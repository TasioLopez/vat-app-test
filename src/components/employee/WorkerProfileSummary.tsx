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
import type { WorkerProfileView } from '@/lib/employee/worker-profile-summary';

const ROW_ICONS: Record<string, LucideIcon> = {
  'E-mail': Mail,
  Telefoon: Phone,
  Geboortedatum: Calendar,
  Geslacht: User,
  Opleiding: GraduationCap,
  Rijbewijs: Car,
  Vervoer: Bus,
  Nederlands: Languages,
  Computer,
  Werkervaring: Briefcase,
  'Andere werkgevers': Building2,
  'Ex-werknemer': UserRound,
  Contactpersoon: User,
  'Dossier-eigenaar': UserRound,
};

type Props = {
  profile: WorkerProfileView;
};

export function WorkerProfileSummary({ profile }: Props) {
  const rows = profile.groups.flatMap((group) => group.rows);

  if (profile.isEmpty) {
    return <p className="text-sm text-gray-600">Gegevens komen uit de intake.</p>;
  }

  if (rows.length === 0) return null;

  return (
    <dl>
      {rows.map((row) => {
        const Icon = ROW_ICONS[row.label] ?? User;
        return (
          <div key={row.label} className="flex min-h-9 items-start gap-2 py-1.5">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
            <dt className="w-28 shrink-0 pt-0.5 text-xs text-gray-500">{row.label}</dt>
            <dd className="min-w-0 flex-1 whitespace-pre-wrap text-sm text-gray-900">{row.value}</dd>
          </div>
        );
      })}
    </dl>
  );
}
