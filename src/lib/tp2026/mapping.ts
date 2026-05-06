import { formatTP2026CoverVoorName } from '@/lib/utils';
import { VISIE_LOOPBAANADVISEUR_BASIS, WETTELIJKE_KADERS } from '@/lib/tp/static';
import type {
  TP2026Bijlage1Activity,
  TP2026Bijlage1Phase,
  TP2026Bijlage2Model,
  TP2026Bijlage2PowTrede,
  TP2026Bijlage3Decision,
  TP2026BijlageChecklistRow,
} from './schema';
import { createOfficialBijlage2Model } from '@/lib/tp2026/bijlage2-official';
import { createOfficialBijlage3Decisions } from '@/lib/tp2026/bijlage3-official';

const bijlage1PhaseDefaults: TP2026Bijlage1Phase[] = [
  {
    title: 'Oriëntatie',
    period_from: '',
    period_to: '',
    activities: [
      'Verwerking verlies en acceptatie',
      'Empowerment',
      'Webinars',
      'Kwaliteiten en vaardigheden onderzoek',
      'Beroeps-en arbeidsmarktoriëntatie',
      'Scholingsmogelijkheden onderzoeken',
      'Sollicitatietools (brief en cv)',
      'Voortgangsrapportage en evaluatie',
    ].map((name) => ({ name, status: 'P' })),
  },
  {
    title: 'Activering',
    period_from: '',
    period_to: '',
    activities: [
      'Sollicitatievaardigheden vervolg (gesprek)',
      'Netwerken',
      'Webinars',
      'Solliciteren en/of netwerken via Social Media',
      'Vacatures zoeken en beoordeling',
      'Wekelijks solliciteren',
      'Activering/ werkervaringsplaats',
      'Voortgangsrapportage en evaluatie',
    ].map((name) => ({ name, status: 'P' })),
  },
  {
    title: 'Betaald werk',
    period_from: '',
    period_to: '',
    activities: [
      'Wekelijks solliciteren vervolg',
      'Sollicitatiegesprek voorbereiden en presenteren',
      'Jobhunten',
      'Detachering onderzoeken',
      'Webinar, gericht op WIA-aanvraag',
      'Begeleiding WIA',
      'Voortgangsrapportage en eindevaluatie',
    ].map((name) => ({ name, status: 'P' })),
  },
];

const bijlage2Default: TP2026Bijlage2Model = createOfficialBijlage2Model();

function normChecklistLabel(label: string): string {
  return String(label || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\u2019/g, "'");
}

/** Map legacy dev labels to official PDF labels so checked state is preserved. */
const BIJLAGE2_CHECKLIST_LEGACY: Record<string, string> = {
  'Opstellen verzorgd cv': 'Opstellen verzorgd c.v.',
  '(Werk)ervaring via spoor 1': '(Werk)ervaring opgedaan via Spoor 1',
  '(Werk)ervaring via stage/WEP': '(Werk)ervaring opgedaan via een werkervaringsplaats/ stage (WEP)',
  'Jobhunting/actieve bemiddeling': 'Jobhunting/ actieve bemiddeling',
};

function canonicalChecklistLabel(label: string): string {
  const n = normChecklistLabel(label);
  const mapped = BIJLAGE2_CHECKLIST_LEGACY[n];
  return mapped ? normChecklistLabel(mapped) : n;
}

function mergeChecklistGroup(
  defaults: TP2026BijlageChecklistRow[],
  saved: unknown
): TP2026BijlageChecklistRow[] {
  const savedArr = Array.isArray(saved) ? saved : [];
  const checkedByCanonical = new Map<string, boolean>();
  for (const row of savedArr) {
    if (!row || typeof row !== 'object' || typeof (row as { label?: unknown }).label !== 'string') continue;
    const r = row as TP2026BijlageChecklistRow;
    const key = canonicalChecklistLabel(r.label);
    checkedByCanonical.set(key, checkedByCanonical.get(key) || Boolean(r.checked));
  }
  return defaults.map((d) => ({
    label: d.label,
    checked: checkedByCanonical.get(normChecklistLabel(d.label)) ?? false,
  }));
}

function isLegacyPowPlaceholder(row: Record<string, unknown>): boolean {
  const raw = row.criteria ?? row.checks;
  if (!Array.isArray(raw) || raw.length !== 1) return false;
  const first = raw[0] as { label?: unknown };
  return typeof first?.label === 'string' && /behaald/i.test(first.label);
}

function normalizePowTredes(savedPow: unknown): TP2026Bijlage2PowTrede[] {
  const defaults = createOfficialBijlage2Model().powTredes;
  if (!Array.isArray(savedPow)) return defaults;

  const savedRows = savedPow
    .filter((x) => x && typeof x === 'object')
    .map((x) => x as Record<string, unknown>);

  return defaults.map((def) => {
    const tredeNum = def.trede;
    const saved = savedRows.find((r) => Number(r.trede) === tredeNum);
    if (!saved) return def;
    if (isLegacyPowPlaceholder(saved)) return def;

    const src = (saved.criteria ?? saved.checks) as unknown;
    if (!Array.isArray(src)) return def;

    const checkedByLabel = new Map<string, boolean>();
    for (const c of src) {
      if (!c || typeof c !== 'object' || typeof (c as { label?: unknown }).label !== 'string') continue;
      const cr = c as TP2026BijlageChecklistRow;
      checkedByLabel.set(normChecklistLabel(cr.label), Boolean(cr.checked));
    }

    return {
      trede: tredeNum,
      criteria: def.criteria.map((cr) => ({
        label: cr.label,
        checked: checkedByLabel.get(normChecklistLabel(cr.label)) ?? false,
      })),
    };
  });
}

export function normalizeBijlage2Model(raw: unknown): TP2026Bijlage2Model {
  const base = createOfficialBijlage2Model();
  if (!raw || typeof raw !== 'object') return base;

  const m = raw as Record<string, unknown>;
  return {
    willen: mergeChecklistGroup(base.willen, m.willen),
    weten: mergeChecklistGroup(base.weten, m.weten),
    kunnen: mergeChecklistGroup(base.kunnen, m.kunnen),
    doen: mergeChecklistGroup(base.doen, m.doen),
    powTredes: normalizePowTredes(m.powTredes),
  };
}

function normalizeBijlage3Decisions(raw: unknown): TP2026Bijlage3Decision[] {
  const defaults = createOfficialBijlage3Decisions();
  if (!Array.isArray(raw) || raw.length === 0) return defaults;

  return defaults.map((def, idx) => {
    const arr = raw as Record<string, unknown>[];
    const byId = arr.find((x) => x && typeof x === 'object' && String((x as { id?: unknown }).id) === def.id);
    const saved = (byId ?? arr[idx]) as Record<string, unknown> | undefined;
    if (!saved || typeof saved !== 'object') {
      return { ...def };
    }
    const r = saved.reached;
    const reached = r === 'yes' || r === 'no' ? r : null;
    return {
      ...def,
      reached,
      doelJa: Boolean(saved.doelJa),
      doelNee: Boolean(saved.doelNee),
    };
  });
}

function normalizeBijlage3Page2(raw: unknown): { doelJa: boolean; doelNee: boolean } {
  if (!raw || typeof raw !== 'object') return { doelJa: false, doelNee: false };
  const o = raw as Record<string, unknown>;
  return { doelJa: Boolean(o.doelJa), doelNee: Boolean(o.doelNee) };
}

function normalizeBijlage1Phases(raw: unknown): TP2026Bijlage1Phase[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((phase) => phase && typeof phase === 'object')
    .map((phase, index) => {
      const typedPhase = phase as Record<string, any>;
      const activities = Array.isArray(typedPhase.activities) ? typedPhase.activities : [];
      return {
        title: String(typedPhase.title || `Planning fase ${index + 1}`),
        period_from: String(typedPhase.period_from || typedPhase.periode?.from || ''),
        period_to: String(typedPhase.period_to || typedPhase.periode?.to || ''),
        activities: activities
          .filter((activity) => activity && typeof activity === 'object' && typeof activity.name === 'string')
          .map((activity) => ({
            name: String(activity.name || ''),
            status:
              activity.status === 'G' || activity.status === 'P' || activity.status === 'N' || activity.status === 'U'
                ? activity.status
                : 'P',
          })),
      };
    });
}

export function ensureTP2026Shape(raw: Record<string, any>): Record<string, any> {
  const next = { ...raw };

  if (next.first_name && next.last_name) {
    next.employee_name = formatTP2026CoverVoorName(next.first_name, next.last_name);
  } else if (!next.employee_name?.trim()) {
    next.employee_name = [next.first_name, next.last_name].filter(Boolean).join(' ').trim();
  }

  const fromLegacy = normalizeBijlage1Phases(next.bijlage_fases);
  const currentBijlage1 = normalizeBijlage1Phases(next.bijlage1_phases);
  if (!Array.isArray(next.bijlage1_phases) || next.bijlage1_phases.length === 0) {
    next.bijlage1_phases = (fromLegacy.length > 0
      ? fromLegacy
      : bijlage1PhaseDefaults) as TP2026Bijlage1Phase[];
  } else {
    next.bijlage1_phases = currentBijlage1.length > 0 ? currentBijlage1 : bijlage1PhaseDefaults;
  }

  if (!next.bijlage2_model || typeof next.bijlage2_model !== 'object') {
    next.bijlage2_model = bijlage2Default;
  } else {
    next.bijlage2_model = normalizeBijlage2Model(next.bijlage2_model);
  }

  if (!Array.isArray(next.bijlage3_decisions) || next.bijlage3_decisions.length === 0) {
    next.bijlage3_decisions = createOfficialBijlage3Decisions();
  } else {
    next.bijlage3_decisions = normalizeBijlage3Decisions(next.bijlage3_decisions);
  }
  next.bijlage3_page2 = normalizeBijlage3Page2(next.bijlage3_page2);

  if (!String(next.wettelijke_kaders || '').trim()) {
    next.wettelijke_kaders = WETTELIJKE_KADERS;
  }
  if (!String(next.visie_loopbaanadviseur || '').trim()) {
    next.visie_loopbaanadviseur = VISIE_LOOPBAANADVISEUR_BASIS;
  }
  if (!String(next.praktische_belemmeringen || '').trim()) {
    next.praktische_belemmeringen =
      'Voor zover bekend zijn er geen praktische belemmeringen die van invloed kunnen zijn op het verloop van het tweede spoortraject.';
  }

  return next;
}

export function mergeAutofillIntoTP2026(
  current: Record<string, any>,
  payload: Record<string, any>
): Record<string, any> {
  return ensureTP2026Shape({
    ...current,
    ...payload,
  });
}

export function flattenBijlage1Activities(phases: TP2026Bijlage1Phase[]): TP2026Bijlage1Activity[] {
  return phases.flatMap((phase) => phase.activities);
}
