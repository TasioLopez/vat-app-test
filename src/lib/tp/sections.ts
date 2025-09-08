// Sections that never change (paste your exact boilerplates here)
export const ALWAYS_SAME: Record<string, string> = {
  wettelijke_kaders: `Ik heb werknemer uitleg gegeven over:
• Het doel van de intake;
• Het doel en opzet van het 2e spoortraject;
• Rechten en plichten van werkgever en werknemer in het kader van de Wet Verbetering Poortwachter;
• Het verschil tussen spoor 1 en spoor 2 en dat de beiden trajecten parallel aan elkaar kunnen lopen;
• Wat de procedure is als een werknemer 2 jaar ziek is en geen ander werk heeft gevonden.
• Hoe een arbeidsongeschiktheidspercentage (AO-percentage) tot stand komt.
• De WIA-aanvraag. Als een werknemer na 2 jaar ziekte een WIA-uitkering aanvraagt, beoordeelt het UWV wat de werknemer nog kan verdienen, daarbij rekening houdend met ziekte of handicap van de werknemer.`,
  visie_loopbaanadviseur: `Werknemer heeft conform de FML/ IZP/ LAB van (datum) beperkingen in de volgende rubrieken:
• Persoonlijk functioneren
• Sociaal functioneren
• Aanpassing aan fysieke omgevingseisen
• Dynamische handelingen
• Statische houdingen
• Werktijden`,
  akkoordtekst: `Door het trajectplan te ondertekenen, gaat u met onderstaande akkoord;
• ValentineZ vraagt eventuele benodigde informatie op bij uw werkgever, zoals een Arbeidsdeskundig Rapport en/of een Inzetbaarheidsprofiel/Functie Mogelijkheden Lijst. ...
• Uw loopbaan adviseur kan de verstrekte informatie gebruiken om een rapportage te schrijven over de voortgang van uw begeleiding, ...
• Uw CV kan worden gebruikt ...
• ValentineZ werkt met een multidisciplinair team. ...
• U kunt benaderd worden door een extern bureau ...
• U bent zelf eindverantwoordelijk ...
Met ondertekening van dit trajectplan gaat u akkoord ...`
};

export const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    sections: {
      type: "object",
      additionalProperties: false,
      properties: {
        inleiding: { type: "string" },
        nb_blok: { type: "string" },
        wettelijke_kaders: { type: "string" },
        sociale_achtergrond: { type: "string" },
        visie_werknemer: { type: "string" },
        visie_loopbaanadviseur: { type: "string" },
        prognose_bedrijfsarts: { type: "string" },
        persoonlijk_profiel: { type: "string" },
        praktische_belemmeringen: { type: "string" },
        zoekprofiel: { type: "string" },
        advies_ad_passende_arbeid: { type: "string" },
        pow_meter: { type: "string" },
        visie_plaatsbaarheid: { type: "string" },
        trajectdoel_activiteiten: { type: "string" },
        akkoordtekst: { type: "string" }
      }
    }
  },
  required: ["sections"]
} as const;
