'use client';

import {
  ChevronRight,
  ClipboardList,
  FileUser,
  Loader2,
  Route,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { DocStatusPill } from '@/components/employee/DocStatusPill';
import type { EmployeeDocStatuses } from '@/hooks/useEmployeeDocStatuses';
import type { CvStatus, GeneratedDocKind, IntakeStatus, TpStatus } from '@/lib/employee/doc-status';
import { cn } from '@/lib/utils';
import { CARD_CLASS, CARD_TITLE_CLASS, formatShortDate } from '@/components/employee/detail/shared';

type DocKind = GeneratedDocKind | 'cv';

type Props = {
  statuses: EmployeeDocStatuses;
  /** Builder that is being opened right now, if any. */
  opening: Partial<Record<DocKind, boolean>>;
  onOpen: (kind: DocKind) => void;
};

const ROWS: Array<{ kind: DocKind; label: string; Icon: LucideIcon }> = [
  { kind: 'intake', label: 'Intake', Icon: ClipboardList },
  { kind: 'tp', label: 'Trajectplan', Icon: Route },
  { kind: 'vgr', label: 'Concept-VGR', Icon: Target },
  { kind: 'cv', label: 'CV', Icon: FileUser },
];

export function DocumentsCard({ statuses, opening, onOpen }: Props) {
  const anyOpening = Object.values(opening).some(Boolean);

  return (
    <section aria-labelledby="employee-documents-title" className={cn(CARD_CLASS, 'overflow-hidden')}>
      <h2 id="employee-documents-title" className={cn(CARD_TITLE_CLASS, 'px-4 pb-1.5 pt-3')}>
        Documenten
      </h2>
      <ul className="divide-y divide-gray-100">
        {ROWS.map(({ kind, label, Icon }) => {
          const status: TpStatus | IntakeStatus | CvStatus | null =
            kind === 'cv'
              ? statuses.cv.status
              : kind === 'intake'
                ? statuses.intake.status
                : statuses[kind].status;
          const lastExportAt = kind === 'cv' ? null : statuses[kind].lastExportAt;
          const exportDate = formatShortDate(lastExportAt);
          const isOpening = Boolean(opening[kind]);

          return (
            <li key={kind}>
              <button
                type="button"
                onClick={() => onOpen(kind)}
                disabled={anyOpening}
                className="group flex h-10 w-full items-center gap-2.5 px-4 text-left transition-colors hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none disabled:opacity-70"
              >
                <Icon
                  className="h-4 w-4 shrink-0 text-gray-400 transition-colors group-hover:text-purple-600"
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">{label}</span>
                {exportDate ? (
                  <span className="shrink-0 text-xs text-gray-500" title={`Laatste export: ${exportDate}`}>
                    {exportDate}
                  </span>
                ) : null}
                {status ? (
                  <DocStatusPill kind={kind} status={status} />
                ) : statuses.loading ? (
                  <span aria-hidden className="h-5 w-16 animate-pulse rounded-full bg-gray-100" />
                ) : null}
                {isOpening ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gray-400" aria-hidden />
                ) : (
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-gray-500"
                    aria-hidden
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
