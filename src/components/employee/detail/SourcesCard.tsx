'use client';

import { Eye, Plus, Trash2, Upload } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EMPLOYEE_DOC_LABELS, type EmployeeDocType } from '@/lib/documents/employee-doc-types';
import { cn } from '@/lib/utils';
import { CARD_CLASS, CARD_TITLE_CLASS } from '@/components/employee/detail/shared';

export type SourceDocument = {
  id: string;
  name: string | null;
  type: string | null;
  url: string;
};

type Props<TDoc extends SourceDocument> = {
  docTypes: EmployeeDocType[];
  documents: TDoc[];
  /** Opens the upload dialog for a type; also used to replace an existing upload. */
  onUpload: (type: EmployeeDocType) => void;
  onPreview: (doc: TDoc, type: EmployeeDocType) => void;
  onDelete: (doc: TDoc, type: EmployeeDocType) => void;
  onOpenGesprek: () => void;
};

/** Labels that are too long for a half-width cell; the full label stays in the tooltip and menu. */
const SHORT_LABELS: Partial<Record<EmployeeDocType, string>> = {
  spreek_reportage: 'Spreekuur',
};

const CELL_CLASS =
  'group flex h-8 w-full min-w-0 items-center gap-2 rounded-md px-2 text-left text-[13px] transition-colors hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40';

function StatusDot({ uploaded }: { uploaded: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'h-2 w-2 shrink-0 rounded-full',
        uploaded ? 'bg-emerald-500' : 'border border-gray-300'
      )}
    />
  );
}

export function SourcesCard<TDoc extends SourceDocument>({
  docTypes,
  documents,
  onUpload,
  onPreview,
  onDelete,
  onOpenGesprek,
}: Props<TDoc>) {
  const findDoc = (type: EmployeeDocType) =>
    documents.find((doc) => doc.type?.toLowerCase().trim() === type) ?? null;
  const uploadedCount = docTypes.filter((type) => findDoc(type)).length;

  return (
    <section aria-labelledby="employee-sources-title" className={CARD_CLASS}>
      <div className="flex items-baseline justify-between px-4 pb-1.5 pt-3">
        <h2 id="employee-sources-title" className={CARD_TITLE_CLASS}>
          Bronnen
        </h2>
        <p className="text-xs tabular-nums text-gray-500">
          {uploadedCount}/{docTypes.length} geüpload
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-x-1 px-2 pb-2">
        {docTypes.map((type) => {
          const doc = findDoc(type);
          const fullLabel = EMPLOYEE_DOC_LABELS[type];
          const label = SHORT_LABELS[type] ?? fullLabel;

          if (type === 'gespreksverslag') {
            return (
              <li key={type} className="min-w-0">
                <button
                  type="button"
                  onClick={onOpenGesprek}
                  className={CELL_CLASS}
                  title={doc ? 'Gesprek: notities bewaard' : 'Gesprek: transcript en notities'}
                >
                  <StatusDot uploaded={Boolean(doc)} />
                  <span className={cn('min-w-0 flex-1 truncate', doc ? 'text-gray-900' : 'text-gray-500')}>
                    {label}
                  </span>
                </button>
              </li>
            );
          }

          if (!doc) {
            return (
              <li key={type} className="min-w-0">
                <button
                  type="button"
                  onClick={() => onUpload(type)}
                  className={CELL_CLASS}
                  title={`${fullLabel} uploaden`}
                >
                  <StatusDot uploaded={false} />
                  <span className="min-w-0 flex-1 truncate text-gray-500 group-hover:text-gray-900">
                    {label}
                  </span>
                  <Plus
                    className="h-3.5 w-3.5 shrink-0 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                    aria-hidden
                  />
                </button>
              </li>
            );
          }

          return (
            <li key={type} className="min-w-0">
              {/* Non-modal: the items open dialogs, and a modal menu would leave the page unclickable. */}
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(CELL_CLASS, 'data-[state=open]:bg-gray-50')}
                    title={doc.name ? `${fullLabel}: ${doc.name}` : fullLabel}
                  >
                    <StatusDot uploaded />
                    <span className="min-w-0 flex-1 truncate text-gray-900">{label}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 border-gray-200">
                  <DropdownMenuLabel className="truncate font-medium text-gray-500">
                    {fullLabel}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-100" />
                  <DropdownMenuItem onSelect={() => onPreview(doc, type)}>
                    <Eye className="mr-2 h-4 w-4 text-gray-500" aria-hidden />
                    Bekijken
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onUpload(type)}>
                    <Upload className="mr-2 h-4 w-4 text-gray-500" aria-hidden />
                    Vervangen
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => onDelete(doc, type)}
                    className="text-red-700 focus:bg-red-50"
                  >
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                    Verwijderen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
