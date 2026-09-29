'use client';

import type { IntakeData, IntakeSection6 } from '@/lib/intake/schema';
import { formatIntakeDateNl } from '@/lib/intake/format-date';

const DOCTOR_ROLES = ['Arts', 'Anios', 'Aios', 'BA', 'VA'] as const;
const OSV_ROLES = ['Arts', 'Anios', 'Aios', 'BA', 'VA'] as const;

const inputClass = 'w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm';

type PatchS6 = (patch: Partial<IntakeSection6>, opts?: { debounce?: boolean }) => void;

function Field({
  label,
  value,
  onChange,
  readOnly,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  type?: 'text' | 'date';
}) {
  if (readOnly) {
    const display = type === 'date' ? formatIntakeDateNl(value) : value;
    return (
      <div className="mb-1.5 text-[11pt] leading-snug">
        <span className="font-medium text-gray-800">{label}: </span>
        <span className="text-gray-700">{display || '—'}</span>
      </div>
    );
  }
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <input
        type={type}
        className={inputClass}
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </label>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
  readOnly,
}: {
  label: string;
  checked: boolean;
  onChange?: (v: boolean) => void;
  readOnly?: boolean;
}) {
  if (readOnly) {
    return (
      <span className="mr-2 inline-flex items-center gap-1 text-gray-700">
        <span aria-hidden>{checked ? '☒' : '☐'}</span>
        {label}
      </span>
    );
  }
  return (
    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300"
      />
      {label}
    </label>
  );
}

function RoleCheckboxes({
  value,
  onChange,
  roles,
  readOnly,
}: {
  value: string;
  onChange?: (v: string) => void;
  roles: readonly string[];
  readOnly?: boolean;
}) {
  return (
    <div className={readOnly ? 'inline' : 'grid gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-5'}>
      {roles.map((role) => (
        <Checkbox
          key={role}
          label={role}
          checked={value === role}
          readOnly={readOnly}
          onChange={(checked) => onChange?.(checked ? role : '')}
        />
      ))}
    </div>
  );
}

export type IntakeDossierHeaderProps = {
  data: IntakeData;
  /** When set, fields are editable; omit for print/read-only. */
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

  return (
    <section
      id="intake-sec-dossier"
      className={
        className ||
        (readOnly
          ? 'mb-5 break-inside-avoid border-b border-gray-300 pb-4'
          : 'scroll-mt-4 space-y-4 rounded-lg border border-gray-200 bg-white p-5')
      }
    >
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Dossiergegevens</h2>
          <Checkbox
            label="Ex-werknemer"
            checked={s6.is_ex_werknemer}
            onChange={(v) => patch({ is_ex_werknemer: v })}
          />
        </div>
      )}

      <div className={readOnly ? 'grid grid-cols-2 gap-x-6 gap-y-1' : 'grid gap-4 sm:grid-cols-2'}>
        <Field
          label="Geboortedatum"
          type="date"
          value={s6.date_of_birth}
          readOnly={readOnly}
          onChange={(v) => patch({ date_of_birth: v })}
        />
        <Field
          label="Weken"
          value={s6.weken}
          readOnly={readOnly}
          onChange={(v) => patch({ weken: v }, { debounce: true })}
        />
        <Field
          label="Aanmelddatum"
          type="date"
          value={s6.registration_date}
          readOnly={readOnly}
          onChange={(v) => patch({ registration_date: v })}
        />
        <Field
          label="Startdatum"
          type="date"
          value={s6.tp_start_date}
          readOnly={readOnly}
          onChange={(v) => patch({ tp_start_date: v })}
        />

        <div className={readOnly ? 'mb-1.5' : 'space-y-2'}>
          {readOnly ? (
            <div className="text-[11pt] leading-snug text-gray-700">
              <span className="font-medium text-gray-800">Datum </span>
              <Checkbox label="FML" checked={s6.fml_izp_lab_kind === 'fml'} readOnly />
              <Checkbox label="IZP" checked={s6.fml_izp_lab_kind === 'izp'} readOnly />
              <span>: {formatIntakeDateNl(s6.fml_izp_lab_date) || '—'}</span>
            </div>
          ) : (
            <>
              <Field
                label="Datum FML/IZP"
                type="date"
                value={s6.fml_izp_lab_date}
                onChange={(v) => patch({ fml_izp_lab_date: v })}
              />
              <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
                <Checkbox
                  label="FML"
                  checked={s6.fml_izp_lab_kind === 'fml'}
                  onChange={(checked) => patch({ fml_izp_lab_kind: checked ? 'fml' : '' })}
                />
                <Checkbox
                  label="IZP"
                  checked={s6.fml_izp_lab_kind === 'izp'}
                  onChange={(checked) => patch({ fml_izp_lab_kind: checked ? 'izp' : '' })}
                />
              </div>
            </>
          )}
        </div>

        <Field
          label="Einddatum"
          type="date"
          value={s6.tp_end_date}
          readOnly={readOnly}
          onChange={(v) => patch({ tp_end_date: v })}
        />

        <div className={readOnly ? 'mb-1.5 text-[11pt] leading-snug' : 'space-y-2'}>
          {readOnly ? (
            <>
              <div>
                <span className="font-medium text-gray-800">Naam </span>
                <RoleCheckboxes value={s6.doctor_role} roles={DOCTOR_ROLES} readOnly />
                <span className="text-gray-700">: {s6.occupational_doctor_name || '—'}</span>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700">Naam Arts / Anios / Aios / BA / VA</p>
              <RoleCheckboxes
                value={s6.doctor_role}
                roles={DOCTOR_ROLES}
                onChange={(v) => patch({ doctor_role: v })}
              />
              <Field
                label="Naam"
                value={s6.occupational_doctor_name}
                onChange={(v) => patch({ occupational_doctor_name: v }, { debounce: true })}
              />
            </>
          )}
        </div>

        <div className={readOnly ? 'mb-1.5 text-[11pt] leading-snug' : 'space-y-2'}>
          {readOnly ? (
            <div>
              <span className="font-medium text-gray-800">Datum AD-rapport: </span>
              <span className="text-gray-700">{formatIntakeDateNl(s6.ad_report_date) || '—'}</span>
              <span className="ml-3">
                <Checkbox label="Concept" checked={s6.ad_report_concept} readOnly />
              </span>
            </div>
          ) : (
            <>
              <Field
                label="Datum AD-rapport"
                type="date"
                value={s6.ad_report_date}
                onChange={(v) => patch({ ad_report_date: v })}
              />
              <Checkbox
                label="Concept"
                checked={s6.ad_report_concept}
                onChange={(v) => patch({ ad_report_concept: v })}
              />
            </>
          )}
        </div>

        <div className={readOnly ? 'mb-1.5 text-[11pt] leading-snug' : 'space-y-2'}>
          {readOnly ? (
            <div>
              <span className="font-medium text-gray-800">OSV </span>
              <RoleCheckboxes value={s6.osv_doctor_role} roles={OSV_ROLES} readOnly />
              <span className="text-gray-700">: {s6.osv_doctor_name || '—'}</span>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700">OSV Arts / Anios / Aios / BA / VA</p>
              <RoleCheckboxes
                value={s6.osv_doctor_role}
                roles={OSV_ROLES}
                onChange={(v) => patch({ osv_doctor_role: v })}
              />
              <Field
                label="Naam OSV"
                value={s6.osv_doctor_name}
                onChange={(v) => patch({ osv_doctor_name: v }, { debounce: true })}
              />
            </>
          )}
        </div>

        <Field
          label="Naam AD"
          value={s6.occupational_doctor_ad_name}
          readOnly={readOnly}
          onChange={(v) => patch({ occupational_doctor_ad_name: v }, { debounce: true })}
        />

        {readOnly && (
          <div className="col-span-2 mb-1">
            <Checkbox label="Ex-werknemer" checked={s6.is_ex_werknemer} readOnly />
          </div>
        )}
      </div>
    </section>
  );
}
