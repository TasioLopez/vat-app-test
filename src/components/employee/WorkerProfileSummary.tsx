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
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-gray-900">{profile.name}</h2>
          {profile.job ? <p className="mt-0.5 text-sm text-gray-600">{profile.job}</p> : null}
        </div>
        <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={onEdit}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Bewerken
        </Button>
      </div>

      {reviewCount > 0 ? (
        <p className="text-sm font-medium text-amber-700">
          {reviewCount} te controleren
        </p>
      ) : null}

      {profile.isEmpty ? (
        <p className="text-sm text-gray-600">Gegevens komen uit de intake.</p>
      ) : (
        <div className="space-y-4">
          {profile.groups.map((group) => (
            <section key={group.title} className="space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{group.title}</h3>
              <dl className="space-y-1">
                {group.facts.map((fact) => (
                  <div key={`${group.title}-${fact.label}`} className="grid grid-cols-[8.5rem_1fr] gap-x-3 text-sm">
                    <dt className="text-gray-500">{fact.label}</dt>
                    <dd className="min-w-0 whitespace-pre-wrap text-gray-900">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
