import { isEmptyGegevensField } from '@/lib/tp2026/gegevens-autofill';
import { formatComputerSkillsOption } from '@/lib/tp2026/gegevens-field-options';

export type WorkerProfileFact = {
  label: string;
  value: string;
  wide?: boolean;
};

export type WorkerProfileInput = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  currentJob?: string | null;
  workExperience?: string | null;
  contractHours?: number | null;
  otherEmployers?: string | null;
  isExWerknemer?: boolean | null;
  educationLevel?: string | null;
  educationName?: string | null;
  driversLicense?: boolean | null;
  driversLicenseType?: string[] | null;
  transportType?: string[] | null;
  dutchSpeaking?: string | null;
  dutchWriting?: string | null;
  dutchReading?: string | null;
  hasComputer?: boolean | null;
  computerSkills?: string | null;
  computerSkillsDescription?: string | null;
  clientName?: string | null;
  referentName?: string | null;
  ownerName?: string | null;
};

export type WorkerProfileView = {
  name: string;
  subtitle: string | null;
  meta: string | null;
  facts: WorkerProfileFact[];
  isEmpty: boolean;
};

function textFact(label: string, key: string, value: unknown, wide = false): WorkerProfileFact | null {
  if (isEmptyGegevensField(key, value)) return null;
  return { label, value: String(value).trim(), wide };
}

function formatDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return value.trim();
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function joinNonEmpty(parts: Array<string | null | undefined>): string | null {
  const filled = parts.filter((part): part is string => Boolean(part && part.trim()));
  return filled.length > 0 ? filled.join(' · ') : null;
}

export function buildWorkerProfileView(input: WorkerProfileInput): WorkerProfileView {
  const name = [input.firstName, input.lastName].filter((part) => part && part.trim()).join(' ').trim();
  const job = textFact('Huidig werk', 'current_job', input.currentJob)?.value ?? null;
  const client = textFact('Werkgever', 'client_name', input.clientName)?.value ?? null;
  const referent = textFact('Contactpersoon', 'referent_name', input.referentName)?.value ?? null;
  const owner = textFact('Eigenaar', 'owner_name', input.ownerName)?.value ?? null;

  const facts: WorkerProfileFact[] = [];
  const push = (fact: WorkerProfileFact | null) => {
    if (fact) facts.push(fact);
  };

  push(textFact('E-mail', 'email', input.email));
  push(textFact('Telefoon', 'phone', input.phone));
  const birth = textFact('Geboortedatum', 'date_of_birth', input.dateOfBirth);
  if (birth) push({ ...birth, value: formatDate(birth.value) });
  push(textFact('Geslacht', 'gender', input.gender));

  const education = joinNonEmpty([
    textFact('Opleiding', 'education_level', input.educationLevel)?.value,
    textFact('Opleiding', 'education_name', input.educationName)?.value,
  ]);
  if (education) facts.push({ label: 'Opleiding', value: education });

  const licenseTypes = Array.isArray(input.driversLicenseType)
    ? input.driversLicenseType.map((type) => type.trim()).filter(Boolean)
    : [];
  if (input.driversLicense === true || licenseTypes.length > 0) {
    facts.push({
      label: 'Rijbewijs',
      value: licenseTypes.length > 0 ? licenseTypes.join(', ') : 'Ja',
    });
  }

  const transportTypes = Array.isArray(input.transportType)
    ? input.transportType.map((type) => type.trim()).filter(Boolean)
    : [];
  if (transportTypes.length > 0) facts.push({ label: 'Vervoer', value: transportTypes.join(', ') });

  push(textFact('Spreken', 'dutch_speaking', input.dutchSpeaking));
  push(textFact('Schrijven', 'dutch_writing', input.dutchWriting));
  push(textFact('Lezen', 'dutch_reading', input.dutchReading));

  const skillsLabel = formatComputerSkillsOption(input.computerSkills);
  if (skillsLabel) {
    const description = textFact('Toelichting', 'computer_skills_description', input.computerSkillsDescription);
    facts.push({
      label: 'Computer',
      value: description ? `${skillsLabel} (${description.value})` : skillsLabel,
    });
  } else if (input.hasComputer === true) {
    facts.push({ label: 'PC', value: 'Ja' });
  }

  if (typeof input.contractHours === 'number') {
    facts.push({ label: 'Contracturen', value: String(input.contractHours) });
  }
  if (input.isExWerknemer === true) facts.push({ label: 'Ex-werknemer', value: 'Ja' });

  push(textFact('Werkervaring', 'work_experience', input.workExperience, true));
  push(textFact('Andere werkgevers', 'other_employers', input.otherEmployers, true));

  return {
    name: name || 'Werknemer',
    subtitle: joinNonEmpty([job, client]),
    meta: joinNonEmpty([
      referent ? `Contactpersoon ${referent}` : null,
      owner ? `Eigenaar ${owner}` : null,
    ]),
    facts,
    isEmpty: facts.length === 0 && !job,
  };
}
