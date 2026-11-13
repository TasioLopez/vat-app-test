'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FieldValidateButton } from '@/components/employee/FieldValidateButton';
import { ValidatableField } from '@/components/employee/ValidatableField';
import type { EmployeeDetailsPersist } from '@/lib/employee/autofill-persist';
import { isIncompleteContractHoursInput, parseContractHours } from '@/lib/employee/contract-hours';
import type {
  EmployeeDetailFieldKey,
  EmployeeFieldDisplayStatus,
} from '@/lib/employee/field-review';
import { INPUT_CLASS, SELECT_CLASS } from '@/lib/select-class';
import {
  COMPUTER_SKILLS_OPTIONS,
  DUTCH_LANGUAGE_OPTIONS,
  EDUCATION_LEVEL_CUSTOM_SELECT_VALUE,
  EDUCATION_LEVEL_OPTIONS,
  TRANSPORT_TYPE_OPTIONS,
  addCustomTransportType,
  coerceEducationLevelInput,
  getComputerSkillsDefaultDescription,
  getCustomEducationLevelLabel,
  normalizeEducationLevel,
  removeTransportType,
  splitTransportTypes,
} from '@/lib/tp2026/gegevens-field-options';
import { cn, isAbsentText } from '@/lib/utils';
import { CARD_CLASS, SECTION_LABEL_CLASS } from '@/components/employee/detail/shared';

type EmployeeNameFields = {
  first_name: string;
  last_name: string;
  email: string;
};

type Props = {
  employee: EmployeeNameFields;
  onEmployeeChange: (patch: Partial<EmployeeNameFields>) => void;
  details: EmployeeDetailsPersist | null;
  onDetailChange: (field: keyof EmployeeDetailsPersist, value: unknown) => void;
  getStatus: (field: EmployeeDetailFieldKey) => EmployeeFieldDisplayStatus;
  onValidate: (field: EmployeeDetailFieldKey) => void;
  /** Main employer, named in the hint for other employers. */
  clientName: string;
};

const DRIVERS_LICENSE_OPTIONS = [
  { value: 'B', label: 'B (Auto)' },
  { value: 'C', label: 'C (Vrachtwagen)' },
  { value: 'C1', label: 'C1 (Middelgrote vrachtwagen)' },
  { value: 'D', label: 'D (Bus)' },
  { value: 'D1', label: 'D1 (Kleine bus)' },
  { value: 'E', label: 'E (Aanhangwagen)' },
  { value: 'A', label: 'A (Motor)' },
  { value: 'AM', label: 'AM (Bromfiets)' },
  { value: 'A1', label: 'A1 (Motor beperkt)' },
  { value: 'A2', label: 'A2 (Motor beperkt)' },
  { value: 'BE', label: 'BE (Auto + Aanhangwagen)' },
  { value: 'CE', label: 'CE (Vrachtwagen + Aanhangwagen)' },
  { value: 'DE', label: 'DE (Bus + Aanhangwagen)' },
  { value: 'T', label: 'T (Trekker)' },
];

const DUTCH_SKILLS: Array<{ field: 'dutch_speaking' | 'dutch_writing' | 'dutch_reading'; label: string }> = [
  { field: 'dutch_speaking', label: 'Spreekvaardigheid' },
  { field: 'dutch_writing', label: 'Schrijfvaardigheid' },
  { field: 'dutch_reading', label: 'Leesvaardigheid' },
];

const FIELD_LABEL_CLASS = 'block text-[13px] font-medium text-gray-600';
const FIELD_GRID_CLASS = 'grid gap-x-4 gap-y-3 @xl:grid-cols-2 @4xl:grid-cols-3';

function statusSurfaceClass(status: EmployeeFieldDisplayStatus): string {
  if (status === 'validated') return 'border-green-500 bg-green-50/30';
  if (status === 'review') return 'border-yellow-400 bg-yellow-50/30';
  return '';
}

function statusTextClass(status: EmployeeFieldDisplayStatus): string {
  if (status === 'validated') return 'text-green-700';
  if (status === 'review') return 'text-yellow-700';
  return 'text-gray-800';
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="space-y-3 px-5 py-4">
      <h3 className={SECTION_LABEL_CLASS}>{title}</h3>
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('min-w-0 space-y-1', className)}>
      <label htmlFor={htmlFor} className={FIELD_LABEL_CLASS}>
        {label}
      </label>
      {children}
    </div>
  );
}

function CheckField({
  label,
  checked,
  status,
  onChange,
  onValidate,
}: {
  label: string;
  checked: boolean;
  status: EmployeeFieldDisplayStatus;
  onChange: (checked: boolean) => void;
  onValidate: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-purple-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-1"
        />
        <span className={statusTextClass(status)}>{label}</span>
      </label>
      <FieldValidateButton
        onClick={onValidate}
        disabled={status !== 'review'}
        label={`Valideer ${label.toLowerCase()}`}
        size="sm"
      />
    </div>
  );
}

function ToggleChip({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: (selected: boolean) => void;
}) {
  return (
    <label
      className={cn(
        'inline-flex cursor-pointer select-none items-center rounded-md border px-2.5 py-1 text-[13px] font-medium transition-colors focus-within:ring-2 focus-within:ring-purple-500/40',
        selected
          ? 'border-purple-500 bg-purple-50 text-purple-800'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
      )}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={selected}
        onChange={(event) => onToggle(event.target.checked)}
      />
      {label}
    </label>
  );
}

function ChipGroup({
  label,
  status,
  validateLabel,
  onValidate,
  children,
}: {
  label: string;
  status: EmployeeFieldDisplayStatus;
  validateLabel: string;
  onValidate: () => void;
  children: ReactNode;
}) {
  return (
    <div role="group" aria-label={label} className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={cn('text-[13px] font-medium', status === 'empty' ? 'text-gray-600' : statusTextClass(status))}>
          {label}
        </span>
        <FieldValidateButton
          onClick={onValidate}
          disabled={status !== 'review'}
          label={validateLabel}
          size="sm"
        />
      </div>
      {children}
    </div>
  );
}

export function ProfileForm({
  employee,
  onEmployeeChange,
  details,
  onDetailChange,
  getStatus,
  onValidate,
  clientName,
}: Props) {
  const [contractHoursText, setContractHoursText] = useState<string | null>(null);
  const [customTransportDraft, setCustomTransportDraft] = useState('');
  const [customEducationDraft, setCustomEducationDraft] = useState('');
  const [educationAndereOpen, setEducationAndereOpen] = useState(false);

  const fieldClass = (field: EmployeeDetailFieldKey) =>
    cn(INPUT_CLASS, statusSurfaceClass(getStatus(field)));
  const selectFieldClass = (field: EmployeeDetailFieldKey) =>
    cn(SELECT_CLASS, statusSurfaceClass(getStatus(field)));
  const canValidate = (field: EmployeeDetailFieldKey) => getStatus(field) === 'review';

  const licenseTypes = Array.isArray(details?.drivers_license_type) ? details.drivers_license_type : [];
  const transportTypes = Array.isArray(details?.transport_type) ? details.transport_type : [];
  const { custom: customTransport } = splitTransportTypes(transportTypes);

  const commitCustomTransport = () => {
    const next = addCustomTransportType(transportTypes, customTransportDraft);
    if (next !== transportTypes) onDetailChange('transport_type', next);
    setCustomTransportDraft('');
  };

  const storedCustomEducation = getCustomEducationLevelLabel(details?.education_level);
  const showAndereEducation = educationAndereOpen || !!storedCustomEducation;
  const educationSelectValue = showAndereEducation
    ? EDUCATION_LEVEL_CUSTOM_SELECT_VALUE
    : normalizeEducationLevel(details?.education_level) ?? undefined;
  const educationDraftValue =
    educationAndereOpen || customEducationDraft ? customEducationDraft : storedCustomEducation;
  const commitCustomEducation = () => {
    const next = coerceEducationLevelInput(educationDraftValue);
    if (!next) return;
    onDetailChange('education_level', next);
    setEducationAndereOpen(false);
    setCustomEducationDraft('');
  };

  return (
    <section aria-label="Gegevens bewerken" className={cn(CARD_CLASS, '@container divide-y divide-gray-100')}>
      <FormSection title="Persoonsgegevens">
        <div className={FIELD_GRID_CLASS}>
          <Field label="Voornaam" htmlFor="employee-first-name">
            <input
              id="employee-first-name"
              className={INPUT_CLASS}
              value={employee.first_name || ''}
              onChange={(event) => onEmployeeChange({ first_name: event.target.value })}
            />
          </Field>
          <Field label="Achternaam" htmlFor="employee-last-name">
            <input
              id="employee-last-name"
              className={INPUT_CLASS}
              value={employee.last_name || ''}
              onChange={(event) => onEmployeeChange({ last_name: event.target.value })}
            />
          </Field>
          <Field label="Geslacht" htmlFor="employee-gender">
            <ValidatableField
              onValidate={() => onValidate('gender')}
              canValidate={canValidate('gender')}
              validateLabel="Valideer geslacht"
            >
              <Select
                value={details?.gender || undefined}
                onValueChange={(value) => onDetailChange('gender', value)}
              >
                <SelectTrigger id="employee-gender" className={cn(selectFieldClass('gender'), 'pr-10')}>
                  <SelectValue placeholder="Selecteer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Man">Man</SelectItem>
                  <SelectItem value="Vrouw">Vrouw</SelectItem>
                  <SelectItem value="Anders">Anders</SelectItem>
                </SelectContent>
              </Select>
            </ValidatableField>
          </Field>
          <Field label="Geboortedatum" htmlFor="employee-date-of-birth">
            <ValidatableField
              onValidate={() => onValidate('date_of_birth')}
              canValidate={canValidate('date_of_birth')}
              validateLabel="Valideer geboortedatum"
            >
              <input
                id="employee-date-of-birth"
                className={cn(fieldClass('date_of_birth'), 'pr-10')}
                type="date"
                value={details?.date_of_birth || ''}
                onChange={(event) => onDetailChange('date_of_birth', event.target.value)}
              />
            </ValidatableField>
          </Field>
          <Field label="Telefoon" htmlFor="employee-phone">
            <ValidatableField
              onValidate={() => onValidate('phone')}
              canValidate={canValidate('phone')}
              validateLabel="Valideer telefoon"
            >
              <input
                id="employee-phone"
                className={cn(fieldClass('phone'), 'pr-10')}
                inputMode="tel"
                value={details?.phone || ''}
                onChange={(event) => onDetailChange('phone', event.target.value)}
              />
            </ValidatableField>
          </Field>
          <Field label="E-mail" htmlFor="employee-email">
            <input
              id="employee-email"
              className={INPUT_CLASS}
              inputMode="email"
              value={employee.email || ''}
              onChange={(event) => onEmployeeChange({ email: event.target.value })}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Werk">
        <div className={FIELD_GRID_CLASS}>
          <Field label="Huidig werk" htmlFor="employee-current-job">
            <ValidatableField
              onValidate={() => onValidate('current_job')}
              canValidate={canValidate('current_job')}
              validateLabel="Valideer huidig werk"
            >
              <Input
                id="employee-current-job"
                className={cn(fieldClass('current_job'), 'pr-10')}
                placeholder="Bijv. Jobcoach/stagebegeleider"
                value={details?.current_job || ''}
                onChange={(event) => onDetailChange('current_job', event.target.value)}
              />
            </ValidatableField>
          </Field>
          <Field label="Contracturen per week" htmlFor="employee-contract-hours">
            <ValidatableField
              onValidate={() => onValidate('contract_hours')}
              canValidate={canValidate('contract_hours')}
              validateLabel="Valideer contracturen"
            >
              <Input
                id="employee-contract-hours"
                className={cn(fieldClass('contract_hours'), 'pr-10')}
                type="text"
                inputMode="decimal"
                placeholder="Bijv. 36.5"
                value={
                  contractHoursText !== null
                    ? contractHoursText
                    : details?.contract_hours != null
                      ? String(details.contract_hours)
                      : ''
                }
                onFocus={() => {
                  setContractHoursText(
                    details?.contract_hours != null ? String(details.contract_hours) : ''
                  );
                }}
                onChange={(event) => {
                  const raw = event.target.value;
                  if (raw !== '' && !/^[\d.,]*$/.test(raw)) return;
                  setContractHoursText(raw);
                  if (raw.trim() === '') {
                    onDetailChange('contract_hours', null);
                    return;
                  }
                  if (isIncompleteContractHoursInput(raw)) return;
                  const parsed = parseContractHours(raw);
                  if (parsed != null) {
                    onDetailChange('contract_hours', parsed);
                  }
                }}
                onBlur={() => {
                  const raw = contractHoursText;
                  setContractHoursText(null);
                  if (raw == null) return;
                  if (raw.trim() === '') {
                    onDetailChange('contract_hours', null);
                    return;
                  }
                  onDetailChange('contract_hours', parseContractHours(raw));
                }}
              />
            </ValidatableField>
          </Field>
          <Field label="Werkervaring" htmlFor="employee-work-experience" className="col-span-full">
            <ValidatableField
              onValidate={() => onValidate('work_experience')}
              canValidate={canValidate('work_experience')}
              validateLabel="Valideer werkervaring"
              placement="textarea-top"
            >
              <Textarea
                id="employee-work-experience"
                className={cn(fieldClass('work_experience'), 'h-auto min-h-[60px] pr-10')}
                placeholder="Functietitels, komma-gescheiden (bijv. Magazijnmedewerker, Teamleider)"
                value={details?.work_experience || ''}
                onChange={(event) => onDetailChange('work_experience', event.target.value)}
              />
            </ValidatableField>
          </Field>
          <Field label="Andere werkgevers" htmlFor="employee-other-employers" className="col-span-full">
            <ValidatableField
              onValidate={() => onValidate('other_employers')}
              canValidate={canValidate('other_employers')}
              validateLabel="Valideer andere werkgevers"
              placement="textarea-top"
            >
              <Textarea
                id="employee-other-employers"
                className={cn(fieldClass('other_employers'), 'h-auto min-h-[60px] pr-10')}
                value={
                  isAbsentText(details?.other_employers) ? 'Geen' : details?.other_employers || 'Geen'
                }
                onChange={(event) => onDetailChange('other_employers', event.target.value)}
              />
            </ValidatableField>
            <p className="text-xs text-gray-500">
              Alleen andere huidige werkgevers bij meerdere banen, niet de hoofdwerkgever
              {clientName ? ` (${clientName})` : ''}.
            </p>
          </Field>
        </div>
        <CheckField
          label="Ex-werknemer"
          checked={Boolean(details?.is_ex_werknemer)}
          status={getStatus('is_ex_werknemer')}
          onChange={(checked) => onDetailChange('is_ex_werknemer', checked)}
          onValidate={() => onValidate('is_ex_werknemer')}
        />
      </FormSection>

      <FormSection title="Opleiding">
        <div className={FIELD_GRID_CLASS}>
          <Field label="Opleidingsniveau" htmlFor="employee-education-level">
            <ValidatableField
              onValidate={() => onValidate('education_level')}
              canValidate={canValidate('education_level')}
              validateLabel="Valideer opleidingsniveau"
            >
              <Select
                value={educationSelectValue}
                onValueChange={(value) => {
                  if (value === EDUCATION_LEVEL_CUSTOM_SELECT_VALUE) {
                    setEducationAndereOpen(true);
                    setCustomEducationDraft(storedCustomEducation);
                    return;
                  }
                  setEducationAndereOpen(false);
                  setCustomEducationDraft('');
                  onDetailChange('education_level', value);
                }}
              >
                <SelectTrigger
                  id="employee-education-level"
                  className={cn(selectFieldClass('education_level'), 'pr-10')}
                >
                  <SelectValue placeholder="Selecteer opleidingsniveau" />
                </SelectTrigger>
                <SelectContent>
                  {EDUCATION_LEVEL_OPTIONS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                  <SelectItem value={EDUCATION_LEVEL_CUSTOM_SELECT_VALUE}>Andere</SelectItem>
                </SelectContent>
              </Select>
            </ValidatableField>
            {showAndereEducation ? (
              <div className="flex items-center gap-2 pt-1">
                <Input
                  aria-label="Ander opleidingsniveau"
                  value={educationDraftValue}
                  onChange={(event) => {
                    setEducationAndereOpen(true);
                    setCustomEducationDraft(event.target.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      commitCustomEducation();
                    }
                  }}
                  placeholder="Bijv. Buitenlands diploma"
                  className="h-9 bg-white"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0 border-purple-300 text-purple-700 hover:bg-purple-50"
                  onClick={commitCustomEducation}
                >
                  Toevoegen
                </Button>
              </div>
            ) : null}
          </Field>
          <Field label="Specialisatie" htmlFor="employee-education-name">
            <ValidatableField
              onValidate={() => onValidate('education_name')}
              canValidate={canValidate('education_name')}
              validateLabel="Valideer specialisatie"
            >
              <Input
                id="employee-education-name"
                className={cn(fieldClass('education_name'), 'pr-10')}
                placeholder="Bijv. Kappersopleiding"
                value={details?.education_name || ''}
                onChange={(event) => onDetailChange('education_name', event.target.value)}
              />
            </ValidatableField>
          </Field>
        </div>
      </FormSection>

      <FormSection title="Mobiliteit">
        <CheckField
          label="Rijbewijs"
          checked={Boolean(details?.drivers_license)}
          status={getStatus('drivers_license')}
          onChange={(checked) => onDetailChange('drivers_license', checked)}
          onValidate={() => onValidate('drivers_license')}
        />

        {details?.drivers_license ? (
          <ChipGroup
            label="Rijbewijstype"
            status={getStatus('drivers_license_type')}
            validateLabel="Valideer rijbewijstype"
            onValidate={() => onValidate('drivers_license_type')}
          >
            <div className="flex flex-wrap gap-1.5">
              {DRIVERS_LICENSE_OPTIONS.map((option) => (
                <ToggleChip
                  key={option.value}
                  label={option.label}
                  selected={licenseTypes.includes(option.value)}
                  onToggle={(selected) =>
                    onDetailChange(
                      'drivers_license_type',
                      selected
                        ? [...licenseTypes, option.value]
                        : licenseTypes.filter((type) => type !== option.value)
                    )
                  }
                />
              ))}
            </div>
          </ChipGroup>
        ) : null}

        <ChipGroup
          label="Eigen vervoer"
          status={getStatus('transport_type')}
          validateLabel="Valideer eigen vervoer"
          onValidate={() => onValidate('transport_type')}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            {TRANSPORT_TYPE_OPTIONS.map((option) => (
              <ToggleChip
                key={option}
                label={option}
                selected={transportTypes.includes(option)}
                onToggle={(selected) =>
                  onDetailChange(
                    'transport_type',
                    selected
                      ? [...transportTypes, option]
                      : transportTypes.filter((type) => type !== option)
                  )
                }
              />
            ))}
            {customTransport.map((label) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 rounded-md border border-purple-500 bg-purple-50 py-1 pl-2.5 pr-1 text-[13px] font-medium text-purple-800"
              >
                {label}
                <button
                  type="button"
                  aria-label={`Verwijder ${label}`}
                  className="rounded px-1 leading-none text-purple-600 hover:bg-purple-200 hover:text-purple-900"
                  onClick={() => onDetailChange('transport_type', removeTransportType(transportTypes, label))}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              aria-label="Ander vervoer"
              value={customTransportDraft}
              onChange={(event) => setCustomTransportDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitCustomTransport();
                }
              }}
              placeholder="Ander vervoer, bijv. Scootmobiel"
              className="h-9 max-w-xs bg-white"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 border-purple-300 text-purple-700 hover:bg-purple-50"
              onClick={commitCustomTransport}
            >
              Toevoegen
            </Button>
          </div>
        </ChipGroup>
      </FormSection>

      <FormSection title="Taal & digitaal">
        <div role="group" aria-label="Nederlandse taalvaardigheid" className="grid gap-x-4 gap-y-3 @xl:grid-cols-3">
          {DUTCH_SKILLS.map(({ field, label }) => (
            <Field key={field} label={label} htmlFor={`employee-${field}`}>
              <ValidatableField
                onValidate={() => onValidate(field)}
                canValidate={canValidate(field)}
                validateLabel={`Valideer ${label.toLowerCase()}`}
                buttonSize="sm"
              >
                <Select
                  value={details?.[field] || undefined}
                  onValueChange={(value) => onDetailChange(field, value || null)}
                >
                  <SelectTrigger id={`employee-${field}`} className={cn(selectFieldClass(field), 'pr-9')}>
                    <SelectValue placeholder="Selecteer" />
                  </SelectTrigger>
                  <SelectContent>
                    {DUTCH_LANGUAGE_OPTIONS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ValidatableField>
            </Field>
          ))}
        </div>

        <Field label="Computervaardigheden" htmlFor="employee-computer-skills">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={details?.computer_skills || undefined}
              onValueChange={(value) => onDetailChange('computer_skills', value)}
            >
              <SelectTrigger
                id="employee-computer-skills"
                className={cn(selectFieldClass('computer_skills'), 'w-48')}
              >
                <SelectValue placeholder="Niveau" />
              </SelectTrigger>
              <SelectContent>
                {COMPUTER_SKILLS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.value} - {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {details?.computer_skills && details.computer_skills !== '1' ? (
              <Input
                aria-label="Toelichting computervaardigheden"
                className={cn(
                  selectFieldClass('computer_skills_description'),
                  'w-auto min-w-[12rem] max-w-md flex-1'
                )}
                value={
                  details.computer_skills_description ??
                  getComputerSkillsDefaultDescription(details.computer_skills)
                }
                onChange={(event) => onDetailChange('computer_skills_description', event.target.value)}
                placeholder={getComputerSkillsDefaultDescription(details.computer_skills)}
              />
            ) : null}
            <FieldValidateButton
              onClick={() => onValidate('computer_skills')}
              disabled={!canValidate('computer_skills')}
              label="Valideer computervaardigheden"
            />
          </div>
        </Field>

        <CheckField
          label="Heeft pc"
          checked={Boolean(details?.has_computer)}
          status={getStatus('has_computer')}
          onChange={(checked) => onDetailChange('has_computer', checked)}
          onValidate={() => onValidate('has_computer')}
        />
      </FormSection>
    </section>
  );
}
