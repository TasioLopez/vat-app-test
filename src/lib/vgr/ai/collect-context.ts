import type { SupabaseClient } from '@supabase/supabase-js';
import { extractStoragePath } from '@/lib/document-analysis/storage';
import { normalizeForAnalysis } from '@/lib/document-analysis/normalizeForAnalysis';
import type { MultiFilePdfInput } from '@/lib/document-analysis/runStructuredExtraction';
import { getEmployeeDocLabel } from '@/lib/documents/employee-doc-types';
import {
  VGR_ACTIVATIE_OPTIONS,
  VGR_KWALITEITEN_OPTIONS,
  VGR_MOTIVATIE_OPTIONS,
  VGR_SCHOLING_OPTIONS,
  VGR_SOLLICITATIE_OPTIONS,
  findInterventionOption,
  leernavigatorLabelWithUren,
} from '@/lib/vgr/content';

const ALL_INTERVENTION_OPTIONS = [
  ...VGR_MOTIVATIE_OPTIONS,
  ...VGR_KWALITEITEN_OPTIONS,
  ...VGR_SCHOLING_OPTIONS,
  ...VGR_SOLLICITATIE_OPTIONS,
  ...VGR_ACTIVATIE_OPTIONS,
];
import { vgrPeriodeText } from '@/lib/vgr/period';
import { formatNLDate, trajectDoelLabel, type VGRBody, type VGRData } from '@/lib/vgr/schema';
import { applicationLine, groupApplicationsByMonth } from '@/lib/vgr/applications';
import { VGR_AI_SECTIONS, type VGRAiSectionId } from './sections';

export type VGRSourceDocument = {
  id: string;
  type: string;
  name: string;
  url: string;
  uploaded_at: string | null;
};

export type VGRAiContext = {
  /** Plain-text dossier context passed as the user message. */
  text: string;
  /** PDFs to attach (already normalized). */
  files: MultiFilePdfInput[];
  /** Human-readable list of what was used. */
  sources: string[];
  /** Conflicts detected during preflight (also surfaced to the adviser). */
  conflicts: string[];
};

const MAX_FILES = 6;
const MAX_PRIOR_SECTION_CHARS = 3500;

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

export async function listVgrSourceDocuments(supabase: SupabaseClient, employeeId: string): Promise<VGRSourceDocument[]> {
  const { data } = await supabase
    .from('documents')
    .select('id, type, name, url, uploaded_at')
    .eq('employee_id', employeeId)
    .order('uploaded_at', { ascending: false });
  return ((data ?? []) as VGRSourceDocument[]).filter((d) => d.url && d.type !== 'vgr' && d.type !== 'tp' && !String(d.type).startsWith('tp_'));
}

/**
 * Pick which documents to attach for a section: the adviser's explicit selection first
 * (vgr_meta.source_document_ids), ordered by the section's preferred types; capped.
 */
export function selectDocumentsForSection(
  docs: VGRSourceDocument[],
  selectedIds: string[],
  sectionId: VGRAiSectionId
): VGRSourceDocument[] {
  const preferred = VGR_AI_SECTIONS[sectionId].preferredDocTypes;
  const rank = (d: VGRSourceDocument) => {
    const i = preferred.indexOf(d.type);
    return i === -1 ? preferred.length : i;
  };
  const selected = selectedIds.length ? docs.filter((d) => selectedIds.includes(d.id)) : docs.filter((d) => preferred.includes(d.type));
  return [...selected].sort((a, b) => rank(a) - rank(b) || String(b.uploaded_at ?? '').localeCompare(String(a.uploaded_at ?? ''))).slice(0, MAX_FILES);
}

export async function loadDocumentsAsPdfInputs(
  supabase: SupabaseClient,
  docs: VGRSourceDocument[]
): Promise<{ files: MultiFilePdfInput[]; labels: string[]; skipped: string[] }> {
  const files: MultiFilePdfInput[] = [];
  const labels: string[] = [];
  const skipped: string[] = [];
  for (const doc of docs) {
    const path = extractStoragePath(doc.url || '');
    if (!path) {
      skipped.push(doc.name || doc.id);
      continue;
    }
    const { data: file } = await supabase.storage.from('documents').download(path);
    if (!file) {
      skipped.push(doc.name || doc.id);
      continue;
    }
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const { pdfBuffer, analysisFilename } = await normalizeForAnalysis(buffer, doc.name || path);
      const label = `${getEmployeeDocLabel(doc.type)}: ${doc.name || analysisFilename}${doc.uploaded_at ? ` (${formatNLDate(doc.uploaded_at)})` : ''}`;
      files.push({ pdfBuffer, analysisFilename, label });
      labels.push(label);
    } catch (e) {
      console.warn('VGR AI: skip document', doc.name, e);
      skipped.push(doc.name || doc.id);
    }
  }
  return { files, labels, skipped };
}

/* ------------------------------------------------------------------ */
/* Dossier text                                                        */
/* ------------------------------------------------------------------ */

const v = (x: unknown) => String(x ?? '').trim();
const line = (label: string, value: unknown) => (v(value) ? `${label}: ${v(value)}` : '');
const clip = (s: string, n = MAX_PRIOR_SECTION_CHARS) => (s.length > n ? `${s.slice(0, n)}…` : s);

function gegevensBlock(data: VGRData): string {
  return [
    '## Gegevens traject (uit de rapportage, geen namen gebruiken in de tekst)',
    line('Rapportageperiode', vgrPeriodeText(data)),
    line('Datum rapportage', formatNLDate(data.vgr_meta.report_date)),
    line('Rapportage versie', `${data.vgr_meta.version}${data.vgr_meta.prior_vgr_instance_id ? ' (vervolgrapportage)' : ' (eerste rapportage)'}`),
    line('Eerste ziektedag', formatNLDate(data.first_sick_day)),
    line('Start traject spoor 2', formatNLDate(data.tp_start_date)),
    line('Einde traject spoor 2', formatNLDate(data.tp_end_date)),
    line('Laatste functie', data.current_job || data.last_function),
    line('Contracturen', data.contract_hours),
    line('Opleidingsniveau', data.education_level),
    line('Computervaardigheden', data.computer_skills),
    line('Rijbewijs', data.has_drivers_license === true ? 'ja' : data.has_drivers_license === false ? 'nee' : ''),
    line('Eigen vervoer', data.has_transport === true ? 'ja' : data.has_transport === false ? 'nee' : ''),
    line('Taalniveau Nederlands', data.dutch_speaking || data.language_level),
    line('FML/IZP/LAB datum', formatNLDate(data.fml_izp_lab_date)),
    line('AD-rapport datum', formatNLDate(data.ad_report_date)),
    line('Bedrijfsarts', data.occupational_doctor_name),
    line('Arbeidsdeskundige', data.ad_name),
  ]
    .filter(Boolean)
    .join('\n');
}

function interventionSummary(sec: VGRBody['interventies_motivatie'], label: string): string {
  if (!sec.selected.length) return `${label}: geen interventies aangevinkt`;
  const parts = sec.selected.map((id) => {
    const opt = findInterventionOption(ALL_INTERVENTION_OPTIONS, id);
    const b = sec.blocks[id];
    const t = b?.toelichting?.trim();
    return `- ${opt?.heading ?? id}${t ? `: ${clip(t, 700)}` : ''}`;
  });
  return `${label}:\n${parts.join('\n')}`;
}

function currentBodyBlock(data: VGRData, sectionId: VGRAiSectionId): string {
  const b = data.body;
  const parts: string[] = ['## Huidige inhoud van de rapportage (actualiseren, niet negeren)'];
  parts.push(line('Doelstelling bij intake', trajectDoelLabel(b.doelstelling_traject.bij_intake)));
  parts.push(line('Huidige doelstelling', trajectDoelLabel(b.doelstelling_traject.huidige)));
  if (b.doelstelling_traject.history.some((h) => h.changed)) {
    parts.push(
      'Doelwijzigingen: ' +
        b.doelstelling_traject.history
          .filter((h) => h.changed)
          .map((h) => `${formatNLDate(h.date)}: ${trajectDoelLabel(h.from)} → ${trajectDoelLabel(h.to)}${h.toelichting ? ` (${h.toelichting})` : ''}`)
          .join('; ')
    );
  }
  parts.push(line('Benutbare mogelijkheden', b.benutbare_mogelijkheden.heeft === null ? '' : b.benutbare_mogelijkheden.heeft ? 'ja' : 'nee'));
  if (b.benutbare_mogelijkheden.prognose.citaat) parts.push(`Prognose bedrijfsarts (${b.benutbare_mogelijkheden.prognose.bron_naam}, ${formatNLDate(b.benutbare_mogelijkheden.prognose.bron_datum)}): "${clip(b.benutbare_mogelijkheden.prognose.citaat, 800)}"`);
  if (b.benutbare_mogelijkheden.eerdere_prognose) parts.push(`Eerdere prognose (TP): "${clip(b.benutbare_mogelijkheden.eerdere_prognose, 600)}"`);
  parts.push(line('Praktische belemmeringen', b.praktische_belemmeringen.aanwezig === null ? '' : b.praktische_belemmeringen.aanwezig ? `ja — ${clip(b.praktische_belemmeringen.toelichting, 800)}` : 'nee'));
  parts.push(line('Belastbaarheidsprofiel', `${b.belastbaarheidsprofiel.kind.toUpperCase()} ${formatNLDate(b.belastbaarheidsprofiel.datum)} ${b.belastbaarheidsprofiel.auteur}; rubrieken: ${b.belastbaarheidsprofiel.rubrieken.join(', ') || '—'}`));
  if (b.belastbaarheidsprofiel.toelichting) parts.push(`Toelichting belastbaarheid: ${clip(b.belastbaarheidsprofiel.toelichting, 1200)}`);
  if (b.bijstellingen_belastbaarheid.revisions.length) {
    parts.push(
      'Bijstellingen belastbaarheid: ' +
        b.bijstellingen_belastbaarheid.revisions.map((r) => `${formatNLDate(r.date)} (${r.kind.toUpperCase()}, ${r.auteur}): ${clip(r.toelichting, 500)}`).join(' | ')
    );
  }
  if (sectionId !== 'persoonlijk_profiel' && b.persoonlijk_profiel.tekst) parts.push(`Persoonlijk profiel: ${clip(b.persoonlijk_profiel.tekst, 1500)}`);
  if (sectionId !== 'zoekprofiel' && b.zoekprofiel.tekst) parts.push(`Zoekprofiel: ${clip(b.zoekprofiel.tekst, 1500)}`);
  parts.push(line('Werkt mee aan traject', b.inzet_houding.werkt_mee === null ? '' : b.inzet_houding.werkt_mee ? 'ja' : 'nee'));
  if (b.inzet_houding.toelichting && sectionId !== 'inzet_houding') parts.push(`Inzet en houding: ${clip(b.inzet_houding.toelichting, 800)}`);
  parts.push(interventionSummary(b.interventies_motivatie, 'Interventies motivatie'));
  parts.push(interventionSummary(b.kwaliteiten_onderzoek, 'Kwaliteiten/vaardigheden onderzoek'));
  parts.push(interventionSummary(b.scholing, 'Scholing'));
  parts.push(interventionSummary(b.sollicitatie_vaardigheden, 'Sollicitatievaardigheden'));
  parts.push(interventionSummary(b.interventies_activatie, 'Activatie en arbeidsbemiddeling'));
  parts.push(
    `PoW-meter: intake trede ${b.pow.intake_trede ?? '—'}, huidige trede ${b.pow.huidige_trede ?? '—'}, doel ${b.pow.doel_onbekend ? 'nog niet vast te stellen' : (b.pow.doel_trede ?? '—')}; werkzame uren ${b.pow.werkzame_uren || '—'} ${b.pow.werkzame_uren_context}`
  );
  for (const m of b.pow.history.slice(0, 3)) if (m.toelichting) parts.push(`PoW onderbouwing ${formatNLDate(m.date)}: ${clip(m.toelichting, 1200)}`);
  if (b.visie_plaatsbaarheid.ad.citaat) parts.push(`AD-advies (${b.visie_plaatsbaarheid.ad.bron_naam}, ${formatNLDate(b.visie_plaatsbaarheid.ad.bron_datum)}): "${clip(b.visie_plaatsbaarheid.ad.citaat, 800)}"`);
  parts.push(line('Kansen vrije arbeidsmarkt', b.visie_plaatsbaarheid.kansen));
  if (b.visie_plaatsbaarheid.functies.length) parts.push(`Mogelijk passende functies: ${b.visie_plaatsbaarheid.functies.join(', ')}`);
  if (b.visie_plaatsbaarheid.conclusie && sectionId !== 'visie_plaatsbaarheid') parts.push(`Conclusie plaatsbaarheid: ${clip(b.visie_plaatsbaarheid.conclusie, 800)}`);
  const ln = [...b.leernavigator.basis, ...b.leernavigator.activering].filter((i) => i.checked).map(leernavigatorLabelWithUren);
  if (ln.length) parts.push(`Leernavigator (afgevinkt): ${ln.join(' | ')}`);
  return parts.filter(Boolean).join('\n');
}

function planningBlock(data: VGRData): string {
  if (!data.planning_phases.length) return '';
  const legend: Record<string, string> = { G: 'gerealiseerd', P: 'gepland', N: 'niet van toepassing', U: 'uitgesteld' };
  return [
    '## Bijlage 1 — voortgang en planning',
    ...data.planning_phases.map(
      (p) =>
        `${p.title} (${formatNLDate(p.period_from)} – ${formatNLDate(p.period_to)}) doel: ${p.goal || '—'}\n` +
        p.activities.map((a) => `  - ${a.name} [${legend[a.status] ?? a.status}]${a.note ? ` — ${a.note}` : ''}`).join('\n')
    ),
  ].join('\n');
}

function applicationsBlock(data: VGRData): string {
  if (!data.applications.length) return '## Bijlage 2 — sollicitaties\nGeen sollicitaties geregistreerd in deze periode. Schrijf NIET dat er is gesolliciteerd.';
  const groups = groupApplicationsByMonth(data.applications);
  return [
    '## Bijlage 2 — sollicitaties (enige bron voor sollicitatie-activiteiten)',
    ...groups.map((g) => `${g.monthKey}:\n${g.items.map((a) => `  - ${formatNLDate(a.date)}: ${applicationLine(a)}${a.note ? ` — ${a.note}` : ''}`).join('\n')}`),
  ].join('\n');
}

function priorReportBlock(prior: VGRData | null, sectionId: VGRAiSectionId): string {
  if (!prior) return '';
  const pb = prior.body;
  const pick: Partial<Record<VGRAiSectionId, string>> = {
    persoonlijk_profiel: pb.persoonlijk_profiel.tekst,
    zoekprofiel: pb.zoekprofiel.tekst,
    doelstelling_traject: pb.doelstelling_traject.toelichting,
    praktische_belemmeringen: pb.praktische_belemmeringen.toelichting,
    inzet_houding: pb.inzet_houding.toelichting,
    pow: pb.pow.history[0]?.toelichting ?? '',
    visie_plaatsbaarheid: pb.visie_plaatsbaarheid.conclusie,
    belastbaarheidsprofiel: pb.belastbaarheidsprofiel.toelichting,
  };
  const prev = pick[sectionId];
  return [
    `## Vorige rapportage (periode ${vgrPeriodeText(prior)}, versie ${prior.vgr_meta.version}) — schrijf deze periode in de verleden tijd`,
    `PoW toen: huidige trede ${pb.pow.huidige_trede ?? '—'}, doel ${pb.pow.doel_trede ?? '—'}, uren ${pb.pow.werkzame_uren || '—'}`,
    `Doelstelling toen: ${trajectDoelLabel(pb.doelstelling_traject.huidige) || '—'}`,
    prev ? `Tekst van dit onderdeel in de vorige rapportage:\n${clip(prev)}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/* ------------------------------------------------------------------ */
/* Preflight conflicts                                                 */
/* ------------------------------------------------------------------ */

export function detectVgrSourceConflicts(data: VGRData, prior: VGRData | null): string[] {
  const out: string[] = [];
  const b = data.body;
  if (v(data.fml_izp_lab_date) && v(data.fml_izp_lab_date) === v(data.first_sick_day)) {
    out.push('FML/IZP/LAB-datum is gelijk aan de eerste ziektedag (waarschijnlijk invoerfout).');
  }
  if (b.belastbaarheidsprofiel.datum && v(data.fml_izp_lab_date) && b.belastbaarheidsprofiel.datum !== v(data.fml_izp_lab_date)) {
    out.push(`Datum belastbaarheidsprofiel (${formatNLDate(b.belastbaarheidsprofiel.datum)}) wijkt af van FML-datum in de gegevens (${formatNLDate(data.fml_izp_lab_date)}).`);
  }
  if (prior) {
    const p = prior.body.pow;
    if (p.huidige_trede && b.pow.huidige_trede && Math.abs(b.pow.huidige_trede - p.huidige_trede) >= 2) {
      out.push(`PoW-trede verspringt van ${p.huidige_trede} (vorige rapportage) naar ${b.pow.huidige_trede}.`);
    }
    if (p.huidige_trede && b.pow.huidige_trede && b.pow.huidige_trede < p.huidige_trede) {
      out.push(`PoW-trede is gedaald t.o.v. de vorige rapportage (${p.huidige_trede} → ${b.pow.huidige_trede}).`);
    }
    if (prior.body.doelstelling_traject.huidige && b.doelstelling_traject.huidige && prior.body.doelstelling_traject.huidige !== b.doelstelling_traject.huidige && !b.wijzigingen_doelstelling.aanwezig) {
      out.push('Doelstelling verschilt van de vorige rapportage, maar "wijzigingen doelstelling" staat niet op ja.');
    }
  }
  const wekelijks = b.interventies_activatie.selected.includes('wekelijks_solliciteren');
  if (wekelijks && !data.applications.length) out.push('"Wekelijks solliciteren" is aangevinkt maar Bijlage 2 bevat geen sollicitaties.');
  if (b.pow.huidige_trede && b.pow.huidige_trede >= 4 && !v(b.pow.werkzame_uren)) out.push('PoW-trede 4+ zonder werkzame uren.');
  if (b.doelstelling_traject.huidige === 'activering' && wekelijks) out.push('Doelstelling is activering, maar wekelijks solliciteren is aangevinkt — controleer de hoofdfocus.');
  return out;
}

/* ------------------------------------------------------------------ */
/* Entry                                                               */
/* ------------------------------------------------------------------ */

export async function collectVgrAiContext(params: {
  supabase: SupabaseClient;
  employeeId: string;
  data: VGRData;
  prior: VGRData | null;
  sectionId: VGRAiSectionId;
  extraInstruction?: string;
}): Promise<VGRAiContext> {
  const { supabase, employeeId, data, prior, sectionId, extraInstruction } = params;
  const docs = await listVgrSourceDocuments(supabase, employeeId);
  const chosen = selectDocumentsForSection(docs, data.vgr_meta.source_document_ids, sectionId);
  const { files, labels, skipped } = await loadDocumentsAsPdfInputs(supabase, chosen);
  const conflicts = detectVgrSourceConflicts(data, prior);

  const text = [
    `# Dossiercontext voor onderdeel "${VGR_AI_SECTIONS[sectionId].label}"`,
    gegevensBlock(data),
    currentBodyBlock(data, sectionId),
    planningBlock(data),
    applicationsBlock(data),
    priorReportBlock(prior, sectionId),
    conflicts.length ? `## Gesignaleerde tegenstrijdigheden (benoem in waarschuwingen, los niet zelf op)\n${conflicts.map((c) => `- ${c}`).join('\n')}` : '',
    files.length ? `## Bijgevoegde documenten\n${labels.map((l) => `- ${l}`).join('\n')}` : '## Bijgevoegde documenten\nGeen. Gebruik alleen bovenstaande context; laat velden leeg als informatie ontbreekt.',
    skipped.length ? `Niet leesbaar/overgeslagen: ${skipped.join(', ')}` : '',
    extraInstruction?.trim() ? `## Aanvullende instructie van de loopbaanadviseur\n${extraInstruction.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return { text, files, sources: [...labels, 'Rapportagegegevens', ...(prior ? ['Vorige rapportage'] : [])], conflicts };
}
