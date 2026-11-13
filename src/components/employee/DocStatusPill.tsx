import { CheckCircle2, Circle, Clock, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CvStatus, GeneratedDocKind, TpStatus } from '@/lib/employee/doc-status';

type DocKind = GeneratedDocKind | 'cv';

const BUILDER_KIND_LABEL: Record<GeneratedDocKind, string> = {
  tp: 'Trajectplan',
  intake: 'Intake',
  vgr: 'VGR',
};

const BUILDER_META: Record<TpStatus, { label: string; tone: string; Icon: typeof Circle }> = {
  none: {
    label: 'Niet gestart',
    tone: 'bg-gray-50 text-gray-600 ring-gray-200',
    Icon: Circle,
  },
  draft: {
    label: 'Concept',
    tone: 'bg-amber-50 text-amber-900 ring-amber-200',
    Icon: Clock,
  },
  completed: {
    label: 'Klaar',
    tone: 'bg-green-50 text-green-800 ring-green-200',
    Icon: CheckCircle2,
  },
};

const CV_META: Record<
  CvStatus,
  { label: string; full: string; tone: string; Icon: typeof Circle }
> = {
  none: {
    label: 'Niet gestart',
    full: 'CV: Niet gestart',
    tone: 'bg-gray-50 text-gray-600 ring-gray-200',
    Icon: Circle,
  },
  draft: {
    label: 'Concept',
    full: 'CV: Concept (aanwezig)',
    tone: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    Icon: CheckCircle2,
  },
  shared: {
    label: 'Gedeeld',
    full: 'CV: Gedeeld',
    tone: 'bg-sky-50 text-sky-800 ring-sky-200',
    Icon: Link2,
  },
  opened: {
    label: 'Geopend',
    full: 'CV: Geopend',
    tone: 'bg-green-50 text-green-800 ring-green-200',
    Icon: CheckCircle2,
  },
};

export function DocStatusPill({
  kind,
  status,
  variant = 'default',
  className,
}: {
  kind: DocKind;
  status: TpStatus | CvStatus;
  /** `icon` hides the label; status text stays on title / aria-label for hover. */
  variant?: 'default' | 'icon';
  className?: string;
}) {
  const meta =
    kind === 'cv'
      ? CV_META[status as CvStatus]
      : {
          ...BUILDER_META[status as TpStatus],
          full: `${BUILDER_KIND_LABEL[kind]}: ${BUILDER_META[status as TpStatus].label}`,
        };
  const { Icon } = meta;
  const iconOnly = variant === 'icon';

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full text-xs font-medium ring-1 ring-inset whitespace-nowrap',
        iconOnly ? 'h-7 w-7 p-0' : 'gap-1 px-2 py-0.5',
        meta.tone,
        className
      )}
      title={meta.full}
      aria-label={meta.full}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {!iconOnly ? meta.label : null}
    </span>
  );
}
