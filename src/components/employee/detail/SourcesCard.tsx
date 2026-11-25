'use client';

import { Eye, Mic, Plus, Trash2, Upload } from 'lucide-react';
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

export type SourceUploadMode = 'add' | 'replace';

type Props<TDoc extends SourceDocument> = {
  docTypes: EmployeeDocType[];
  documents: TDoc[];
  /**
   * Opens the upload dialog for a type.
   * Staging multi-doc: `add` keeps existing files; `replace` swaps the focused doc.
   */
  onUpload: (type: EmployeeDocType, mode?: SourceUploadMode) => void;
  onPreview: (doc: TDoc, type: EmployeeDocType) => void;
  onDelete: (doc: TDoc, type: EmployeeDocType) => void;
  /** Opens the gesprek / transcript panel for intake or VGR purpose. */
  onOpenGesprek: (type: Extract<EmployeeDocType, 'gespreksverslag' | 'gespreksverslag_vgr'>) => void;
  /** When true, allow a second file of the same type without forcing replace. */
  allowMultiplePerType?: boolean;
};

/** Labels that are too long for a half-width cell; the full label stays in the tooltip and menu. */
const SHORT_LABELS: Partial<Record<EmployeeDocType, string>> = {
  spreek_reportage: 'Spreekuur',
  gespreksverslag_vgr: 'Gesprek VGR',
};

function isGesprekSourceType(
  type: EmployeeDocType
): type is Extract<EmployeeDocType, 'gespreksverslag' | 'gespreksverslag_vgr'> {
  return type === 'gespreksverslag' || type === 'gespreksverslag_vgr';
}

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
  allowMultiplePerType = false,
}: Props<TDoc>) {
  const docsForType = (type: EmployeeDocType) =>
    documents.filter((doc) => doc.type?.toLowerCase().trim() === type);
  const findDoc = (type: EmployeeDocType) => docsForType(type)[0] ?? null;
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
          const gesprekType = isGesprekSourceType(type) ? type : null;

          if (!doc && gesprekType) {
            return (
              <li key={type} className="min-w-0">
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(CELL_CLASS, 'data-[state=open]:bg-gray-50')}
                      title={`${fullLabel}: uploaden of gesprek openen`}
                    >
                      <StatusDot uploaded={false} />
                      <span className="min-w-0 flex-1 truncate text-gray-500 group-hover:text-gray-900">
                        {label}
                      </span>
                      <Plus
                        className="h-3.5 w-3.5 shrink-0 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 data-[state=open]:opacity-100"
                        aria-hidden
                      />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 border-gray-200">
                    <DropdownMenuLabel className="truncate font-medium text-gray-500">
                      {fullLabel}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-gray-100" />
                    <DropdownMenuItem onSelect={() => onUpload(gesprekType)}>
                      <Upload className="mr-2 h-4 w-4 text-gray-500" aria-hidden />
                      Bestand uploaden
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onOpenGesprek(gesprekType)}>
                      <Mic className="mr-2 h-4 w-4 text-gray-500" aria-hidden />
                      Gesprek / transcript
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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

          const typeDocs = docsForType(type);
          const countLabel = typeDocs.length > 1 ? ` (${typeDocs.length})` : '';

          return (
            <li key={type} className="min-w-0">
              {/* Non-modal: the items open dialogs, and a modal menu would leave the page unclickable. */}
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(CELL_CLASS, 'data-[state=open]:bg-gray-50')}
                    title={doc.name ? `${fullLabel}: ${doc.name}${countLabel}` : fullLabel}
                  >
                    <StatusDot uploaded />
                    <span className="min-w-0 flex-1 truncate text-gray-900">
                      {label}
                      {countLabel}
                    </span>
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
                  {allowMultiplePerType ? (
                    <DropdownMenuItem onSelect={() => onUpload(type, 'add')}>
                      <Plus className="mr-2 h-4 w-4 text-gray-500" aria-hidden />
                      Toevoegen
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem onSelect={() => onUpload(type, 'replace')}>
                    <Upload className="mr-2 h-4 w-4 text-gray-500" aria-hidden />
                    Vervangen
                  </DropdownMenuItem>
                  {gesprekType ? (
                    <DropdownMenuItem onSelect={() => onOpenGesprek(gesprekType)}>
                      <Mic className="mr-2 h-4 w-4 text-gray-500" aria-hidden />
                      Gesprek / transcript
                    </DropdownMenuItem>
                  ) : null}
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
