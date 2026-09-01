'use client';

import { GegevensSubsectionTitle } from '@/components/tp2026/GegevensEditorSection';
import FieldControl from '@/components/tp2026/FieldControl';
import { ComputerSkillsField } from '@/components/tp2026/ComputerSkillsField';
import {
  getGegevensFieldDef,
  type GegevensEditorRow,
  type GegevensFieldSpan,
} from '@/lib/tp2026/gegevens-editor-layout';
import type { TP2026FieldDef } from '@/lib/tp2026/schema';
import { adReportDateLabel, isAdReportConcept } from '@/lib/tp/ad-report-wording';
import { resolveOccupationalDoctorLabel } from '@/lib/tp/format-context';
import { hasFilledAdReportDate } from '@/lib/tp/intake-ad-presence';
import { materializeSpoor2ForExWerknemer } from '@/lib/tp/tp_activities';

function shouldHideField(key: string, data: Record<string, unknown>): boolean {
  if (
    key === 'ad_report_date' &&
    data.has_ad_report === false &&
    !hasFilledAdReportDate(data.ad_report_date)
  ) {
    return true;
  }
  if (key === 'drivers_license_type' && data.drivers_license !== true) return true;
  if (key === 'computer_skills' && data.has_computer === false) return true;
  return false;
}

function resolveFieldProps(field: TP2026FieldDef) {
  return {
    layout: 'stack' as const,
    compactBoolean: field.type === 'boolean',
    minRows: field.type === 'multiline' ? 3 : undefined,
  };
}

function gridClassForRow(keys: string[], spans?: GegevensFieldSpan[], override?: string): string {
  if (override) return override;
  if (keys.length === 3) return 'grid grid-cols-1 gap-y-4 sm:grid-cols-2 lg:grid-cols-3';
  if (keys.length === 2) return 'grid grid-cols-1 gap-y-4 sm:grid-cols-2';
  return 'grid grid-cols-1 gap-y-4';
}

export function GegevensEditorRow({
  row,
  data,
  updateField,
}: {
  row: GegevensEditorRow;
  data: Record<string, any>;
  updateField: (key: string, value: any) => void;
}) {
  const visibleKeys = row.keys.filter((key) => !shouldHideField(key, data));
  if (visibleKeys.length === 0) return null;

  const gridClass = gridClassForRow(visibleKeys, row.spans, row.gridClass);

  return (
    <div className="space-y-3">
      {row.subsection ? <GegevensSubsectionTitle>{row.subsection}</GegevensSubsectionTitle> : null}
      <div className={gridClass}>
        {visibleKeys.map((key) => {
          const fieldDef = getGegevensFieldDef(key);
          let field: TP2026FieldDef = fieldDef;
          if (key === 'ad_report_date') {
            field = { ...fieldDef, label: adReportDateLabel(isAdReportConcept(data)) };
          } else if (key === 'occupational_doctor_org') {
            field = {
              ...fieldDef,
              label: resolveOccupationalDoctorLabel(
                typeof data.occupational_doctor_org === 'string'
                  ? data.occupational_doctor_org
                  : null
              ),
            };
          }
          const props = resolveFieldProps(field);

          if (key === 'computer_skills') {
            return (
              <ComputerSkillsField
                key={key}
                field={field}
                level={data.computer_skills}
                description={data.computer_skills_description}
                updateField={updateField}
              />
            );
          }

          return (
            <FieldControl
              key={key}
              field={field}
              value={data[key]}
              onChange={(v) => {
                if (key === 'has_ad_report' && v === true) {
                  // Definitive AD present → clear concept so Ja is not overridden on shape/save.
                  updateField('ad_report_concept', false);
                }
                if (key === 'ad_report_concept' && v === true) {
                  updateField('has_ad_report', false);
                }
                if (key === 'is_ex_werknemer' && v === true) {
                  const spoor2 = materializeSpoor2ForExWerknemer(data.tp3_activities, true);
                  if (spoor2) updateField('tp3_activities', spoor2);
                }
                updateField(key, v);
              }}
              {...props}
            />
          );
        })}
      </div>
    </div>
  );
}
