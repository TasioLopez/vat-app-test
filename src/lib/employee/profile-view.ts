import { parseContractHours } from '@/lib/employee/contract-hours';
import {
  getEmployeeFieldDisplayStatus,
  type EmployeeDetailFieldKey,
  type EmployeeFieldReviewStatus,
} from '@/lib/employee/field-review';
import { formatPhoneForDisplay } from '@/lib/phone/format-dutch-display';
import { formatComputerSkills, isAbsentText, normalizeStringArrayField } from '@/lib/utils';

export type ProfileFactStatus = 'none' | 'review' | 'validated';

export type ProfileDetailsInput = Partial<Record<EmployeeDetailFieldKey, unknown>> & {
  field_review_status?: Partial<Record<EmployeeDetailFieldKey, EmployeeFieldReviewStatus>> | null;
  field_content_hash?: Partial<Record<EmployeeDetailFieldKey, string>> | null;
};

export type ProfileViewInput = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  clientName?: string | null;
  details?: ProfileDetailsInput | null;
  /** Injected for age calculation in tests. */
  now?: Date;
};

type ReviewState = {
  status: ProfileFactStatus;
  /** Fields behind this fact that still wait for validation. */
  reviewFields: EmployeeDetailFieldKey[];
};

export type ProfileHeaderFactId = 'gender' | 'date_of_birth' | 'phone' | 'email';

export type ProfileHeaderFact = ReviewState & {
  id: ProfileHeaderFactId;
  text: string;
  href?: string;
};

export type ProfileRow = ReviewState & {
  id: string;
  label: string;
  text: string | null;
  chips: string[];
};

export type ProfileGroupId = 'werk' | 'opleiding' | 'mobiliteit' | 'taal_digitaal';

export type ProfileGroup = {
  id: ProfileGroupId;
  label: string;
  rows: ProfileRow[];
};

export type EmployeeProfileView = {
  name: string;
  initials: string;
  subtitle: string | null;
  /** Present when the worker is marked as ex-werknemer. */
  exWerknemer: ReviewState | null;
  headerFacts: ProfileHeaderFact[];
  groups: ProfileGroup[];
  /** Labels of fields that have a clear empty state and are not filled yet. */
  emptyLabels: string[];
  /** Visible facts that still wait for validation. */
  reviewCount: number;
  hasProfileFacts: boolean;
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

const NAME_PREFIXES = new Set([
  'van',
  'de',
  'der',
  'den',
  'het',
  "'t",
  'ten',
  'ter',
  'te',
  'in',
  'op',
  'von',
  'la',
  'le',
  'da',
  'do',
  'dos',
  'el',
  'al',
]);

/** Work-experience titles longer than this read as prose, not as a chip. */
const MAX_CHIP_LENGTH = 40;

const NO_REVIEW: ReviewState = { status: 'none', reviewFields: [] };

function cleanText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function firstLetter(value: string): string {
  const match = /\p{L}/u.exec(value);
  return match ? match[0].toUpperCase() : '';
}

function buildInitials(firstName: string, lastName: string): string {
  const words = lastName.split(/\s+/).filter(Boolean);
  const mainWord = words.find((word) => !NAME_PREFIXES.has(word.toLowerCase())) ?? words[0] ?? '';
  return `${firstLetter(firstName)}${firstLetter(mainWord)}`;
}

function parseIsoDate(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

export function calculateAge(dateOfBirth: string, now: Date = new Date()): number | null {
  const parsed = parseIsoDate(dateOfBirth.trim());
  if (!parsed) return null;
  let age = now.getFullYear() - parsed.year;
  const beforeBirthday =
    now.getMonth() + 1 < parsed.month ||
    (now.getMonth() + 1 === parsed.month && now.getDate() < parsed.day);
  if (beforeBirthday) age -= 1;
  return age >= 0 && age <= 120 ? age : null;
}

export function formatBirthDate(dateOfBirth: string, now: Date = new Date()): string {
  const trimmed = dateOfBirth.trim();
  const parsed = parseIsoDate(trimmed);
  if (!parsed) return trimmed;
  const date = `${parsed.day} ${MONTHS[parsed.month - 1]} ${parsed.year}`;
  const age = calculateAge(trimmed, now);
  return age === null ? date : `${date} (${age} jaar)`;
}

export function formatContractHours(value: unknown): string | null {
  const hours = parseContractHours(value);
  if (hours === null) return null;
  return `${String(hours).replace('.', ',')} uur per week`;
}

export function buildEmployeeProfileView(input: ProfileViewInput): EmployeeProfileView {
  const details: ProfileDetailsInput = input.details ?? {};
  const now = input.now ?? new Date();

  const statusOf = (field: EmployeeDetailFieldKey) =>
    getEmployeeFieldDisplayStatus(
      field,
      details,
      details.field_review_status,
      details.field_content_hash
    );

  const reviewState = (fields: EmployeeDetailFieldKey[]): ReviewState => {
    const statuses = fields.map(statusOf);
    const reviewFields = fields.filter((_, index) => statuses[index] === 'review');
    if (reviewFields.length > 0) return { status: 'review', reviewFields };
    if (statuses.includes('validated')) return { status: 'validated', reviewFields };
    return NO_REVIEW;
  };

  /** A "no" only counts as a fact once someone, or the AI, has put it on record. */
  const isAsserted = (field: EmployeeDetailFieldKey) => statusOf(field) !== 'empty';

  const emptyLabels: string[] = [];

  // Header
  const firstName = cleanText(input.firstName);
  const lastName = cleanText(input.lastName);
  const name = [firstName, lastName].filter(Boolean).join(' ');
  const currentJob = cleanText(details.current_job);
  const clientName = cleanText(input.clientName);
  const subtitle = [currentJob, clientName].filter(Boolean).join(' · ') || null;

  const headerFacts: ProfileHeaderFact[] = [];

  const gender = cleanText(details.gender);
  if (gender) headerFacts.push({ id: 'gender', text: gender, ...reviewState(['gender']) });

  const dateOfBirth = cleanText(details.date_of_birth);
  if (dateOfBirth) {
    headerFacts.push({
      id: 'date_of_birth',
      text: formatBirthDate(dateOfBirth, now),
      ...reviewState(['date_of_birth']),
    });
  }

  const phone = cleanText(details.phone);
  if (phone) {
    headerFacts.push({
      id: 'phone',
      text: formatPhoneForDisplay(phone),
      href: `tel:${phone.replace(/[^\d+]/g, '')}`,
      ...reviewState(['phone']),
    });
  }

  const email = cleanText(input.email);
  if (email) headerFacts.push({ id: 'email', text: email, href: `mailto:${email}`, ...NO_REVIEW });

  if (!email) emptyLabels.push('E-mail');
  if (!phone) emptyLabels.push('Telefoon');
  if (!gender) emptyLabels.push('Geslacht');
  if (!dateOfBirth) emptyLabels.push('Geboortedatum');

  const exWerknemer = details.is_ex_werknemer === true ? reviewState(['is_ex_werknemer']) : null;

  // Werk
  const werk: ProfileRow[] = [];

  if (currentJob) {
    werk.push({
      id: 'current_job',
      label: 'Huidig werk',
      text: currentJob,
      chips: [],
      ...reviewState(['current_job']),
    });
  } else {
    emptyLabels.push('Huidig werk');
  }

  const experience = normalizeStringArrayField(details.work_experience);
  if (experience.length > 0) {
    const asChips =
      experience.length > 1 && experience.every((title) => title.length <= MAX_CHIP_LENGTH);
    werk.push({
      id: 'work_experience',
      label: 'Werkervaring',
      text: asChips ? null : experience.join(', '),
      chips: asChips ? experience : [],
      ...reviewState(['work_experience']),
    });
  } else {
    emptyLabels.push('Werkervaring');
  }

  const contractHours = formatContractHours(details.contract_hours);
  if (contractHours) {
    werk.push({
      id: 'contract_hours',
      label: 'Contracturen',
      text: contractHours,
      chips: [],
      ...reviewState(['contract_hours']),
    });
  } else {
    emptyLabels.push('Contracturen');
  }

  if (!isAbsentText(details.other_employers)) {
    werk.push({
      id: 'other_employers',
      label: 'Andere werkgevers',
      text: cleanText(details.other_employers),
      chips: [],
      ...reviewState(['other_employers']),
    });
  } else if (isAsserted('other_employers')) {
    werk.push({
      id: 'other_employers',
      label: 'Andere werkgevers',
      text: 'Geen',
      chips: [],
      ...reviewState(['other_employers']),
    });
  }

  // Opleiding
  const opleiding: ProfileRow[] = [];

  const educationLevel = cleanText(details.education_level);
  if (educationLevel) {
    opleiding.push({
      id: 'education_level',
      label: 'Niveau',
      text: educationLevel,
      chips: [],
      ...reviewState(['education_level']),
    });
  } else {
    emptyLabels.push('Opleidingsniveau');
  }

  const educationName = cleanText(details.education_name);
  if (educationName) {
    opleiding.push({
      id: 'education_name',
      label: 'Specialisatie',
      text: educationName,
      chips: [],
      ...reviewState(['education_name']),
    });
  } else {
    emptyLabels.push('Specialisatie');
  }

  // Mobiliteit
  const mobiliteit: ProfileRow[] = [];

  if (details.drivers_license === true) {
    const types = normalizeStringArrayField(details.drivers_license_type);
    mobiliteit.push({
      id: 'drivers_license',
      label: 'Rijbewijs',
      text: types.length > 0 ? null : 'Ja',
      chips: types,
      ...reviewState(
        types.length > 0 ? ['drivers_license', 'drivers_license_type'] : ['drivers_license']
      ),
    });
  } else if (details.drivers_license === false && isAsserted('drivers_license')) {
    mobiliteit.push({
      id: 'drivers_license',
      label: 'Rijbewijs',
      text: 'Geen rijbewijs',
      chips: [],
      ...reviewState(['drivers_license']),
    });
  }

  const transport = normalizeStringArrayField(details.transport_type);
  if (transport.length > 0) {
    mobiliteit.push({
      id: 'transport_type',
      label: 'Vervoer',
      text: null,
      chips: transport,
      ...reviewState(['transport_type']),
    });
  } else {
    emptyLabels.push('Eigen vervoer');
  }

  // Taal & digitaal
  const taalDigitaal: ProfileRow[] = [];

  const languageParts: string[] = [];
  const languageFields: EmployeeDetailFieldKey[] = [];
  const languageSkills: Array<[EmployeeDetailFieldKey, string, string]> = [
    ['dutch_speaking', 'Spreken', 'Spreekvaardigheid'],
    ['dutch_writing', 'Schrijven', 'Schrijfvaardigheid'],
    ['dutch_reading', 'Lezen', 'Leesvaardigheid'],
  ];
  for (const [field, shortLabel, emptyLabel] of languageSkills) {
    const level = cleanText(details[field]);
    if (level) {
      languageParts.push(`${shortLabel} ${level.toLowerCase()}`);
      languageFields.push(field);
    } else {
      emptyLabels.push(emptyLabel);
    }
  }
  if (languageParts.length > 0) {
    taalDigitaal.push({
      id: 'dutch',
      label: 'Nederlands',
      text: languageParts.join(' · '),
      chips: [],
      ...reviewState(languageFields),
    });
  }

  const computerSkills = cleanText(details.computer_skills);
  if (computerSkills) {
    const hasNoSkills = computerSkills === '1';
    taalDigitaal.push({
      id: 'computer_skills',
      label: 'Computer',
      text: hasNoSkills
        ? 'Geen vaardigheden'
        : formatComputerSkills(computerSkills, cleanText(details.computer_skills_description)),
      chips: [],
      ...reviewState(
        hasNoSkills ? ['computer_skills'] : ['computer_skills', 'computer_skills_description']
      ),
    });
  } else {
    emptyLabels.push('Computervaardigheden');
  }

  if (details.has_computer === true) {
    taalDigitaal.push({
      id: 'has_computer',
      label: 'Eigen pc',
      text: 'Ja',
      chips: [],
      ...reviewState(['has_computer']),
    });
  } else if (details.has_computer === false && isAsserted('has_computer')) {
    taalDigitaal.push({
      id: 'has_computer',
      label: 'Eigen pc',
      text: 'Nee',
      chips: [],
      ...reviewState(['has_computer']),
    });
  }

  const allGroups: ProfileGroup[] = [
    { id: 'werk', label: 'Werk', rows: werk },
    { id: 'opleiding', label: 'Opleiding', rows: opleiding },
    { id: 'mobiliteit', label: 'Mobiliteit', rows: mobiliteit },
    { id: 'taal_digitaal', label: 'Taal & digitaal', rows: taalDigitaal },
  ];
  const groups = allGroups.filter((group) => group.rows.length > 0);

  const reviewCount =
    headerFacts.filter((fact) => fact.status === 'review').length +
    (exWerknemer?.status === 'review' ? 1 : 0) +
    groups.reduce(
      (total, group) => total + group.rows.filter((row) => row.status === 'review').length,
      0
    );

  return {
    name: name || 'Naamloze werknemer',
    initials: buildInitials(firstName, lastName),
    subtitle,
    exWerknemer,
    headerFacts,
    groups,
    emptyLabels,
    reviewCount,
    hasProfileFacts: groups.length > 0,
  };
}
