'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  Download,
  Trash2,
} from 'lucide-react';
import type { Database } from '@/types/supabase';
import { getEmployeeDocLabel } from '@/lib/documents/employee-doc-types';
import { signStorageUrl } from '@/lib/documents/sign-storage-url';

type Document = Database['public']['Tables']['documents']['Row'];

type Props = {
  type: string;
  employeeId: string;
  existingDoc: Document | null;
  onClose: () => void;
  onUploaded: () => void;
  onDeleted: () => void;
};

export default function DocumentModal({
  type,
  employeeId,
  existingDoc,
  onClose,
  onUploaded,
  onDeleted,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [opening, setOpening] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const title = getEmployeeDocLabel(type);
  const busy = uploading || opening || deleting;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, busy]);

  const processFile = async (file: File) => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(false);
    setStatus('Upload voorbereiden…');

    try {
      if (existingDoc) {
        setStatus('Bestaand document verwijderen…');
        const deleteRes = await fetch('/api/documents/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: existingDoc.id,
            url: existingDoc.url,
          }),
        });

        const deleteResult = await deleteRes.json();

        if (!deleteRes.ok || !deleteResult.success) {
          throw new Error(
            `Kon bestaand document niet verwijderen: ${deleteResult.error}`
          );
        }
      }

      setStatus('Bestand uploaden…');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('employee_id', employeeId);
      formData.append('type', type);
      formData.append('name', file.name);

      const uploadRes = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(`Upload mislukt: ${uploadData.error}`);
      }

      const uploadedPath = uploadData.path;

      setStatus('Documentgegevens opslaan…');

      const metadataRes = await fetch('/api/documents/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          type,
          name: file.name,
          url: uploadedPath,
        }),
      });

      const metadataData = await metadataRes.json();

      if (!metadataRes.ok) {
        throw new Error(`Kon documentgegevens niet opslaan: ${metadataData.error}`);
      }

      setStatus('Upload voltooid!');
      setSuccess(true);

      setTimeout(() => {
        onUploaded();
        onClose();
      }, 1500);
    } catch (err: unknown) {
      console.error('❌ Upload failed:', err);
      setError(err instanceof Error ? err.message : 'Upload mislukt. Probeer het opnieuw.');
      setStatus(null);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  const handleDelete = async () => {
    if (!existingDoc?.url || !existingDoc.id || busy) return;
    if (!confirm('Weet je zeker dat je dit document wilt verwijderen?')) return;

    setDeleting(true);
    setError(null);

    try {
      const res = await fetch('/api/documents/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: existingDoc.id,
          url: existingDoc.url,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Verwijderen mislukt');
      }

      onDeleted();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verwijderen mislukt');
    } finally {
      setDeleting(false);
    }
  };

  const openOrDownloadExisting = async () => {
    if (!existingDoc?.url || busy) return;

    setOpening(true);
    setError(null);
    setStatus('Document openen…');

    try {
      const url = await signStorageUrl(existingDoc.url);
      window.open(url, '_blank', 'noopener,noreferrer');
      setStatus(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Kon document niet openen');
      setStatus(null);
    } finally {
      setOpening(false);
    }
  };

  return typeof window !== 'undefined'
    ? createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => {
            if (!busy) onClose();
          }}
        >
          <div
            className="relative z-50 w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-2 top-2 text-gray-500 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={onClose}
              disabled={busy}
              aria-label="Sluiten"
            >
              <X />
            </button>

            <h2 className="mb-4 text-lg font-bold text-gray-900">{title}</h2>

            {existingDoc ? (
              <div className="mb-4 space-y-2">
                <p className="text-sm text-gray-700">Huidig bestand:</p>
                <div className="flex items-start gap-1">
                  <button
                    type="button"
                    onClick={() => void openOrDownloadExisting()}
                    disabled={busy}
                    className="min-w-0 flex-1 break-all text-left text-sm text-blue-600 underline disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {opening ? 'Openen…' : existingDoc.name || 'Document'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void openOrDownloadExisting()}
                    disabled={busy}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Downloaden"
                    aria-label="Downloaden"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    disabled={busy}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-red-600 hover:bg-red-50 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Verwijderen"
                    aria-label="Verwijderen"
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Je kunt het huidige bestand vervangen door hieronder een nieuw bestand te
                  uploaden.
                </p>
              </div>
            ) : (
              <p className="mb-4 text-sm text-gray-600">Nog geen bestand geüpload.</p>
            )}

            {status && (
              <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3">
                <div className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-blue-600" />
                  <p className="text-sm text-blue-800">{status}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3">
                <div className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                  <p className="text-sm text-green-800">Upload voltooid!</p>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3">
                <div className="flex items-center">
                  <AlertCircle className="mr-2 h-4 w-4 text-red-600" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            )}

            <div
              className={`rounded border border-dashed p-6 text-center transition-colors ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-400 hover:bg-gray-50'
              } ${uploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
              onClick={() => !uploading && fileInputRef.current?.click()}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {uploading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="mb-2 h-8 w-8 animate-spin text-blue-600" />
                  <p className="text-sm text-gray-600">Uploaden…</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Upload className="mb-2 h-8 w-8 text-gray-400" />
                  <p className="mb-1 text-sm text-gray-700">
                    {dragActive
                      ? 'Laat het bestand hier los'
                      : 'Klik of sleep een bestand hierheen'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Ondersteund: PDF, DOC, DOCX, PNG, JPG
                  </p>
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.doc,.docx,.png,.jpg"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </div>
          </div>
        </div>,
        document.body
      )
    : null;
}
