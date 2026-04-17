'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  Printer,
  Mail,
  Check,
  Sparkles,
  Wand2,
  Image,
  ImageOff,
  Upload,
  Crop,
  Trash2,
} from 'lucide-react';
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
import CvPhotoCropDialog from '@/components/cv/CvPhotoCropDialog';

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
    photoDisplayUrl,
  } = useCV();

  const photoFileRef = useRef<HTMLInputElement>(null);
  const [cropOpen, setCropOpen] = useState(false);
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

  const statusText = saving
    ? 'Opslaan…'
    : isDirty
      ? 'Niet opgeslagen'
      : lastSavedAt
        ? 'Opgeslagen'
        : '';

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
      updatePersonal({ photoStoragePath: json.path as string, photoCrop: undefined });
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
    updatePersonal({ photoStoragePath: undefined, photoCrop: undefined });
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
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-gray-600" asChild>
              <Link
                href={`/dashboard/employees/${employeeId}`}
                aria-label="Terug naar werknemer"
                title="Terug naar werknemer"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="hidden h-6 w-px shrink-0 bg-gray-200 sm:block" aria-hidden />
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="min-w-0 max-w-[10rem] flex-1 font-semibold sm:max-w-xs"
              placeholder="CV-titel"
            />
            {statusText ? (
              <span
                className={cn(
                  'shrink-0 text-xs',
                  saving || isDirty ? 'text-amber-600' : 'text-emerald-600'
                )}
                title={statusText}
              >
                {statusText}
              </span>
            ) : null}
            {saveError ? (
              <span className="max-w-[min(100%,14rem)] shrink-0 text-xs text-red-600" role="alert">
                {saveError}
              </span>
            ) : null}
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => save()} disabled={saving}>
                <Check className="mr-1 h-4 w-4" />
                Opslaan
              </Button>
            </div>
          </div>

          <div
            className="-mx-1 flex min-h-0 flex-nowrap items-center gap-2 overflow-x-auto overflow-y-hidden border-t border-gray-100 px-1 pt-1.5 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="toolbar"
            aria-label="CV-werkbalk"
          >
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-8 w-8 shrink-0"
                disabled={aiBusy}
                onClick={() => runAi('fill')}
                aria-label="Lege velden invullen met AI"
                title="Lege velden invullen met AI"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-8 w-8 shrink-0"
                disabled={aiBusy}
                onClick={() => runAi('polish')}
                aria-label="Teksten verfijnen met AI"
                title="Teksten verfijnen met AI"
              >
                <Wand2 className="h-4 w-4" />
              </Button>
              {aiError ? (
                <span
                  className="ml-1 max-w-[9rem] shrink-0 truncate text-xs text-red-600"
                  role="alert"
                  title={aiError}
                >
                  {aiError}
                </span>
              ) : null}
            </div>

            <div className="h-6 w-px shrink-0 bg-gray-200" aria-hidden />

            <div className="flex shrink-0 items-center gap-1">
              <AccentColorPicker variant="compact" value={accentColor} onChange={setAccentColor} />
              <Button
                type="button"
                variant={includePhoto ? 'secondary' : 'outline'}
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label={includePhoto ? 'Foto verbergen op CV' : 'Foto tonen op CV'}
                title={includePhoto ? 'Foto verbergen op CV' : 'Foto tonen op CV'}
                aria-pressed={includePhoto}
                onClick={() => updateOptions({ includePhotoInCv: !includePhoto })}
              >
                {includePhoto ? <Image className="h-4 w-4" /> : <ImageOff className="h-4 w-4" />}
              </Button>
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
                size="icon"
                className="h-8 w-8 shrink-0"
                disabled={saving}
                onClick={() => photoFileRef.current?.click()}
                aria-label="Foto uploaden"
                title="Foto uploaden"
              >
                <Upload className="h-4 w-4" />
              </Button>
              {cvData.personal.photoStoragePath ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    disabled={saving || !photoDisplayUrl}
                    onClick={() => setCropOpen(true)}
                    aria-label="Foto uitsnede bewerken"
                    title="Foto uitsnede bewerken"
                  >
                    <Crop className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-red-700 hover:bg-red-50 hover:text-red-700"
                    onClick={removePhoto}
                    aria-label="Foto verwijderen"
                    title="Foto verwijderen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              ) : null}
              {photoError ? (
                <span className="max-w-[8rem] shrink-0 truncate text-xs text-red-600" role="alert" title={photoError}>
                  {photoError}
                </span>
              ) : null}
            </div>

            <div className="h-6 w-px shrink-0 bg-gray-200" aria-hidden />

            <div className="flex shrink-0 items-center gap-1">
              <span id="cv-editor-template-label" className="sr-only">
                Template
              </span>
              <Select value={templateKey} onValueChange={(v) => setTemplateKey(v as CvTemplateKey)}>
                <SelectTrigger
                  className="h-8 w-[min(11rem,46vw)] text-xs"
                  aria-labelledby="cv-editor-template-label"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="modern_professional">Modern (zijbalk)</SelectItem>
                  <SelectItem value="creative_bold">Creatief</SelectItem>
                  <SelectItem value="corporate_minimal">Formeel</SelectItem>
                  <SelectItem value="linear_timeline">Tijdlijn</SelectItem>
                  <SelectItem value="balanced_split">Tweeluik</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="h-6 w-px shrink-0 bg-gray-200" aria-hidden />

            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={handlePrint}
                aria-label="Afdrukken"
                title="Afdrukken"
              >
                <Printer className="h-4 w-4" />
              </Button>
              {cvData.personal.email ? (
                <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" asChild>
                  <a href={mailto} aria-label="E-mail CV" title="E-mail CV">
                    <Mail className="h-4 w-4" />
                  </a>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  disabled
                  aria-label="Geen e-mailadres op CV"
                  title="Geen e-mailadres op CV"
                >
                  <Mail className="h-4 w-4" />
                </Button>
              )}
              <ExportCVButton employeeId={employeeId} cvId={cvId} variant="icon" />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <p className="cv-no-print mb-2 text-center text-xs text-gray-500">
          {employeeLabel} — klik op tekst om te bewerken.
        </p>
        <div className="flex justify-center overflow-x-auto">
          <CVPreview />
        </div>
      </div>

      <CvPhotoCropDialog
        open={cropOpen}
        onOpenChange={setCropOpen}
        imageSrc={photoDisplayUrl}
        initialCrop={cvData.personal.photoCrop}
        onSave={async (crop) => {
          updatePersonal({ photoCrop: crop });
          await save();
        }}
      />

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
