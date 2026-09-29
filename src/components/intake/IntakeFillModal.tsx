'use client';

import { useEffect, useState } from 'react';
import { FileText, FolderOpen, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import type { IntakeSourcesSummary } from '@/lib/intake/sources';

export type IntakeFillMode = 'import' | 'generate';

type Step = 'choose' | 'empty-intake' | 'empty-dossier' | 'confirm-import' | 'confirm-generate';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  hasDraftContent: boolean;
  onConfirm: (mode: IntakeFillMode) => void;
};

export function IntakeFillModal({
  isOpen,
  onClose,
  employeeId,
  hasDraftContent,
  onConfirm,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<IntakeSourcesSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('choose');

  useEffect(() => {
    if (!isOpen) return;
    setStep('choose');
    setError(null);
    setSources(null);
    setLoading(true);
    let cancelled = false;
    fetch(`/api/intake/sources?employeeId=${encodeURIComponent(employeeId)}`)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Bronnen ophalen mislukt');
        return json as IntakeSourcesSummary;
      })
      .then((summary) => {
        if (!cancelled) setSources(summary);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Bronnen ophalen mislukt');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, employeeId]);

  const pickImport = () => {
    if (!sources?.hasIntakePdf) {
      setStep('empty-intake');
      return;
    }
    setStep('confirm-import');
  };

  const pickGenerate = () => {
    if (!sources?.hasDossierDocs) {
      setStep('empty-dossier');
      return;
    }
    setStep('confirm-generate');
  };

  const confirm = (mode: IntakeFillMode) => {
    onClose();
    onConfirm(mode);
  };

  const footer =
    step === 'choose' ? (
      <Button variant="outline" onClick={onClose}>
        Annuleren
      </Button>
    ) : step === 'empty-intake' || step === 'empty-dossier' ? (
      <>
        <Button variant="outline" onClick={() => setStep('choose')}>
          Terug
        </Button>
        <Button onClick={onClose}>Sluiten</Button>
      </>
    ) : (
      <>
        <Button variant="outline" onClick={() => setStep('choose')}>
          Terug
        </Button>
        <Button
          onClick={() =>
            confirm(step === 'confirm-import' ? 'import' : 'generate')
          }
        >
          Doorgaan
        </Button>
      </>
    );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Intake invullen" size="md" footer={footer}>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Beschikbare documenten controleren…
        </div>
      ) : error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : step === 'choose' ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Kies hoe je het formulier wilt vullen. Bestaande inhoud kan worden overschreven.
          </p>
          <div className="grid gap-3">
            <button
              type="button"
              onClick={pickImport}
              className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-indigo-100 text-indigo-700">
                <FileText className="h-4 w-4" />
              </span>
              <span>
                <span className="block font-medium text-gray-900">Van intakeformulier</span>
                <span className="mt-0.5 block text-sm text-gray-600">
                  Vul automatisch vanuit het geüploade intakeformulier-PDF.
                  {sources?.hasIntakePdf && sources.intakeFileName
                    ? ` Gevonden: ${sources.intakeFileName}`
                    : sources?.hasIntakePdf
                      ? ' Er is een intakeformulier gevonden.'
                      : ' Er is nog geen intakeformulier geüpload.'}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={pickGenerate}
              className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-indigo-100 text-indigo-700">
                <FolderOpen className="h-4 w-4" />
              </span>
              <span>
                <span className="block font-medium text-gray-900">Uit dossier</span>
                <span className="mt-0.5 block text-sm text-gray-600">
                  Genereer op basis van AD/FML/spreekuur en overige dossierstukken (niet het
                  intakeformulier). Gebruik dit als er geen intakeformulier is.
                  {sources?.hasDossierDocs
                    ? ` ${sources.dossierDocCount} document(en) beschikbaar.`
                    : ' Geen geschikte dossierdocumenten gevonden.'}
                </span>
              </span>
            </button>
          </div>
        </div>
      ) : step === 'empty-intake' ? (
        <div className="space-y-2 text-sm text-gray-700">
          <p className="font-medium text-gray-900">Geen intakeformulier geüpload</p>
          <p>
            Er is geen intakeformulier-document gevonden bij deze werknemer. Upload eerst een
            intakeformulier bij de documenten, of kies &quot;Uit dossier&quot; als je wilt
            genereren vanuit AD/FML/spreekuur.
          </p>
        </div>
      ) : step === 'empty-dossier' ? (
        <div className="space-y-2 text-sm text-gray-700">
          <p className="font-medium text-gray-900">Geen dossierdocumenten gevonden</p>
          <p>
            Er zijn geen AD-, FML-, spreekuur- of overige documenten om vanuit te genereren.
            Upload eerst dossierstukken, of gebruik &quot;Van intakeformulier&quot; als die
            beschikbaar is.
          </p>
        </div>
      ) : step === 'confirm-import' ? (
        <div className="space-y-2 text-sm text-gray-700">
          <p className="font-medium text-gray-900">Invullen vanuit intakeformulier</p>
          <p>
            Je staat op het punt het formulier automatisch te vullen vanuit
            {sources?.intakeFileName ? (
              <>
                {' '}
                <strong>{sources.intakeFileName}</strong>
              </>
            ) : (
              ' het geüploade intakeformulier'
            )}
            .
          </p>
          {hasDraftContent ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-900">
              Bestaande velden in dit concept kunnen worden overschreven.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2 text-sm text-gray-700">
          <p className="font-medium text-gray-900">Genereren vanuit dossier</p>
          <p>
            De intake wordt gevuld op basis van AD/FML/spreekuur en overige dossierdocumenten
            ({sources?.dossierDocCount ?? 0} gevonden). Dit is bedoeld wanneer er geen
            intakeformulier is.
          </p>
          {sources?.hasIntakePdf ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-900">
              Er staat wél een intakeformulier klaar. Overweeg &quot;Van intakeformulier&quot;
              als dat de juiste bron is.
            </p>
          ) : null}
          {hasDraftContent ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-900">
              Bestaande velden in dit concept kunnen worden overschreven.
            </p>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
