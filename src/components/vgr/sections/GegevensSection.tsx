'use client';

import React, { useEffect, useLayoutEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Briefcase, Building2, CalendarRange, ClipboardList, UserCircle, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  A4LogoHeader,
  A4Page,
  DataRow,
  FooterIdentity,
  SectionBand,
  TP2026_A4_PAGE_CLASS,
  TP2026FieldTable,
} from '@/components/tp2026/primitives';
import { GegevensEditorSection, GegevensSubsectionTitle } from '@/components/tp2026/GegevensEditorSection';
import FieldControl from '@/components/tp2026/FieldControl';
import { ComputerSkillsField } from '@/components/tp2026/ComputerSkillsField';
import { DocumentEmployerNameField } from '@/components/tp2026/DocumentEmployerNameField';
import { DocumentReferentFields } from '@/components/tp2026/DocumentReferentFields';
import { PrintGenderChecks, PrintJaNeeChecks } from '@/components/tp2026/PrintCheckbox';
import { OrgUserSelect } from '@/components/users/OrgUserSelect';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { fetchOrgDirectory, formatOrgUserDisplayName, type OrgDirectoryUser } from '@/lib/users/org-directory';
import { getGegevensFieldDef } from '@/lib/tp2026/gegevens-editor-layout';
import type { TP2026FieldDef } from '@/lib/tp2026/schema';
import { boolToJaNee } from '@/lib/tp2026/schema';
import { formatNLDateForDoc } from '@/lib/tp/date-line-breaks';
import { adReportDateLabel, formatAdReportDateForDoc, isAdReportConcept } from '@/lib/tp/ad-report-wording';
import { fmlIzpLabDateLabel } from '@/lib/document-analysis/schemas/tp2-date-schema';
import { resolveOccupationalDoctorLabel, stripLeadingDoctorRolePrefix } from '@/lib/tp/format-context';
import { hasFilledAdReportDate } from '@/lib/tp/intake-ad-presence';
import {
  formatComputerSkills,
  formatDriversLicense,
  formatEducationLevel,
  formatGegevensOtherEmployers,
  formatTP2026CoverVoorName,
  formatTransportation,
} from '@/lib/utils';
import { normalizeWorkExperienceTitles } from '@/lib/tp2026/intake-algemene-info';
import { formatPhoneForDisplay, normalizePhoneForStorage } from '@/lib/phone/format-dutch-display';
import { normalizeEducationLevel } from '@/lib/tp2026/gegevens-field-options';
import { getReferentDisplayFields, getWerkgeverName } from '@/lib/tp/resolve-profile-context';
import { useVGRPageNumber } from '@/context/VGRPageNumberContext';
import { VGR_AVG_NOTE, VGR_LEGENDA, VGR_OPDRACHT_DOELSTELLING, VGR_TRAJECTSOORT } from '@/lib/vgr/content';
import type { VGRData } from '@/lib/vgr/schema';

/* ------------------------------------------------------------------ */
/* Editor                                                              */
/* ------------------------------------------------------------------ */

type EditorRow = { keys: string[]; subsection?: string; gridClass?: string };
type EditorSection = { id: string; title: string; icon: LucideIcon; rows: EditorRow[] };

const VGR_GEGEVENS_EDITOR_SECTIONS: EditorSection[] = [
  {
    id: 'werknemer',
    title: 'Gegevens werknemer',
    icon: UserCircle,
    rows: [{ keys: ['gender', 'date_of_birth'] }, { keys: ['phone', 'email'] }],
  },
  {
    id: 'traject',
    title: 'Gegevens re-integratietraject',
    icon: CalendarRange,
    rows: [
      { keys: ['first_sick_day', 'registration_date'] },
      { keys: ['intake_date', 'tp_creation_date'] },
      { keys: ['has_ad_report', 'ad_report_concept'] },
      { keys: ['is_ex_werknemer'] },
      { keys: ['ad_report_date', 'fml_izp_lab_kind'] },
      { keys: ['fml_izp_lab_date'] },
      { keys: ['occupational_doctor_name', 'occupational_doctor_org'] },
    ],
  },
  { id: 'opdrachtgever', title: 'Gegevens opdrachtgever', icon: Building2, rows: [] },
  {
    id: 'adviseur',
    title: 'Gegevens opdrachtnemer',
    icon: UserRound,
    rows: [{ keys: ['consultant_name'] }, { keys: ['consultant_phone', 'consultant_email'] }],
  },
  {
    id: 'profiel',
    title: 'Aanvullende gegevens werknemer',
    icon: Briefcase,
    rows: [
      { subsection: 'Werk & opleiding', keys: ['current_job'] },
      { keys: ['work_experience'] },
      { keys: ['education_level', 'education_name'] },
      { keys: ['contract_hours'] },
      { subsection: 'Mobiliteit & vervoer', keys: ['drivers_license'] },
      { keys: ['drivers_license_type'] },
      { keys: ['transport_type'] },
      {
        subsection: 'Nederlandse taal',
        keys: ['dutch_speaking', 'dutch_writing', 'dutch_reading'],
        gridClass: 'grid grid-cols-1 gap-y-4 sm:grid-cols-2 lg:grid-cols-3',
      },
      { subsection: 'Computer', keys: ['has_computer'] },
      { keys: ['computer_skills'] },
      { subsection: 'Overig', keys: ['other_employers'] },
    ],
  },
  {
    id: 'opdracht',
    title: 'Opdrachtinformatie',
    icon: ClipboardList,
    rows: [{ keys: ['tp_lead_time', 'tp_start_date', 'tp_end_date'], gridClass: 'grid grid-cols-1 gap-y-4 sm:grid-cols-3' }],
  },
];

function hideField(key: string, data: Record<string, unknown>): boolean {
  if (key === 'ad_report_date' && data.has_ad_report === false && !hasFilledAdReportDate(data.ad_report_date)) return true;
  if (key === 'drivers_license_type' && data.drivers_license !== true) return true;
  if (key === 'computer_skills' && data.has_computer === false) return true;
  return false;
}

function VgrGegevensRow({
  row,
  data,
  updateField,
}: {
  row: EditorRow;
  data: VGRData;
  updateField: (key: string, value: any) => void;
}) {
  const keys = row.keys.filter((k) => !hideField(k, data));
  if (keys.length === 0) return null;
  const grid =
    row.gridClass ??
    (keys.length === 3
      ? 'grid grid-cols-1 gap-y-4 sm:grid-cols-2 lg:grid-cols-3'
      : keys.length === 2
        ? 'grid grid-cols-1 gap-y-4 sm:grid-cols-2'
        : 'grid grid-cols-1 gap-y-4');
  return (
    <div className="space-y-3">
      {row.subsection ? <GegevensSubsectionTitle>{row.subsection}</GegevensSubsectionTitle> : null}
      <div className={grid}>
        {keys.map((key) => {
          let field: TP2026FieldDef = getGegevensFieldDef(key);
          if (key === 'ad_report_date') field = { ...field, label: adReportDateLabel(isAdReportConcept({ ad_report_concept: data.ad_report_concept })) };
          if (key === 'occupational_doctor_org') {
            field = { ...field, label: resolveOccupationalDoctorLabel(typeof data.occupational_doctor_org === 'string' ? data.occupational_doctor_org : null) };
          }
          if (key === 'computer_skills') {
            return (
              <ComputerSkillsField
                key={key}
                field={field}
                level={data.computer_skills}
                description={data.computer_skills_description}
                updateField={updateField}
              />
            );
          }
          return (
            <FieldControl
              key={key}
              field={field}
              value={data[key]}
              layout="stack"
              compactBoolean={field.type === 'boolean'}
              minRows={field.type === 'multiline' ? 3 : undefined}
              onChange={(v) => {
                if (key === 'has_ad_report' && v === true) updateField('ad_report_concept', false);
                if (key === 'ad_report_concept' && v === true) updateField('has_ad_report', false);
                updateField(key, v);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export function GegevensEditor({
  data,
  updateField,
}: {
  data: VGRData;
  updateField: (key: string, value: any) => void;
  employeeId: string;
}) {
  const [orgUsers, setOrgUsers] = useState<OrgDirectoryUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (user?.id) setCurrentUserId(user.id);
      const list = await fetchOrgDirectory(supabase);
      if (!cancelled) setOrgUsers(list);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyConsultantFromUser = (user: OrgDirectoryUser | null, userId: string | null) => {
    if (user) {
      updateField('consultant_user_id', user.id);
      updateField('consultant_name', formatOrgUserDisplayName(user));
      updateField('consultant_phone', normalizePhoneForStorage(user.phone) ?? '');
      updateField('consultant_email', (user.email || '').trim());
      return;
    }
    updateField('consultant_user_id', userId);
  };

  const updateConsultantField = (key: string, value: unknown) => {
    updateField(key, value);
    if (key === 'consultant_name' || key === 'consultant_phone' || key === 'consultant_email') {
      updateField('consultant_user_id', null);
    }
  };

  const fmlEqualsSickDay =
    !!data.fml_izp_lab_date && !!data.first_sick_day && data.fml_izp_lab_date === data.first_sick_day;

  return (
    <div className="space-y-6">
      {VGR_GEGEVENS_EDITOR_SECTIONS.map((section) => (
        <GegevensEditorSection key={section.id} title={section.title} icon={section.icon}>
          <div className="space-y-4">
            {section.id === 'opdrachtgever' ? (
              <>
                <DocumentEmployerNameField data={data} updateField={updateField} label="Werkgever" />
                <DocumentReferentFields data={data} updateField={updateField} />
              </>
            ) : null}
            {section.id === 'adviseur' ? (
              <div>
                <div className="mb-1 text-xs font-medium text-muted-foreground">Kies collega</div>
                <OrgUserSelect
                  supabase={supabase}
                  users={orgUsers}
                  value={typeof data.consultant_user_id === 'string' ? data.consultant_user_id : null}
                  currentUserId={currentUserId}
                  placeholder="Selecteer loopbaanadviseur"
                  onChange={(userId, user) => applyConsultantFromUser(user, userId)}
                />
                {currentUserId ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      const me = orgUsers.find((u) => u.id === currentUserId) ?? null;
                      if (me) applyConsultantFromUser(me, me.id);
                    }}
                  >
                    Gebruik mijn gegevens
                  </Button>
                ) : null}
              </div>
            ) : null}
            {section.rows.map((row, i) => (
              <VgrGegevensRow
                key={`${section.id}-${i}`}
                row={row}
                data={data}
                updateField={section.id === 'adviseur' ? updateConsultantField : updateField}
              />
            ))}
            {section.id === 'traject' && fmlEqualsSickDay ? (
              <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                De datum FML/IZP/LAB is gelijk aan de eerste ziektedag. Controleer deze datum: in het sjabloon is dit
                een bekende fout.
              </p>
            ) : null}
          </div>
        </GegevensEditorSection>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* A4 pages                                                            */
/* ------------------------------------------------------------------ */

function NaamBlock({ data }: { data: VGRData }) {
  const naam =
    data.first_name && data.last_name
      ? formatTP2026CoverVoorName(data.first_name, data.last_name)
      : [data.last_name, data.first_name].filter(Boolean).join(' ').trim() || '—';
  return (
    <div className="space-y-1">
      <div>{naam}</div>
      <PrintGenderChecks gender={data.gender} className="text-[11px]" />
    </div>
  );
}

function LegendaBlock() {
  return (
    <div>
      <SectionBand title="Legenda" />
      <TP2026FieldTable>
        {VGR_LEGENDA.map(([abbr, desc]) => (
          <DataRow key={abbr} label={abbr} value={desc} compact />
        ))}
      </TP2026FieldTable>
    </div>
  );
}

function Footer({ data, pageNumber }: { data: VGRData; pageNumber: number }) {
  return (
    <FooterIdentity
      lastName={data.last_name}
      firstName={data.first_name}
      dateOfBirth={formatNLDateForDoc(data.date_of_birth)}
      pageNumber={pageNumber}
    />
  );
}

function Page1({ data, pageNumber }: { data: VGRData; pageNumber: number }) {
  const referent = getReferentDisplayFields(data);
  return (
    <A4Page className={`${TP2026_A4_PAGE_CLASS} flex min-h-0 flex-col overflow-hidden`}>
      <A4LogoHeader />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden" data-vgr-gegevens-body>
        <div>
          <SectionBand title="Gegevens werknemer" />
          <TP2026FieldTable>
            <DataRow label="Naam" value={<NaamBlock data={data} />} />
            <DataRow label="Telefoon" value={formatPhoneForDisplay(data.phone)} />
            <DataRow label="E-mail" value={data.email || '—'} />
            <DataRow label="Geboortedatum" value={formatNLDateForDoc(data.date_of_birth)} />
          </TP2026FieldTable>
        </div>

        <div className="mt-7">
          <SectionBand title="Gegevens re-integratietraject" />
          <TP2026FieldTable>
            <DataRow label="Eerste ziektedag" value={formatNLDateForDoc(data.first_sick_day)} />
            <DataRow label="Datum aanmelding" value={formatNLDateForDoc(data.registration_date)} />
            <DataRow label="Datum intakegesprek" value={formatNLDateForDoc(data.intake_date)} />
            <DataRow label="Datum opmaak trajectplan" value={formatNLDateForDoc(data.tp_creation_date)} />
            <DataRow
              label="Arbeidsdeskundig rapport aanwezig bij aanmelding"
              value={<PrintJaNeeChecks value={data.has_ad_report} className="text-[12px]" />}
            />
            <DataRow label={adReportDateLabel(isAdReportConcept({ ad_report_concept: data.ad_report_concept }))} value={formatAdReportDateForDoc(data.ad_report_date)} />
            <DataRow
              label="Arbeidsdeskundige"
              value={data.occupational_doctor_name?.trim() ? data.occupational_doctor_name : 'Geen'}
            />
            <DataRow
              label={resolveOccupationalDoctorLabel(data.occupational_doctor_org)}
              value={
                data.occupational_doctor_org
                  ? stripLeadingDoctorRolePrefix(String(data.occupational_doctor_org)) || 'Geen'
                  : 'Geen'
              }
            />
            <DataRow label={fmlIzpLabDateLabel(data.fml_izp_lab_kind)} value={formatNLDateForDoc(data.fml_izp_lab_date)} />
          </TP2026FieldTable>
        </div>

        <div className="mt-7">
          <SectionBand title="Gegevens opdrachtgever" />
          <TP2026FieldTable>
            <DataRow label="Werkgever" value={getWerkgeverName(data) || '—'} />
            <DataRow label="Contactpersoon" value={referent.client_referent_name || '—'} />
            <DataRow label="Telefoon" value={formatPhoneForDisplay(referent.client_referent_phone)} />
            <DataRow label="E-mail" value={referent.client_referent_email || '—'} />
          </TP2026FieldTable>
        </div>

        <div className="mt-7">
          <SectionBand title="Gegevens opdrachtnemer" />
          <TP2026FieldTable>
            <DataRow label="Opdrachtnemer" value="ValentineZ" />
            <DataRow label="Loopbaanadviseur" value={data.consultant_name || '—'} />
            <DataRow label="Telefoon" value={formatPhoneForDisplay(data.consultant_phone)} />
            <DataRow label="E-mail" value={data.consultant_email || '—'} />
          </TP2026FieldTable>
        </div>
      </div>
      <Footer data={data} pageNumber={pageNumber} />
    </A4Page>
  );
}

function Page2({ data, pageNumber, includeLegenda }: { data: VGRData; pageNumber: number; includeLegenda: boolean }) {
  const vervoer = formatTransportation(null, data.transport_type);
  const rijbewijs = formatDriversLicense(data.drivers_license, data.drivers_license_type);
  const pc = formatComputerSkills(data.computer_skills, data.computer_skills_description);
  return (
    <A4Page className={`${TP2026_A4_PAGE_CLASS} flex min-h-0 flex-col overflow-hidden`}>
      <A4LogoHeader />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden" data-vgr-gegevens-body>
        <div>
          <SectionBand title="Aanvullende gegevens werknemer" />
          <TP2026FieldTable>
            <DataRow label="Huidige functie" value={data.current_job || '—'} />
            <DataRow label="Werkervaring" value={normalizeWorkExperienceTitles(data.work_experience, data.current_job) || '—'} />
            <DataRow
              label="Opleidingsniveau"
              value={formatEducationLevel(normalizeEducationLevel(data.education_level) ?? data.education_level, data.education_name)}
            />
            <DataRow label="Rijbewijs" value={rijbewijs} />
            <DataRow label="Eigen vervoer" value={vervoer} />
            <DataRow label="Spreekvaardigheid NL-taal" value={data.dutch_speaking || '—'} />
            <DataRow label="Schrijfvaardigheid NL-taal" value={data.dutch_writing || '—'} />
            <DataRow label="Leesvaardigheid NL-taal" value={data.dutch_reading || '—'} />
            <DataRow label="Beschikt over een PC" value={boolToJaNee(data.has_computer)} />
            <DataRow label="PC-vaardigheden" value={pc} />
            <DataRow label="Aantal contracturen" value={data.contract_hours ? `${data.contract_hours} uur per week` : '—'} />
            <DataRow label="Andere werkgever(s)" value={formatGegevensOtherEmployers(data.other_employers, getWerkgeverName(data))} />
          </TP2026FieldTable>
        </div>

        <div className="mt-7">
          <SectionBand title="Opdrachtinformatie" />
          <TP2026FieldTable>
            <DataRow label="Trajectsoort" value={VGR_TRAJECTSOORT} />
            <DataRow label="Doelstelling" value={VGR_OPDRACHT_DOELSTELLING} />
            <DataRow label="Doorlooptijd" value={data.tp_lead_time ? `${data.tp_lead_time} weken` : '—'} />
            <DataRow label="Startdatum" value={formatNLDateForDoc(data.tp_start_date)} />
            <DataRow label="Einddatum (planning)" value={formatNLDateForDoc(data.tp_end_date)} />
          </TP2026FieldTable>
          <p className="mt-3 text-[10.5px] italic leading-snug text-[#702A90]/90">{VGR_AVG_NOTE}</p>
        </div>

        {includeLegenda ? (
          <div className="mt-7">
            <LegendaBlock />
          </div>
        ) : null}
      </div>
      <Footer data={data} pageNumber={pageNumber} />
    </A4Page>
  );
}

function Page3({ data, pageNumber }: { data: VGRData; pageNumber: number }) {
  return (
    <A4Page className={`${TP2026_A4_PAGE_CLASS} flex min-h-0 flex-col overflow-hidden`}>
      <A4LogoHeader />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden" data-vgr-gegevens-body>
        <LegendaBlock />
      </div>
      <Footer data={data} pageNumber={pageNumber} />
    </A4Page>
  );
}

function page2FitsWithLegenda(data: VGRData): boolean {
  if (typeof document === 'undefined') return true;
  const mount = document.createElement('div');
  mount.setAttribute('aria-hidden', 'true');
  mount.style.cssText =
    'position:fixed;left:-12000px;top:0;width:794px;max-width:794px;pointer-events:none;visibility:hidden;z-index:-9999;';
  document.body.appendChild(mount);
  const root = createRoot(mount);
  try {
    flushSync(() => {
      root.render(<Page2 data={data} pageNumber={1} includeLegenda />);
    });
    const body = mount.querySelector('[data-vgr-gegevens-body]') as HTMLElement | null;
    if (!body) return true;
    return body.scrollHeight <= body.clientHeight + 10;
  } finally {
    root.unmount();
    mount.remove();
  }
}

export function GegevensA4Pages({
  data,
  printMode = false,
  onPaginationReady,
}: {
  data: VGRData;
  printMode?: boolean;
  onPaginationReady?: () => void;
}) {
  const { getPageNumber, setSectionPageCount } = useVGRPageNumber();
  const [spill, setSpill] = useState(false);

  useLayoutEffect(() => {
    const fits = page2FitsWithLegenda(data);
    setSpill(!fits);
    setSectionPageCount('gegevens', fits ? 2 : 3);
    onPaginationReady?.();
  }, [data, setSectionPageCount, onPaginationReady]);

  const wrap = (node: React.ReactNode, key: string) =>
    printMode ? (
      <section className="print-page" key={key}>
        {node}
      </section>
    ) : (
      <div key={key}>{node}</div>
    );

  return (
    <>
      {wrap(<Page1 data={data} pageNumber={getPageNumber('gegevens', 0)} />, 'g1')}
      {wrap(<Page2 data={data} pageNumber={getPageNumber('gegevens', 1)} includeLegenda={!spill} />, 'g2')}
      {spill ? wrap(<Page3 data={data} pageNumber={getPageNumber('gegevens', 2)} />, 'g3') : null}
    </>
  );
}
