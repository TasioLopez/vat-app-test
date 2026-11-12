import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildWorkerProfileView, type WorkerProfileInput } from '@/lib/employee/worker-profile-summary';

type Props = {
  input: WorkerProfileInput;
  reviewCount: number;
  onEdit: () => void;
};

export function WorkerProfileSummary({ input, reviewCount, onEdit }: Props) {
  const profile = buildWorkerProfileView(input);

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-gray-900">{profile.name}</h2>
          {profile.subtitle ? <p className="mt-0.5 text-sm text-gray-700">{profile.subtitle}</p> : null}
          {profile.meta ? <p className="mt-0.5 text-sm text-gray-500">{profile.meta}</p> : null}
        </div>
        <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={onEdit}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Bewerken
          {reviewCount > 0 ? (
            <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
              {reviewCount}
            </span>
          ) : null}
        </Button>
      </div>

      {profile.isEmpty ? (
        <p className="mt-4 text-sm text-gray-600">Gegevens komen uit de intake.</p>
      ) : profile.facts.length > 0 ? (
        <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
          {profile.facts.map((fact) => (
            <div key={fact.label} className={fact.wide ? 'sm:col-span-2' : undefined}>
              <dt className="text-xs text-gray-500">{fact.label}</dt>
              <dd className="whitespace-pre-wrap text-sm text-gray-900">{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
