'use client';

import { ArrowLeft, Cake, Mail, Pencil, Phone, UserRound, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { EmployeeDetailFieldKey } from '@/lib/employee/field-review';
import type { EmployeeProfileView, ProfileHeaderFactId } from '@/lib/employee/profile-view';
import { QUIET_BUTTON_CLASS, ReviewSlot } from '@/components/employee/detail/shared';

const FACT_ICONS: Record<ProfileHeaderFactId, LucideIcon> = {
  gender: UserRound,
  date_of_birth: Cake,
  phone: Phone,
  email: Mail,
};

const FACT_LABELS: Record<ProfileHeaderFactId, string> = {
  gender: 'geslacht',
  date_of_birth: 'geboortedatum',
  phone: 'telefoon',
  email: 'e-mail',
};

type Props = {
  view: EmployeeProfileView;
  editing: boolean;
  /** Disables Bewerken and the validate buttons, e.g. while AI autofill runs. */
  busy: boolean;
  canEdit: boolean;
  onBack: () => void;
  onEdit: () => void;
  onValidate: (fields: EmployeeDetailFieldKey[]) => void;
};

export function EmployeeHeader({ view, editing, busy, canEdit, onBack, onEdit, onValidate }: Props) {
  return (
    <header className="space-y-3">
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Werknemers
      </button>

      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 items-start gap-4">
          <div
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-100 text-base font-semibold text-purple-700"
          >
            {view.initials || <UserRound className="h-5 w-5" />}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <h1 className="break-words text-xl font-semibold leading-7 tracking-tight text-gray-900">
                {view.name}
              </h1>
              {view.exWerknemer ? (
                <span className="group/fact inline-flex items-center gap-1">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    Ex-werknemer
                  </span>
                  {view.exWerknemer.status === 'review' && !editing ? (
                    <ReviewSlot
                      label="Valideer ex-werknemer"
                      disabled={busy}
                      onValidate={() => onValidate(view.exWerknemer?.reviewFields ?? [])}
                    />
                  ) : null}
                </span>
              ) : null}
            </div>

            {editing ? (
              <p className="text-sm leading-5 text-gray-600">Gegevens bewerken</p>
            ) : view.subtitle ? (
              <p className="break-words text-sm leading-5 text-gray-600">{view.subtitle}</p>
            ) : null}

            {!editing && view.headerFacts.length > 0 ? (
              <ul className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1">
                {view.headerFacts.map((fact) => {
                  const Icon = FACT_ICONS[fact.id];
                  return (
                    <li
                      key={fact.id}
                      className="group/fact inline-flex min-w-0 items-center gap-1.5 text-[13px] leading-6 text-gray-600"
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
                      {fact.href ? (
                        <a
                          href={fact.href}
                          className="truncate rounded-sm hover:text-purple-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
                        >
                          {fact.text}
                        </a>
                      ) : (
                        <span className="truncate">{fact.text}</span>
                      )}
                      {fact.status === 'review' ? (
                        <ReviewSlot
                          label={`Valideer ${FACT_LABELS[fact.id]}`}
                          disabled={busy}
                          onValidate={() => onValidate(fact.reviewFields)}
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </div>

        {!editing ? (
          <Button
            type="button"
            variant="outline"
            className={QUIET_BUTTON_CLASS}
            onClick={onEdit}
            disabled={busy || !canEdit}
          >
            <Pencil className="h-4 w-4" aria-hidden />
            Bewerken
          </Button>
        ) : null}
      </div>
    </header>
  );
}
