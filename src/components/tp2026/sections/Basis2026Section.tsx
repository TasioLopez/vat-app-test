'use client';

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { TP2026FieldDef } from '@/lib/tp2026/schema';
import { TP2026BasisFields } from '@/lib/tp2026/schema';
import { TP2026_BASIS_AUTOFILL_ENDPOINTS } from '@/lib/tp2026/basis-autofill-endpoints';
import {
  BASIS_EDITOR_SECTIONS,
  getBasisEditorSection,
  type BasisEditorSectionId,
} from '@/lib/tp2026/basis-editor-sections';
import {
  BASIS_SECTION_STATUS_BORDER,
  BASIS_SECTION_STATUS_LABELS,
  getBasisSectionDisplayStatus,
  isBasisSectionEmpty,
  markBasisSectionValidated,
  type BasisSectionDisplayStatus,
} from '@/lib/tp2026/basis-section-review';
import FieldControl from '@/components/tp2026/FieldControl';
import { Spoor2ActivitiesEditor } from '@/components/tp2026/Spoor2ActivitiesEditor';
import { InleidingSubBlock } from '@/components/tp/InleidingSubBlock';
import { Button } from '@/components/ui/button';

export { Basis2026A4Pages } from '@/components/tp2026/Basis2026A4Measured';

const Basis2026MarkdownFieldEditor = dynamic(
  () =>
    import('@/components/tp2026/Basis2026MarkdownFieldEditor').then((m) => m.Basis2026MarkdownFieldEditor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[220px] rounded-md border border-dashed border-[#b8985c]/50 bg-muted/40" aria-hidden />
    ),
  }
);

const BASIS_FIELD_BY_KEY = new Map(TP2026BasisFields.map((field) => [field.key, field]));

type EditorProps = {
  data: Record<string, any>;
  updateField: (key: string, value: any) => void;
  onAutofillField?: (fieldKey: string) => Promise<void>;
};

export function Basis2026Editor({ data, updateField, onAutofillField }: EditorProps) {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [activeSectionId, setActiveSectionId] = useState<BasisEditorSectionId | null>(null);

  const openSection = (sectionId: BasisEditorSectionId) => {
    setActiveSectionId(sectionId);
    setView('detail');
  };

  const backToList = () => {
    setView('list');
    setActiveSectionId(null);
  };

  if (view === 'detail' && activeSectionId) {
    const sectionIndex = BASIS_EDITOR_SECTIONS.findIndex((s) => s.id === activeSectionId);
    const nextSection = sectionIndex >= 0 ? BASIS_EDITOR_SECTIONS[sectionIndex + 1] : undefined;

    return (
      <Basis2026SectionDetail
        sectionId={activeSectionId}
        data={data}
        updateField={updateField}
        onAutofillField={onAutofillField}
        onBack={backToList}
        onOpenNext={nextSection ? () => openSection(nextSection.id) : undefined}
      />
    );
  }

  return <Basis2026SectionList data={data} onOpenSection={openSection} />;
}

function Basis2026SectionList({
  data,
  onOpenSection,
}: {
  data: Record<string, any>;
  onOpenSection: (sectionId: BasisEditorSectionId) => void;
}) {
  const summary = useMemo(() => {
    let validated = 0;
    let filled = 0;
    for (const section of BASIS_EDITOR_SECTIONS) {
      const status = getBasisSectionDisplayStatus(section.id, data);
      if (status !== 'empty') filled += 1;
      if (status === 'validated') validated += 1;
    }
    return { validated, total: BASIS_EDITOR_SECTIONS.length, filled };
  }, [data]);

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Secties basisdocument</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Open een sectie om te bewerken, autofill te gebruiken of te valideren.
        </p>
      </div>

      <ul className="space-y-2">
        {BASIS_EDITOR_SECTIONS.map((section) => {
          const status = getBasisSectionDisplayStatus(section.id, data);
          return (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => onOpenSection(section.id)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg border-2 bg-white px-4 py-3 text-left shadow-sm transition hover:border-[#6d2a96]/40 hover:bg-[#6d2a96]/5 ${BASIS_SECTION_STATUS_BORDER[status]}`}
              >
                <span className="text-sm font-medium text-foreground">{section.label}</span>
                <BasisSectionStatusBadge status={status} />
              </button>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-muted-foreground">
        {summary.validated} van {summary.total} gevalideerd
        {summary.filled < summary.total ? ` · ${summary.filled} ingevuld` : ''}
      </p>
    </div>
  );
}

function Basis2026SectionDetail({
  sectionId,
  data,
  updateField,
  onAutofillField,
  onBack,
  onOpenNext,
}: EditorProps & {
  sectionId: BasisEditorSectionId;
  onBack: () => void;
  onOpenNext?: () => void;
}) {
  const section = getBasisEditorSection(sectionId);
  const status = getBasisSectionDisplayStatus(sectionId, data);
  const isEmpty = isBasisSectionEmpty(sectionId, data);
  const canAutofill = Boolean(onAutofillField && section.kind === 'markdown' && TP2026_BASIS_AUTOFILL_ENDPOINTS[sectionId]);

  const handleValidate = () => {
    if (isEmpty) return;
    markBasisSectionValidated(sectionId, data, updateField);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onBack}>
          Terug
        </Button>
        <h2 className="text-sm font-semibold text-foreground">{section.label}</h2>
        <BasisSectionStatusBadge status={status} />
      </div>

      {section.kind === 'spoor2' ? (
        <div>
          <p className="mb-3 text-xs text-muted-foreground">
            Selecteer welke onderdelen in het trajectplan verschijnen. Optioneel kunt u per onderdeel een subtekst met
            Z-logo toevoegen.
          </p>
          <Spoor2ActivitiesEditor
            tp3Activities={data.tp3_activities}
            onChange={(next) => updateField('tp3_activities', next)}
          />
        </div>
      ) : (
        <BasisFieldEditorRow
          field={BASIS_FIELD_BY_KEY.get(sectionId)!}
          data={data}
          updateField={updateField}
          onAutofillField={onAutofillField}
          showAutofillButton={false}
        />
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 pt-4">
        {canAutofill ? (
          <Button type="button" variant="outline" size="sm" onClick={() => void onAutofillField!(sectionId)}>
            Autofill
          </Button>
        ) : null}
        <Button type="button" size="sm" disabled={isEmpty} onClick={handleValidate}>
          Valideren
        </Button>
        {onOpenNext ? (
          <button
            type="button"
            className="text-xs font-medium text-[#6d2a96] underline underline-offset-2 hover:no-underline"
            onClick={onOpenNext}
          >
            Volgende sectie
          </button>
        ) : null}
      </div>
    </div>
  );
}

function BasisSectionStatusBadge({ status }: { status: BasisSectionDisplayStatus }) {
  const tone =
    status === 'validated'
      ? 'bg-green-50 text-green-800 ring-green-200'
      : status === 'review'
        ? 'bg-amber-50 text-amber-900 ring-amber-200'
        : 'bg-gray-50 text-gray-600 ring-gray-200';

  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tone}`}>
      {BASIS_SECTION_STATUS_LABELS[status]}
    </span>
  );
}

function BasisFieldEditorRow({
  field,
  data,
  updateField,
  onAutofillField,
  showAutofillButton = true,
}: {
  field: TP2026FieldDef;
  data: Record<string, any>;
  updateField: (key: string, value: any) => void;
  onAutofillField?: (fieldKey: string) => Promise<void>;
  showAutofillButton?: boolean;
}) {
  if (field.key === 'inleiding_sub' || field.key === 'wettelijke_kaders') {
    return null;
  }

  const canAutofill = Boolean(showAutofillButton && onAutofillField && TP2026_BASIS_AUTOFILL_ENDPOINTS[field.key]);

  if (field.type !== 'multiline') {
    return <FieldControl field={field} value={data[field.key]} onChange={(v) => updateField(field.key, v)} />;
  }

  const inleidingSub = field.key === 'inleiding' ? String(data.inleiding_sub ?? '').trim() : '';

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="text-sm font-semibold text-foreground">{field.label}</label>
        {canAutofill ? (
          <button
            type="button"
            className="text-xs font-medium text-[#6d2a96] underline underline-offset-2 hover:no-underline"
            onClick={() => void onAutofillField!(field.key)}
          >
            Autofill
          </button>
        ) : null}
      </div>
      <Basis2026MarkdownFieldEditor
        markdown={String(data[field.key] ?? '')}
        onChange={(md) => updateField(field.key, md)}
        placeholder={field.placeholder}
      />
      {inleidingSub ? (
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">AD-toelichting (automatisch)</p>
          <div className="rounded-md border border-[#b8985c]/40 bg-muted/30 px-3 py-2">
            <InleidingSubBlock text={inleidingSub} className="text-sm leading-relaxed text-neutral-900" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
