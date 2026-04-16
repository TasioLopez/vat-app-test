'use client';

import Link from 'next/link';
import { ArrowLeft, Printer, Mail, Check, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCV } from '@/context/CVContext';
import AccentColorPicker from '@/components/cv/AccentColorPicker';
import CVPreview from '@/components/cv/CVPreview';
import { ExportCVButton } from '@/components/cv/ExportCVButton';
import type { CvTemplateKey } from '@/types/cv';
import { cn } from '@/lib/utils';
import { normalizeCvPayload } from '@/lib/cv/normalize';
import type { CvModel } from '@/types/cv';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRef, useState } from 'react';
import AiResultPreview from '@/components/cv/AiResultPreview';

type Props = {
  employeeId: string;
  employeeLabel: string;
};

export default function CVEditorShell({ employeeId, employeeLabel }: Props) {
  const {
    cvId,
    title,
    setTitle,
    templateKey,
    setTemplateKey,
    accentColor,
    setAccentColor,
    save,
    saving,
    isDirty,
    lastSavedAt,
    saveError,
    cvData,
    applyAiPayload,
    updateOptions,
    updatePersonal,
  } = useCV();

  const photoFileRef = useRef<HTMLInputElement>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [aiPreview, setAiPreview] = useState<Record<string, unknown> | null>(null);

  const runAi = async (mode: 'fill' | 'polish') => {
    setAiBusy(true);
    setAiError(null);
    try {
      const res = await fetch(
        `/api/autofill-cv?employeeId=${encodeURIComponent(employeeId)}&cvId=${encodeURIComponent(
          cvId
        )}&mode=${mode}`,
        { method: 'GET' }
      );
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setAiError(json?.error || 'AI-aanroep mislukt');
        return;
      }
      const payload = json?.data?.payload ?? json?.payload;
      setAiPreview(payload as Record<string, unknown> | null);
      setAiOpen(true);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Fout');
    } finally {
      setAiBusy(false);
    }
  };

  const applyAi = () => {
    if (!aiPreview) return;
    applyAiPayload(normalizeCvPayload(aiPreview) as Partial<CvModel>);
    setAiOpen(false);
    setAiPreview(null);
  };

  const handlePrint = () => {
    window.print();
  };

  const mailto = cvData.personal.email
    ? `mailto:?subject=${encodeURIComponent(`CV ${cvData.personal.fullName || title}`)}`
    : '#';

  const includePhoto = cvData.options?.includePhotoInCv === true;

  const onPhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('employeeId', employeeId);
    fd.append('cvId', cvId);
    setPhotoError(null);
    try {
      const res = await fetch('/api/cv-photo/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) {
        setPhotoError(json?.error || 'Upload mislukt');
        return;
      }
      updatePersonal({ photoStoragePath: json.path as string });
      updateOptions({ includePhotoInCv: true });
      await save();
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Upload mislukt');
    }
  };

  const removePhoto = async () => {
    const path = cvData.personal.photoStoragePath?.trim();
    if (path) {
      try {
        await fetch('/api/cv-photo', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId, cvId, path }),
        });
      } catch {
        /* still clear local state */
      }
    }
    updatePersonal({ photoStoragePath: undefined });
    updateOptions({ includePhotoInCv: false });
    try {
      await save();
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-24 print:bg-white print:pb-0">
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur cv-no-print">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" size="sm" className="gap-1 text-gray-600" asChild>
              <Link href={`/dashboard/employees/${employeeId}`}>
                <ArrowLeft className="h-4 w-4" />
                Terug naar werknemer
              </Link>
            </Button>
            <div className="hidden h-6 w-px bg-gray-200 sm:block" />
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="max-w-xs font-semibold"
              placeholder="CV-titel"
            />
            <span
              className={cn(
                'text-xs',
                isDirty ? 'text-amber-600' : 'text-emerald-600'
              )}
            >
              {saving
                ? 'Opslaan…'
                : isDirty
                  ? 'Niet opgeslagen'
                  : lastSavedAt
                    ? 'Opgeslagen'
                    : ''}
            </span>
            {saveError && <span className="text-xs text-red-600">{saveError}</span>}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => save()} disabled={saving}>
                <Check className="mr-1 h-4 w-4" />
                Opslaan
              </Button>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-3 border-t border-gray-100 pt-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-gray-500">AI</span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1"
                disabled={aiBusy}
                onClick={() => runAi('fill')}
              >
                <Sparkles className="h-4 w-4" />
                Lege velden invullen
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1"
                disabled={aiBusy}
                onClick={() => runAi('polish')}
              >
                <Wand2 className="h-4 w-4" />
                Teksten verfijnen
              </Button>
              {aiError && <span className="max-w-[min(100%,12rem)] text-xs text-red-600">{aiError}</span>}
            </div>

            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-4">
              <AccentColorPicker value={accentColor} onChange={setAccentColor} />
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Template:</span>
                <Select
                  value={templateKey}
                  onValueChange={(v) => setTemplateKey(v as CvTemplateKey)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="modern_professional">Modern Professional</SelectItem>
                    <SelectItem value="creative_bold">Creative Bold</SelectItem>
                    <SelectItem value="corporate_minimal">Corporate Minimal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-2 sm:border-t-0 sm:pt-0">
                <span className="text-xs font-medium text-gray-500">Foto</span>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={includePhoto}
                    onChange={(e) => updateOptions({ includePhotoInCv: e.target.checked })}
                  />
                  Tonen op CV
                </label>
                <input
                  ref={photoFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onPhotoSelected}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => photoFileRef.current?.click()}
                >
                  Upload
                </Button>
                {cvData.personal.photoStoragePath ? (
                  <Button type="button" variant="ghost" size="sm" className="text-red-700" onClick={removePhoto}>
                    Verwijderen
                  </Button>
                ) : null}
                {photoError ? (
                  <span className="text-xs text-red-600">{photoError}</span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button type="button" variant="outline" size="sm" className="gap-1" asChild>
                <a href={mailto}>
                  <Mail className="h-4 w-4" />
                  E-mail
                </a>
              </Button>
              <ExportCVButton employeeId={employeeId} cvId={cvId} />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="cv-no-print mb-4 text-center text-sm text-gray-500">
          {employeeLabel} — klik op tekst om te bewerken.
        </p>
        <div className="flex justify-center overflow-x-auto">
          <CVPreview />
        </div>
      </div>

      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>AI-resultaat toepassen?</DialogTitle>
            <p className="text-sm text-muted-foreground">
              De voorgestelde inhoud vervangt de huidige secties. Je kunt daarna nog handmatig
              aanpassen.
            </p>
          </DialogHeader>
          {aiPreview && (
            <AiResultPreview data={normalizeCvPayload(aiPreview) as CvModel} />
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setAiOpen(false)}>
              Annuleren
            </Button>
            <Button type="button" onClick={applyAi}>
              Toepassen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
