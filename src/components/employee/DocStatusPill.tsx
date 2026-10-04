import { CheckCircle2, Circle, Clock, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CvStatus, TpStatus } from '@/lib/employee/doc-status';

type DocKind = 'tp' | 'cv';

const TP_META: Record<
  TpStatus,
  { label: string; full: string; tone: string; Icon: typeof Circle }
> = {
  none: {
    label: 'Niet gestart',
    full: 'Trajectplan: Niet gestart',
    tone: 'bg-gray-50 text-gray-600 ring-gray-200',
    Icon: Circle,
  },
  draft: {
    label: 'Concept',
    full: 'Trajectplan: Concept',
    tone: 'bg-amber-50 text-amber-900 ring-amber-200',
    Icon: Clock,
  },
  completed: {
    label: 'Klaar',
    full: 'Trajectplan: Klaar',
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
  className,
}: {
  kind: DocKind;
  status: TpStatus | CvStatus;
  className?: string;
}) {
  const meta = kind === 'tp' ? TP_META[status as TpStatus] : CV_META[status as CvStatus];
  const { Icon } = meta;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap',
        meta.tone,
        className
      )}
      title={meta.full}
      aria-label={meta.full}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {meta.label}
    </span>
  );
}
