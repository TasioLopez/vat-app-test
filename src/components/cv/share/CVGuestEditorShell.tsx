'use client';

import {
  Printer,
  Check,
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
import { ExportCVShareButton } from '@/components/cv/share/ExportCVShareButton';
import { isLayoutCustomized } from '@/lib/cv/layout-presets';
import { uiLabel } from '@/lib/cv/section-labels';
import type { CvTemplateKey } from '@/types/cv';
import { cn } from '@/lib/utils';
import { useRef, useState } from 'react';
import CvPhotoCropDialog from '@/components/cv/CvPhotoCropDialog';

type Props = {
  shareToken: string;
  employeeLabel: string;
};

export default function CVGuestEditorShell({ shareToken, employeeLabel }: Props) {
  const {
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
    activeLocale,
    setActiveLocale,
    payload,
    layout,
    updateOptions,
    updatePersonal,
    photoDisplayUrl,
  } = useCV();

  const photoFileRef = useRef<HTMLInputElement>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const handleTemplateChange = (v: CvTemplateKey) => {
    if (isLayoutCustomized(layout)) {
      const ok = window.confirm(uiLabel(activeLocale, 'templateChangeConfirm'));
      if (!ok) return;
      setTemplateKey(v, { resetLayout: true });
    } else {
      setTemplateKey(v, { resetLayout: true });
    }
  };

  const handlePrint = () => {
    window.print();
  };

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
    setPhotoError(null);
    try {
      const res = await fetch(`/api/cv-share/${encodeURIComponent(shareToken)}/photo/upload`, {
        method: 'POST',
        body: fd,
      });
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
        await fetch(`/api/cv-share/${encodeURIComponent(shareToken)}/photo`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path }),
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
    <div className="min-h-full shrink-0 bg-gray-100 pb-24 print:bg-white print:pb-0">
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur cv-no-print">
        <div className="mx-auto flex w-full max-w-[min(100%,1400px)] flex-col gap-2 px-6 py-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">CV bewerken</span>
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
                variant={activeLocale === 'nl' ? 'secondary' : 'outline'}
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => setActiveLocale('nl')}
              >
                NL
              </Button>
              <Button
                type="button"
                variant={activeLocale === 'en' ? 'secondary' : 'outline'}
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => setActiveLocale('en')}
              >
                EN
                {!payload.content.en && (
                  <span className="ml-1 text-[10px] text-amber-600">*</span>
                )}
              </Button>
            </div>

            <div className="h-6 w-px shrink-0 bg-gray-200" aria-hidden />

            <div className="flex shrink-0 items-center gap-1">
              <AccentColorPicker variant="compact" value={accentColor} onChange={setAccentColor} />
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
              <span id="cv-guest-template-label" className="sr-only">
                Template
              </span>
              <Select value={templateKey} onValueChange={(v) => handleTemplateChange(v as CvTemplateKey)}>
                <SelectTrigger
                  className="h-8 w-[min(11rem,46vw)] text-xs"
                  aria-labelledby="cv-guest-template-label"
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
              <ExportCVShareButton shareToken={shareToken} variant="icon" locale={activeLocale} />
              {payload.content.en && (
                <ExportCVShareButton
                  shareToken={shareToken}
                  variant="icon"
                  locale="en"
                  label={uiLabel(activeLocale, 'exportEn')}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[min(100%,1400px)] px-6 py-6 pb-8">
        <div className="pb-8">
          <p className="cv-no-print mb-2 text-center text-xs text-gray-500">
            {employeeLabel} — {uiLabel(activeLocale, 'editLayoutHint')}.
          </p>
          <div className="flex justify-center overflow-x-auto">
            <CVPreview />
          </div>
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
    </div>
  );
}
