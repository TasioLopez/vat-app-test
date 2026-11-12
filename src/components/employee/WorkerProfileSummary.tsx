import type { WorkerProfileView } from '@/lib/employee/worker-profile-summary';

type Props = {
  profile: WorkerProfileView;
};

export function WorkerProfileSummary({ profile }: Props) {
  if (profile.isEmpty) {
    return <p className="text-sm text-gray-600">Gegevens komen uit de intake.</p>;
  }

  if (profile.groups.length === 0) return null;

  return (
    <div className="divide-y divide-gray-100">
      {profile.groups.map((group) => (
        <dl key={group.id} className="py-3 first:pt-0 last:pb-0">
          {group.rows.map((row) => (
            <div key={row.label} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-4 border-b border-gray-100 py-2 last:border-b-0">
              <dt className="pt-0.5 text-xs text-gray-500">{row.label}</dt>
              <dd className="whitespace-pre-wrap text-sm text-gray-900">{row.value}</dd>
            </div>
          ))}
        </dl>
      ))}
    </div>
  );
}
