'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  Download,
  FileUp,
  Home,
  Briefcase,
  Calendar,
  Compass,
  FileText,
  HeartPulse,
  History,
  Info,
  Loader2,
  MessageSquare,
  Redo2,
  RefreshCw,
  Save,
  Sparkles,
  Target,
  Undo2,
  User,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import UnsavedChangesSyncGuard from '@/components/unsaved/UnsavedChangesSyncGuard';
import type { AutosaveStatus } from '@/hooks/useDebouncedAutosave';
import { useGuardedRouter } from '@/hooks/useGuardedRouter';
import { useToastHelpers } from '@/components/ui/Toast';
import {
  IntakeInstanceProvider,
  useIntakeInstance,
} from '@/context/IntakeInstanceContext';
import { IntakeSectionEditor } from '@/components/intake/IntakeSectionEditor';
import { IntakeFillModal } from '@/components/intake/IntakeFillModal';
import {
  INTAKE_DOSSIER_NAV,
  INTAKE_SECTION_DEFS,
  ensureIntakeShape,
  type IntakeSectionIcon,
  type IntakeSectionKey,
} from '@/lib/intake/schema';
import { AutofillProgressOverlay } from '@/components/ui/AutofillProgressOverlay';

type Props = {
  employeeId: string;
  intakeInstanceId: string;
  initialData: unknown;
  initialValidatedAt: string | null;
};

type NavKey = 'dossier' | IntakeSectionKey;

const ICON_MAP: Record<IntakeSectionIcon, LucideIcon> = {
  dossier: Home,
  message: MessageSquare,
  user: User,
  briefcase: Briefcase,
  userPlus: UserPlus,
  heartPulse: HeartPulse,
  refresh: RefreshCw,
  fileText: FileText,
  home: Home,
  users: Users,
  housework: Home,
  calendar: Calendar,
  sparkles: Sparkles,
  history: History,
  compass: Compass,
  target: Target,
  info: Info,
};

const NAV_ITEMS: { key: NavKey; title: string; icon: IntakeSectionIcon }[] = [
  INTAKE_DOSSIER_NAV,
  ...INTAKE_SECTION_DEFS.map((s) => ({ key: s.key as NavKey, title: s.title, icon: s.icon })),
];

function autosaveLabel(status: AutosaveStatus, isDirty: boolean): string {
  if (status === 'saving') return 'Opslaan…';
  if (status === 'error') return 'Opslaan mislukt';
  if (status === 'saved' || !isDirty) return 'Opgeslagen';
  return 'Niet opgeslagen';
}

function IntakeBuilderInner({
  employeeId,
  intakeInstanceId,
}: {
  employeeId: string;
  intakeInstanceId: string;
}) {
  const guardedRouter = useGuardedRouter();
  const {
    intakeData,
    replaceIntakeData,
    isDirty,
    markSaved,
    validatedAt,
    setValidatedAt,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useIntakeInstance();
  const { showSuccess, showError } = useToastHelpers();
  const [saving, setSaving] = useState(false);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [noIntakeOpen, setNoIntakeOpen] = useState(false);
  const [noIntakeMessage, setNoIntakeMessage] = useState<string | undefined>();
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('idle');
  const [activeSection, setActiveSection] = useState<NavKey>('dossier');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    const sectionIds = ['intake-sec-dossier', ...INTAKE_SECTION_DEFS.map((s) => `intake-sec-${s.key}`)];
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0];
        if (!top?.target?.id) return;
        const id = top.target.id;
        if (id === 'intake-sec-dossier') {
          setActiveSection('dossier');
          return;
        }
        const key = id.replace(/^intake-sec-/, '') as IntakeSectionKey;
        if (INTAKE_SECTION_DEFS.some((s) => s.key === key)) {
          setActiveSection(key);
        }
      },
      { root, rootMargin: '-10% 0px -55% 0px', threshold: [0.1, 0.25, 0.5] }
    );

    for (const el of sections) observer.observe(el);
    return () => observer.disconnect();
  }, [intakeData]);

  const scrollToSection = useCallback((key: NavKey) => {
    const el = document.getElementById(
      key === 'dossier' ? 'intake-sec-dossier' : `intake-sec-${key}`
    );
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

  const onAutofill = async () => {
    setBusyLabel('Intake automatisch invullen…');
    try {
      const res = await fetch('/api/intake/autofill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, intakeInstanceId }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 404) {
        setNoIntakeMessage(
          typeof json.error === 'string'
            ? json.error
            : 'Er is geen intakeformulier-document gevonden bij deze werknemer. Upload eerst een intakeformulier bij de documenten.'
        );
        setNoIntakeOpen(true);
        return;
      }
      if (!res.ok) throw new Error(json.error || 'Automatisch invullen mislukt');
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
        showSuccess(
          'Ingevuld',
          json.gap_filled
            ? 'Intake is gevuld vanuit het intakeformulier en aangevuld vanuit het dossier.'
            : 'Intake is gevuld vanuit het intakeformulier.'
        );
      }
    } catch (e) {
      showError('Fout', e instanceof Error ? e.message : 'Automatisch invullen mislukt');
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

  const statusText = autosaveLabel(autosaveStatus, isDirty);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <UnsavedChangesSyncGuard
        isDirty={isDirty}
        onSave={persistForGuard}
        autosave
        onAutosaveStatusChange={setAutosaveStatus}
      />
      {busyLabel ? (
        <AutofillProgressOverlay
          progress={{ currentLabel: busyLabel, currentIndex: 0, total: 1 }}
          title="Bezig…"
        />
      ) : null}

      <IntakeFillModal
        isOpen={noIntakeOpen}
        onClose={() => setNoIntakeOpen(false)}
        message={noIntakeMessage}
      />

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
              <span className="mx-1.5 text-gray-300">·</span>
              <span
                className={
                  autosaveStatus === 'error'
                    ? 'text-red-700'
                    : autosaveStatus === 'saving' || isDirty
                      ? 'text-amber-700'
                      : 'text-gray-500'
                }
              >
                {statusText}
              </span>
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => void onAutofill()}
              disabled={!!busyLabel}
            >
              <FileUp className="mr-1 h-4 w-4" />
              Invullen
            </Button>
            <Button variant="outline" size="sm" onClick={() => void onExport()} disabled={!!busyLabel}>
              <Download className="mr-1 h-4 w-4" />
              Download PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={undo}
              disabled={!canUndo || !!busyLabel}
              title="Ongedaan maken (Ctrl+Z)"
              aria-label="Ongedaan maken"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={redo}
              disabled={!canRedo || !!busyLabel}
              title="Opnieuw (Ctrl+Y)"
              aria-label="Opnieuw"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void onSave()}
              disabled={saving || !isDirty}
            >
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
            {NAV_ITEMS.map((s) => {
              const Icon = ICON_MAP[s.icon];
              const active = activeSection === s.key;
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm ${
                      active
                        ? 'bg-indigo-100 font-medium text-indigo-900'
                        : 'text-gray-700 hover:bg-white'
                    }`}
                    onClick={() => scrollToSection(s.key)}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${active ? 'text-indigo-700' : 'text-gray-500'}`}
                    />
                    <span className="truncate">{s.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto bg-gray-50/40 p-6">
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
            onChange={(next, opts) =>
              replaceIntakeData(ensureIntakeShape(next), {
                debounce: opts?.debounce,
              })
            }
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
