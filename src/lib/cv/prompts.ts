import type { CvModel } from '@/types/cv';
import type { CvDocKind, CvFacts } from '@/lib/cv/facts';

export function cvDocExtractionSystemPrompt(kind: CvDocKind): string {
  const focusByKind: Record<CvDocKind, string> = {
    intake:
      'Focus op persoonlijke basisgegevens, praktische inzetbaarheid (rijbewijs/vervoer/uren), vaardigheden, talen en opleidingen.',
    ad:
      'Focus op werkervaring, belastbaarheid in werkcontext, concrete taken en passende functies.',
    vgr:
      'Focus op arbeidsverleden, competenties, motivatie, leerpunten en inzetbare richtingen.',
    other: 'Extract alleen duidelijke CV-relevante feiten als ze expliciet in de tekst staan.',
  };

  return `Je bent een Nederlandse CV-fact extractor.
Doel: extraheer feiten uit EEN document naar JSON.
${focusByKind[kind]}

Regels:
- Alleen feiten die in de tekst staan; geen verzinsels.
- Korte, concrete waarden.
- Gebruik Nederlands.
- Als onbekend: laat veld leeg of array leeg.
- Geef ALLEEN geldige JSON terug.

Verplicht JSON schema:
{
  "personal": {
    "title": "",
    "phone": "",
    "email": "",
    "location": "",
    "dateOfBirth": ""
  },
  "profileHints": [""],
  "experienceFacts": [
    { "role": "", "organization": "", "period": "", "description": "" }
  ],
  "educationFacts": [
    { "institution": "", "diploma": "", "period": "", "description": "" }
  ],
  "skills": [""],
  "languages": [
    { "language": "", "level": "" }
  ],
  "interestsHints": [""],
  "extraHints": [""],
  "mobility": {
    "driversLicense": true,
    "licenseTypes": [""],
    "transport": [""],
    "contractHours": ""
  }
}`;
}

export function cvDocExtractionUserPrompt(kind: CvDocKind, text: string): string {
  return `Documenttype: ${kind}

Documenttekst:
${text}

Extraheer feiten volgens het schema en geef ALLEEN JSON terug.`;
}

export function cvComposeSystemPrompt(): string {
  return `Je bent een ervaren Nederlandse CV-schrijver.
Je antwoordt ALLEEN met geldige JSON volgens CvModel:
{
  personal: { fullName, title, email, phone, location, dateOfBirth?, photoStoragePath?, photoUrl? },
  profile: string,
  experience: [{ id, role, organization?, period?, description? }],
  education: [{ id, institution, diploma?, period?, description? }],
  skills: [{ id, text }],
  languages: [{ id, language, level? }],
  interests: [{ id, text }],
  extra: string,
  options?: { includePhotoInCv?: boolean }
}

Behoud altijd personal.photoStoragePath en options.includePhotoInCv uit de huidige CV tenzij expliciet leeg; verzin geen fotopaden.

Kwaliteitseisen:
- profile: 4-6 zinnen, professioneel en concreet.
- experience: minimaal 2 items als er bewijs is; per item inhoudelijke beschrijving (taken/resultaat/context).
- education: vul diploma/description waar mogelijk vanuit feiten.
- skills: streef 8-12 relevante vaardigheden als bewijs/hints dit toelaten.
- interests: streef 4-8 relevante interesses als hints aanwezig zijn.
- extra: compacte alinea over inzetbaarheid (rijbewijs, vervoer, contracturen, beschikbaarheid).
- Geen markdown, geen toelichting buiten JSON.
- Behoud bestaande IDs wanneer een item logisch hetzelfde blijft.`;
}

export function cvComposeUserPrompt(input: {
  mode: 'fill' | 'polish';
  current: CvModel;
  seeded: CvModel;
  employee: unknown;
  details: unknown;
  facts: CvFacts;
}): string {
  const modeInstruction =
    input.mode === 'fill'
      ? 'Modus: VULLEN. Vul dunne/lege secties agressiever aan op basis van facts + seed, maar verzin geen harde feiten.'
      : 'Modus: POLISH. Herschrijf voor hogere kwaliteit en volledigheid, met behoud van feitelijke kern.';

  return `${modeInstruction}

Brondata:
- Employee: ${JSON.stringify(input.employee)}
- Employee details: ${JSON.stringify(input.details)}
- Geanalyseerde document-facts: ${JSON.stringify(input.facts)}
- Seedmodel: ${JSON.stringify(input.seeded)}
- Huidige CV: ${JSON.stringify(input.current)}

Geef het VOLLEDIGE CvModel terug als JSON.`;
}

export function cvRewriteUserPrompt(input: {
  current: CvModel;
  deficits: string[];
  facts: CvFacts;
}): string {
  return `Herschrijf dit CvModel om kwaliteitsproblemen op te lossen.
Problemen:
${input.deficits.map((d, i) => `${i + 1}. ${d}`).join('\n')}

Gebruik deze feiten als bron:
${JSON.stringify(input.facts)}

Huidig CvModel:
${JSON.stringify(input.current)}

Geef ALLEEN het verbeterde, volledige CvModel als JSON.`;
}
