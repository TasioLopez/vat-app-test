'use client';

import { useCallback, useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  uploadEmployeeDocument,
  validateEmployeeDocumentFile,
} from '@/lib/documents/upload-employee-document';
import { classifyUploadHeuristic } from '@/lib/vgr/sources/classify-upload';
import { cn } from '@/lib/utils';

export type UploadedSourceInfo = {
  id: string;
  type: string;
  name: string;
  uploaded_at: string | null;
  document_date: string | null;
};

type Props = {
  employeeId: string;
  onUploaded: (docs: UploadedSourceInfo[]) => void;
  disabled?: boolean;
};

type ProgressRow = {
  name: string;
  status: 'uploading' | 'classifying' | 'done' | 'error';
  detail?: string;
};

/**
 * Staging multi-file dump zone for VGR start: upload many evidence files,
 * AI/heuristic classify into types, keep document_date + upload time.
 */
export function VgrMultiUploadZone({ employeeId, onUploaded, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<ProgressRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const processFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      if (!files.length || busy || disabled) return;

      setBusy(true);
      setError(null);
      setRows(files.map((f) => ({ name: f.name, status: 'uploading' })));

      const uploaded: UploadedSourceInfo[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;
        const validationError = validateEmployeeDocumentFile(file);
        if (validationError) {
          setRows((prev) =>
            prev.map((r, idx) =>
              idx === i ? { ...r, status: 'error', detail: validationError } : r
            )
          );
          continue;
        }

        try {
          setRows((prev) =>
            prev.map((r, idx) => (idx === i ? { ...r, status: 'uploading' } : r))
          );

          const heuristic = classifyUploadHeuristic({ filename: file.name });
          const result = await uploadEmployeeDocument({
            employeeId,
            type: heuristic.app_type,
            file,
            documentDate: heuristic.document_date,
            existingDoc: null,
          });

          setRows((prev) =>
            prev.map((r, idx) => (idx === i ? { ...r, status: 'classifying' } : r))
          );

          let finalType = result.type || heuristic.app_type;
          let documentDate = result.documentDate || heuristic.document_date;
          let documentId = result.documentId;

          if (documentId) {
            try {
              const res = await fetch('/api/vgr/sources/classify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  employeeId,
                  documentId,
                  filename: file.name,
                  declaredAppType: heuristic.app_type,
                  documentDateHint: heuristic.document_date,
                  persist: true,
                }),
              });
              const json = await res.json();
              if (res.ok && json.classification) {
                finalType = json.classification.app_type || finalType;
                documentDate = json.classification.document_date || documentDate;
                if (json.document?.id) documentId = String(json.document.id);
              }
            } catch {
              // Heuristic upload already persisted; AI refine is best-effort.
            }
          }

          if (documentId) {
            uploaded.push({
              id: documentId,
              type: finalType,
              name: file.name,
              uploaded_at: result.uploadedAt,
              document_date: documentDate,
            });
          }

          setRows((prev) =>
            prev.map((r, idx) =>
              idx === i
                ? {
                    ...r,
                    status: 'done',
                    detail: `${finalType}${documentDate ? ` · doc ${documentDate}` : ''}`,
                  }
                : r
            )
          );
        } catch (err) {
          setRows((prev) =>
            prev.map((r, idx) =>
              idx === i
                ? {
                    ...r,
                    status: 'error',
                    detail: err instanceof Error ? err.message : 'Upload mislukt',
                  }
                : r
            )
          );
        }
      }

      if (uploaded.length) onUploaded(uploaded);
      setBusy(false);
    },
    [busy, disabled, employeeId, onUploaded]
  );

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'rounded-md border border-dashed px-4 py-6 text-center transition-colors',
          dragActive ? 'border-[#702A90] bg-[#702A90]/5' : 'border-border bg-muted/20',
          disabled || busy ? 'opacity-60' : 'cursor-pointer'
        )}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragActive(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files?.length) void processFiles(e.dataTransfer.files);
        }}
        onClick={() => {
          if (!busy && !disabled) inputRef.current?.click();
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!busy && !disabled) inputRef.current?.click();
          }
        }}
      >
        <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">Sleep bestanden hierheen of klik om te kiezen</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Meerdere bestanden tegelijk (PDF/DOC/DOCX/PNG/JPG, max 10 MB). Types worden automatisch
          herkend; uploadtijd en documentdatum blijven bewaard.
        </p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt"
          disabled={busy || disabled}
          onChange={(e) => {
            if (e.target.files?.length) void processFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {rows.length > 0 ? (
        <ul className="divide-y rounded-md border text-sm">
          {rows.map((r) => (
            <li key={`${r.name}-${r.status}-${r.detail || ''}`} className="flex items-center gap-2 px-3 py-2">
              {r.status === 'uploading' || r.status === 'classifying' ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
              ) : null}
              <span className="min-w-0 flex-1 truncate">{r.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {r.status === 'uploading'
                  ? 'Uploaden…'
                  : r.status === 'classifying'
                    ? 'Classificeren…'
                    : r.status === 'done'
                      ? r.detail || 'Klaar'
                      : r.detail || 'Fout'}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy || disabled}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? 'Bezig…' : 'Bestanden kiezen'}
        </Button>
      </div>
    </div>
  );
}
