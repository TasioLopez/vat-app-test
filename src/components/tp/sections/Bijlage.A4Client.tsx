// CLIENT WRAPPER — Bijlage.A4Client.tsx
// Uses TPContext + measurement-based pagination for on-screen preview.

"use client";

import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTP } from "@/context/TPContext";
import Image from "next/image";
import Logo2 from "@/assets/images/logo-2.png";

const page =
  "bg-white w-[794px] h-[1123px] shadow border p-10 text-[12px] font-sans mx-auto mb-6 print:shadow-none";
const heading = "text-lg font-semibold text-center mb-6";
const blockTitle = "font-bold text-[#660066] px-2 py-1";
const paperText = "p-2 whitespace-pre-wrap leading-relaxed bg-[#e7e6e6]";
const subtle = "bg-[#e7e6e6] px-3 py-1 whitespace-pre-wrap leading-relaxed italic";

type Aktiviteit = { name: string; status: string };
type Periode = { from?: string; to?: string };
type Fase = { title?: string; periode?: Periode; activiteiten: Aktiviteit[] };

type PreviewItem =
  | { key: string; variant: "subtle"; node: React.ReactNode }
  | { key: string; variant: "block"; title: string; node: React.ReactNode };

export default function BijlageA4Client({ employeeId }: { employeeId: string }) {
  const { tpData } = useTP();
  const fases: Fase[] = (tpData.bijlage_fases as Fase[] | undefined) ?? [];

  const sections = useMemo<PreviewItem[]>(() => {
    const items: PreviewItem[] = [];

    if (!fases.length) {
      items.push({
        key: "empty",
        variant: "subtle",
        node: <>Er zijn nog geen fasen toegevoegd.</>,
      });
    } else {
      fases.forEach((fase, idx) => {
        const title = `Fase ${idx + 1}: ${fase.title || "(geen doel)"} — Periode: ${fmt(
          fase.periode?.from
        )} - ${fmt(fase.periode?.to)}`;

        items.push({
          key: `fase-${idx}`,
          variant: "block",
          title,
          node: (
            <div className="space-y-0.5">
              {fase.activiteiten?.length ? (
                fase.activiteiten.map((a, i) => (
                  <div key={`${a.name}-${i}`} className="flex justify-between gap-2 px-2 py-0.5">
                    <span className="flex-1">{a.name}</span>
                    <span className="text-right min-w-[20px]">{a.status}</span>
                  </div>
                ))
              ) : (
                <div className="px-2 py-0.5 text-gray-500 italic">Geen activiteiten</div>
              )}
            </div>
          ),
        });
      });
    }

    // Legend + note
    items.push(
      {
        key: "legend",
        variant: "block",
        title: "Legenda",
        node: (
          <div className="text-[10px]">
            <div className="flex gap-6">
              <p>
                <strong>G</strong> = gedaan / succesvol uitgevoerd
              </p>
              <p>
                <strong>P</strong> = nog in planning
              </p>
              <p>
                <strong>N</strong> = niet gedaan / geen succes
              </p>
            </div>
          </div>
        ),
      },
      {
        key: "note",
        variant: "subtle",
        node: (
          <>
            *Het solliciteren geschiedt conform planning, aanvang sollicitatiefase wordt
            vervroegd indien werknemer daar eerder klaar voor is.
          </>
        ),
      }
    );

    return items;
  }, [JSON.stringify(tpData.bijlage_fases)]);

  return (
    <PaginatedA4
      sections={sections}
      headingFirst="Bijlage – Voortgang en planning"
      headingRest=""
    />
  );
}

/* ---------------- A4 auto-pagination with logo every page ---------------- */

function PaginatedA4({
  sections,
  headingFirst,
  headingRest,
}: {
  sections: PreviewItem[];
  headingFirst: string;
  headingRest: string;
}) {
  const PAGE_W = 794;
  const PAGE_H = 1123;
  const PAD = 40;
  const CONTENT_H = PAGE_H - PAD * 2;
  const BLOCK_SPACING = 12;

  const headerFirstRef = useRef<HTMLDivElement | null>(null);
  const headerRestRef = useRef<HTMLDivElement | null>(null);
  const blockRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [pages, setPages] = useState<number[][]>([]);

  const MeasureTree = () => (
    <div style={{ position: "absolute", left: -99999, top: 0, width: PAGE_W }} className="invisible">
      {/* First header (logo + title) */}
      <div className={page} style={{ width: PAGE_W, height: PAGE_H, padding: PAD }}>
        <PageHeader ref={headerFirstRef} headingText={headingFirst} showTitle />
        {sections.map((s, i) => (
          <div
            key={`m-${s.key}`}
            ref={(el) => {
              blockRefs.current[i] = el;
            }}
            className="mb-3"
          >
            {s.variant === "subtle" ? (
              <div className={subtle}>{s.node}</div>
            ) : (
              <div>
                <div className={blockTitle}>{s.title}</div>
                <div className={paperText}>{s.node}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Rest header (logo only) */}
      <div className={page} style={{ width: PAGE_W, height: PAGE_H, padding: PAD }}>
        <PageHeader ref={headerRestRef} headingText={headingRest} showTitle={false} />
      </div>
    </div>
  );

  useLayoutEffect(() => {
    const firstH = headerFirstRef.current?.offsetHeight ?? 0;
    const restH = headerRestRef.current?.offsetHeight ?? 0;

    const heights = sections.map((_, i) => blockRefs.current[i]?.offsetHeight ?? 0);

    const limitFirst = CONTENT_H - firstH;
    const limitRest = CONTENT_H - restH;
    const SAFETY_MARGIN = 20; // Add safety margin to prevent overflow
    const maxLimitFirst = limitFirst - SAFETY_MARGIN;
    const maxLimitRest = limitRest - SAFETY_MARGIN;

    const out: number[][] = [];
    let cur: number[] = [];
    let used = 0;
    let limit = maxLimitFirst;

    heights.forEach((h, idx) => {
      // If a single block is taller than the current limit, it needs its own page
      const currentMaxLimit = limit === maxLimitFirst ? maxLimitFirst : maxLimitRest;
      if (h > currentMaxLimit) {
        // Finalize current page if it has content
        if (cur.length) {
          out.push(cur);
          cur = [];
          used = 0;
        }
        // Place oversized block on its own page
        out.push([idx]);
        used = 0;
        limit = maxLimitRest; // Next pages use rest header
      } else {
        const add = (cur.length ? BLOCK_SPACING : 0) + h;
        if (used + add > limit) {
          if (cur.length) out.push(cur);
          cur = [idx];
          used = h;
          limit = maxLimitRest;
        } else {
          used += add;
          cur.push(idx);
        }
      }
    });

    if (cur.length) out.push(cur);
    setPages(out);
  }, [
    sections.length,
    JSON.stringify(
      sections.map((s) => (s.variant === "subtle" ? ["s", s.key] : ["b", s.key, s.title]))
    ),
  ]);

  return (
    <>
      <MeasureTree />
      {pages.map((idxs, p) => (
        <section key={`p-${p}`} className="print-page">
          <div className={page} style={{ width: PAGE_W, height: PAGE_H, display: 'flex', flexDirection: 'column' }}>
            <PageHeader headingText={p === 0 ? headingFirst : headingRest} showTitle={p === 0 && !!headingFirst} />
            <div style={{ flex: 1, overflow: 'visible', display: 'flex', flexDirection: 'column' }}>
              {idxs.map((i) => {
              const s = sections[i];
              return (
                <div key={s.key} className="mb-3">
                  {s.variant === "subtle" ? (
                    <div className={subtle}>{s.node}</div>
                  ) : (
                    <>
                      <div className={blockTitle}>{s.title}</div>
                      <div className={paperText}>{s.node}</div>
                    </>
                  )}
                </div>
              );
            })}
            </div>
          </div>
        </section>
      ))}
    </>
  );
}

/* ---------------- header + utils ---------------- */

const PageHeader = React.forwardRef<
  HTMLDivElement,
  { headingText: string; showTitle?: boolean }
>(({ headingText, showTitle = true }, ref) => (
  <div ref={ref as any}>
    <LogoBar />
    {showTitle && headingText ? <h1 className={heading}>{headingText}</h1> : null}
  </div>
));
PageHeader.displayName = "PageHeader";

function LogoBar() {
  return (
    <div className="w-full flex justify-end mb-6">
      <Image src={Logo2} alt="Valentinez Logo" width={120} height={60} />
    </div>
  );
}

function fmt(date?: string) {
  if (!date) return "...";
  const d = new Date(date);
  if (isNaN(+d)) return "...";
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}
