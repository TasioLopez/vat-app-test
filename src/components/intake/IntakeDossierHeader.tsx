'use client';

import type { IntakeData, IntakeSection6 } from '@/lib/intake/schema';
import { formatIntakeDateNl } from '@/lib/intake/format-date';
import {
  IntakeChipGroup,
  IntakeField,
  IntakeToggleChip,
} from '@/components/intake/IntakeFormControls';

const DOCTOR_ROLES = ['Arts', 'Anios', 'Aios', 'BA', 'VA'] as const;
const OSV_ROLES = ['Arts', 'Anios', 'Aios', 'BA', 'VA'] as const;

type PatchS6 = (patch: Partial<IntakeSection6>, opts?: { debounce?: boolean }) => void;

function ReadOnlyField({
  label,
  value,
  type = 'text',
}: {
  label: string;
  value: string;
  type?: 'text' | 'date';
}) {
  const display = type === 'date' ? formatIntakeDateNl(value) : value;
  return (
    <div className="mb-1.5 text-[11pt] leading-snug">
      <span className="font-medium text-gray-800">{label}: </span>
      <span className="text-gray-700">{display || '—'}</span>
    </div>
  );
}

function ReadOnlyCheck({ label, checked }: { label: string; checked: boolean }) {
  return (
    <span className="mr-2 inline-flex items-center gap-1 text-gray-700">
      <span aria-hidden>{checked ? '☒' : '☐'}</span>
      {label}
    </span>
  );
}

function ReadOnlyRoles({ value, roles }: { value: string; roles: readonly string[] }) {
  return (
    <span className="inline">
      {roles.map((role) => (
        <ReadOnlyCheck key={role} label={role} checked={value === role} />
      ))}
    </span>
  );
}

export type IntakeDossierHeaderProps = {
  data: IntakeData;
  onPatchS6?: PatchS6;
  className?: string;
};

/**
 * Perfectview page-1 dossier grid (stored on s6).
 * Shown above §1 Gespreksinformatie in editor and print.
 */
export function IntakeDossierHeader({ data, onPatchS6, className }: IntakeDossierHeaderProps) {
  const s6 = data.s6;
  const readOnly = !onPatchS6;
  const patch = onPatchS6 || (() => {});

  if (readOnly) {
    return (
      <section
        id="intake-sec-dossier"
        className={className || 'mb-5 break-inside-avoid border-b border-gray-300 pb-4'}
      >
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          <ReadOnlyField label="Geboortedatum" type="date" value={s6.date_of_birth} />
          <ReadOnlyField label="Weken" value={s6.weken} />
          <ReadOnlyField label="Aanmelddatum" type="date" value={s6.registration_date} />
          <ReadOnlyField label="Startdatum" type="date" value={s6.tp_start_date} />
          <div className="mb-1.5 text-[11pt] leading-snug text-gray-700">
            <span className="font-medium text-gray-800">Datum </span>
            <ReadOnlyCheck label="FML" checked={s6.fml_izp_lab_kind === 'fml'} />
            <ReadOnlyCheck label="IZP" checked={s6.fml_izp_lab_kind === 'izp'} />
            <span>: {formatIntakeDateNl(s6.fml_izp_lab_date) || '—'}</span>
          </div>
          <ReadOnlyField label="Einddatum" type="date" value={s6.tp_end_date} />
          <div className="mb-1.5 text-[11pt] leading-snug">
            <span className="font-medium text-gray-800">Naam </span>
            <ReadOnlyRoles value={s6.doctor_role} roles={DOCTOR_ROLES} />
            <span className="text-gray-700">: {s6.occupational_doctor_name || '—'}</span>
          </div>
          <div className="mb-1.5 text-[11pt] leading-snug">
            <span className="font-medium text-gray-800">Datum AD-rapport: </span>
            <span className="text-gray-700">{formatIntakeDateNl(s6.ad_report_date) || '—'}</span>
            <span className="ml-3">
              <ReadOnlyCheck label="Concept" checked={s6.ad_report_concept} />
            </span>
          </div>
          <div className="mb-1.5 text-[11pt] leading-snug">
            <span className="font-medium text-gray-800">OSV </span>
            <ReadOnlyRoles value={s6.osv_doctor_role} roles={OSV_ROLES} />
            <span className="text-gray-700">: {s6.osv_doctor_name || '—'}</span>
          </div>
          <ReadOnlyField label="Naam AD" value={s6.occupational_doctor_ad_name} />
          <div className="col-span-2 mb-1">
            <ReadOnlyCheck label="Ex-werknemer" checked={s6.is_ex_werknemer} />
          </div>
        </div>
      </section>
    );
  }

  const roleOptions = DOCTOR_ROLES.map((r) => ({ value: r, label: r }));

  return (
    <section
      id="intake-sec-dossier"
      className={
        className ||
        'scroll-mt-4 space-y-5 rounded-lg border border-gray-200 bg-white p-5 shadow-sm'
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Dossiergegevens</h2>
        <IntakeToggleChip
          label="Ex-werknemer"
          checked={s6.is_ex_werknemer}
          onChange={(v) => patch({ is_ex_werknemer: v })}
        />
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-purple-800/80">
          Trajectdata
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <IntakeField
            label="Geboortedatum"
            type="date"
            value={s6.date_of_birth}
            onChange={(v) => patch({ date_of_birth: v })}
          />
          <IntakeField
            label="Weken"
            value={s6.weken}
            onChange={(v) => patch({ weken: v }, { debounce: true })}
          />
          <IntakeField
            label="Aanmelddatum"
            type="date"
            value={s6.registration_date}
            onChange={(v) => patch({ registration_date: v })}
          />
          <IntakeField
            label="Startdatum"
            type="date"
            value={s6.tp_start_date}
            onChange={(v) => patch({ tp_start_date: v })}
          />
          <div className="space-y-2">
            <IntakeField
              label="Datum FML/IZP"
              type="date"
              value={s6.fml_izp_lab_date}
              onChange={(v) => patch({ fml_izp_lab_date: v })}
            />
            <IntakeChipGroup
              options={[
                { value: 'fml', label: 'FML' },
                { value: 'izp', label: 'IZP' },
              ]}
              value={s6.fml_izp_lab_kind}
              onChange={(v) => patch({ fml_izp_lab_kind: v as IntakeSection6['fml_izp_lab_kind'] })}
            />
          </div>
          <IntakeField
            label="Einddatum"
            type="date"
            value={s6.tp_end_date}
            onChange={(v) => patch({ tp_end_date: v })}
          />
        </div>
      </div>

      <div className="space-y-3 border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-purple-800/80">
          Artsen / OSV
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">Rol arts</p>
            <IntakeChipGroup
              options={roleOptions}
              value={s6.doctor_role}
              onChange={(v) => patch({ doctor_role: v })}
            />
            <IntakeField
              label="Naam"
              value={s6.occupational_doctor_name}
              onChange={(v) => patch({ occupational_doctor_name: v }, { debounce: true })}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">OSV-rol</p>
            <IntakeChipGroup
              options={roleOptions}
              value={s6.osv_doctor_role}
              onChange={(v) => patch({ osv_doctor_role: v })}
            />
            <IntakeField
              label="Naam OSV"
              value={s6.osv_doctor_name}
              onChange={(v) => patch({ osv_doctor_name: v }, { debounce: true })}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-purple-800/80">
          AD-rapport
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <IntakeField
              label="Datum AD-rapport"
              type="date"
              value={s6.ad_report_date}
              onChange={(v) => patch({ ad_report_date: v })}
            />
            <IntakeToggleChip
              label="Concept"
              checked={s6.ad_report_concept}
              onChange={(v) => patch({ ad_report_concept: v })}
            />
          </div>
          <IntakeField
            label="Naam AD"
            value={s6.occupational_doctor_ad_name}
            onChange={(v) => patch({ occupational_doctor_ad_name: v }, { debounce: true })}
          />
        </div>
      </div>
    </section>
  );
}
