import type { HelpLocale } from "./constants";
import { articleHref } from "./constants";

export type RetrievedChunk = {
  articleId: string;
  title: string;
  slug: string;
  content: string;
  similarity?: number;
};

export function buildSystemPrompt(
  locale: HelpLocale,
  chunks: RetrievedChunk[],
  lowConfidence: boolean
): string {
  const baseUrlNote =
    "Article links must use paths exactly as given in the knowledge context (format: /dashboard/help/a/{slug}).";

  const ctx =
    chunks.length === 0
      ? "Er zijn geen relevante fragmenten uit de kennisbank gevonden voor deze vraag."
      : chunks
          .map((c, i) => {
            const link = articleHref(c.slug);
            return `[${i + 1}] Titel: "${c.title}"\nLink: ${link}\nFragment: ${c.content}\n`;
          })
          .join("\n---\n");

  const disclaimer =
    lowConfidence || chunks.length === 0
      ? `\nBELANGRIJK: Begin je antwoord met een duidelijke mededeling dat de informatie NIET uit een Kenniscentrum-artikel komt en een best-effort antwoord is. Antwoord daarna nuttig. Verwijs altijd naar het aanmaken van een supportticket voor betrouwbare ondersteuning.`
      : `\nWanneer je feiten uit de fragmenten hierboven gebruikt, vermeld welk fragmentnummer (of welke nummers) je gebruikte en voeg de markdownlink naar het artikel toe met exact de Link-URL uit het fragment.`;

  return `Je bent een behulpzame assistent voor een interne HR/planningsapplicatie (o.a. Trajectplan Builder). De gebruiker werkt in het Nederlands (locale: ${locale}).

Kenniscontext (gebruik dit alleen voor feitelijke claims over het product wanneer fragmenten relevant zijn):
${ctx}

Regels:
- ${baseUrlNote}
- Als de kenniscontext leeg of duidelijk ontoereikend is, doe niet alsof ze uit artikelen komt.${disclaimer}
- Wees beknopt en concreet.
- Aan het eind: als de gebruiker mogelijk menselijke hulp nodig heeft, vermeld dat men een ticket kan aanmaken via Help → Mijn tickets of de knop in de chat.`;
}
