import { isEmptyGegevensField } from '@/lib/tp2026/gegevens-autofill';
import { formatComputerSkillsOption } from '@/lib/tp2026/gegevens-field-options';

export type WorkerProfileFact = {
  label: string;
  value: string;
};

export type WorkerProfileGroup = {
  title: string;
  facts: WorkerProfileFact[];
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
};

export type WorkerProfileView = {
  name: string;
  job: string | null;
  groups: WorkerProfileGroup[];
  isEmpty: boolean;
};

function textFact(label: string, key: string, value: unknown): WorkerProfileFact | null {
  if (isEmptyGegevensField(key, value)) return null;
  return { label, value: String(value).trim() };
}

function booleanFact(label: string, value: boolean | null | undefined, yes = 'Ja', no = 'Nee'): WorkerProfileFact | null {
  if (typeof value !== 'boolean') return null;
  return { label, value: value ? yes : no };
}

function formatDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return value.trim();
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function joinNonEmpty(parts: Array<string | null>): string | null {
  const filled = parts.filter((part): part is string => Boolean(part && part.trim()));
  return filled.length > 0 ? filled.join(' · ') : null;
}

export function buildWorkerProfileView(input: WorkerProfileInput): WorkerProfileView {
  const name = [input.firstName, input.lastName].filter((part) => part && part.trim()).join(' ').trim();
  const jobFact = textFact('Huidig werk', 'current_job', input.currentJob);

  const contact: WorkerProfileFact[] = [];
  const email = textFact('E-mail', 'email', input.email);
  const phone = textFact('Telefoon', 'phone', input.phone);
  const birth = textFact('Geboortedatum', 'date_of_birth', input.dateOfBirth);
  const gender = textFact('Geslacht', 'gender', input.gender);
  if (email) contact.push(email);
  if (phone) contact.push(phone);
  if (birth) contact.push({ ...birth, value: formatDate(birth.value) });
  if (gender) contact.push(gender);

  const work: WorkerProfileFact[] = [];
  const experience = textFact('Werkervaring', 'work_experience', input.workExperience);
  const hours = typeof input.contractHours === 'number' ? { label: 'Contracturen', value: String(input.contractHours) } : null;
  const employers = textFact('Andere werkgevers', 'other_employers', input.otherEmployers);
  const ex = booleanFact('Ex-werknemer', input.isExWerknemer);
  if (experience) work.push(experience);
  if (hours) work.push(hours);
  if (employers) work.push(employers);
  if (ex) work.push(ex);

  const educationParts = joinNonEmpty([
    textFact('Opleiding', 'education_level', input.educationLevel)?.value ?? null,
    textFact('Opleiding', 'education_name', input.educationName)?.value ?? null,
  ]);

  const transport: WorkerProfileFact[] = [];
  const license = booleanFact('Rijbewijs', input.driversLicense, 'Ja', 'Geen');
  if (license) {
    const types = Array.isArray(input.driversLicenseType)
      ? input.driversLicenseType.map((type) => type.trim()).filter(Boolean)
      : [];
    transport.push(license.value === 'Ja' && types.length > 0 ? { label: 'Rijbewijs', value: types.join(', ') } : license);
  }
  const transportTypes = Array.isArray(input.transportType)
    ? input.transportType.map((type) => type.trim()).filter(Boolean)
    : [];
  if (transportTypes.length > 0) transport.push({ label: 'Vervoer', value: transportTypes.join(', ') });

  const language: WorkerProfileFact[] = [];
  const speaking = textFact('Spreken', 'dutch_speaking', input.dutchSpeaking);
  const writing = textFact('Schrijven', 'dutch_writing', input.dutchWriting);
  const reading = textFact('Lezen', 'dutch_reading', input.dutchReading);
  if (speaking) language.push(speaking);
  if (writing) language.push(writing);
  if (reading) language.push(reading);
  const computer = booleanFact('PC', input.hasComputer);
  if (computer) language.push(computer);
  const skillsLabel = formatComputerSkillsOption(input.computerSkills);
  if (skillsLabel) {
    const description = textFact('Toelichting', 'computer_skills_description', input.computerSkillsDescription);
    language.push({
      label: 'Computer',
      value: description ? `${skillsLabel} (${description.value})` : skillsLabel,
    });
  }

  const groups = [
    { title: 'Contact', facts: contact },
    { title: 'Werk', facts: work },
    educationParts ? { title: 'Opleiding', facts: [{ label: 'Opleiding', value: educationParts }] } : null,
    { title: 'Vervoer', facts: transport },
    { title: 'Taal en computer', facts: language },
  ].filter((group): group is WorkerProfileGroup => Boolean(group && group.facts.length > 0));

  return {
    name: name || 'Werknemer',
    job: jobFact?.value ?? null,
    groups,
    isEmpty: groups.length === 0,
  };
}
