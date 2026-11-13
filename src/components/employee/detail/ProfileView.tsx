'use client';

import { AlertCircle, Sparkles, UserRoundSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AutofillProgressOverlay,
  type AutofillProgressState,
} from '@/components/ui/AutofillProgressOverlay';
import type { AutosaveStatus } from '@/hooks/useDebouncedAutosave';
import type { EmployeeDetailFieldKey } from '@/lib/employee/field-review';
import type { EmployeeProfileView, ProfileRow } from '@/lib/employee/profile-view';
import { cn } from '@/lib/utils';
import {
  CARD_CLASS,
  CARD_TITLE_CLASS,
  QUIET_BUTTON_CLASS,
  ReviewSlot,
  SECTION_LABEL_CLASS,
} from '@/components/employee/detail/shared';

type Props = {
  view: EmployeeProfileView;
  /** Profile data could not be loaded; show a retry instead of an empty profile. */
  loadFailed: boolean;
  onRetryLoad: () => void;
  uploadedSourcesCount: number;
  aiLoading: boolean;
  aiCancelling: boolean;
  autofillProgress: AutofillProgressState | null;
  onAutofill: () => void;
  onCancelAutofill: () => void;
  /** Disables validate actions while a save or autofill runs. */
  busy: boolean;
  saveStatus: AutosaveStatus;
  onRetrySave: () => void;
  onValidate: (fields: EmployeeDetailFieldKey[]) => void;
  onValidateAll: () => void;
  onEdit: () => void;
};

function FactRow({
  row,
  busy,
  onValidate,
}: {
  row: ProfileRow;
  busy: boolean;
  onValidate: (fields: EmployeeDetailFieldKey[]) => void;
}) {
  return (
    <div className="group/fact grid grid-cols-[8.25rem_minmax(0,1fr)] gap-x-3 py-1">
      <dt className="text-[13px] leading-6 text-gray-500">{row.label}</dt>
      <dd className="flex min-w-0 items-start gap-2">
        <div className="min-w-0 flex-1">
          {row.chips.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {row.chips.map((chip) => (
                <li
                  key={chip}
                  className="rounded-md bg-gray-100 px-2 py-0.5 text-[13px] leading-5 text-gray-800"
                >
                  {chip}
                </li>
              ))}
            </ul>
          ) : (
            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-900">
              {row.text}
            </p>
          )}
        </div>
        {row.status === 'review' ? (
          <ReviewSlot
            label={`Valideer ${row.label.toLowerCase()}`}
            disabled={busy}
            onValidate={() => onValidate(row.reviewFields)}
          />
        ) : null}
      </dd>
    </div>
  );
}

export function ProfileView({
  view,
  loadFailed,
  onRetryLoad,
  uploadedSourcesCount,
  aiLoading,
  aiCancelling,
  autofillProgress,
  onAutofill,
  onCancelAutofill,
  busy,
  saveStatus,
  onRetrySave,
  onValidate,
  onValidateAll,
  onEdit,
}: Props) {
  const showEmptyState = !loadFailed && !view.hasProfileFacts;
  const emptyCount = view.emptyLabels.length;

  return (
    <section
      aria-labelledby="employee-profile-title"
      className={cn(CARD_CLASS, '@container relative', aiLoading && 'min-h-[22rem]')}
    >
      {aiLoading && autofillProgress ? (
        <AutofillProgressOverlay
          progress={autofillProgress}
          title="Invullen met AI"
          onCancel={onCancelAutofill}
          cancelling={aiCancelling}
        />
      ) : null}

      <div className="flex min-h-[3.25rem] flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-gray-100 px-5 py-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 id="employee-profile-title" className={CARD_TITLE_CLASS}>
            Profiel
          </h2>

          {view.reviewCount > 0 ? (
            <p className="inline-flex items-center gap-1.5 text-[13px] text-gray-600">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {view.reviewCount} te controleren
              <span aria-hidden className="text-gray-300">
                ·
              </span>
              <button
                type="button"
                onClick={onValidateAll}
                disabled={busy}
                className="rounded-sm font-medium text-purple-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 disabled:opacity-50"
              >
                Valideer alles
              </button>
            </p>
          ) : null}

          {saveStatus === 'dirty' || saveStatus === 'saving' ? (
            <p className="text-[13px] text-gray-400" role="status">
              Opslaan…
            </p>
          ) : null}
          {saveStatus === 'error' ? (
            <p className="inline-flex items-center gap-1.5 text-[13px] text-red-700" role="alert">
              <AlertCircle className="h-3.5 w-3.5" aria-hidden />
              Opslaan mislukt
              <button
                type="button"
                onClick={onRetrySave}
                className="rounded-sm font-medium underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
              >
                Opnieuw
              </button>
            </p>
          ) : null}
        </div>

        {!showEmptyState && !loadFailed ? (
          <Button
            type="button"
            variant="outline"
            className={QUIET_BUTTON_CLASS}
            onClick={onAutofill}
            disabled={aiLoading}
          >
            <Sparkles className={cn('h-4 w-4 text-purple-600', aiLoading && 'animate-pulse')} aria-hidden />
            {aiLoading ? 'AI bezig…' : 'Invullen met AI'}
          </Button>
        ) : null}
      </div>

      {loadFailed ? (
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <AlertCircle className="h-6 w-6 text-red-500" aria-hidden />
          <p className="mt-3 text-sm font-medium text-gray-900">Profiel laden mislukt</p>
          <p className="mt-1 max-w-sm text-[13px] text-gray-500">
            De profielgegevens konden niet worden opgehaald. Er is niets gewijzigd.
          </p>
          <Button
            type="button"
            variant="outline"
            className={cn(QUIET_BUTTON_CLASS, 'mt-4')}
            onClick={onRetryLoad}
          >
            Opnieuw proberen
          </Button>
        </div>
      ) : showEmptyState ? (
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-50 text-purple-600">
            <UserRoundSearch className="h-5 w-5" aria-hidden />
          </span>
          <p className="mt-3 text-sm font-medium text-gray-900">Nog geen profielgegevens</p>
          <p className="mt-1 max-w-sm text-[13px] leading-5 text-gray-500">
            {uploadedSourcesCount > 0
              ? `Er ${uploadedSourcesCount === 1 ? 'staat 1 bron' : `staan ${uploadedSourcesCount} bronnen`} klaar. Laat AI het profiel invullen of vul het zelf in.`
              : 'Upload een bron om het profiel met AI te laten invullen, of vul het zelf in.'}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {uploadedSourcesCount > 0 ? (
              <Button type="button" className="h-9 gap-2 px-3" onClick={onAutofill} disabled={aiLoading}>
                <Sparkles className={cn('h-4 w-4', aiLoading && 'animate-pulse')} aria-hidden />
                {aiLoading ? 'AI bezig…' : 'Invullen met AI'}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className={QUIET_BUTTON_CLASS}
              onClick={onEdit}
              disabled={aiLoading}
            >
              Zelf invullen
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-x-10 gap-y-5 px-5 py-4 @2xl:grid-cols-2">
            {view.groups.map((group) => (
              <section key={group.id} aria-label={group.label} className="min-w-0">
                <h3 className={cn(SECTION_LABEL_CLASS, 'mb-1')}>{group.label}</h3>
                <dl>
                  {group.rows.map((row) => (
                    <FactRow key={row.id} row={row} busy={busy} onValidate={onValidate} />
                  ))}
                </dl>
              </section>
            ))}
          </div>

          {emptyCount > 0 ? (
            <p
              className="border-t border-gray-100 px-5 py-2.5 text-[13px] text-gray-500"
              title={view.emptyLabels.join(', ')}
            >
              {emptyCount === 1 ? '1 veld nog leeg' : `${emptyCount} velden nog leeg`}
              <span aria-hidden className="mx-1.5 text-gray-300">
                ·
              </span>
              <button
                type="button"
                onClick={onEdit}
                disabled={aiLoading}
                className="rounded-sm font-medium text-purple-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 disabled:opacity-50"
              >
                Aanvullen
              </button>
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
