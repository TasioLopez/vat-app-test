"use client";

import {
  DndContext, closestCenter, useDraggable, useDroppable, DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import React, {
  ReactNode, useEffect, useMemo, useRef, useState, useLayoutEffect,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import Logo2 from "@/assets/images/logo-2.png";
import { supabase } from "@/lib/supabase/client";
import { useTP } from "@/context/TPContext";

const STATUS_OPTIONS = ["G", "P", "N"] as const;

const ACTIVITIES = [
  "Verwerking verlies en acceptatie",
  "Empowerment",
  "Kwaliteiten en vaardigheden onderzoeken",
  "Beroeps-en arbeidsmarkt oriëntatie",
  "Scholingsmogelijkheden onderzoeken",
  "Sollicitatietools (brief en cv)",
  "Voortgangsrapportage en evaluatie",
  "Netwerken",
  "Sollicitatievaardigheden vervolg (gesprek)",
  "Webinar",
  "Solliciteren via social media en/of netwerken",
  "Vacatures zoeken en beoordeling",
  "Wekelijks solliciteren",
  "Sollicitatiegesprek voorbereiden en presenteren",
  "Jobhunten",
  "Detacheren onderzoeken",
  "Activering / werkervaring",
  "Webinar (gericht op eventuele WIA-aanvraag)",
  "Voortgangsrapportage en eindevaluatie",
  "Begeleiding WIA",
] as const;

type Aktiviteit = { name: string; status: (typeof STATUS_OPTIONS)[number] };
type Periode = { from: string; to: string };
type Fase = { title: string; periode: Periode; activiteiten: Aktiviteit[] };

type DraggableProps = { id: string; children?: ReactNode; className?: string };

function Draggable({ id, children }: DraggableProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
  const style = { transform: transform ? CSS.Translate.toString(transform) : undefined, zIndex: 10 };
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="cursor-grab">
      {children}
    </div>
  );
}

function Droppable({
  id, children,
  className = "min-h-[100px] border border-dashed rounded p-2 bg-gray-50 space-y-2",
}: {
  id: string; children: React.ReactNode; className?: string;
}) {
  const { setNodeRef } = useDroppable({ id });
  return <div ref={setNodeRef} className={className}>{children}</div>;
}

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: 10 };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab">
      {children}
    </div>
  );
}

/* ---------- A4 preview geometry ---------- */
const A4_W = 794;          // px
const A4_H = 1123;         // px
const PAGE_PADDING_Y = 40; // Tailwind p-10 ~= 40px per side
const CONTENT_H = A4_H - PAGE_PADDING_Y * 2;

/** Heuristic line-heights for pagination (visual zoom does NOT affect these) */
const BASE_W = 595;
const SCALE_UP = A4_W / BASE_W;         // ≈ 1.334
const HEADER_H = Math.round(22 * SCALE_UP);
const ROW_H = Math.round(14 * SCALE_UP);
const HEADER_MARGIN = Math.round(8 * SCALE_UP);
const SECTION_MARGIN = Math.round(10 * SCALE_UP);
const LEGEND_BLOCK_H = Math.round(70 * SCALE_UP);

/** Split fases into page-sized chunks */
function paginateFases(fases: Fase[]) {
  const pages: { sections: Fase[] }[] = [];
  let cur: Fase[] = [];
  let used = 0;

  const maxFirstPages = CONTENT_H;
  const maxLastPage = CONTENT_H - LEGEND_BLOCK_H;

  fases.forEach((f, idx) => {
    const sectionH = HEADER_H + HEADER_MARGIN + f.activiteiten.length * ROW_H + SECTION_MARGIN;
    const isLastFase = idx === fases.length - 1;
    const pageLimit = isLastFase ? maxLastPage : maxFirstPages;

    if (used + sectionH > pageLimit && cur.length) {
      pages.push({ sections: cur });
      cur = [];
      used = 0;
    }
    cur.push(f);
    used += sectionH;
  });

  if (cur.length) pages.push({ sections: cur });
  return pages;
}

/** Fit scale: how big the page can be inside its rail (no extra caps here) */
function useFitScale(ref: React.RefObject<HTMLElement>, baseWidth: number, baseHeight: number) {
  const [fit, setFit] = useState(1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const cs = window.getComputedStyle(el);
      const padX = parseFloat(cs.paddingLeft || "0") + parseFloat(cs.paddingRight || "0");
      const padY = parseFloat(cs.paddingTop || "0") + parseFloat(cs.paddingBottom || "0");
      const innerW = Math.max(0, el.clientWidth - padX);
      const innerH = Math.max(0, el.clientHeight - padY);
      const byW = innerW / baseWidth;
      const byH = innerH / baseHeight;
      setFit(Math.min(byW, byH));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [ref, baseWidth, baseHeight]);

  return fit;
}

/** Extra preview zoom so it's always smaller than fit */
const PREVIEW_ZOOM = 0.65; // 65% of the fit size

export default function Bijlage({ employeeId }: { employeeId: string }) {
  const { updateField } = useTP();

  // --- local state
  const [fases, setFases] = useState<Fase[]>([
    { title: "", periode: { from: "", to: "" }, activiteiten: [] },
  ]);
  const [unassigned, setUnassigned] = useState<string[]>([...ACTIVITIES]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ pages + preview scaling
  const pages = useMemo(() => paginateFases(fases), [fases]);
  const previewRef = useRef<HTMLDivElement>(null);
  const fit = useFitScale(previewRef as any, A4_W, A4_H);
  const scale = Math.max(0.35, Math.min(0.45, fit * PREVIEW_ZOOM)); // clamp final scale

  const computeUnassigned = (all: readonly string[], fs: Fase[]) => {
    const used = new Set(fs.flatMap((f) => f.activiteiten.map((a) => a.name)));
    return all.filter((a) => !used.has(a));
  };

  // --- initial load
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("tp_meta")
        .select("bijlage_fases")
        .eq("employee_id", employeeId)
        .maybeSingle();

      if (!error && data?.bijlage_fases) {
        const fs: Fase[] = (data.bijlage_fases as Fase[]).map((f) => ({
          title: f.title ?? "",
          periode: { from: f.periode?.from ?? "", to: f.periode?.to ?? "" },
          activiteiten: (f.activiteiten ?? []).map((a) => ({
            name: a.name,
            status: (a.status as any) ?? "P",
          })),
        }));
        setFases(fs.length ? fs : [{ title: "", periode: { from: "", to: "" }, activiteiten: [] }]);
        setUnassigned(computeUnassigned(ACTIVITIES, fs));
        updateField("bijlage_fases", fs);
      } else {
        setUnassigned(computeUnassigned(ACTIVITIES, fases));
        updateField("bijlage_fases", fases);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  // --- persist (debounced)
  const persist = async (payload: Fase[]) => {
    setSaving(true);
    const { error } = await supabase
      .from("tp_meta")
      .upsert([{ employee_id: employeeId, bijlage_fases: payload } as any], {
        onConflict: "employee_id",
      });
    setSaving(false);
    if (!error) setLastSavedAt(new Date());
  };

  useEffect(() => {
    updateField("bijlage_fases", fases);
    setUnassigned(computeUnassigned(ACTIVITIES, fases));

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void persist(fases);
    }, 800);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fases]);

  const handleSaveNow = async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await persist(fases);
  };

  const addFase = () => {
    setFases((prev) => [...prev, { title: "", periode: { from: "", to: "" }, activiteiten: [] }]);
  };

  const formatDate = (input: string) => {
    if (!input) return "...";
    const [year, month, day] = input.split("-");
    return `${day}/${month}/${year}`;
  };

  const handleStatusChange = (faseIndex: number, activityName: string, status: string) => {
    setFases((prev) => {
      const updated = [...prev];
      const activity = updated[faseIndex].activiteiten.find((a) => a.name === activityName);
      if (activity) activity.status = status as any;
      return updated;
    });
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activity = active.id as string;

    setFases((prev) => {
      const fromFaseIndex = prev.findIndex((f) => f.activiteiten.some((a) => a.name === activity));

      const toFaseIndex =
        over.id === "unassigned"
          ? -1
          : typeof over.id === "string" && over.id.startsWith("fase-")
            ? Number((over.id as string).split("-")[1])
            : prev.findIndex((f) => f.activiteiten.some((a) => a.name === over.id));

      const next = [...prev];

      if (over.id === "unassigned") {
        if (fromFaseIndex !== -1) {
          next[fromFaseIndex].activiteiten =
            next[fromFaseIndex].activiteiten.filter((a) => a.name !== activity);
        }
        return next;
      }

      if (fromFaseIndex === toFaseIndex && fromFaseIndex !== -1) {
        const items = [...next[fromFaseIndex].activiteiten];
        const fromIndex = items.findIndex((a) => a.name === activity);
        const toIndex = items.findIndex((a) => a.name === over.id);
        if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return next;
        next[fromFaseIndex].activiteiten = arrayMove(items, fromIndex, toIndex);
        return next;
      }

      if (fromFaseIndex === -1 && toFaseIndex !== -1) {
        next[toFaseIndex].activiteiten = [
          ...next[toFaseIndex].activiteiten,
          { name: activity, status: "P" },
        ];
        return next;
      }

      if (fromFaseIndex !== -1 && toFaseIndex !== -1) {
        const moved = next[fromFaseIndex].activiteiten.find((a) => a.name === activity);
        if (!moved) return next;
        next[fromFaseIndex].activiteiten =
          next[fromFaseIndex].activiteiten.filter((a) => a.name !== activity);
        next[toFaseIndex].activiteiten.push(moved);
        return next;
      }

      return next;
    });
  };

  if (loading) return <p className="px-4 py-4">Loading…</p>;

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={(event) => setActiveId(event.active.id as string)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex h-[75vh] w-full overflow-visible relative">
        {/* COLUMN 1: Activities List */}
        <div className="w-[28%] min-w-[240px] max-w-[30%] border-r px-4 py-4 overflow-y-auto text-xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg">Beschikbare activiteiten</h2>
            <div className="text-[11px] text-gray-500">
              {saving ? "Saving…" : lastSavedAt ? "Saved" : "—"}
            </div>
          </div>
          <Droppable id="unassigned">
            {unassigned.map((act) => (
              <Draggable key={act} id={act}>
                <div className="bg-white p-2 rounded border shadow-sm mb-1">{act}</div>
              </Draggable>
            ))}
          </Droppable>
        </div>

        {/* COLUMN 2: Builder */}
        <div className="w-[30%] min-w-[400px] px-4 py-4 overflow-y-auto text-xs">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-lg">Fase Builder</h2>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleSaveNow} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button size="sm" onClick={addFase}>➕ Voeg Fase toe</Button>
            </div>
          </div>

          <div className="space-y-6">
            {fases.map((fase, i) => (
              <div key={i} className="border p-4 rounded space-y-4 bg-gray-100/10">
                <div className="flex justify-between items-center">
                  <Label>Fase {i + 1} - Doel</Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setFases((prev) => prev.filter((_, idx) => idx !== i))
                    }
                  >
                    Verwijder
                  </Button>
                </div>
                <Input
                  value={fase.title}
                  onChange={(e) =>
                    setFases((prev) => {
                      const next = [...prev];
                      next[i].title = e.target.value;
                      return next;
                    })
                  }
                />

                <Label>Periode</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={fase.periode.from}
                    onChange={(e) =>
                      setFases((prev) => {
                        const next = [...prev];
                        next[i].periode.from = e.target.value;
                        return next;
                      })
                    }
                  />
                  <Input
                    type="date"
                    value={fase.periode.to}
                    onChange={(e) =>
                      setFases((prev) => {
                        const next = [...prev];
                        next[i].periode.to = e.target.value;
                        return next;
                      })
                    }
                  />
                </div>

                <Droppable id={`fase-${i}`}>
                  <SortableContext
                    items={fase.activiteiten.map((a) => a.name)}
                    strategy={verticalListSortingStrategy}
                  >
                    {fase.activiteiten.map((act) => (
                      <SortableItem id={act.name} key={act.name}>
                        <div className="bg-white p-2 rounded border flex justify-between items-center">
                          <span>{act.name}</span>
                          <select
                            value={act.status}
                            onChange={(e) => handleStatusChange(i, act.name, e.target.value)}
                            className="border rounded px-1 py-0.5"
                          >
                            {STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </div>
                      </SortableItem>
                    ))}
                  </SortableContext>
                </Droppable>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: scaled A4 preview */}
        <div
          ref={previewRef}
          className="basis-[420px] shrink-0 grow-0 px-3 py-3 bg-gray-50 overflow-y-auto overflow-x-hidden"
        >
          {pages.map((page, pi) => {
            const scaledW = Math.round(A4_W * scale);
            const scaledH = Math.round(A4_H * scale);

            return (
              <div
                key={pi}
                className="mx-auto mb-6"
                style={{
                  width: scaledW,
                  height: scaledH,
                  position: "relative",
                }}
              >
                {/* The actual A4 page; we scale the whole page */}
                <div
                  className="bg-white border rounded shadow font-sans"
                  style={{
                    width: A4_W,
                    height: A4_H,
                    padding: PAGE_PADDING_Y,
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                    position: "absolute",
                    left: 0,
                    top: 0,
                  }}
                >
                  {/* header */}
                  <div className="w-full flex justify-end mb-3">
                    <Image src={Logo2} alt="Valentinez Logo" width={180} height={90} />
                  </div>
                  <h1 className="text-center font-semibold text-[22px] mb-8">
                    Bijlage – Voortgang en planning
                  </h1>

                  {/* page content */}
                  <div className="text-[18px] leading-tight">
                    {page.sections.map((fase, i) => (
                      <div key={`${pi}-${i}`} className="mb-4">
                        <div className="bg-gray-100 font-bold py-[2px] px-2 flex justify-between text-[18px]">
                          <span>Fase{fase.title ? `: ${fase.title}` : ""}</span>
                          <span>
                            Periode: {formatDate(fase.periode.from)} - {formatDate(fase.periode.to)}
                          </span>
                        </div>
                        <div className="mt-1 space-y-[1px]">
                          {fase.activiteiten.map((a) => (
                            <div key={a.name} className="flex justify-between gap-2 py-0.5 px-2">
                              <span className="flex-1">{a.name}</span>
                              <span className="text-right min-w-[20px]">{a.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* legend only on the last page */}
                    {pi === pages.length - 1 && (
                      <>
                        <div className="flex flex-col gap-[2px] mb-2 text-[14px] mt-3">
                          <strong>Legenda</strong>
                          <div className="flex gap-6">
                            <p><strong>G</strong> = gedaan/ succesvol uitgevoerd</p>
                            <p><strong>P</strong> = nog in planning</p>
                            <p><strong>N</strong> = niet gedaan / geen succes</p>
                          </div>
                        </div>
                        <p className="italic text-[14px] text-gray-600">
                          *Het solliciteren geschiedt conform planning, aanvang sollicitatiefase
                          wordt vervroegd indien werknemer daar eerder klaar voor is.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <DragOverlay>
        {activeId ? (
          <div className="cursor-grabbing bg-white p-2 rounded border shadow-sm mb-1">{activeId}</div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
