// Sections that never change (paste your exact boilerplates here)
import {
  TOELICHTING_DELIMITER,
  TOELICHTING_ONBEKEND,
  FUNCTIES_DELIMITER,
  AD_FUNCTIES_INTRO,
  FUNCTIE_FOOTER,
} from '@/lib/tp/visie-loopbaanadviseur/constants';

export const ALWAYS_SAME: Record<string, string> = {
  wettelijke_kaders: `• Het doel van het intakegesprek;
• Het doel, de inhoud en fasering van het tweede spoortraject;
• Rechten en plichten van zowel de werkgever als de werknemer in het kader van de Wet Verbetering Poortwachter;
• De verschillen tussen spoor 1 en spoor 2 en dat de beiden trajecten parallel aan elkaar (kunnen) worden ingezet;
• Wat de procedure is als een werknemer 2 jaar ziek is en geen ander passend werk heeft gevonden.
• Toelichting op de WIA-aanvraag. Wanneer een werknemer na twee jaar ziekte een WIA-uitkering aanvraagt, beoordeelt het UWV wat de werknemer nog kan verdienen, rekening houdend met de beperkingen in belastbaarheid.
• Waar het ValentineZ privacy- en klachtenreglement vindbaar zijn.`,
  visie_loopbaanadviseur: `${TOELICHTING_DELIMITER}\n${TOELICHTING_ONBEKEND}\n\n${FUNCTIES_DELIMITER}\n${AD_FUNCTIES_INTRO}\n\n• **En soortgelijk**\n\n${FUNCTIE_FOOTER}`,
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
