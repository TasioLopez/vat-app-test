/** Canonical order for TP 2026 step 3 "Profiel werknemer" sections (matches inhoudsopgave). */

export const TP2026_POW_OVERVIEW_TITLE = 'Perspectief op werk - POW-meter™';
export const TP2026_TOELICHTING_POW_TITLE = 'Toelichting POW-meter™';
export const TP2026_VISIE_PLAATSBARHEID_TITLE = 'Visie op plaatsbaarheid';

export const TP2026_PROFIEL_WERKNEMER_FIELD_ORDER = [
  'sociale_achtergrond',
  'visie_werknemer',
  'persoonlijk_profiel',
  'prognose_bedrijfsarts',
  'praktische_belemmeringen',
  'advies_ad_passende_arbeid',
  'pow_meter',
  'visie_plaatsbaarheid',
  'visie_loopbaanadviseur',
  'zoekprofiel',
] as const;

export type TP2026ProfielWerknemerFieldKey = (typeof TP2026_PROFIEL_WERKNEMER_FIELD_ORDER)[number];

export type TP2026ProfielPreviewMeta = {
  previewKey: string;
  title: string;
  editorLabel: string;
};

export const TP2026_PROFIEL_PREVIEW_META: Record<
  TP2026ProfielWerknemerFieldKey,
  TP2026ProfielPreviewMeta
> = {
  sociale_achtergrond: {
    previewKey: 'soc',
    title: 'Sociale achtergrond & maatschappelijke context',
    editorLabel: 'Sociale achtergrond & maatschappelijke context',
  },
  visie_werknemer: {
    previewKey: 'visw',
    title: 'Visie van werknemer',
    editorLabel: 'Visie van werknemer',
  },
  persoonlijk_profiel: {
    previewKey: 'prof',
    title: 'Persoonlijk profiel',
    editorLabel: 'Persoonlijk profiel',
  },
  prognose_bedrijfsarts: {
    previewKey: 'prog',
    title: 'Belastbaarheidsprofiel',
    editorLabel: 'Belastbaarheidsprofiel',
  },
  praktische_belemmeringen: {
    previewKey: 'blem',
    title: 'Praktische belemmeringen',
    editorLabel: 'Praktische belemmeringen',
  },
  advies_ad_passende_arbeid: {
    previewKey: 'ad',
    title: 'Advies passende arbeid',
    editorLabel: 'Advies passende arbeid (AD)',
  },
  pow_meter: {
    previewKey: 'pow',
    title: TP2026_POW_OVERVIEW_TITLE,
    editorLabel: TP2026_POW_OVERVIEW_TITLE,
  },
  visie_plaatsbaarheid: {
    previewKey: 'plaats',
    title: TP2026_VISIE_PLAATSBARHEID_TITLE,
    editorLabel: TP2026_VISIE_PLAATSBARHEID_TITLE,
  },
  visie_loopbaanadviseur: {
    previewKey: 'vlb',
    title: 'Visie van loopbaanadviseur',
    editorLabel: 'Visie van loopbaanadviseur',
  },
  zoekprofiel: {
    previewKey: 'zp',
    title: 'Zoekprofiel',
    editorLabel: 'Zoekprofiel',
  },
};
