import type { TP2026Bijlage3Decision } from '@/lib/tp2026/schema';

/** Official stroomschema rows (ValentineZ Trajectplan Stroomschema Bijlage 3). */
export const BIJLAGE3_TABLE_HEADERS = [
  'Vragen stroomschema',
  'Trede-bepaling',
  'Doel uren %',
  'Werkboeken',
  'Doel behaald',
] as const;

export type Bijlage3OfficialStepDef = Omit<TP2026Bijlage3Decision, 'reached' | 'doelJa' | 'doelNee'>;

export const BIJLAGE3_OFFICIAL_STEPS: readonly Bijlage3OfficialStepDef[] = [
  {
    id: 'b3_step_1',
    question: 'Zijn er benutbare mogelijkheden\n(zie advies/ conclusie BA)',
    neeTredeNum: 1,
    neeTredeLabel: 'Trede 1',
    neeTredeBody: 'Geïsoleerd < 2 uur actief binnenshuis',
    doelUren: '',
    werkboeken: ['Empowerment', 'Dagstructuur', 'Zelfkennis'],
    yesOutcome: 'Volgende vraag',
    noOutcome: 'Trede 1',
  },
  {
    id: 'b3_step_2',
    question: 'Komt men regelmatig het huis\nuit (2x per week)?',
    hint:
      'Denk aan: geen contact buitenshuis behalve\nfunctionele contacten zoals een bezoek aan de\nhuisarts of fysiotherapeut',
    neeTredeNum: 1,
    neeTredeLabel: 'Trede 1',
    neeTredeBody: 'Deelname aan een activiteit buitenshuis < 2 uur',
    doelUren: '',
    werkboeken: ['Empowerment', 'Dagstructuur', 'Zelfkennis'],
    yesOutcome: 'Volgende vraag',
    noOutcome: 'Trede 1',
  },
  {
    id: 'b3_step_3',
    question: 'Heeft men minimaal 2x per week\nactiviteiten/ sociale contacten\nbuitenshuis?',
    hint:
      'Denk aan: wekelijks contact met anderen\nbuitenshuis zoals het deelnemen aan een\nkoffieochtend of het volgen van cursus of\ntaallessen.',
    neeTredeNum: 2,
    neeTredeLabel: 'Trede 2',
    neeTredeBody: 'Deelname aan een activiteit buitenshuis < 4 uur',
    doelUren: '',
    werkboeken: ['Empowerment', 'Dagstructuur', 'Solliciteren', 'Beroepskeuze'],
    yesOutcome: 'Volgende vraag',
    noOutcome: 'Trede 2',
  },
  {
    id: 'b3_step_4',
    question: 'Is men gemotiveerd om aan het werk\nte gaan?',
    hint:
      'Staat men ervoor open, is het een kwestie van\nniet willen of niet kunnen, zijn er factoren waar\nwerknemer gedemotiveerd van raakt?',
    neeTredeNum: 3,
    neeTredeLabel: 'Trede 3:',
    neeTredeBody: 'Activering of spoor 1 < 10 uur',
    doelUren: '',
    werkboeken: ['Empowerment', 'Dagstructuur', 'Solliciteren', 'Beroepskeuze'],
    yesOutcome: 'Volgende vraag',
    noOutcome: 'Trede 3',
  },
  {
    id: 'b3_step_5',
    question: 'Kan men op het moment van de intake\nminimaal 12 uur per week werken?\n(geen urenbeperking)',
    hint:
      'Denk aan: deelname aan activiteiten met\nuitvoering van taken met een lage werkdruk en\nmet weinig eigen verantwoordelijkheid en/ of\nzelfstandigheid.',
    neeTredeNum: 3,
    neeTredeLabel: 'Trede 3:',
    neeTredeBody: 'Activering of spoor 1 < 10 uur',
    doelUren: '',
    werkboeken: ['Empowerment', 'Dagstructuur', 'Solliciteren', 'Beroepskeuze'],
    yesOutcome: 'Volgende vraag',
    noOutcome: 'Trede 3',
  },
  {
    id: 'b3_step_6',
    question: 'Kan men zonder opleiding direct aan\nhet werk?',
    hint:
      'Denk aan: onbetaald werk, gericht op werk.\nVoert zelfstandig taken uit en/of draagt\nverantwoordelijkheid en/of opbrengst heeft\neconomische waarde; en/of volgt een\nberoepsopleiding richting passend arbeid?',
    neeTredeNum: 4,
    neeTredeLabel: 'Trede 4:',
    neeTredeBody: 'Stage/WEP/Re-integratie spoor 1 < 20 uur\nof < 50%',
    doelUren: '> 20 uur per week of\n50% van de\ncontracturen',
    werkboeken: ['Solliciteren', 'Beroepskeuze'],
    yesOutcome: 'Volgende vraag',
    noOutcome: 'Trede 4',
  },
  {
    id: 'b3_step_7',
    question:
      'Kan een functie zonder aanpassingen,\n(aanvulling inkomen/ uitkering) of\nvoorzieningen (werkplek,\ntaakaan-passing) etc. uitgevoerd\nworden?',
    hint:
      'Is werknemer voor minimaal 65% hersteld\ngemeld in eigen of andere functie in spoor 1 of\nkan men minimaal 65% loonwaarde ergens\nanders in een passende functie genereren?',
    neeTredeNum: 5,
    neeTredeLabel: 'Trede 5:',
    neeTredeBody: 'Parttime betaald werk, detacheren, voorziening of eigen werkgever',
    doelUren: '> 50% van de\ncontracturen\n(minimaal 11 uur)',
    werkboeken: ['Solliciteren', 'Beroepskeuze'],
    yesOutcome: 'Trede 6 (pagina 2)',
    noOutcome: 'Trede 5',
  },
] as const;

export const BIJLAGE3_PAGE2 = {
  jaLeadIn: 'JA >',
  focusLine: 'Directe focus op duurzaam betaald\narbeid.',
  tredeNum: 6 as const,
  tredeLabel: 'Trede 6:',
  tredeBody: 'Weer volledig werkzaam binnen of buiten de organisatie',
} as const;

export function createOfficialBijlage3Decisions(): TP2026Bijlage3Decision[] {
  return BIJLAGE3_OFFICIAL_STEPS.map((s) => ({
    ...s,
    werkboeken: [...s.werkboeken],
    reached: null,
    doelJa: false,
    doelNee: false,
  }));
}
