/**
 * Static Inhoudsopgave for TP 2026 stap 03 (basisdocument) page 1 — aligned with official template.
 */

import {
  TP2026_POW_OVERVIEW_TITLE,
  TP2026_TOELICHTING_POW_TITLE,
  TP2026_VISIE_PLAATSBARHEID_TITLE,
} from '@/lib/tp2026/basis-profiel-field-order';

export const BASIS_INHOUDSOPGAVE_TITLE = 'Inhoudsopgave';

/** Leading bullets (no coloured bar). */
export const BASIS_INHOUDSOPGAVE_INTRO_ITEMS: string[] = [
  'Inleiding',
  'Wettelijke kaders en terminologie',
];

export type BasisInhoudsopgaveBarVariant = 'purple' | 'salmon' | 'beige';

export type BasisInhoudsopgaveSection = {
  barVariant: BasisInhoudsopgaveBarVariant;
  title: string;
  items: string[];
};

export const BASIS_INHOUDSOPGAVE_SECTIONS: BasisInhoudsopgaveSection[] = [
  {
    barVariant: 'purple',
    title: 'Profiel werknemer',
    items: [
      'Sociale achtergrond & maatschappelijke context',
      'Visie van werknemer',
      'Persoonlijk profiel',
      'Belastbaarheidsprofiel',
      'Praktische belemmeringen',
      'Advies passende arbeid',
      TP2026_POW_OVERVIEW_TITLE,
      TP2026_TOELICHTING_POW_TITLE,
      TP2026_VISIE_PLAATSBARHEID_TITLE,
      'Visie loopbaanadviseur',
      'Zoekprofiel',
    ],
  },
  {
    barVariant: 'salmon',
    title: 'Onderdelen Spoor 2 begeleiding',
    items: ['Onderdelen tweede spoortraject', 'Leernavigator'],
  },
  {
    barVariant: 'beige',
    title: 'Bijlagen',
    items: ['Voortgang en planning'],
  },
];
