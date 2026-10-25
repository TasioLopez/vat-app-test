/**
 * Body (03) print model: a flat list of "atoms" that `BodyA4Pages` measures and packs onto A4 pages.
 * Only STATIC + CONDITIONAL template text and adviser prose are emitted — never instructions.
 */
import React from 'react';
import { PrintCheckbox } from '@/components/tp2026/PrintCheckbox';
import {
  VGR_ACTIVATIE_ALGEMEEN,
  VGR_ACTIVATIE_OPTIONS,
  VGR_BENUTBARE_VRAAG,
  VGR_BEROEPEN_CRITERIA,
  VGR_BEROEPEN_CRITERIA_INTRO,
  VGR_BEROEPEN_CRITERIA_OUTRO,
  VGR_BIJSTELLING_VRAAG,
  VGR_CHAPTERS,
  VGR_DOELSTELLING_INTRO,
  VGR_INZET_VRAAG,
  VGR_KWALITEITEN_LEAD,
  VGR_KWALITEITEN_OPTIONS,
  VGR_LEERNAVIGATOR_ACTIVERING_TITLE,
  VGR_LEERNAVIGATOR_BASIS_TITLE,
  VGR_LEERNAVIGATOR_INTRO,
  VGR_MOTIVATIE_ALGEMEEN,
  VGR_MOTIVATIE_LEAD,
  VGR_MOTIVATIE_OPTIONS,
  VGR_ORIENTATIE_ALGEMEEN,
  VGR_PERSONALITY_TRAITS,
  VGR_PERSPECTIEF_ALGEMEEN,
  VGR_POW_CHART_SRC,
  VGR_POW_FOOTNOTE,
  VGR_POW_METER_TEKST,
  VGR_POW_ROW_LABELS,
  VGR_POW_UREN_SUFFIX,
  VGR_PRAKTISCHE_VRAAG,
  VGR_SCHOLING_ALGEMEEN,
  VGR_SCHOLING_OPTIONS,
  VGR_SOLLICITATIE_LEAD,
  VGR_SOLLICITATIE_OPTIONS,
  VGR_VERVOLG_LEAD,
  VGR_VISIE_FUNCTIES_FOOTNOTE,
  VGR_VISIE_FUNCTIES_LEAD,
  VGR_VISIE_LA_TITLE,
  VGR_VRAAGSTELLING,
  VGR_WIJZIGING_DOEL_VRAAG,
  leernavigatorLabelWithUren,
  vgrBelastbaarheidIntro,
  vgrBijstellingIntro,
  vgrDoelstellingWijzigingZin,
  vgrQuoteLead,
  vgrVisieAdLead,
  vgrVisieKansenZin,
  type VGRChapterId,
  type VGRInterventionOption,
} from '@/lib/vgr/content';
import { vgrPeriodeText, vgrVervolgPeriodeText } from '@/lib/vgr/period';
import {
  VGR_FML_RUBRIEKEN,
  VGR_KANSEN_OPTIONS,
  VGR_TRAJECT_DOEL_OPTIONS,
  formatNLDate,
  trajectDoelLabel,
  type JaNee,
  type VGRBody,
  type VGRData,
  type VGRInterventionSection,
  type VGRQuoteBlock,
} from '@/lib/vgr/schema';

/* ------------------------------------------------------------------ */
/* Atom model                                                          */
/* ------------------------------------------------------------------ */

export type VGRBodyAtom = {
  id: string;
  node: React.ReactNode;
  /** Headings: never leave alone at the bottom of a page. */
  keepWithNext?: boolean;
  /** Chapter bands start a new page. */
  pageBreakBefore?: boolean;
  /** Long prose: can be split into paragraphs when it does not fit. */
  splitText?: { text: string; render: (part: string, partIndex: number) => React.ReactNode };
};

/* ------------------------------------------------------------------ */
/* Print primitives                                                    */
/* ------------------------------------------------------------------ */

export const VGR_BODY_TEXT_CLASS = 'text-[10.5pt] leading-[1.42] text-neutral-900';

export function ChapterBand({ chapter }: { chapter: VGRChapterId }) {
  const def = VGR_CHAPTERS.find((c) => c.id === chapter)!;
  return (
    <div
      className="px-2.5 py-2 text-[15px] font-bold leading-tight text-white"
      style={{ backgroundColor: def.color }}
      data-vgr-chapter={chapter}
    >
      {def.title}
    </div>
  );
}

export function SectionTitle({ title, sub = false }: { title: string; sub?: boolean }) {
  return sub ? (
    <div className="pt-1 text-[11pt] font-bold leading-tight text-neutral-900">{title}</div>
  ) : (
    <div className="pt-1.5 text-[12pt] font-extrabold leading-tight text-[#6d2a96]">{title}</div>
  );
}

export function Para({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`${VGR_BODY_TEXT_CLASS} whitespace-pre-line ${className}`}>{children}</p>;
}

export function Quote({ text }: { text: string }) {
  const t = text.trim();
  if (!t) return <Para className="italic text-neutral-500">“—”</Para>;
  return <Para className="italic">“{t}”</Para>;
}

export function CheckLine({ checked, label }: { checked: boolean; label: React.ReactNode }) {
  return (
    <div className={`${VGR_BODY_TEXT_CLASS} flex items-start gap-2`}>
      <span className="flex h-[1lh] shrink-0 items-center">
        <PrintCheckbox checked={checked} />
      </span>
      <span className="min-w-0 flex-1">{label}</span>
    </div>
  );
}

export function JaNeeLine({ value }: { value: JaNee }) {
  return (
    <div className="flex flex-col gap-0.5">
      <CheckLine checked={value === true} label="Ja" />
      <CheckLine checked={value === false} label="Nee" />
    </div>
  );
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <ul className={`${VGR_BODY_TEXT_CLASS} list-disc space-y-0.5 pl-5`}>
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Builders                                                            */
/* ------------------------------------------------------------------ */

type Ctx = { data: VGRData; body: VGRBody; atoms: VGRBodyAtom[] };

function push(ctx: Ctx, atom: VGRBodyAtom) {
  ctx.atoms.push(atom);
}

function heading(ctx: Ctx, id: string, title: string, sub = false) {
  push(ctx, { id, node: <SectionTitle title={title} sub={sub} />, keepWithNext: true });
}

function prose(ctx: Ctx, id: string, text: string, className = '') {
  const t = text.trim();
  if (!t) return;
  push(ctx, {
    id,
    node: <Para className={className}>{t}</Para>,
    splitText: { text: t, render: (part) => <Para className={className}>{part}</Para> },
  });
}

function quoteBlock(ctx: Ctx, id: string, kind: 'prognose' | 'conclusie' | 'advies', q: VGRQuoteBlock, title: string) {
  heading(ctx, `${id}-h`, title, true);
  push(ctx, {
    id: `${id}-lead`,
    node: <Para>{vgrQuoteLead(kind, q.bron_naam, formatNLDate(q.bron_datum), q.bron_type)}</Para>,
    keepWithNext: true,
  });
  push(ctx, { id: `${id}-q`, node: <Quote text={q.citaat} /> });
}

function interventionBlocks(
  ctx: Ctx,
  idPrefix: string,
  section: VGRInterventionSection,
  options: VGRInterventionOption[],
  extra?: (opt: VGRInterventionOption, ctx: Ctx) => void
) {
  for (const optId of section.selected) {
    const opt = options.find((o) => o.id === optId);
    if (!opt) continue;
    const block = section.blocks[opt.id] ?? { toelichting: '', items: [], standaardtekst: true };
    heading(ctx, `${idPrefix}-${opt.id}-h`, opt.heading, true);
    if (block.standaardtekst && opt.standardText) {
      opt.standardText.forEach((p, i) => prose(ctx, `${idPrefix}-${opt.id}-std-${i}`, p));
    }
    if (extra) extra(opt, ctx);
    const items = block.items.length ? block.items : block.standaardtekst ? opt.defaultItems ?? [] : [];
    if (items.length) {
      if (opt.itemsLead) {
        push(ctx, { id: `${idPrefix}-${opt.id}-il`, node: <Para>{opt.itemsLead}</Para>, keepWithNext: true });
      }
      push(ctx, { id: `${idPrefix}-${opt.id}-items`, node: <BulletList items={items} /> });
    }
    prose(ctx, `${idPrefix}-${opt.id}-toel`, block.toelichting);
  }
}

function selectionChecklist(ctx: Ctx, id: string, section: VGRInterventionSection, options: VGRInterventionOption[]) {
  push(ctx, {
    id,
    node: (
      <div className="flex flex-col gap-0.5">
        {options.map((o) => (
          <CheckLine key={o.id} checked={section.selected.includes(o.id)} label={o.label} />
        ))}
      </div>
    ),
  });
}

function vervolgLine(ctx: Ctx, id: string, section: VGRInterventionSection) {
  const text = section.vervolg_activiteiten.trim();
  if (!text) return;
  const periode = vgrVervolgPeriodeText(section.vervolg_periode_van, section.vervolg_periode_tot);
  push(ctx, { id: `${id}-lead`, node: <Para className="font-semibold">{VGR_VERVOLG_LEAD(periode)}</Para>, keepWithNext: true });
  prose(ctx, `${id}-text`, text);
}

/* --------------------------- A. Profiel ---------------------------- */

function buildProfiel(ctx: Ctx) {
  const { body, data } = ctx;
  push(ctx, { id: 'ch-profiel', node: <ChapterBand chapter="profiel" />, pageBreakBefore: true, keepWithNext: true });

  const periode = vgrPeriodeText(data);
  push(ctx, {
    id: 'periode',
    node: <Para className="font-bold text-[#6d2a96]">Voortgangsrapportage periode: {periode || '…'}</Para>,
  });

  heading(ctx, 'vraag-h', 'Vraagstelling');
  push(ctx, { id: 'vraag-list', node: <BulletList items={VGR_VRAAGSTELLING} /> });

  // Benutbare mogelijkheden
  const bm = body.benutbare_mogelijkheden;
  heading(ctx, 'bm-h', 'Benutbare mogelijkheden');
  push(ctx, { id: 'bm-q', node: <Para>{VGR_BENUTBARE_VRAAG}</Para>, keepWithNext: true });
  push(ctx, { id: 'bm-jn', node: <JaNeeLine value={bm.heeft} /> });
  quoteBlock(ctx, 'bm-prog', 'prognose', bm.prognose, 'Prognose');
  if (bm.eerdere_prognose.trim()) {
    push(ctx, { id: 'bm-eerder-lead', node: <Para className="text-neutral-600">Eerdere prognose (vorige rapportage):</Para>, keepWithNext: true });
    push(ctx, { id: 'bm-eerder', node: <Quote text={bm.eerdere_prognose} /> });
  }
  quoteBlock(ctx, 'bm-conc', 'conclusie', bm.conclusie, 'Conclusie');
  quoteBlock(ctx, 'bm-adv', 'advies', bm.advies, 'Advies');

  // Praktische belemmeringen
  const pb = body.praktische_belemmeringen;
  heading(ctx, 'pb-h', 'Praktische belemmeringen');
  push(ctx, { id: 'pb-q', node: <Para>{VGR_PRAKTISCHE_VRAAG}</Para>, keepWithNext: true });
  push(ctx, { id: 'pb-jn', node: <JaNeeLine value={pb.aanwezig} /> });
  if (pb.aanwezig && pb.toelichting.trim()) {
    heading(ctx, 'pb-toel-h', 'Toelichting', true);
    prose(ctx, 'pb-toel', pb.toelichting);
  } else if (pb.aanwezig === false && pb.toelichting.trim()) {
    prose(ctx, 'pb-toel', pb.toelichting);
  }

  // Doelstelling traject
  const dt = body.doelstelling_traject;
  heading(ctx, 'dt-h', 'Doelstelling traject');
  prose(ctx, 'dt-intro', VGR_DOELSTELLING_INTRO);
  push(ctx, {
    id: 'dt-checks',
    node: (
      <div className="flex flex-col gap-0.5">
        {VGR_TRAJECT_DOEL_OPTIONS.map((o) => (
          <CheckLine key={o.value} checked={dt.bij_intake === o.value} label={o.label} />
        ))}
      </div>
    ),
  });
  const history = dt.history.length
    ? dt.history
    : [{ id: 'now', date: data.vgr_meta.report_date, from: dt.bij_intake, to: dt.huidige || dt.bij_intake, changed: false, toelichting: '' }];
  push(ctx, {
    id: 'dt-history',
    node: (
      <div className="flex flex-col gap-1">
        {history.map((h) => (
          <div key={h.id}>
            <div className={`${VGR_BODY_TEXT_CLASS} font-semibold`}>Doelstelling {formatNLDate(h.date)}</div>
            <Para>{vgrDoelstellingWijzigingZin(h.changed, trajectDoelLabel(h.from), trajectDoelLabel(h.to))}</Para>
            {h.toelichting.trim() ? <Para>{h.toelichting.trim()}</Para> : null}
          </div>
        ))}
      </div>
    ),
  });
  if (dt.toelichting.trim()) {
    heading(ctx, 'dt-toel-h', 'Toelichting', true);
    prose(ctx, 'dt-toel', dt.toelichting);
  }

  // Persoonlijk profiel
  heading(ctx, 'pp-h', 'Persoonlijk profiel werknemer');
  prose(ctx, 'pp-text', body.persoonlijk_profiel.tekst || '—');

  // Belastbaarheidsprofiel
  const bp = body.belastbaarheidsprofiel;
  heading(ctx, 'bp-h', 'Belastbaarheidsprofiel werknemer');
  push(ctx, {
    id: 'bp-intro',
    node: <Para>{vgrBelastbaarheidIntro(kindLabel(bp.kind), formatNLDate(bp.datum), bp.auteur)}</Para>,
    keepWithNext: true,
  });
  push(ctx, {
    id: 'bp-rubrieken',
    node: (
      <div className="flex flex-col gap-0.5">
        {VGR_FML_RUBRIEKEN.map((r) => (
          <CheckLine key={r} checked={bp.rubrieken.includes(r)} label={r} />
        ))}
      </div>
    ),
  });
  prose(ctx, 'bp-toel', bp.toelichting);

  // Bijstellingen
  const bb = body.bijstellingen_belastbaarheid;
  heading(ctx, 'bb-h', 'Bijstellingen van het belastbaarheidsprofiel');
  push(ctx, { id: 'bb-q', node: <Para>{VGR_BIJSTELLING_VRAAG}</Para>, keepWithNext: true });
  push(ctx, { id: 'bb-jn', node: <JaNeeLine value={bb.aanwezig} /> });
  if (bb.aanwezig && bb.revisions.length) {
    bb.revisions.forEach((rev, i) => {
      push(ctx, {
        id: `bb-rev-${rev.id}-intro`,
        node: <Para>{vgrBijstellingIntro(kindLabel(rev.kind), rev.auteur, formatNLDate(rev.date))}</Para>,
        keepWithNext: true,
      });
      push(ctx, {
        id: `bb-rev-${rev.id}-rub`,
        node: (
          <div className="flex flex-col gap-0.5">
            {VGR_FML_RUBRIEKEN.map((r) => (
              <CheckLine key={r} checked={rev.rubrieken.includes(r)} label={r} />
            ))}
          </div>
        ),
      });
      if (rev.toelichting.trim()) {
        heading(ctx, `bb-rev-${rev.id}-toel-h`, 'Toelichting', true);
        prose(ctx, `bb-rev-${rev.id}-toel`, rev.toelichting);
      }
      if (i < bb.revisions.length - 1) push(ctx, { id: `bb-rev-${rev.id}-sep`, node: <div className="h-1" /> });
    });
  } else {
    prose(ctx, 'bb-geen', bb.toelichting_geen);
  }

  // Wijzigingen doelstelling
  const wd = body.wijzigingen_doelstelling;
  heading(ctx, 'wd-h', 'Wijzigingen doelstelling');
  push(ctx, { id: 'wd-q', node: <Para>{VGR_WIJZIGING_DOEL_VRAAG}</Para>, keepWithNext: true });
  push(ctx, { id: 'wd-jn', node: <JaNeeLine value={wd.aanwezig} /> });
  if (wd.aanwezig) prose(ctx, 'wd-toel', wd.toelichting);

  // Zoekprofiel
  heading(ctx, 'zp-h', 'Zoekprofiel');
  prose(ctx, 'zp-text', body.zoekprofiel.tekst || '—');
}

function kindLabel(kind: string): string {
  if (kind === 'fml') return 'de FML';
  if (kind === 'izp') return 'het IZP';
  if (kind === 'lab') return 'de LAB';
  return '';
}

/* --------------------------- B. Motivatie -------------------------- */

function buildMotivatie(ctx: Ctx) {
  const { body } = ctx;
  push(ctx, { id: 'ch-motivatie', node: <ChapterBand chapter="motivatie" />, pageBreakBefore: true, keepWithNext: true });

  const ih = body.inzet_houding;
  heading(ctx, 'ih-h', 'Inzet en houding werknemer');
  push(ctx, { id: 'ih-q', node: <Para>{VGR_INZET_VRAAG}</Para>, keepWithNext: true });
  push(ctx, { id: 'ih-jn', node: <JaNeeLine value={ih.werkt_mee} /> });
  heading(ctx, 'ih-toel-h', 'Toelichting', true);
  prose(ctx, 'ih-toel', ih.toelichting || '—');

  heading(ctx, 'im-h', 'Interventies gericht op motivatie');
  heading(ctx, 'im-alg-h', 'Algemene toelichting', true);
  prose(ctx, 'im-alg', VGR_MOTIVATIE_ALGEMEEN);
  push(ctx, { id: 'im-lead', node: <Para>{VGR_MOTIVATIE_LEAD}</Para>, keepWithNext: true });
  selectionChecklist(ctx, 'im-checks', body.interventies_motivatie, VGR_MOTIVATIE_OPTIONS);
  interventionBlocks(ctx, 'im', body.interventies_motivatie, VGR_MOTIVATIE_OPTIONS);
}

/* --------------------------- C. Oriëntatie ------------------------- */

function buildOrientatie(ctx: Ctx) {
  const { body } = ctx;
  push(ctx, { id: 'ch-orientatie', node: <ChapterBand chapter="orientatie" />, pageBreakBefore: true, keepWithNext: true });

  heading(ctx, 'or-alg-h', 'Algemene toelichting');
  prose(ctx, 'or-alg', VGR_ORIENTATIE_ALGEMEEN);

  const ko = body.kwaliteiten_onderzoek;
  heading(ctx, 'ko-h', 'Kwaliteiten en vaardigheden onderzoek');
  push(ctx, { id: 'ko-lead', node: <Para>{VGR_KWALITEITEN_LEAD}</Para>, keepWithNext: true });
  selectionChecklist(ctx, 'ko-checks', ko, VGR_KWALITEITEN_OPTIONS);
  interventionBlocks(ctx, 'ko', ko, VGR_KWALITEITEN_OPTIONS, (opt, c) => {
    if (opt.id === 'persoonlijkheidstest') {
      const scores = ko.persoonlijkheid_scores;
      const texts = ko.persoonlijkheid_teksten;
      push(c, {
        id: 'ko-pt-scores',
        node: (
          <div className={`${VGR_BODY_TEXT_CLASS} flex flex-col`}>
            {VGR_PERSONALITY_TRAITS.map((t) => (
              <div key={t.key}>
                {t.label}: {scores[t.key] ? `${scores[t.key]}%` : '…'}
              </div>
            ))}
          </div>
        ),
      });
      for (const t of VGR_PERSONALITY_TRAITS) {
        const txt = texts[t.key].trim();
        if (!txt) continue;
        push(c, {
          id: `ko-pt-${t.key}-h`,
          node: <div className={`${VGR_BODY_TEXT_CLASS} pt-1 font-semibold`}>{t.label}: {scores[t.key] ? `${scores[t.key]}%` : ''}</div>,
          keepWithNext: true,
        });
        prose(c, `ko-pt-${t.key}`, txt);
      }
    }
    if (opt.id === 'beroepen_arbeidsmarkt') {
      const beroepen = ko.beroepen.filter((b) => b.trim());
      if (beroepen.length) {
        push(c, { id: 'ko-ber-list', node: <BulletList items={[...beroepen, 'En vergelijkbaar']} /> });
      }
      prose(c, 'ko-ber-crit-intro', VGR_BEROEPEN_CRITERIA_INTRO);
      push(c, {
        id: 'ko-ber-crit',
        node: (
          <div className="flex flex-col gap-1">
            {VGR_BEROEPEN_CRITERIA.map((cr) => (
              <div key={cr.title}>
                <div className={`${VGR_BODY_TEXT_CLASS} font-semibold`}>{cr.title}</div>
                <Para>{cr.doel}</Para>
              </div>
            ))}
          </div>
        ),
      });
      prose(c, 'ko-ber-crit-outro', VGR_BEROEPEN_CRITERIA_OUTRO);
      heading(c, 'ko-ber-conc-h', 'Conclusie', true);
      prose(c, 'ko-ber-conc', ko.beroepen_conclusie || '—');
    }
  });

  const sc = body.scholing;
  heading(ctx, 'sc-h', 'Scholingsmogelijkheden');
  selectionChecklist(ctx, 'sc-checks', sc, VGR_SCHOLING_OPTIONS);
  heading(ctx, 'sc-alg-h', 'Algemene toelichting', true);
  prose(ctx, 'sc-alg', VGR_SCHOLING_ALGEMEEN);
  interventionBlocks(ctx, 'sc', sc, VGR_SCHOLING_OPTIONS);

  const sv = body.sollicitatie_vaardigheden;
  heading(ctx, 'sv-h', 'Sollicitatie vaardigheden');
  push(ctx, { id: 'sv-lead', node: <Para>{VGR_SOLLICITATIE_LEAD}</Para>, keepWithNext: true });
  selectionChecklist(ctx, 'sv-checks', sv, VGR_SOLLICITATIE_OPTIONS);
  vervolgLine(ctx, 'sv-vervolg', sv);
  interventionBlocks(ctx, 'sv', sv, VGR_SOLLICITATIE_OPTIONS);
}

/* --------------------------- D. Activatie -------------------------- */

function buildActivatie(ctx: Ctx) {
  const { body, data } = ctx;
  push(ctx, { id: 'ch-activatie', node: <ChapterBand chapter="activatie" />, pageBreakBefore: true, keepWithNext: true });

  heading(ctx, 'ac-alg-h', 'Algemene toelichting');
  prose(ctx, 'ac-alg', VGR_ACTIVATIE_ALGEMEEN);

  const ia = body.interventies_activatie;
  heading(ctx, 'ia-h', 'Interventies activatie en arbeidsbemiddeling');
  selectionChecklist(ctx, 'ia-checks', ia, VGR_ACTIVATIE_OPTIONS);
  vervolgLine(ctx, 'ia-vervolg', ia);
  interventionBlocks(ctx, 'ia', ia, VGR_ACTIVATIE_OPTIONS);

  // Perspectief op werk
  heading(ctx, 'pw-h', 'Perspectief op werk');
  heading(ctx, 'pw-alg-h', 'Algemene toelichting', true);
  prose(ctx, 'pw-alg', VGR_PERSPECTIEF_ALGEMEEN);
  heading(ctx, 'pw-pow-h', 'PoW-meter™', true);
  prose(ctx, 'pw-pow', VGR_POW_METER_TEKST);

  heading(ctx, 'pw-chart-h', 'Grafische weergave PoW-meter™');
  push(ctx, {
    id: 'pw-chart',
    node: (
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={VGR_POW_CHART_SRC} alt="PoW-meter" className="mx-auto block h-auto w-full max-w-[560px]" />
        <p className="mt-1 text-[8pt] italic leading-tight text-[#6d2a96]">{VGR_POW_FOOTNOTE}</p>
      </div>
    ),
  });

  const pow = body.pow;
  heading(ctx, 'pw-ins-h', 'Inschaling PoW-meter™');
  const tr = (t: number | null) => (t ? String(t) : '…');
  push(ctx, {
    id: 'pw-ins-table',
    node: (
      <table className="tp2026-html-table w-full table-fixed bg-white text-[10pt] leading-snug text-neutral-900">
        <colgroup>
          <col style={{ width: '38%' }} />
          <col style={{ width: '62%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td className="bg-[#f3efe4] px-2 py-1 align-top font-bold text-[#6d2a96]">{VGR_POW_ROW_LABELS.intake}</td>
            <td className="px-2 py-1 align-top">Werknemer bevond zich in trede {tr(pow.intake_trede)}.</td>
          </tr>
          <tr>
            <td className="bg-[#f3efe4] px-2 py-1 align-top font-bold text-[#6d2a96]">{VGR_POW_ROW_LABELS.huidig}</td>
            <td className="px-2 py-1 align-top">Werknemer bevindt zich in trede {tr(pow.huidige_trede)}.</td>
          </tr>
          <tr>
            <td className="bg-[#f3efe4] px-2 py-1 align-top font-bold text-[#6d2a96]">{VGR_POW_ROW_LABELS.doel}</td>
            <td className="px-2 py-1 align-top">
              {pow.doel_onbekend
                ? 'De verwachting voor de aankomende periode is nog niet vast te stellen.'
                : `Werknemer bevindt zich vermoedelijk in trede ${tr(pow.doel_trede)}.`}
            </td>
          </tr>
          <tr>
            <td className="bg-[#f3efe4] px-2 py-1 align-top font-bold text-[#6d2a96]">{VGR_POW_ROW_LABELS.uren}</td>
            <td className="px-2 py-1 align-top">
              {pow.werkzame_uren.trim() ? `${pow.werkzame_uren.trim()} ${VGR_POW_UREN_SUFFIX}` : `… ${VGR_POW_UREN_SUFFIX}`}
              {pow.werkzame_uren_context.trim() ? ` ${pow.werkzame_uren_context.trim()}` : ''}
            </td>
          </tr>
        </tbody>
      </table>
    ),
  });
  heading(ctx, 'pw-toel-h', 'Toelichting onderbouwing PoW-meter™', true);
  if (pow.history.length === 0) {
    prose(ctx, 'pw-toel-empty', '—');
  }
  pow.history.forEach((m) => {
    push(ctx, {
      id: `pw-m-${m.id}-h`,
      node: <div className={`${VGR_BODY_TEXT_CLASS} pt-0.5 font-semibold`}>Onderbouwing PoW-meter™ – {formatNLDate(m.date)}</div>,
      keepWithNext: true,
    });
    prose(ctx, `pw-m-${m.id}`, m.toelichting || '—');
  });

  // Visie op plaatsbaarheid
  const vp = body.visie_plaatsbaarheid;
  heading(ctx, 'vp-h', 'Visie op plaatsbaarheid');
  if (data.has_ad_report !== false || vp.ad.citaat.trim()) {
    push(ctx, {
      id: 'vp-ad-lead',
      node: <Para>{vgrVisieAdLead(vp.ad.bron_naam || String(data.occupational_doctor_name || ''), formatNLDate(vp.ad.bron_datum || data.ad_report_date))}</Para>,
      keepWithNext: true,
    });
    push(ctx, { id: 'vp-ad-q', node: <Quote text={vp.ad.citaat} /> });
  }
  heading(ctx, 'vp-la-h', VGR_VISIE_LA_TITLE, true);
  const kansenLabel = VGR_KANSEN_OPTIONS.find((o) => o.value === vp.kansen)?.label ?? '';
  prose(ctx, 'vp-kansen', vgrVisieKansenZin(kansenLabel));
  const functies = vp.functies.filter((f) => f.trim());
  if (functies.length) {
    push(ctx, { id: 'vp-fun-lead', node: <Para>{VGR_VISIE_FUNCTIES_LEAD}</Para>, keepWithNext: true });
    push(ctx, { id: 'vp-fun-list', node: <BulletList items={functies} /> });
    push(ctx, { id: 'vp-fun-foot', node: <p className="text-[8pt] italic leading-tight text-[#6d2a96]">{VGR_VISIE_FUNCTIES_FOOTNOTE}</p> });
  }
  heading(ctx, 'vp-conc-h', 'Conclusie', true);
  prose(ctx, 'vp-conc', vp.conclusie || '—');

  // Leernavigator
  const ln = body.leernavigator;
  heading(ctx, 'ln-h', 'Leernavigator');
  prose(ctx, 'ln-intro', VGR_LEERNAVIGATOR_INTRO);
  push(ctx, {
    id: 'ln-grid',
    node: (
      <div className="grid grid-cols-2 gap-x-6">
        <div>
          <div className={`${VGR_BODY_TEXT_CLASS} mb-1 font-bold text-[#6d2a96]`}>{VGR_LEERNAVIGATOR_BASIS_TITLE}</div>
          <div className="flex flex-col gap-0.5">
            {ln.basis.map((item) => (
              <CheckLine key={item.id} checked={item.checked} label={item.label} />
            ))}
          </div>
        </div>
        <div>
          <div className={`${VGR_BODY_TEXT_CLASS} mb-1 font-bold text-[#6d2a96]`}>{VGR_LEERNAVIGATOR_ACTIVERING_TITLE}</div>
          <div className="flex flex-col gap-0.5">
            {ln.activering.map((item) => (
              <CheckLine key={item.id} checked={item.checked} label={leernavigatorLabelWithUren(item)} />
            ))}
          </div>
        </div>
      </div>
    ),
  });
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export function buildVgrBodyAtoms(data: VGRData): VGRBodyAtom[] {
  const ctx: Ctx = { data, body: data.body, atoms: [] };
  buildProfiel(ctx);
  buildMotivatie(ctx);
  buildOrientatie(ctx);
  buildActivatie(ctx);
  return ctx.atoms;
}

/** Split prose atom into paragraph (or sentence) parts for pagination. */
export function splitVgrBodyAtom(atom: VGRBodyAtom): VGRBodyAtom[] | null {
  if (!atom.splitText) return null;
  const { text, render } = atom.splitText;
  let parts = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) parts = text.split(/\n/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) {
    const sentences = text.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
    if (sentences.length < 2) return null;
    const half = Math.ceil(sentences.length / 2);
    parts = [sentences.slice(0, half).join(' '), sentences.slice(half).join(' ')];
  }
  return parts.map((part, i) => ({
    id: `${atom.id}#${i}`,
    node: render(part, i),
    splitText: { text: part, render },
  }));
}

/** Inhoudsopgave entries, filtered to what is actually rendered. */
export function vgrTocEntries(data: VGRData): { chapter: VGRChapterId; entries: string[] }[] {
  const b = data.body;
  return [
    {
      chapter: 'profiel',
      entries: [
        'Vraagstelling',
        'Benutbare mogelijkheden',
        'Praktische belemmeringen',
        'Doelstelling traject',
        'Persoonlijk profiel werknemer',
        'Belastbaarheidsprofiel werknemer',
        'Bijstellingen van het belastbaarheidsprofiel',
        'Wijzigingen doelstelling',
        'Zoekprofiel',
      ],
    },
    { chapter: 'motivatie', entries: ['Inzet en houding werknemer', 'Interventies gericht op motivatie'] },
    {
      chapter: 'orientatie',
      entries: ['Algemene toelichting', 'Kwaliteiten en vaardigheden onderzoek', 'Scholingsmogelijkheden', 'Sollicitatie vaardigheden'],
    },
    {
      chapter: 'activatie',
      entries: [
        'Interventies activatie en arbeidsbemiddeling',
        'Perspectief op werk',
        'Grafische weergave PoW-meter™',
        'Inschaling PoW-meter™',
        'Visie op plaatsbaarheid',
        ...(b.leernavigator.basis.length || b.leernavigator.activering.length ? ['Leernavigator'] : []),
      ],
    },
  ];
}
