'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  FileUp,
  Loader2,
  Save,
  Sparkles,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import UnsavedChangesSyncGuard from '@/components/unsaved/UnsavedChangesSyncGuard';
import { useGuardedRouter } from '@/hooks/useGuardedRouter';
import { useToastHelpers } from '@/components/ui/Toast';
import {
  IntakeInstanceProvider,
  useIntakeInstance,
} from '@/context/IntakeInstanceContext';
import { IntakeSectionEditor } from '@/components/intake/IntakeSectionEditor';
import {
  INTAKE_SECTION_DEFS,
  ensureIntakeShape,
  type IntakeSectionKey,
} from '@/lib/intake/schema';
import { AutofillProgressOverlay } from '@/components/ui/AutofillProgressOverlay';

type Props = {
  employeeId: string;
  intakeInstanceId: string;
  initialData: unknown;
  initialValidatedAt: string | null;
};

function IntakeBuilderInner({
  employeeId,
  intakeInstanceId,
}: {
  employeeId: string;
  intakeInstanceId: string;
}) {
  const guardedRouter = useGuardedRouter();
  const { intakeData, replaceIntakeData, isDirty, markSaved, validatedAt, setValidatedAt } =
    useIntakeInstance();
  const { showSuccess, showError } = useToastHelpers();
  const [saving, setSaving] = useState(false);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<IntakeSectionKey>(
    INTAKE_SECTION_DEFS[0].key
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    const sections = INTAKE_SECTION_DEFS.map((s) =>
      document.getElementById(`intake-sec-${s.key}`)
    ).filter((el): el is HTMLElement => Boolean(el));

    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0];
        if (!top?.target?.id) return;
        const key = top.target.id.replace(/^intake-sec-/, '') as IntakeSectionKey;
        if (INTAKE_SECTION_DEFS.some((s) => s.key === key)) {
          setActiveSection(key);
        }
      },
      { root, rootMargin: '-10% 0px -55% 0px', threshold: [0.1, 0.25, 0.5] }
    );

    for (const el of sections) observer.observe(el);
    return () => observer.disconnect();
  }, [intakeData]);

  const scrollToSection = useCallback((key: IntakeSectionKey) => {
    const el = document.getElementById(`intake-sec-${key}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(key);
  }, []);

  const persist = useCallback(
    async (opts?: { validate?: boolean }) => {
      const res = await fetch('/api/intake/persist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          intakeInstanceId,
          data_json: intakeData,
          validate: opts?.validate === true,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Opslaan mislukt');
      if (json.validated_at) setValidatedAt(json.validated_at);
      markSaved();
      return json;
    },
    [employeeId, intakeData, intakeInstanceId, markSaved, setValidatedAt]
  );

  const persistForGuard = useCallback(async () => {
    await persist();
  }, [persist]);

  const onSave = async () => {
    setSaving(true);
    try {
      await persist();
      showSuccess('Opgeslagen', 'Intake concept is opgeslagen.');
    } catch (e) {
      showError('Fout', e instanceof Error ? e.message : 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  const onValidate = async () => {
    setSaving(true);
    try {
      await persist({ validate: true });
      showSuccess('Gevalideerd', 'Intake is gevalideerd en doorgezet naar werknemersprofiel/TP-meta.');
    } catch (e) {
      showError('Fout', e instanceof Error ? e.message : 'Valideren mislukt');
    } finally {
      setSaving(false);
    }
  };

  const onImport = async () => {
    setBusyLabel('Intake importeren uit PDF…');
    try {
      const res = await fetch('/api/intake/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          intakeInstanceId,
          data_json: intakeData,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Import mislukt');
      replaceIntakeData(json.data_json, { markDirty: false });
      setValidatedAt(null);
      markSaved();
      if (json.warning) showError('Let op', json.warning);
      else showSuccess('Geïmporteerd', 'Velden zijn gevuld vanuit het intakeformulier.');
    } catch (e) {
      showError('Fout', e instanceof Error ? e.message : 'Import mislukt');
    } finally {
      setBusyLabel(null);
    }
  };

  const onGenerate = async () => {
    setBusyLabel('Intake genereren uit dossier…');
    try {
      const res = await fetch('/api/intake/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, intakeInstanceId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Generatie mislukt');
      replaceIntakeData(json.data_json, { markDirty: false });
      setValidatedAt(null);
      markSaved();
      const conflicts = Array.isArray(json.conflicts) ? json.conflicts : [];
      if (conflicts.length) {
        showError(
          'Conflicten',
          `${conflicts.length} veld(en) leeg gelaten wegens tegenstrijdige bronnen.`
        );
      } else if (json.warning) {
        showError('Let op', json.warning);
      } else {
        showSuccess('Gegenereerd', 'Intake is gevuld vanuit dossierdocumenten.');
      }
    } catch (e) {
      showError('Fout', e instanceof Error ? e.message : 'Generatie mislukt');
    } finally {
      setBusyLabel(null);
    }
  };

  const onExport = async () => {
    setBusyLabel('PDF exporteren…');
    try {
      await persist();
      const res = await fetch(
        `/api/export-intake-pdf?employeeId=${encodeURIComponent(employeeId)}&intakeInstanceId=${encodeURIComponent(intakeInstanceId)}&mode=json`
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Export mislukt');
      if (json.signedUrl) window.open(json.signedUrl, '_blank');
      showSuccess('Export', 'Intake-PDF is aangemaakt.');
    } catch (e) {
      showError('Fout', e instanceof Error ? e.message : 'Export mislukt');
    } finally {
      setBusyLabel(null);
    }
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <UnsavedChangesSyncGuard isDirty={isDirty} onSave={persistForGuard} autosave />
      {busyLabel ? (
        <AutofillProgressOverlay
          progress={{ currentLabel: busyLabel, currentIndex: 0, total: 1 }}
          title="Bezig…"
        />
      ) : null}

      <div className="sticky top-0 z-20 shrink-0 border-b border-border bg-white px-6 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-gray-900">Intakeformulier</h1>
            <p className="text-sm text-gray-600">
              {validatedAt ? (
                <span className="text-emerald-700">Gevalideerd</span>
              ) : (
                <span className="text-amber-700">Concept</span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => guardedRouter.push(`/dashboard/employees/${employeeId}`)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Werknemer
            </Button>
            <Button variant="outline" size="sm" onClick={() => void onImport()} disabled={!!busyLabel}>
              <FileUp className="mr-1 h-4 w-4" />
              Importeer PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => void onGenerate()} disabled={!!busyLabel}>
              <Sparkles className="mr-1 h-4 w-4" />
              Genereer
            </Button>
            <Button variant="outline" size="sm" onClick={() => void onExport()} disabled={!!busyLabel}>
              <Download className="mr-1 h-4 w-4" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => void onSave()} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
              Opslaan
            </Button>
            <Button size="sm" onClick={() => void onValidate()} disabled={saving}>
              <Check className="mr-1 h-4 w-4" />
              Valideer
            </Button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <nav className="hidden w-64 shrink-0 overflow-y-auto border-r bg-gray-50 p-3 md:block">
          <ul className="space-y-1">
            {INTAKE_SECTION_DEFS.map((s) => (
              <li key={s.key}>
                <button
                  type="button"
                  className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${
                    activeSection === s.key
                      ? 'bg-purple-100 font-medium text-purple-900'
                      : 'text-gray-700 hover:bg-white'
                  }`}
                  onClick={() => scrollToSection(s.key)}
                >
                  {s.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-6">
          {intakeData.meta.conflicts.length > 0 ? (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-medium">Conflicten bij generatie</p>
              <ul className="mt-1 list-disc pl-5">
                {intakeData.meta.conflicts.map((c, i) => (
                  <li key={`${c.field}-${i}`}>
                    <strong>{c.field}:</strong> {c.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <IntakeSectionEditor
            data={intakeData}
            onChange={(next) => replaceIntakeData(ensureIntakeShape(next))}
          />
        </div>
      </div>
    </div>
  );
}

export default function IntakeBuilder({
  employeeId,
  intakeInstanceId,
  initialData,
  initialValidatedAt,
}: Props) {
  return (
    <IntakeInstanceProvider
      initialData={initialData}
      initialValidatedAt={initialValidatedAt}
    >
      <IntakeBuilderInner employeeId={employeeId} intakeInstanceId={intakeInstanceId} />
    </IntakeInstanceProvider>
  );
}
