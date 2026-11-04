/**
 * Body (03) print model: a flat list of "atoms" that `BodyA4Pages` measures and packs onto A4 pages.
 * Only STATIC + CONDITIONAL template text and adviser prose are emitted — never instructions.
 */
import React from 'react';
import { PrintCheckbox } from '@/components/tp2026/PrintCheckbox';
import { ValentineZLogoBulletRow } from '@/components/tp2026/ValentineZLogoBullet';
import { VGR_PANEL_INNER_GAP_PX } from '@/lib/vgr/panel-layout';
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
  /**
   * Shaded panel id. Consecutive atoms with the same id are wrapped in one box per page,
   * and a split continues the box on the next page.
   */
  panel?: string;
};

/* ------------------------------------------------------------------ */
/* Print primitives                                                    */
/* ------------------------------------------------------------------ */

export const VGR_BODY_TEXT_CLASS = 'text-[10.5pt] leading-[1.42] text-neutral-900';

/** 10pt bold purple label inside a shaded panel (Prognose, Toelichting, doelstelling date). */
const VGR_PANEL_LABEL_CLASS = 'text-[10pt] font-bold leading-[1.42] text-[#782A90]';

/** 10.5pt bold purple Z-mark row (Taal links, beroep criteria titles). */
const VGR_PURPLE_Z_CLASS = 'text-[10.5pt] font-bold leading-[1.42] text-[#782A90]';

/** Italic bijlage reference inside Wekelijks solliciteren. Not a Para: that class forces black text. */
const VGR_BIJLAGE_CLASS = 'whitespace-pre-line text-[10.5pt] italic leading-[1.42] text-[#660066]';

/** Italic purple quote and the small PoW / visie footnotes. */
const VGR_PURPLE_ITALIC_QUOTE_CLASS = 'whitespace-pre-line text-[10.5pt] italic leading-[1.42] text-[#782A90]';
const VGR_FOOTNOTE_CLASS = 'text-[8pt] italic leading-tight text-[#782A90]';

function PanelLabel({ children }: { children: React.ReactNode }) {
  return <div className={VGR_PANEL_LABEL_CLASS}>{children}</div>;
}

function BijlageSentence({ text }: { text: string }) {
  return <p className={VGR_BIJLAGE_CLASS}>{text}</p>;
}

function PurpleItalicQuote({ text }: { text: string }) {
  const t = text.trim() || '—';
  return <p className={VGR_PURPLE_ITALIC_QUOTE_CLASS}>“{t}”</p>;
}

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
    <div className="pt-2.5 text-[11pt] font-bold leading-tight text-[#782A90]">{title}</div>
  );
}

export function Para({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`${VGR_BODY_TEXT_CLASS} whitespace-pre-line ${className}`}>{children}</p>;
}

export function Quote({ text, plain = false }: { text: string; plain?: boolean }) {
  const t = text.trim();
  if (!t) return <Para className={plain ? 'text-neutral-500' : 'italic text-neutral-500'}>“—”</Para>;
  return <Para className={plain ? '' : 'italic'}>“{t}”</Para>;
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

function prose(ctx: Ctx, id: string, text: string, className = '', panel?: string) {
  const t = text.trim();
  if (!t) return;
  push(ctx, {
    id,
    panel,
    node: <Para className={className}>{t}</Para>,
    splitText: { text: t, render: (part) => <Para className={className}>{part}</Para> },
  });
}

function quoteBlock(
  ctx: Ctx,
  id: string,
  kind: 'prognose' | 'conclusie' | 'advies',
  q: VGRQuoteBlock,
  title: string,
  panel: string,
) {
  push(ctx, { id: `${id}-h`, panel, node: <PanelLabel>{title}</PanelLabel>, keepWithNext: true });
  push(ctx, {
    id: `${id}-lead`,
    panel,
    node: <PanelLabel>{vgrQuoteLead(kind, q.bron_naam, formatNLDate(q.bron_datum), q.bron_type)}</PanelLabel>,
    keepWithNext: true,
  });
  push(ctx, { id: `${id}-q`, panel, node: <Quote text={q.citaat} plain /> });
}

function zBulletList(items: string[], className = VGR_BODY_TEXT_CLASS) {
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((item, i) => (
        <ValentineZLogoBulletRow key={`${i}-${item}`} className={className} eagerLoading>
          {item}
        </ValentineZLogoBulletRow>
      ))}
    </div>
  );
}

type InterventionPanels = {
  /** Purple panel label (motivatie) or regular black body text (oriëntatie). */
  itemsLead?: 'purple' | 'body';
  /** Black Z rows, or a per-option choice. Taal uses purple. */
  items?: 'z' | ((opt: VGRInterventionOption) => 'z' | 'z-purple');
  /**
   * Replaces `prose` for one standard paragraph. Return null to keep the black paragraph.
   * Used for the italic bijlage sentence in Wekelijks solliciteren.
   */
  standardParagraph?: (opt: VGRInterventionOption, index: number, text: string) => React.ReactNode | null;
};

function resolvePanels(panels: boolean | InterventionPanels) {
  if (!panels) {
    return {
      on: false,
      itemsLead: 'body' as const,
      items: (_opt: VGRInterventionOption) => 'disc' as const,
      standardParagraph: undefined as InterventionPanels['standardParagraph'],
    };
  }
  if (panels === true) {
    return {
      on: true,
      itemsLead: 'purple' as const,
      items: (_opt: VGRInterventionOption) => 'z' as const,
      standardParagraph: undefined as InterventionPanels['standardParagraph'],
    };
  }
  const items = panels.items ?? 'z';
  return {
    on: true,
    itemsLead: panels.itemsLead ?? 'body',
    items: typeof items === 'function' ? items : (_opt: VGRInterventionOption) => items,
    standardParagraph: panels.standardParagraph,
  };
}

function interventionItemNode(kind: 'disc' | 'z' | 'z-purple', items: string[]) {
  if (kind === 'z-purple') return zBulletList(items, VGR_PURPLE_Z_CLASS);
  if (kind === 'z') return zBulletList(items);
  return <BulletList items={items} />;
}

function interventionBlocks(
  ctx: Ctx,
  idPrefix: string,
  section: VGRInterventionSection,
  options: VGRInterventionOption[],
  extra?: (opt: VGRInterventionOption, ctx: Ctx, panel?: string) => void,
  /**
   * `true` keeps Fase motivatie: a panel per option, purple items lead, black Z rows.
   * An object is Fase oriëntatie: same panels, with a black items lead and optional purple rows.
   */
  panels: boolean | InterventionPanels = false,
) {
  const mode = resolvePanels(panels);
  for (const optId of section.selected) {
    const opt = options.find((o) => o.id === optId);
    if (!opt) continue;
    const block = section.blocks[opt.id] ?? { toelichting: '', items: [], standaardtekst: true };
    const panel = mode.on ? `${idPrefix}-${opt.id}` : undefined;
    if (panel) {
      push(ctx, {
        id: `${idPrefix}-${opt.id}-h`,
        panel,
        node: <PanelLabel>{opt.heading}</PanelLabel>,
        keepWithNext: true,
      });
    } else {
      heading(ctx, `${idPrefix}-${opt.id}-h`, opt.heading, true);
    }
    if (block.standaardtekst && opt.standardText) {
      opt.standardText.forEach((p, i) => {
        const custom = mode.standardParagraph?.(opt, i, p);
        const text = p.trim();
        if (custom && text) {
          push(ctx, {
            id: `${idPrefix}-${opt.id}-std-${i}`,
            panel,
            node: custom,
            splitText: {
              text,
              render: (part) => mode.standardParagraph?.(opt, i, part) ?? <Para>{part}</Para>,
            },
          });
          return;
        }
        prose(ctx, `${idPrefix}-${opt.id}-std-${i}`, p, '', panel);
      });
    }
    if (extra) extra(opt, ctx, panel);
    const items = block.items.length ? block.items : block.standaardtekst ? opt.defaultItems ?? [] : [];
    if (items.length) {
      if (opt.itemsLead) {
        push(ctx, {
          id: `${idPrefix}-${opt.id}-il`,
          panel,
          node: mode.itemsLead === 'purple' ? <PanelLabel>{opt.itemsLead}</PanelLabel> : <Para>{opt.itemsLead}</Para>,
          keepWithNext: true,
        });
      }
      push(ctx, {
        id: `${idPrefix}-${opt.id}-items`,
        panel,
        node: interventionItemNode(mode.items(opt), items),
      });
    }
    prose(ctx, `${idPrefix}-${opt.id}-toel`, block.toelichting, '', panel);
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

function vervolgLine(ctx: Ctx, id: string, section: VGRInterventionSection, panel?: string) {
  const text = section.vervolg_activiteiten.trim();
  if (!text) return;
  const periode = vgrVervolgPeriodeText(section.vervolg_periode_van, section.vervolg_periode_tot);
  const lead = VGR_VERVOLG_LEAD(periode);
  if (panel) {
    push(ctx, { id: `${id}-lead`, panel, node: <PanelLabel>{lead}</PanelLabel>, keepWithNext: true });
    push(ctx, {
      id: `${id}-text`,
      panel,
      node: (
        <ValentineZLogoBulletRow className={`${VGR_BODY_TEXT_CLASS} whitespace-pre-line`} eagerLoading>
          {text}
        </ValentineZLogoBulletRow>
      ),
    });
    return;
  }
  push(ctx, { id: `${id}-lead`, node: <Para className="font-semibold">{lead}</Para>, keepWithNext: true });
  prose(ctx, `${id}-text`, text);
}

/* --------------------------- A. Profiel ---------------------------- */

function buildProfiel(ctx: Ctx) {
  const { body, data } = ctx;
  const periode = vgrPeriodeText(data);
  push(ctx, {
    id: 'periode',
    pageBreakBefore: true,
    keepWithNext: true,
    node: (
      <div className="text-[11pt] font-bold leading-tight text-[#782A90]">
        Voortgangsrapportage periode: {periode || '…'}
      </div>
    ),
  });
  push(ctx, { id: 'ch-profiel', node: <ChapterBand chapter="profiel" />, keepWithNext: true });

  heading(ctx, 'vraag-h', 'Vraagstelling');
  push(ctx, {
    id: 'vraag-list',
    panel: 'vraag',
    node: (
      <div className="flex flex-col gap-3">
        {VGR_VRAAGSTELLING.map((item) => (
          <ValentineZLogoBulletRow key={item} className={VGR_BODY_TEXT_CLASS} eagerLoading>
            {item}
          </ValentineZLogoBulletRow>
        ))}
      </div>
    ),
  });

  // Benutbare mogelijkheden — Ja/Nee stays outside; prognose, conclusie and advies share one panel.
  const bm = body.benutbare_mogelijkheden;
  heading(ctx, 'bm-h', 'Benutbare mogelijkheden');
  push(ctx, { id: 'bm-q', node: <Para>{VGR_BENUTBARE_VRAAG}</Para>, keepWithNext: true });
  push(ctx, { id: 'bm-jn', node: <JaNeeLine value={bm.heeft} /> });
  quoteBlock(ctx, 'bm-prog', 'prognose', bm.prognose, 'Prognose', 'bm-quotes');
  if (bm.eerdere_prognose.trim()) {
    push(ctx, {
      id: 'bm-eerder-lead',
      panel: 'bm-quotes',
      node: <PanelLabel>Eerdere prognose (vorige rapportage):</PanelLabel>,
      keepWithNext: true,
    });
    push(ctx, { id: 'bm-eerder', panel: 'bm-quotes', node: <Quote text={bm.eerdere_prognose} plain /> });
  }
  quoteBlock(ctx, 'bm-conc', 'conclusie', bm.conclusie, 'Conclusie', 'bm-quotes');
  quoteBlock(ctx, 'bm-adv', 'advies', bm.advies, 'Advies', 'bm-quotes');

  // Praktische belemmeringen
  const pb = body.praktische_belemmeringen;
  heading(ctx, 'pb-h', 'Praktische belemmeringen');
  push(ctx, { id: 'pb-q', node: <Para>{VGR_PRAKTISCHE_VRAAG}</Para>, keepWithNext: true });
  push(ctx, { id: 'pb-jn', node: <JaNeeLine value={pb.aanwezig} /> });
  if (pb.toelichting.trim()) {
    push(ctx, {
      id: 'pb-toel-h',
      panel: 'pb-toel',
      node: <PanelLabel>Toelichting</PanelLabel>,
      keepWithNext: true,
    });
    prose(ctx, 'pb-toel', pb.toelichting, '', 'pb-toel');
  }

  // Doelstelling traject — date line, wijziging sentence and narrative share one panel.
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
    panel: 'dt',
    node: (
      <div className="flex flex-col" style={{ rowGap: VGR_PANEL_INNER_GAP_PX }}>
        {history.map((h) => (
          <div key={h.id} className="flex flex-col" style={{ rowGap: VGR_PANEL_INNER_GAP_PX }}>
            <PanelLabel>Doelstelling {formatNLDate(h.date)}</PanelLabel>
            <Para>{vgrDoelstellingWijzigingZin(h.changed, trajectDoelLabel(h.from), trajectDoelLabel(h.to))}</Para>
            {h.toelichting.trim() ? <Para>{h.toelichting.trim()}</Para> : null}
          </div>
        ))}
      </div>
    ),
  });
  prose(ctx, 'dt-toel', dt.toelichting, '', 'dt');

  // Persoonlijk profiel
  heading(ctx, 'pp-h', 'Persoonlijk profiel werknemer');
  prose(ctx, 'pp-text', body.persoonlijk_profiel.tekst || '—', '', 'pp');

  // Belastbaarheidsprofiel
  const bp = body.belastbaarheidsprofiel;
  heading(ctx, 'bp-h', 'Belastbaarheidsprofiel werknemer');
  push(ctx, {
    id: 'bp-intro',
    panel: 'bp',
    node: <PanelLabel>{vgrBelastbaarheidIntro(kindLabel(bp.kind), formatNLDate(bp.datum), bp.auteur)}</PanelLabel>,
    keepWithNext: true,
  });
  push(ctx, {
    id: 'bp-rubrieken',
    panel: 'bp',
    node: (
      <div className="flex flex-col gap-0.5">
        {VGR_FML_RUBRIEKEN.map((r) => (
          <CheckLine key={r} checked={bp.rubrieken.includes(r)} label={r} />
        ))}
      </div>
    ),
  });
  prose(ctx, 'bp-toel', bp.toelichting, '', 'bp');

  // Bijstellingen — Ja/Nee stays outside; the revision text shares one panel.
  const bb = body.bijstellingen_belastbaarheid;
  heading(ctx, 'bb-h', 'Bijstellingen van het belastbaarheidsprofiel');
  push(ctx, { id: 'bb-q', node: <Para>{VGR_BIJSTELLING_VRAAG}</Para>, keepWithNext: true });
  push(ctx, { id: 'bb-jn', node: <JaNeeLine value={bb.aanwezig} /> });
  if (bb.aanwezig && bb.revisions.length) {
    bb.revisions.forEach((rev) => {
      push(ctx, {
        id: `bb-rev-${rev.id}-intro`,
        panel: 'bb',
        node: <PanelLabel>{vgrBijstellingIntro(kindLabel(rev.kind), rev.auteur, formatNLDate(rev.date))}</PanelLabel>,
        keepWithNext: true,
      });
      push(ctx, {
        id: `bb-rev-${rev.id}-rub`,
        panel: 'bb',
        node: (
          <div className="flex flex-col gap-0.5">
            {VGR_FML_RUBRIEKEN.map((r) => (
              <CheckLine key={r} checked={rev.rubrieken.includes(r)} label={r} />
            ))}
          </div>
        ),
      });
      if (rev.toelichting.trim()) {
        push(ctx, {
          id: `bb-rev-${rev.id}-toel-h`,
          panel: 'bb',
          node: <PanelLabel>Toelichting</PanelLabel>,
          keepWithNext: true,
        });
        prose(ctx, `bb-rev-${rev.id}-toel`, rev.toelichting, '', 'bb');
      }
    });
  } else {
    prose(ctx, 'bb-geen', bb.toelichting_geen, '', 'bb');
  }

  // Wijzigingen doelstelling
  const wd = body.wijzigingen_doelstelling;
  heading(ctx, 'wd-h', 'Wijzigingen doelstelling');
  push(ctx, { id: 'wd-q', node: <Para>{VGR_WIJZIGING_DOEL_VRAAG}</Para>, keepWithNext: true });
  push(ctx, { id: 'wd-jn', node: <JaNeeLine value={wd.aanwezig} /> });
  if (wd.aanwezig) prose(ctx, 'wd-toel', wd.toelichting, '', 'wd');

  // Zoekprofiel
  heading(ctx, 'zp-h', 'Zoekprofiel');
  prose(ctx, 'zp-text', body.zoekprofiel.tekst || '—', '', 'zp');
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
  push(ctx, {
    id: 'ih-toel-h',
    panel: 'ih-toel',
    node: <PanelLabel>Toelichting</PanelLabel>,
    keepWithNext: true,
  });
  prose(ctx, 'ih-toel', ih.toelichting || '—', '', 'ih-toel');

  heading(ctx, 'im-h', 'Interventies gericht op motivatie');
  push(ctx, {
    id: 'im-alg-h',
    panel: 'im-alg',
    node: <PanelLabel>Algemene toelichting</PanelLabel>,
    keepWithNext: true,
  });
  prose(ctx, 'im-alg', VGR_MOTIVATIE_ALGEMEEN, '', 'im-alg');
  push(ctx, { id: 'im-lead', node: <PanelLabel>{VGR_MOTIVATIE_LEAD}</PanelLabel>, keepWithNext: true });
  selectionChecklist(ctx, 'im-checks', body.interventies_motivatie, VGR_MOTIVATIE_OPTIONS);
  interventionBlocks(ctx, 'im', body.interventies_motivatie, VGR_MOTIVATIE_OPTIONS, undefined, true);
}

/* --------------------------- C. Oriëntatie ------------------------- */

function buildOrientatie(ctx: Ctx) {
  const { body } = ctx;
  push(ctx, { id: 'ch-orientatie', node: <ChapterBand chapter="orientatie" />, pageBreakBefore: true, keepWithNext: true });

  push(ctx, {
    id: 'or-alg-h',
    panel: 'or-alg',
    node: <PanelLabel>Algemene toelichting</PanelLabel>,
    keepWithNext: true,
  });
  prose(ctx, 'or-alg', VGR_ORIENTATIE_ALGEMEEN, '', 'or-alg');

  const ko = body.kwaliteiten_onderzoek;
  heading(ctx, 'ko-h', 'Kwaliteiten en vaardigheden onderzoek');
  push(ctx, { id: 'ko-lead', node: <Para>{VGR_KWALITEITEN_LEAD}</Para>, keepWithNext: true });
  selectionChecklist(ctx, 'ko-checks', ko, VGR_KWALITEITEN_OPTIONS);
  interventionBlocks(ctx, 'ko', ko, VGR_KWALITEITEN_OPTIONS, (opt, c, panel) => {
    if (opt.id === 'persoonlijkheidstest') {
      const scores = ko.persoonlijkheid_scores;
      const texts = ko.persoonlijkheid_teksten;
      push(c, {
        id: 'ko-pt-scores',
        panel,
        node: zBulletList(
          VGR_PERSONALITY_TRAITS.map((t) => `${t.label}: ${scores[t.key] ? `${scores[t.key]}%` : '…'}`),
        ),
      });
      for (const t of VGR_PERSONALITY_TRAITS) {
        const txt = texts[t.key].trim();
        if (!txt) continue;
        const pct = scores[t.key] ? `${scores[t.key]}%` : '';
        push(c, {
          id: `ko-pt-${t.key}-h`,
          panel,
          node: <PanelLabel>{t.label}: {pct}</PanelLabel>,
          keepWithNext: true,
        });
        prose(c, `ko-pt-${t.key}`, txt, '', panel);
      }
    }
    if (opt.id === 'beroepen_arbeidsmarkt') {
      const beroepen = ko.beroepen.filter((b) => b.trim());
      if (beroepen.length) {
        push(c, { id: 'ko-ber-list', panel, node: zBulletList([...beroepen, 'En vergelijkbaar']) });
      }
      prose(c, 'ko-ber-crit-intro', VGR_BEROEPEN_CRITERIA_INTRO, '', panel);
      push(c, {
        id: 'ko-ber-crit',
        panel,
        node: (
          <div className="flex flex-col gap-1.5">
            {VGR_BEROEPEN_CRITERIA.map((cr) => (
              <ValentineZLogoBulletRow key={cr.title} eagerLoading>
                <span className={`block ${VGR_PURPLE_Z_CLASS}`}>{cr.title}</span>
                <span className={`block font-normal ${VGR_BODY_TEXT_CLASS}`}>{cr.doel}</span>
              </ValentineZLogoBulletRow>
            ))}
          </div>
        ),
      });
      prose(c, 'ko-ber-crit-outro', VGR_BEROEPEN_CRITERIA_OUTRO, '', panel);
      push(c, {
        id: 'ko-ber-conc-h',
        panel,
        node: <PanelLabel>Conclusie</PanelLabel>,
        keepWithNext: true,
      });
      prose(c, 'ko-ber-conc', ko.beroepen_conclusie || '—', '', panel);
    }
  }, { itemsLead: 'body', items: 'z' });

  const sc = body.scholing;
  heading(ctx, 'sc-h', 'Scholingsmogelijkheden');
  selectionChecklist(ctx, 'sc-checks', sc, VGR_SCHOLING_OPTIONS);
  push(ctx, {
    id: 'sc-alg-h',
    panel: 'sc-alg',
    node: <PanelLabel>Algemene toelichting</PanelLabel>,
    keepWithNext: true,
  });
  prose(ctx, 'sc-alg', VGR_SCHOLING_ALGEMEEN, '', 'sc-alg');
  interventionBlocks(ctx, 'sc', sc, VGR_SCHOLING_OPTIONS, undefined, {
    itemsLead: 'body',
    items: (opt) => (opt.id === 'taal' ? 'z-purple' : 'z'),
  });

  const sv = body.sollicitatie_vaardigheden;
  heading(ctx, 'sv-h', 'Sollicitatie vaardigheden');
  push(ctx, { id: 'sv-lead', node: <Para>{VGR_SOLLICITATIE_LEAD}</Para>, keepWithNext: true });
  selectionChecklist(ctx, 'sv-checks', sv, VGR_SOLLICITATIE_OPTIONS);
  vervolgLine(ctx, 'sv-vervolg', sv, 'sv-vervolg');
  interventionBlocks(ctx, 'sv', sv, VGR_SOLLICITATIE_OPTIONS, undefined, { itemsLead: 'body', items: 'z' });
}

/* --------------------------- D. Activatie -------------------------- */

function buildActivatie(ctx: Ctx) {
  const { body, data } = ctx;
  push(ctx, { id: 'ch-activatie', node: <ChapterBand chapter="activatie" />, pageBreakBefore: true, keepWithNext: true });

  push(ctx, {
    id: 'ac-alg-h',
    panel: 'ac-alg',
    node: <PanelLabel>Algemene toelichting</PanelLabel>,
    keepWithNext: true,
  });
  prose(ctx, 'ac-alg', VGR_ACTIVATIE_ALGEMEEN, '', 'ac-alg');

  const ia = body.interventies_activatie;
  heading(ctx, 'ia-h', 'Interventies activatie en arbeidsbemiddeling');
  selectionChecklist(ctx, 'ia-checks', ia, VGR_ACTIVATIE_OPTIONS);
  vervolgLine(ctx, 'ia-vervolg', ia, 'ia-vervolg');
  interventionBlocks(ctx, 'ia', ia, VGR_ACTIVATIE_OPTIONS, undefined, {
    itemsLead: 'body',
    items: 'z',
    standardParagraph: (opt, index, text) =>
      opt.id === 'wekelijks_solliciteren' && index === 1 ? <BijlageSentence text={text} /> : null,
  });

  // Perspectief op werk
  heading(ctx, 'pw-h', 'Perspectief op werk');
  push(ctx, {
    id: 'pw-alg-h',
    panel: 'pw-alg',
    node: <PanelLabel>Algemene toelichting</PanelLabel>,
    keepWithNext: true,
  });
  prose(ctx, 'pw-alg', VGR_PERSPECTIEF_ALGEMEEN, '', 'pw-alg');
  push(ctx, {
    id: 'pw-pow-h',
    panel: 'pw-pow',
    node: <PanelLabel>PoW-meter™</PanelLabel>,
    keepWithNext: true,
  });
  prose(ctx, 'pw-pow', VGR_POW_METER_TEKST, '', 'pw-pow');

  heading(ctx, 'pw-chart-h', 'Grafische weergave PoW-meter™');
  push(ctx, {
    id: 'pw-chart',
    node: (
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={VGR_POW_CHART_SRC} alt="PoW-meter" className="mx-auto block h-auto w-full max-w-[560px]" />
        <p className={`mt-1 ${VGR_FOOTNOTE_CLASS}`}>{VGR_POW_FOOTNOTE}</p>
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
            <td className="bg-[#f3efe4] px-2 py-1 align-top font-bold text-[#782A90]">{VGR_POW_ROW_LABELS.intake}</td>
            <td className="px-2 py-1 align-top">Werknemer bevond zich in trede {tr(pow.intake_trede)}.</td>
          </tr>
          <tr>
            <td className="bg-[#f3efe4] px-2 py-1 align-top font-bold text-[#782A90]">{VGR_POW_ROW_LABELS.huidig}</td>
            <td className="px-2 py-1 align-top">Werknemer bevindt zich in trede {tr(pow.huidige_trede)}.</td>
          </tr>
          <tr>
            <td className="bg-[#f3efe4] px-2 py-1 align-top font-bold text-[#782A90]">{VGR_POW_ROW_LABELS.doel}</td>
            <td className="px-2 py-1 align-top">
              {pow.doel_onbekend
                ? 'De verwachting voor de aankomende periode is nog niet vast te stellen.'
                : `Werknemer bevindt zich vermoedelijk in trede ${tr(pow.doel_trede)}.`}
            </td>
          </tr>
          <tr>
            <td className="bg-[#f3efe4] px-2 py-1 align-top font-bold text-[#782A90]">{VGR_POW_ROW_LABELS.uren}</td>
            <td className="px-2 py-1 align-top">
              {pow.werkzame_uren.trim() ? `${pow.werkzame_uren.trim()} ${VGR_POW_UREN_SUFFIX}` : `… ${VGR_POW_UREN_SUFFIX}`}
              {pow.werkzame_uren_context.trim() ? ` ${pow.werkzame_uren_context.trim()}` : ''}
            </td>
          </tr>
        </tbody>
      </table>
    ),
  });
  push(ctx, {
    id: 'pw-toel-h',
    panel: 'pw-toel',
    node: <PanelLabel>Toelichting onderbouwing PoW-meter™</PanelLabel>,
    keepWithNext: true,
  });
  if (pow.history.length === 0) {
    prose(ctx, 'pw-toel-empty', '—', '', 'pw-toel');
  }
  pow.history.forEach((m) => {
    push(ctx, {
      id: `pw-m-${m.id}-h`,
      panel: 'pw-toel',
      node: <div className={`${VGR_BODY_TEXT_CLASS} font-bold`}>Onderbouwing PoW-meter™ – {formatNLDate(m.date)}</div>,
      keepWithNext: true,
    });
    prose(ctx, `pw-m-${m.id}`, m.toelichting || '—', '', 'pw-toel');
  });

  // Visie op plaatsbaarheid
  const vp = body.visie_plaatsbaarheid;
  const visiePanel = 'vp';
  heading(ctx, 'vp-h', 'Visie op plaatsbaarheid');
  if (data.has_ad_report !== false || vp.ad.citaat.trim()) {
    push(ctx, {
      id: 'vp-ad-lead',
      panel: visiePanel,
      node: (
        <PanelLabel>
          {vgrVisieAdLead(vp.ad.bron_naam || String(data.occupational_doctor_name || ''), formatNLDate(vp.ad.bron_datum || data.ad_report_date))}
        </PanelLabel>
      ),
      keepWithNext: true,
    });
    push(ctx, { id: 'vp-ad-q', panel: visiePanel, node: <PurpleItalicQuote text={vp.ad.citaat} /> });
  }
  push(ctx, {
    id: 'vp-la-h',
    panel: visiePanel,
    node: <PanelLabel>{VGR_VISIE_LA_TITLE}</PanelLabel>,
    keepWithNext: true,
  });
  const kansenLabel = VGR_KANSEN_OPTIONS.find((o) => o.value === vp.kansen)?.label ?? '';
  prose(ctx, 'vp-kansen', vgrVisieKansenZin(kansenLabel), '', visiePanel);
  const functies = vp.functies.filter((f) => f.trim());
  if (functies.length) {
    push(ctx, { id: 'vp-fun-lead', panel: visiePanel, node: <Para>{VGR_VISIE_FUNCTIES_LEAD}</Para>, keepWithNext: true });
    push(ctx, { id: 'vp-fun-list', panel: visiePanel, node: zBulletList(functies) });
    push(ctx, {
      id: 'vp-fun-foot',
      panel: visiePanel,
      node: <p className={VGR_FOOTNOTE_CLASS}>{VGR_VISIE_FUNCTIES_FOOTNOTE}</p>,
    });
  }
  push(ctx, {
    id: 'vp-conc-h',
    panel: visiePanel,
    node: <PanelLabel>Conclusie</PanelLabel>,
    keepWithNext: true,
  });
  prose(ctx, 'vp-conc', vp.conclusie || '—', '', visiePanel);

  // Leernavigator
  const ln = body.leernavigator;
  heading(ctx, 'ln-h', 'Leernavigator');
  prose(ctx, 'ln-intro', VGR_LEERNAVIGATOR_INTRO);
  push(ctx, {
    id: 'ln-grid',
    node: (
      <div>
        <div className="grid grid-cols-2 gap-x-6 bg-[#F3EFE4] px-2 py-1">
          <div className={VGR_PANEL_LABEL_CLASS}>{VGR_LEERNAVIGATOR_BASIS_TITLE}</div>
          <div className={VGR_PANEL_LABEL_CLASS}>{VGR_LEERNAVIGATOR_ACTIVERING_TITLE}</div>
        </div>
        <div className="grid grid-cols-2 gap-x-6 pt-1">
          <div className="flex flex-col gap-0.5">
            {ln.basis.map((item) => (
              <CheckLine key={item.id} checked={item.checked} label={item.label} />
            ))}
          </div>
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
    panel: atom.panel,
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
