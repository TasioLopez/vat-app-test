import {
  Briefcase,
  Building2,
  Bus,
  Calendar,
  Car,
  Computer,
  GraduationCap,
  Languages,
  Mail,
  Phone,
  User,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import type { WorkerProfileRow, WorkerProfileView } from '@/lib/employee/worker-profile-summary';

const FACT_ICONS: Record<string, LucideIcon> = {
  'E-mail': Mail,
  Telefoon: Phone,
  Geboortedatum: Calendar,
  Geslacht: User,
  Opleiding: GraduationCap,
  Rijbewijs: Car,
  Vervoer: Bus,
  Nederlands: Languages,
  Computer,
  'Ex-werknemer': UserRound,
  Werkervaring: Briefcase,
  'Andere werkgevers': Building2,
};

function rowsFor(profile: WorkerProfileView, id: string): WorkerProfileRow[] {
  return profile.groups.find((group) => group.id === id)?.rows ?? [];
}

type Props = {
  profile: WorkerProfileView;
};

export function WorkerProfileSummary({ profile }: Props) {
  const people = rowsFor(profile, 'people');
  const facts = rowsFor(profile, 'facts');
  const prose = rowsFor(profile, 'prose');

  if (profile.isEmpty) {
    return <p className="text-sm text-gray-600">Gegevens komen uit de intake.</p>;
  }

  if (people.length === 0 && facts.length === 0 && prose.length === 0) return null;

  return (
    <div className="space-y-6">
      {people.length > 0 ? (
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {people.map((row) => (
            <div key={row.label}>
              <dt className="text-xs text-gray-500">{row.label}</dt>
              <dd className="mt-0.5 text-sm text-gray-900">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {facts.length > 0 ? (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
          {facts.map((row) => {
            const Icon = FACT_ICONS[row.label] ?? User;
            return (
              <div key={row.label} className="min-w-0">
                <dt className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Icon className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                  {row.label}
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{row.value}</dd>
              </div>
            );
          })}
        </dl>
      ) : null}

      {prose.length > 0 ? (
        <dl className="space-y-4">
          {prose.map((row) => (
            <div key={row.label}>
              <dt className="text-xs text-gray-500">{row.label}</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-900">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
