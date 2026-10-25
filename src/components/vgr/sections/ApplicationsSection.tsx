'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { A4LogoHeader, A4Page, FooterIdentity, TP2026_A4_PAGE_CLASS } from '@/components/tp2026/primitives';
import { TP2026_CELL_BG_WARM_CLASS, TP2026_HTML_TABLE_CLASS } from '@/lib/tp2026/tp2026-colors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatNLDateForDoc } from '@/lib/tp/date-line-breaks';
import { useVGRPageNumber } from '@/context/VGRPageNumberContext';
import { VGR_APPLICATION_CAVEATS, VGR_APPLICATIONS_EMPTY_TEXT, VGR_APPLICATIONS_INSTRUCTIE } from '@/lib/vgr/content';
import {
  VGR_APPLICATION_STATUSES,
  VGR_APPLICATION_TYPES,
  formatNLMonthYear,
  monthKeyFromDate,
  newVgrId,
  type VGRApplication,
  type VGRData,
} from '@/lib/vgr/schema';

import { activeApplicationCaveats, applicationLine, groupApplicationsByMonth } from '@/lib/vgr/applications';

export { activeApplicationCaveats, applicationLine, groupApplicationsByMonth };

/* ------------------------------------------------------------------ */
/* Editor                                                              */
/* ------------------------------------------------------------------ */

export function ApplicationsEditor({
  applications,
  setApplications,
  periodStart,
  periodEnd,
}: {
  applications: VGRApplication[];
  setApplications: (next: VGRApplication[]) => void;
  periodStart?: string;
  periodEnd?: string;
}) {
  const [draft, setDraft] = useState<Omit<VGRApplication, 'id' | 'month_key'>>({
    date: '',
    type: 'Sollicitatie',
    functie: '',
    organisatie: '',
    status: 'in behandeling',
    note: '',
  });

  const groups = useMemo(() => groupApplicationsByMonth(applications), [applications]);

  const update = (id: string, patch: Partial<VGRApplication>) =>
    setApplications(
      applications.map((a) => {
        if (a.id !== id) return a;
        const next = { ...a, ...patch };
        if (patch.date !== undefined) next.month_key = monthKeyFromDate(patch.date);
        return next;
      })
    );

  const add = () => {
    if (!draft.date) return;
    setApplications([...applications, { ...draft, id: newVgrId('app'), month_key: monthKeyFromDate(draft.date) }]);
    setDraft((d) => ({ ...d, functie: '', organisatie: '', note: '' }));
  };

  const outOfPeriod = (date: string) =>
    !!date && ((!!periodStart && date < periodStart) || (!!periodEnd && date > periodEnd));

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
        {VGR_APPLICATIONS_INSTRUCTIE}
      </div>

      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-[#702A90]">Activiteit toevoegen</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Datum</label>
            <Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Type activiteit</label>
            <select
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
              value={draft.type}
              onChange={(e) => setDraft({ ...draft, type: e.target.value })}
            >
              {VGR_APPLICATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
            <select
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value })}
            >
              {VGR_APPLICATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Functie</label>
            <Input value={draft.functie} onChange={(e) => setDraft({ ...draft, functie: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Organisatie / bedrijf</label>
            <Input value={draft.organisatie} onChange={(e) => setDraft({ ...draft, organisatie: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Notitie (niet afgedrukt)</label>
            <Input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button type="button" size="sm" className="gap-1" disabled={!draft.date} onClick={add}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Toevoegen
          </Button>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nog geen activiteiten geregistreerd. De bijlage toont dan een lege-staat tekst.</p>
      ) : (
        groups.map((g) => (
          <div key={g.monthKey} className="rounded-lg border border-border bg-card shadow-sm">
            <div className="border-b bg-muted/40 px-4 py-2 text-sm font-semibold text-[#702A90]">
              {formatNLMonthYear(g.monthKey)} <span className="font-normal text-muted-foreground">({g.items.length})</span>
            </div>
            <div className="divide-y">
              {g.items.map((a) => (
                <div key={a.id} className="grid grid-cols-1 gap-2 px-4 py-2 sm:grid-cols-[130px_1fr_1fr_1fr_150px_auto] sm:items-center">
                  <div>
                    <Input
                      type="date"
                      className={`h-8 text-xs ${outOfPeriod(a.date) ? 'border-amber-400' : ''}`}
                      value={a.date}
                      onChange={(e) => update(a.id, { date: e.target.value })}
                    />
                    {outOfPeriod(a.date) ? <p className="mt-0.5 text-[10px] text-amber-700">Buiten rapportageperiode</p> : null}
                  </div>
                  <select
                    className="h-8 rounded border border-border bg-background px-1.5 text-xs"
                    value={a.type}
                    onChange={(e) => update(a.id, { type: e.target.value })}
                  >
                    {!VGR_APPLICATION_TYPES.includes(a.type as (typeof VGR_APPLICATION_TYPES)[number]) && a.type ? (
                      <option value={a.type}>{a.type}</option>
                    ) : null}
                    {VGR_APPLICATION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <Input className="h-8 text-xs" value={a.functie} placeholder="Functie" onChange={(e) => update(a.id, { functie: e.target.value })} />
                  <Input
                    className="h-8 text-xs"
                    value={a.organisatie}
                    placeholder="Organisatie"
                    onChange={(e) => update(a.id, { organisatie: e.target.value })}
                  />
                  <select
                    className="h-8 rounded border border-border bg-background px-1.5 text-xs"
                    value={a.status}
                    onChange={(e) => update(a.id, { status: e.target.value })}
                  >
                    {VGR_APPLICATION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="justify-self-end rounded p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-700"
                    aria-label="Verwijderen"
                    onClick={() => setApplications(applications.filter((x) => x.id !== a.id))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* A4                                                                  */
/* ------------------------------------------------------------------ */

const MAX_LINES_PER_PAGE = 42;

type PageChunk = { monthKey: string; items: VGRApplication[]; continued: boolean }[];

function paginateGroups(groups: ReturnType<typeof groupApplicationsByMonth>): PageChunk[] {
  const pages: PageChunk[] = [];
  let current: PageChunk = [];
  let lines = 0;
  for (const g of groups) {
    let remaining = [...g.items];
    let continued = false;
    while (remaining.length > 0) {
      const room = MAX_LINES_PER_PAGE - lines - 1; // header line
      if (room <= 2 && current.length > 0) {
        pages.push(current);
        current = [];
        lines = 0;
        continue;
      }
      const take = remaining.slice(0, Math.max(1, room));
      remaining = remaining.slice(take.length);
      current.push({ monthKey: g.monthKey, items: take, continued });
      lines += 1 + take.length;
      continued = true;
      if (remaining.length > 0) {
        pages.push(current);
        current = [];
        lines = 0;
      }
    }
  }
  if (current.length > 0 || pages.length === 0) pages.push(current);
  return pages;
}

export function ApplicationsA4Pages({ data, printMode = false }: { data: VGRData; printMode?: boolean }) {
  const { getPageNumber, setSectionPageCount } = useVGRPageNumber();
  const groups = useMemo(() => groupApplicationsByMonth(data.applications), [data.applications]);
  const pages = useMemo(() => paginateGroups(groups), [groups]);
  const caveats = activeApplicationCaveats(data.applications);

  useEffect(() => {
    setSectionPageCount('applications', pages.length);
  }, [pages.length, setSectionPageCount]);

  return (
    <>
      {pages.map((chunks, pageIdx) => {
        const isLast = pageIdx === pages.length - 1;
        const page = (
          <A4Page className={`${TP2026_A4_PAGE_CLASS} flex min-h-0 flex-col overflow-hidden`}>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <A4LogoHeader />
              {pageIdx === 0 ? (
                <div className="mb-2 shrink-0">
                  <div className="text-[11pt] font-bold leading-tight tracking-tight text-[#d4694a]">Bijlage 2</div>
                  <div className="mt-0.5 text-[10pt] font-bold leading-tight tracking-tight text-[#2d8f82]">
                    Sollicitatieactiviteitenoverzicht
                  </div>
                </div>
              ) : null}
              {chunks.length === 0 ? (
                <p className="text-[10pt] leading-snug text-neutral-900">{VGR_APPLICATIONS_EMPTY_TEXT}</p>
              ) : (
                <table className={`${TP2026_HTML_TABLE_CLASS} bg-white text-[10pt] leading-snug text-neutral-900`}>
                  <colgroup>
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '78%' }} />
                  </colgroup>
                  <tbody>
                    {chunks.map((c) =>
                      c.items.map((a, i) => (
                        <tr key={a.id}>
                          {i === 0 ? (
                            <td
                              rowSpan={c.items.length}
                              className={`px-2 py-0.5 align-top font-bold text-[#702A90] ${TP2026_CELL_BG_WARM_CLASS}`}
                            >
                              {formatNLMonthYear(c.monthKey)}
                              {c.continued ? ' (vervolg)' : ''}
                            </td>
                          ) : null}
                          <td className="!bg-white px-2 py-0.5 align-top">{applicationLine(a) || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
              {isLast ? (
                <div className="mt-2 shrink-0 space-y-0.5 pb-1">
                  {caveats.map((c) => (
                    <p key={c} className="text-[8pt] italic leading-tight text-[#702A90]">
                      {c}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
            <FooterIdentity
              lastName={data.last_name}
              firstName={data.first_name}
              dateOfBirth={formatNLDateForDoc(data.date_of_birth)}
              pageNumber={getPageNumber('applications', pageIdx)}
            />
          </A4Page>
        );
        return printMode ? (
          <section className="print-page" key={pageIdx}>
            {page}
          </section>
        ) : (
          <div key={pageIdx}>{page}</div>
        );
      })}
    </>
  );
}
