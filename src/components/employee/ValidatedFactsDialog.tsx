'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { SkippedValidatedField } from '@/lib/employee/save-worker-facts';

const LABELS: Record<string, string> = {
  first_name: 'Voornaam',
  last_name: 'Achternaam',
  email: 'E-mail',
  gender: 'Geslacht',
  phone: 'Telefoon',
  date_of_birth: 'Geboortedatum',
  current_job: 'Huidige functie',
  work_experience: 'Werkervaring',
  education_level: 'Opleidingsniveau',
  education_name: 'Opleiding',
  drivers_license: 'Rijbewijs',
  drivers_license_type: 'Rijbewijstype',
  transport_type: 'Vervoer',
  dutch_speaking: 'Spreekvaardigheid',
  dutch_writing: 'Schrijfvaardigheid',
  dutch_reading: 'Leesvaardigheid',
  has_computer: 'Beschikking over een PC',
  computer_skills: 'Computervaardigheden',
  computer_skills_description: 'Toelichting computervaardigheden',
  contract_hours: 'Contracturen',
  other_employers: 'Andere werkgever(s)',
  is_ex_werknemer: 'Ex-werknemer',
  first_sick_day: 'Eerste ziektedag',
  registration_date: 'Datum registratie',
  intake_date: 'Datum intake',
  tp_creation_date: 'Datum opmaak trajectplan',
  has_ad_report: 'AD-rapport aanwezig',
  ad_report_concept: 'AD-rapport concept',
  ad_report_date: 'Datum AD-rapport',
  occupational_doctor_name: 'Bedrijfsarts',
  occupational_doctor_org: 'Organisatie arts',
  fml_izp_lab_date: 'Datum FML/IZP',
  fml_izp_lab_kind: 'Soort belastbaarheidsdocument',
  tp_lead_time: 'Doorlooptijd',
  tp_start_date: 'Startdatum traject',
  tp_end_date: 'Einddatum traject',
};

function formatFact(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Ja' : 'Nee';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  return String(value);
}

export function ValidatedFactsDialog({
  conflicts,
  onAccept,
  onDismiss,
  busy,
}: {
  conflicts: SkippedValidatedField[] | null;
  onAccept: () => void;
  onDismiss: () => void;
  busy?: boolean;
}) {
  return (
    <Dialog open={Boolean(conflicts?.length)} onOpenChange={(open) => { if (!open) onDismiss(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Gevalideerde velden behouden</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600">
          Deze velden zijn al gevalideerd op de werknemer. Het voorstel wijkt af. Alleen de velden die je
          bevestigt worden vervangen.
        </p>
        <ul className="mt-3 max-h-64 space-y-2 overflow-auto text-sm">
          {(conflicts || []).map((conflict) => (
            <li key={conflict.key} className="rounded border border-gray-200 px-3 py-2">
              <div className="font-medium text-gray-900">{LABELS[conflict.key] || conflict.key}</div>
              <div className="text-gray-600">Huidig: {formatFact(conflict.current)}</div>
              <div className="text-gray-600">Voorstel: {formatFact(conflict.proposed)}</div>
            </li>
          ))}
        </ul>
        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={onDismiss} disabled={busy}>
            Behouden
          </Button>
          <Button type="button" onClick={onAccept} disabled={busy}>
            Voorstel overnemen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
