export const WETTELIJKE_KADERS = `Ik heb werknemer uitleg gegeven over:
• Het doel van de intake;
• Het doel en opzet van het 2e spoortraject;
• Rechten en plichten van werkgever en werknemer in het kader van de Wet Verbetering Poortwachter;
• Het verschil tussen spoor 1 en spoor 2 en dat de beiden trajecten parallel aan elkaar kunnen lopen;
• Wat de procedure is als een werknemer 2 jaar ziek is en geen ander werk heeft gevonden.
• Hoe een arbeidsongeschiktheidspercentage (AO-percentage) tot stand komt.
• De WIA-aanvraag. Als een werknemer na 2 jaar ziekte een WIA-uitkering aanvraagt, beoordeelt het UWV wat de werknemer nog kan verdienen, daarbij rekening houdend met ziekte of handicap van de werknemer.`;

export const NB_DEFAULT_GEEN_AD = `NB: in het kader van de algemene verordening gegevensbescherming (AVG) worden in deze rapportage geen medische termen en diagnoses vermeld. Voor meer informatie over ons privacyreglement en het klachtenreglement verwijzen wij u naar onze website.`;

export const VISIE_LOOPBAANADVISEUR_BASIS = `Als loopbaanadviseur beoordeel ik de mogelijkheden van werknemer om, binnen de resterende belastbaarheid en rekening houdend met de Wet verbetering poortwachter, te komen tot duurzame werkhervatting buiten de eigen werkgever (2e spoor). Ik hanteer een arbeidsmarktgerichte en realistische benadering, waarbij we inzetten op het vergroten van inzetbaarheid, het onderzoeken van passende functies en het geleidelijk toewerken naar plaatsing. Medische informatie wordt niet vastgelegd; ik baseer mij op functionele mogelijkheden zoals door artsen/AD beschreven.`;

/** Strip leftover literal asterisks from inleiding_sub markdown (e.g. * **intro** "quote"* → **intro** *quote*) */
export function cleanInleidingSubMarkdown(text: string): string {
  if (!text || (text.includes('N.B.:') && text.includes('nog geen AD-rapport'))) return text ?? '';
  let t = text;
  // Leading orphan: * **intro**... or *In het...
  if (t.startsWith('* ') && t.includes('**In het Arbeidsdeskundige rapport')) {
    t = t.replace(/^\*\s+/, '');
  } else if (t.startsWith('*') && !t.startsWith('**') && t.includes('In het Arbeidsdeskundige rapport')) {
    t = t.replace(/^\*\s*/, '');
  }
  // Trailing orphan: ..."quote"* or ...* (not part of *quote*)
  if (t.endsWith('*') && !t.endsWith('**')) {
    const beforeLast = t.slice(0, -1);
    const lastItalic = beforeLast.match(/\*[^*]+\*$/);
    if (!lastItalic) t = beforeLast;
  }
  return t;
}
