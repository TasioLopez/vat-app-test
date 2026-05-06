import type { TP2026Bijlage2Model, TP2026BijlageChecklistRow } from '@/lib/tp2026/schema';

/** Section title above the four-column checklist (official template). */
export const BIJLAGE2_SECTION_BASIS = 'Basisinterventies ontwikkeling';

export const BIJLAGE2_WILLEN_LABELS = [
  'Empowerment',
  'Dagstructuur',
  'Rouwverwerking en acceptatie',
  'Fit en vitaliteit/ lifestyle coaching',
  'Vitaliteitsgerelateerde webinars',
  'Stress- en energiemanagement',
  'Burn-out coaching',
  'Mediation',
  'Denken in kansen en mogelijkheden',
  'Iets proberen om te ervaren of het passend is',
] as const;

export const BIJLAGE2_WETEN_LABELS = [
  'Competenties en vaardigheden testen',
  'Verbetering pc-vaardigheden',
  'Verbetering Nederlandse taal',
  'Scholing onderzoeken',
  'Wet- en regelgeving spoor 2',
  'Arbeidsgerelateerde webinars',
  'Arbeidsmarkt oriëntatie',
  'Kennis welke beroepen passend zijn',
  "Zelfkennis/ kennis USP's",
  'Inzicht in interesses, talenten en valkuilen',
  'Inzicht in persoonsprofiel',
  'Inzicht in zoekprofiel',
  'Assertiviteitscoaching',
] as const;

export const BIJLAGE2_KUNNEN_LABELS = [
  'Opstellen verzorgd c.v.',
  'Schrijven open sollicitatiebrief',
  'Schrijven gesloten sollicitatiebrief',
  'Aanmelden bij en solliciteren via vacatureportal',
  'Vacatures zoeken en beoordelen',
  'Rollenspellen',
  'AI gebruiken tijdens solliciteren',
  'Netwerken',
  'LinkedIn gebruiken voor netwerken en solliciteren',
  'Netwerkgesprek voorbereiden en voeren',
  'Sollicitatiegesprek voorbereiden en voeren',
  'Haalbaarheidsonderzoek',
] as const;

export const BIJLAGE2_DOEN_LABELS = [
  'Jobhunting/ actieve bemiddeling',
  'Sollicitatieactiviteit (1 x per week)',
  '(Werk)ervaring opgedaan via Spoor 1',
  '(Werk)ervaring opgedaan via een werkervaringsplaats/ stage (WEP)',
  '(Werk)ervaring opgedaan via een werksimulatieplaats',
  '(Werk)ervaring opgedaan via een detacheringsplek',
  'Opleiding/cursus',
  'Nazorg',
] as const;

/** Per-trede criterion lines (incl. * / ** where used in the official PDF). */
export const BIJLAGE2_POW_CRITERIA_LABELS: Record<number, readonly string[]> = {
  1: [
    'Werknemer verricht min. 3x per week een activiteit binnenshuis of',
    'Werknemer komt min. 2x per week buitenshuis of',
    'Werknemer re-integreert voor min. 2 uur per week in spoor 1',
  ],
  2: [
    'Werknemer doet min. 2x p. week mee aan 1 of meer activiteiten buitenshuis of',
    'Werknemer werkt in een beschermde werkomgeving voor min. 8 uur p. week of',
    'Werknemer re-integreert voor min. 4 uur per week in spoor 1',
  ],
  3: [
    'Werknemer heeft een activeringsplaats** voor min. 10 uur p. week of',
    'Werknemer heeft een stage/ werkervaringsplaats* voor min. 10 uur per week of',
    'Werknemer re-integreert min. voor 10 uur per week in eigen werk',
  ],
  4: [
    'Werknemer heeft een stage/werkervaringsplaats* voor min. 12 uur per week of',
    'Werknemer re-integreert voor min. 20 uur (of min. 50% van de contracturen) per week in eigen werk',
  ],
  5: [
    'Werknemer heeft een parttimebaan voor min. 50% van de oorspronkelijke uren (tenminste min. 11 uur) per week of',
    'Werknemer heeft een detacheringsplek voor min. 70% van de contracturen per week (tenminste min. 11 uur) of',
    'Werknemer zijn of haar volledige uren maakt, (deels) in aangepaste vorm',
  ],
  6: [
    'Werknemer heeft een fulltime functie met minimaal 65% loonwaarde of',
    "Werknemer is als ZZP'er of ondernemer aan de slag zonder loonaanvulling van de werkgever",
  ],
};

export const BIJLAGE2_FOOTNOTES = [
  '* Een werkervaringsplaats (WEP) kan zijn re-integratie spoor 1 of een stage.',
  '** Een activeringsplaats kan zijn vrijwilligerswerk of een simulatieplek.',
] as const;

export function rowsFromLabels(labels: readonly string[]): TP2026BijlageChecklistRow[] {
  return labels.map((label) => ({ label, checked: false }));
}

export function createOfficialBijlage2Model(): TP2026Bijlage2Model {
  return {
    willen: rowsFromLabels(BIJLAGE2_WILLEN_LABELS),
    weten: rowsFromLabels(BIJLAGE2_WETEN_LABELS),
    kunnen: rowsFromLabels(BIJLAGE2_KUNNEN_LABELS),
    doen: rowsFromLabels(BIJLAGE2_DOEN_LABELS),
    powTredes: ([1, 2, 3, 4, 5, 6] as const).map((trede) => ({
      trede,
      criteria: rowsFromLabels(BIJLAGE2_POW_CRITERIA_LABELS[trede]),
    })),
  };
}
