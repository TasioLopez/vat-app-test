import type { VGRData } from '@/lib/vgr/schema';
import { trajectDoelLabel } from '@/lib/vgr/schema';

export type VGRIssueLevel = 'error' | 'warning' | 'info';

export type VGRIssue = {
  id: string;
  level: VGRIssueLevel;
  /** Wizard step the issue belongs to. */
  step: 'setup' | 'cover' | 'gegevens' | 'body' | 'planning' | 'applications';
  /** Body section id (for scroll-to). */
  sectionId?: string;
  message: string;
};

const isBlank = (v: unknown) => String(v ?? '').trim() === '';

function hasText(v: unknown) {
  return !isBlank(v);
}

function issueKey(step: string, sectionId: string | undefined, key: string): string {
  return `${step}:${sectionId ?? '_'}:${key}`;
}

/**
 * Warnings/infos the adviser already dismissed (with rationale) stay out of the
 * blocking list. Errors are never dismissible.
 */
export function visibleIssues(issues: VGRIssue[], dismissed: Record<string, string> | undefined): VGRIssue[] {
  const map = dismissed ?? {};
  return issues.filter((i) => i.level === 'error' || !map[i.id]);
}

/**
 * Consistency / completeness checks on a VGR draft. Pure; safe to unit test.
 * Errors block "final"; warnings are advisory.
 */
export function validateVgr(data: VGRData): VGRIssue[] {
  const issues: VGRIssue[] = [];
  const push = (issue: Omit<VGRIssue, 'id'> & { id?: string; key?: string }) => {
    const { key, id, ...rest } = issue;
    issues.push({
      ...rest,
      id: id ?? issueKey(rest.step, rest.sectionId, key ?? rest.message),
    });
  };

  const meta = data.vgr_meta;
  const b = data.body;

  /* ---------------- Setup / period ---------------- */
  if (isBlank(meta.period_start) || isBlank(meta.period_end)) {
    push({ level: 'error', step: 'setup', message: 'Rapportageperiode (van / tot en met) ontbreekt.' });
  } else if (meta.period_start > meta.period_end) {
    push({ level: 'error', step: 'setup', message: 'Einde rapportageperiode ligt vóór het begin.' });
  }
  if (isBlank(meta.report_date)) {
    push({ level: 'error', step: 'setup', message: 'Datum rapportage ontbreekt.' });
  } else if (hasText(meta.period_end) && meta.report_date < meta.period_end) {
    push({ level: 'warning', step: 'setup', message: 'Datum rapportage ligt vóór het einde van de rapportageperiode.' });
  }
  if (!meta.source_document_ids.length) {
    push({ level: 'info', step: 'setup', message: 'Geen brondocumenten geselecteerd voor deze rapportage (AI-voorstellen gebruiken dan alleen de intake/TP-gegevens).' });
  }

  /* ---------------- Gegevens ---------------- */
  for (const [key, label] of [
    ['first_name', 'Voornaam'],
    ['last_name', 'Achternaam'],
    ['date_of_birth', 'Geboortedatum'],
    ['first_sick_day', 'Eerste ziektedag'],
    ['consultant_name', 'Naam loopbaanadviseur'],
  ] as const) {
    if (isBlank((data as Record<string, unknown>)[key])) {
      push({ level: 'error', step: 'gegevens', message: `${label} ontbreekt.` });
    }
  }
  if (isBlank(data.document_employer_name) && isBlank(data.client_name) && isBlank(data.employer_name)) {
    push({ level: 'error', step: 'gegevens', message: 'Naam werkgever/opdrachtgever ontbreekt.' });
  }
  const fmlDate = String(data.fml_izp_lab_date ?? '').trim();
  if (fmlDate && fmlDate === String(data.first_sick_day ?? '').trim()) {
    push({
      id: 'gegevens:_:fml-eq-ezd',
      level: 'warning',
      step: 'gegevens',
      message: 'Datum FML/IZP/LAB is gelijk aan de eerste ziektedag. Dit is vrijwel altijd een invoerfout (sjabloonfout in het bronbestand).',
    });
  }
  if (hasText(data.ad_report_date) && isBlank(data.ad_name) && isBlank(b.visie_plaatsbaarheid.ad.bron_naam)) {
    push({ level: 'warning', step: 'gegevens', message: 'AD-rapportdatum is ingevuld maar de naam van de arbeidsdeskundige ontbreekt.' });
  }

  /* ---------------- Body: profiel ---------------- */
  if (b.benutbare_mogelijkheden.heeft === null) {
    push({ level: 'error', step: 'body', sectionId: 'benutbare_mogelijkheden', message: 'Benutbare mogelijkheden: ja/nee niet ingevuld.' });
  }
  for (const [k, label] of [
    ['prognose', 'Prognose'],
    ['conclusie', 'Conclusie'],
    ['advies', 'Advies'],
  ] as const) {
    const q = b.benutbare_mogelijkheden[k];
    if (hasText(q.citaat) && (isBlank(q.bron_naam) || isBlank(q.bron_datum))) {
      push({ level: 'warning', step: 'body', sectionId: 'benutbare_mogelijkheden', message: `${label}: citaat zonder naam bedrijfsarts of datum bron.` });
    }
    if (isBlank(q.citaat)) {
      push({ level: 'warning', step: 'body', sectionId: 'benutbare_mogelijkheden', message: `${label} is leeg.` });
    }
  }
  if (b.praktische_belemmeringen.aanwezig === null) {
    push({ level: 'error', step: 'body', sectionId: 'praktische_belemmeringen', message: 'Praktische belemmeringen: ja/nee niet ingevuld.' });
  } else if (b.praktische_belemmeringen.aanwezig && isBlank(b.praktische_belemmeringen.toelichting)) {
    push({ level: 'warning', step: 'body', sectionId: 'praktische_belemmeringen', message: 'Praktische belemmeringen: "ja" zonder toelichting.' });
  }
  if (isBlank(b.doelstelling_traject.huidige)) {
    push({ level: 'error', step: 'setup', message: 'Huidige doelstelling van het traject ontbreekt.' });
  }
  if (isBlank(b.doelstelling_traject.toelichting)) {
    push({ level: 'warning', step: 'body', sectionId: 'doelstelling_traject', message: 'Doelstelling traject: toelichting is leeg.' });
  }
  if (isBlank(b.persoonlijk_profiel.tekst)) {
    push({ level: 'warning', step: 'body', sectionId: 'persoonlijk_profiel', message: 'Persoonlijk profiel is leeg.' });
  }
  if (isBlank(b.belastbaarheidsprofiel.kind) || isBlank(b.belastbaarheidsprofiel.datum)) {
    push({ level: 'error', step: 'body', sectionId: 'belastbaarheidsprofiel', message: 'Belastbaarheidsprofiel: type (FML/IZP/LAB) of datum ontbreekt.' });
  } else if (b.belastbaarheidsprofiel.datum === String(data.first_sick_day ?? '')) {
    push({ level: 'warning', step: 'body', sectionId: 'belastbaarheidsprofiel', message: 'Datum belastbaarheidsprofiel is gelijk aan de eerste ziektedag.' });
  }
  if (!b.belastbaarheidsprofiel.rubrieken.length && isBlank(b.belastbaarheidsprofiel.toelichting)) {
    push({ level: 'warning', step: 'body', sectionId: 'belastbaarheidsprofiel', message: 'Belastbaarheidsprofiel: geen rubrieken en geen toelichting.' });
  }
  if (b.bijstellingen_belastbaarheid.aanwezig === null) {
    push({ level: 'error', step: 'body', sectionId: 'bijstellingen_belastbaarheid', message: 'Bijstellingen belastbaarheidsprofiel: ja/nee niet ingevuld.' });
  } else if (b.bijstellingen_belastbaarheid.aanwezig && !b.bijstellingen_belastbaarheid.revisions.length) {
    push({ level: 'error', step: 'body', sectionId: 'bijstellingen_belastbaarheid', message: 'Bijstellingen: "ja" maar geen bijstelling vastgelegd.' });
  }
  for (const rev of b.bijstellingen_belastbaarheid.revisions) {
    if (hasText(rev.date) && hasText(b.belastbaarheidsprofiel.datum) && rev.date <= b.belastbaarheidsprofiel.datum) {
      push({ level: 'warning', step: 'body', sectionId: 'bijstellingen_belastbaarheid', message: `Bijstelling van ${rev.date} ligt niet ná het oorspronkelijke belastbaarheidsprofiel.` });
    }
  }
  const goalChanged = b.doelstelling_traject.history.some((h) => h.changed);
  if (b.wijzigingen_doelstelling.aanwezig === null) {
    push({ level: 'error', step: 'body', sectionId: 'wijzigingen_doelstelling', message: 'Wijzigingen doelstelling: ja/nee niet ingevuld.' });
  } else if (b.wijzigingen_doelstelling.aanwezig === false && goalChanged) {
    push({
      level: 'warning',
      step: 'body',
      sectionId: 'wijzigingen_doelstelling',
      message: `Wijzigingen doelstelling staat op "nee", maar in Stap 1 is een doelwijziging geregistreerd (nu: ${trajectDoelLabel(b.doelstelling_traject.huidige)}).`,
    });
  } else if (b.wijzigingen_doelstelling.aanwezig && isBlank(b.wijzigingen_doelstelling.toelichting)) {
    push({ level: 'warning', step: 'body', sectionId: 'wijzigingen_doelstelling', message: 'Wijzigingen doelstelling: "ja" zonder toelichting.' });
  }
  if (isBlank(b.zoekprofiel.tekst)) {
    push({ level: 'warning', step: 'body', sectionId: 'zoekprofiel', message: 'Zoekprofiel is leeg.' });
  }

  /* ---------------- Body: motivatie ---------------- */
  if (b.inzet_houding.werkt_mee === null) {
    push({ level: 'error', step: 'body', sectionId: 'inzet_houding', message: 'Inzet en houding: ja/nee niet ingevuld.' });
  }
  if (isBlank(b.inzet_houding.toelichting)) {
    push({ level: 'warning', step: 'body', sectionId: 'inzet_houding', message: 'Inzet en houding: toelichting is leeg.' });
  }
  for (const [sectionId, label] of [
    ['interventies_motivatie', 'Interventies motivatie'],
    ['kwaliteiten_onderzoek', 'Kwaliteiten en vaardigheden onderzoek'],
    ['scholing', 'Scholingsmogelijkheden'],
    ['sollicitatie_vaardigheden', 'Sollicitatie vaardigheden'],
    ['interventies_activatie', 'Interventies activatie'],
  ] as const) {
    const sec = b[sectionId];
    if (!sec.selected.length) {
      push({ level: 'warning', step: 'body', sectionId, message: `${label}: geen interventies aangevinkt.` });
    }
    for (const id of sec.selected) {
      const block = sec.blocks[id];
      if (!block || (isBlank(block.toelichting) && !block.items.length)) {
        push({ level: 'info', step: 'body', sectionId, message: `${label}: "${id}" aangevinkt zonder persoonlijke toelichting.` });
      }
    }
  }

  /* ---------------- Body: oriëntatie ---------------- */
  const ko = b.kwaliteiten_onderzoek;
  if (ko.selected.includes('persoonlijkheidstest')) {
    const scores = Object.values(ko.persoonlijkheid_scores);
    if (scores.every(isBlank)) {
      push({ level: 'warning', step: 'body', sectionId: 'kwaliteiten_onderzoek', message: 'Persoonlijkheidstest aangevinkt maar geen scores ingevuld.' });
    }
    for (const s of scores) {
      if (hasText(s) && (!/^\d{1,3}$/.test(s.trim()) || Number(s) > 100)) {
        push({ level: 'warning', step: 'body', sectionId: 'kwaliteiten_onderzoek', message: `Persoonlijkheidsscore "${s}" is geen percentage (0–100).` });
      }
    }
  }
  if (ko.selected.includes('beroepen_arbeidsmarkt') && !ko.beroepen.filter(hasText).length) {
    push({ level: 'warning', step: 'body', sectionId: 'kwaliteiten_onderzoek', message: 'Beroepen uit de testen: aangevinkt maar geen beroepen opgenomen.' });
  }

  /* ---------------- Body: activatie / PoW ---------------- */
  const pow = b.pow;
  if (pow.huidige_trede === null) {
    push({ level: 'error', step: 'body', sectionId: 'pow', message: 'PoW-meter: huidige trede ontbreekt.' });
  }
  if (pow.intake_trede === null) {
    push({ level: 'warning', step: 'body', sectionId: 'pow', message: 'PoW-meter: trede bij intake ontbreekt.' });
  }
  if (!pow.doel_onbekend && pow.doel_trede === null) {
    push({ level: 'warning', step: 'body', sectionId: 'pow', message: 'PoW-meter: doeltrede ontbreekt (of vink "nog niet vast te stellen" aan).' });
  }
  if (pow.huidige_trede !== null && pow.intake_trede !== null && pow.huidige_trede - pow.intake_trede >= 2) {
    push({ level: 'warning', step: 'body', sectionId: 'pow', message: `PoW-meter: sprong van trede ${pow.intake_trede} naar ${pow.huidige_trede}. Onderbouw dit expliciet.` });
  }
  if (pow.huidige_trede !== null && pow.doel_trede !== null && pow.doel_trede < pow.huidige_trede) {
    push({ level: 'warning', step: 'body', sectionId: 'pow', message: 'PoW-meter: doeltrede ligt onder de huidige trede.' });
  }
  if (!pow.history.length || pow.history.every((m) => isBlank(m.toelichting))) {
    push({ level: 'warning', step: 'body', sectionId: 'pow', message: 'PoW-meter: geen onderbouwing (meting) ingevuld.' });
  }
  if (pow.huidige_trede !== null && pow.huidige_trede >= 4 && isBlank(pow.werkzame_uren)) {
    push({ level: 'warning', step: 'body', sectionId: 'pow', message: 'PoW-meter: trede 4 of hoger zonder werkzame uren.' });
  }
  if (hasText(pow.werkzame_uren) && Number(pow.werkzame_uren) === 0 && pow.huidige_trede !== null && pow.huidige_trede >= 4) {
    push({ level: 'warning', step: 'body', sectionId: 'pow', message: 'PoW-meter: 0 werkzame uren is strijdig met trede 4+.' });
  }
  if (isBlank(b.visie_plaatsbaarheid.kansen)) {
    push({ level: 'error', step: 'body', sectionId: 'visie_plaatsbaarheid', message: 'Visie op plaatsbaarheid: inschatting kansen ontbreekt.' });
  }
  if (isBlank(b.visie_plaatsbaarheid.conclusie)) {
    push({ level: 'warning', step: 'body', sectionId: 'visie_plaatsbaarheid', message: 'Visie op plaatsbaarheid: conclusie is leeg.' });
  }
  if (hasText(b.visie_plaatsbaarheid.ad.citaat) && isBlank(b.visie_plaatsbaarheid.ad.bron_naam)) {
    push({ level: 'warning', step: 'body', sectionId: 'visie_plaatsbaarheid', message: 'AD-advies: citaat zonder naam arbeidsdeskundige.' });
  }
  const checkedLn = [...b.leernavigator.basis, ...b.leernavigator.activering].filter((i) => i.checked);
  if (!checkedLn.length) {
    push({ level: 'info', step: 'body', sectionId: 'leernavigator', message: 'Leernavigator: niets aangevinkt.' });
  }
  for (const item of b.leernavigator.activering) {
    if (item.checked && item.label.includes('…') && isBlank(item.uren)) {
      push({ level: 'warning', step: 'body', sectionId: 'leernavigator', message: `Leernavigator: "${item.label}" aangevinkt zonder aantal uren.` });
    }
  }

  /* ---------------- Planning ---------------- */
  if (!data.planning_phases.length) {
    push({ level: 'error', step: 'planning', message: 'Bijlage 1: geen fases.' });
  }
  const allActs = data.planning_phases.flatMap((p) => p.activities);
  if (allActs.length && allActs.every((a) => a.status === 'P')) {
    push({ level: 'warning', step: 'planning', message: 'Bijlage 1: alle activiteiten staan nog op "P" (gepland).' });
  }
  for (const p of data.planning_phases) {
    if (isBlank(p.goal)) push({ level: 'warning', step: 'planning', message: `Bijlage 1: doel van "${p.title}" is leeg.` });
  }

  /* ---------------- Applications ---------------- */
  const apps = data.applications;
  const wekelijks = b.interventies_activatie.selected.includes('wekelijks_solliciteren') || b.sollicitatie_vaardigheden.selected.includes('wekelijks_solliciteren');
  if (wekelijks && !apps.length) {
    push({
      id: 'applications:_:wekelijks-zonder-apps',
      level: 'warning',
      step: 'applications',
      message: 'Wekelijks solliciteren is aangevinkt, maar Bijlage 2 bevat geen sollicitaties.',
    });
  }
  if (apps.length && hasText(meta.period_start) && hasText(meta.period_end)) {
    const outside = apps.filter((a) => a.date && (a.date < meta.period_start || a.date > meta.period_end));
    if (outside.length) {
      push({ level: 'info', step: 'applications', message: `${outside.length} sollicitatie(s) vallen buiten de rapportageperiode.` });
    }
  }
  for (const a of apps) {
    if (isBlank(a.date) || isBlank(a.organisatie)) {
      push({ level: 'warning', step: 'applications', message: 'Bijlage 2: sollicitatie zonder datum of organisatie.' });
      break;
    }
  }

  return issues;
}

export function countIssues(issues: VGRIssue[]) {
  return {
    errors: issues.filter((i) => i.level === 'error').length,
    warnings: issues.filter((i) => i.level === 'warning').length,
    infos: issues.filter((i) => i.level === 'info').length,
  };
}
