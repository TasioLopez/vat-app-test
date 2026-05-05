import { formatTP2026CoverVoorName } from '@/lib/utils';
import { VISIE_LOOPBAANADVISEUR_BASIS, WETTELIJKE_KADERS } from '@/lib/tp/static';
import type {
  TP2026Bijlage1Activity,
  TP2026Bijlage1Phase,
  TP2026Bijlage2Model,
  TP2026Bijlage3Decision,
} from './schema';

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

const bijlage2Default: TP2026Bijlage2Model = {
  willen: [
    'Empowerment',
    'Dagstructuur',
    'Rouwverwerking en acceptatie',
    'Fit en vitaliteit/ lifestyle coaching',
  ].map((label) => ({ label, checked: false })),
  weten: [
    'Wet- en regelgeving spoor 2',
    'Arbeidsmarkt oriëntatie',
    'Kennis welke beroepen passend zijn',
    'Inzicht in zoekprofiel',
  ].map((label) => ({ label, checked: false })),
  kunnen: [
    'Opstellen verzorgd cv',
    'Schrijven open sollicitatiebrief',
    'Vacatures zoeken en beoordelen',
    'LinkedIn gebruiken voor netwerken en solliciteren',
  ].map((label) => ({ label, checked: false })),
  doen: [
    'Sollicitatieactiviteit (1 x per week)',
    '(Werk)ervaring via spoor 1',
    '(Werk)ervaring via stage/WEP',
    'Jobhunting/actieve bemiddeling',
  ].map((label) => ({ label, checked: false })),
  powTredes: [1, 2, 3, 4, 5, 6].map((trede) => ({
    trede,
    checks: [{ label: `Trede ${trede} behaald`, checked: false }],
  })),
};

const bijlage3Defaults: TP2026Bijlage3Decision[] = [
  {
    question: 'Zijn er benutbare mogelijkheden (zie advies/conclusie BA)?',
    yesOutcome: 'Ga door naar volgende vraag',
    noOutcome: 'Trede 1',
    reached: null,
  },
  {
    question: 'Komt men regelmatig het huis uit (2x per week)?',
    yesOutcome: 'Ga door naar volgende vraag',
    noOutcome: 'Trede 1',
    reached: null,
  },
  {
    question: 'Heeft men minimaal 2x per week activiteiten buitenshuis?',
    yesOutcome: 'Ga door naar volgende vraag',
    noOutcome: 'Trede 2',
    reached: null,
  },
  {
    question: 'Is men gemotiveerd om aan het werk te gaan?',
    yesOutcome: 'Ga door naar volgende vraag',
    noOutcome: 'Trede 3',
    reached: null,
  },
  {
    question: 'Kan men op intake minimaal 12 uur per week werken?',
    yesOutcome: 'Ga door naar volgende vraag',
    noOutcome: 'Trede 3',
    reached: null,
  },
  {
    question: 'Kan men zonder opleiding direct aan het werk?',
    yesOutcome: 'Ga door naar volgende vraag',
    noOutcome: 'Trede 4',
    reached: null,
  },
  {
    question: 'Kan functie zonder aanpassingen/voorzieningen uitgevoerd worden?',
    yesOutcome: 'Trede 6',
    noOutcome: 'Trede 5',
    reached: null,
  },
];

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
  }

  if (!Array.isArray(next.bijlage3_decisions) || next.bijlage3_decisions.length === 0) {
    next.bijlage3_decisions = bijlage3Defaults;
  }

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
