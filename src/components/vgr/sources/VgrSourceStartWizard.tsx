'use client';

import { FileUp, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GegevensEditorSection } from '@/components/tp2026/GegevensEditorSection';
import { VgrMultiUploadZone, type UploadedSourceInfo } from './VgrMultiUploadZone';

type Mode = 'choose' | 'upload';

type Props = {
  employeeId: string;
  mode: Mode;
  onChooseExisting: () => void;
  onStartUpload: () => void;
  onUploaded: (docs: UploadedSourceInfo[]) => void;
  onFinishUpload: () => void;
};

/**
 * Staging-only VGR start: ask whether dossier sources are already uploaded
 * or dump many files now (meeting notes, transcripts, CV, AD, …).
 */
export function VgrSourceStartWizard({
  employeeId,
  mode,
  onChooseExisting,
  onStartUpload,
  onUploaded,
  onFinishUpload,
}: Props) {
  return (
    <GegevensEditorSection title="Brondocumenten voor dit concept" icon={FolderOpen}>
      {mode === 'choose' ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Gebruik bestaande dossierbestanden (trajectplan/app-context blijft altijd meegenomen) of
            upload nu meerdere bewijsstukken tegelijk. Bij versies (AD, transcripts, …) kun je later
            de nieuwste of een specifieke bron kiezen.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="h-auto flex-col items-start gap-1 px-4 py-3 text-left"
              onClick={onChooseExisting}
            >
              <span className="flex items-center gap-2 font-medium">
                <FolderOpen className="h-4 w-4" aria-hidden />
                Al geüpload
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                Selecteer bronnen uit het werknemerdossier
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-auto flex-col items-start gap-1 px-4 py-3 text-left"
              onClick={onStartUpload}
            >
              <span className="flex items-center gap-2 font-medium">
                <FileUp className="h-4 w-4" aria-hidden />
                Nu uploaden
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                Dump notulen, CV, AD, arts, tests, e-mail, …
              </span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Sleep alle relevante bestanden in één keer. De app classificeert ze naar type en bewaart
            uploadtijd én documentdatum (indien herkenbaar). AI-voorstellen blijven tot Overnemen
            (D01); export blijft PDF (D05).
          </p>
          <VgrMultiUploadZone employeeId={employeeId} onUploaded={onUploaded} />
          <div className="flex justify-end">
            <Button type="button" className="bg-[#702A90] hover:bg-[#5a1f75]" onClick={onFinishUpload}>
              Doorgaan naar selectie
            </Button>
          </div>
        </div>
      )}
    </GegevensEditorSection>
  );
}
