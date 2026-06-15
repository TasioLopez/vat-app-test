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
import { Basis2026MarkdownBody } from '@/components/tp2026/Basis2026MarkdownBody';
import { Spoor2ActivitiesEditor } from '@/components/tp2026/Spoor2ActivitiesEditor';
import { InleidingSubBlock } from '@/components/tp/InleidingSubBlock';
import { AdviesPassendeArbeidBlock } from '@/components/tp/AdviesPassendeArbeidBlock';
import { BelastbaarheidsprofielBlock } from '@/components/tp/BelastbaarheidsprofielBlock';
import { PerspectiefOpWerkBlock } from '@/components/tp/PerspectiefOpWerkBlock';
import { PowInschalingTable } from '@/components/tp/PowInschalingTable';
import { VisieLoopbaanadviseurBlock } from '@/components/tp/VisieLoopbaanadviseurBlock';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

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
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <IconActionButton label="Terug naar secties" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </IconActionButton>
          <h2 className="text-sm font-semibold text-foreground">{section.label}</h2>
          <BasisSectionStatusBadge status={status} />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {canAutofill ? (
            <IconActionButton label="Autofill" onClick={() => void onAutofillField!(sectionId)}>
              <Sparkles className="h-4 w-4" aria-hidden />
            </IconActionButton>
          ) : null}
          <IconActionButton label="Valideren" onClick={handleValidate} disabled={isEmpty}>
            <CheckCircle2 className="h-4 w-4" aria-hidden />
          </IconActionButton>
          {onOpenNext ? (
            <IconActionButton label="Volgende sectie" onClick={onOpenNext}>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </IconActionButton>
          ) : null}
        </div>
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
          hideLabel
        />
      )}
    </div>
  );
}

function IconActionButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="h-8 w-8 shrink-0"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
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
  hideLabel = false,
}: {
  field: TP2026FieldDef;
  data: Record<string, any>;
  updateField: (key: string, value: any) => void;
  onAutofillField?: (fieldKey: string) => Promise<void>;
  showAutofillButton?: boolean;
  hideLabel?: boolean;
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
      {!hideLabel ? (
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
      ) : null}
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
      {field.key === 'prognose_bedrijfsarts' && String(data[field.key] ?? '').trim() ? (
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Voorbeeldweergave</p>
          <div className="rounded-md border border-[#b8985c]/40 bg-[#f3efe4] px-3 py-2">
            <BelastbaarheidsprofielBlock
              text={String(data[field.key] ?? '')}
              className="text-sm leading-relaxed"
            />
          </div>
        </div>
      ) : null}
      {field.key === 'advies_ad_passende_arbeid' && String(data[field.key] ?? '').trim() ? (
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Voorbeeldweergave</p>
          <div className="rounded-md border border-[#b8985c]/40 bg-[#f3efe4] px-3 py-2">
            <AdviesPassendeArbeidBlock
              text={String(data[field.key] ?? '')}
              className="text-sm leading-relaxed"
            />
          </div>
        </div>
      ) : null}
      {field.key === 'pow_meter' ? (
        <div className="mt-3 space-y-3">
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Perspectief op werk (vast)</p>
            <div className="rounded-md border border-[#b8985c]/40 bg-[#f3efe4] px-3 py-2">
              <PerspectiefOpWerkBlock className="text-sm leading-relaxed" />
            </div>
          </div>
          {String(data[field.key] ?? '').trim() ? (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Inschaling (voorbeeldweergave)</p>
              <div className="rounded-md border border-[#b8985c]/40 bg-[#f3efe4] px-3 py-2">
                <PowInschalingTable raw={String(data[field.key] ?? '')} />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {field.key === 'visie_plaatsbaarheid' && String(data[field.key] ?? '').trim() ? (
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Voorbeeldweergave</p>
          <div className="rounded-md border border-[#b8985c]/40 bg-[#f3efe4] px-3 py-2 text-sm leading-relaxed text-neutral-900">
            <Basis2026MarkdownBody markdown={String(data[field.key] ?? '')} />
          </div>
        </div>
      ) : null}
      {field.key === 'visie_loopbaanadviseur' && String(data[field.key] ?? '').trim() ? (
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Voorbeeldweergave</p>
          <div className="rounded-md border border-[#b8985c]/40 bg-[#f3efe4] px-3 py-2">
            <VisieLoopbaanadviseurBlock
              text={String(data[field.key] ?? '')}
              className="text-sm leading-relaxed"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
