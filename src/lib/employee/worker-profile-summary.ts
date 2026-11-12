import { isEmptyGegevensField } from '@/lib/tp2026/gegevens-autofill';
import { formatComputerSkillsOption } from '@/lib/tp2026/gegevens-field-options';

export type WorkerProfileRow = {
  label: string;
  value: string;
};

export type WorkerProfileGroup = {
  id: string;
  rows: WorkerProfileRow[];
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
  groups: WorkerProfileGroup[];
  isEmpty: boolean;
};

const MONTHS = [
  'januari',
  'februari',
  'maart',
  'april',
  'mei',
  'juni',
  'juli',
  'augustus',
  'september',
  'oktober',
  'november',
  'december',
];

function textRow(label: string, key: string, value: unknown): WorkerProfileRow | null {
  if (isEmptyGegevensField(key, value)) return null;
  return { label, value: String(value).trim() };
}

function formatDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return value.trim();
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return value.trim();
  return `${Number(match[3])} ${month} ${match[1]}`;
}

function joinNonEmpty(parts: Array<string | null | undefined>, separator = ' · '): string | null {
  const filled = parts.filter((part): part is string => Boolean(part && part.trim()));
  return filled.length > 0 ? filled.join(separator) : null;
}

function group(id: string, rows: Array<WorkerProfileRow | null>): WorkerProfileGroup | null {
  const filled = rows.filter((row): row is WorkerProfileRow => row !== null);
  return filled.length > 0 ? { id, rows: filled } : null;
}

export function buildWorkerProfileView(input: WorkerProfileInput): WorkerProfileView {
  const name = [input.firstName, input.lastName].filter((part) => part && part.trim()).join(' ').trim();
  const job = textRow('Huidig werk', 'current_job', input.currentJob)?.value ?? null;
  const client = textRow('Werkgever', 'client_name', input.clientName)?.value ?? null;
  const referent = textRow('Contactpersoon', 'referent_name', input.referentName)?.value ?? null;
  const owner = textRow('Eigenaar', 'owner_name', input.ownerName)?.value ?? null;
  const hours = typeof input.contractHours === 'number' ? `${input.contractHours} uur` : null;
  const role = job && client ? `${job} bij ${client}` : job || client;

  const groups: WorkerProfileGroup[] = [];
  const push = (next: WorkerProfileGroup | null) => {
    if (next) groups.push(next);
  };

  push(group('people', [
    client ? { label: 'Werkgever', value: client } : null,
    referent ? { label: 'Contactpersoon', value: referent } : null,
    owner ? { label: 'Dossier-eigenaar', value: owner } : null,
  ]));

  const birth = textRow('Geboortedatum', 'date_of_birth', input.dateOfBirth);
  const factRows: Array<WorkerProfileRow | null> = [
    textRow('E-mail', 'email', input.email),
    textRow('Telefoon', 'phone', input.phone),
    birth ? { ...birth, value: formatDate(birth.value) } : null,
    textRow('Geslacht', 'gender', input.gender),
  ];

  const education = joinNonEmpty([
    textRow('Opleiding', 'education_level', input.educationLevel)?.value,
    textRow('Opleiding', 'education_name', input.educationName)?.value,
  ]);
  const licenseTypes = Array.isArray(input.driversLicenseType)
    ? input.driversLicenseType.map((type) => type.trim()).filter(Boolean)
    : [];
  const license = input.driversLicense === true || licenseTypes.length > 0
    ? { label: 'Rijbewijs', value: licenseTypes.length > 0 ? licenseTypes.join(', ') : 'Ja' }
    : null;
  const transportTypes = Array.isArray(input.transportType)
    ? input.transportType.map((type) => type.trim()).filter(Boolean)
    : [];
  factRows.push(
    education ? { label: 'Opleiding', value: education } : null,
    license,
    transportTypes.length > 0 ? { label: 'Vervoer', value: transportTypes.join(', ') } : null,
    input.isExWerknemer === true ? { label: 'Ex-werknemer', value: 'Ja' } : null,
  );

  const speaking = textRow('Spreken', 'dutch_speaking', input.dutchSpeaking)?.value;
  const writing = textRow('Schrijven', 'dutch_writing', input.dutchWriting)?.value;
  const reading = textRow('Lezen', 'dutch_reading', input.dutchReading)?.value;
  const language = joinNonEmpty([
    speaking ? `Spreken ${speaking}` : null,
    writing ? `Schrijven ${writing}` : null,
    reading ? `Lezen ${reading}` : null,
  ]);
  factRows.push(language ? { label: 'Nederlands', value: language } : null);

  const skillsLabel = formatComputerSkillsOption(input.computerSkills);
  const skillsDescription = textRow('Toelichting', 'computer_skills_description', input.computerSkillsDescription);
  const computer = skillsLabel
    ? { label: 'Computer', value: skillsDescription ? `${skillsLabel}, ${skillsDescription.value}` : skillsLabel }
    : input.hasComputer === true
      ? { label: 'Computer', value: 'Ja' }
      : null;
  factRows.push(computer);
  push(group('facts', factRows));

  push(group('prose', [
    textRow('Werkervaring', 'work_experience', input.workExperience),
    textRow('Andere werkgevers', 'other_employers', input.otherEmployers),
  ]));

  const subtitle = joinNonEmpty([role, hours]);

  return {
    name: name || 'Werknemer',
    subtitle,
    meta: null,
    groups,
    isEmpty: groups.length === 0 && !subtitle,
  };
}
