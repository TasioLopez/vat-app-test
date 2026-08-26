'use client';

import React, { useEffect, useLayoutEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { useTP2026PageNumber } from '@/context/TP2026PageNumberContext';
import { GEGEVENS_PAGE_COUNT } from '@/lib/tp2026/page-numbering';
import { gegevensPageCountForLegendaSpill } from '@/lib/tp2026/gegevens-pagination';
import { boolToJaNee } from '@/lib/tp2026/schema';
import { formatNLDateForDoc } from '@/lib/tp/date-line-breaks';
import { GEGEVENS_EDITOR_SECTIONS } from '@/lib/tp2026/gegevens-editor-layout';
import {
  A4LogoHeader,
  A4Page,
  DataRow,
  FooterIdentity,
  SectionBand,
  TP2026_A4_PAGE_CLASS,
  TP2026FieldTable,
} from '@/components/tp2026/primitives';
import { GegevensEditorSection } from '@/components/tp2026/GegevensEditorSection';
import { GegevensEditorRow } from '@/components/tp2026/GegevensEditorRow';
import { adReportDateLabel, isAdReportConcept } from '@/lib/tp/ad-report-wording';
import {
  resolveOccupationalDoctorLabel,
  stripLeadingDoctorRolePrefix,
} from '@/lib/tp/format-context';
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
import { NB_DEFAULT_GEEN_AD } from '@/lib/tp/static';
import { getWerkgeverName, resolveTPProfileContext } from '@/lib/tp/resolve-profile-context';
import { Mail, Phone, User } from 'lucide-react';
import { PrintGenderChecks, PrintJaNeeChecks } from '@/components/tp2026/PrintCheckbox';
import { DocumentEmployerNameField } from '@/components/tp2026/DocumentEmployerNameField';
import { Button } from '@/components/ui/button';
import { useToastHelpers } from '@/components/ui/Toast';
import { OrgUserSelect } from '@/components/users/OrgUserSelect';
import { supabase } from '@/lib/supabase/client';
import { createAndLinkReferentFromTpData } from '@/lib/referents';
import {
  fetchOrgDirectory,
  formatOrgUserDisplayName,
  type OrgDirectoryUser,
} from '@/lib/users/org-directory';

const GEGEVENS_LEGENDA_ITEMS: [string, string][] = [
  ['AO', 'Arbeidsdeskundig onderzoek'],
  ['AD', 'Arbeidsdeskundig'],
  ['BA', 'Bedrijfsarts'],
  ['EZD', 'Eerste ziekte dag'],
  ['FML', 'Functiemogelijkhedenlijst'],
  ['GBM', 'Geen benutbare mogelijkheden'],
  ['IZP', 'Inzetbaarheidsprofiel'],
  ['LAB', 'Lijst arbeidsmogelijkheden en beperkingen'],
  ['TP', 'Trajectplan'],
  ['VGR', 'Voortgangsrapportage'],
  ['WAZO', 'Wet arbeid en zorg'],
];

function GegevensNaamBlock({ data }: { data: Record<string, any> }) {
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

function GegevensContextCard({ data }: { data: Record<string, any> }) {
  const naam =
    data.first_name && data.last_name
      ? formatTP2026CoverVoorName(data.first_name, data.last_name)
      : [data.last_name, data.first_name].filter(Boolean).join(' ').trim() || '—';
  const werkgever = getWerkgeverName(data) || '—';
  const adviseur = data.consultant_name || '—';

  const items: { label: string; value: React.ReactNode }[] = [
    { label: 'Naam', value: naam },
    { label: 'Werkgever', value: werkgever },
    { label: 'Opdrachtnemer', value: 'ValentineZ' },
    {
      label: 'Loopbaanadviseur',
      value: (
        <span className="space-y-1">
          <span className="block">{adviseur}</span>
          {data.consultant_phone ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="h-3 w-3 shrink-0" aria-hidden />
              {formatPhoneForDisplay(data.consultant_phone)}
            </span>
          ) : null}
          {data.consultant_email ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="h-3 w-3 shrink-0" aria-hidden />
              {data.consultant_email}
            </span>
          ) : null}
        </span>
      ),
    },
  ];

  return (
    <GegevensEditorSection title="Samenvatting" icon={User}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {items.map(({ label, value }) => (
          <div key={label}>
            <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
            <div className="text-sm text-foreground">{value}</div>
          </div>
        ))}
      </div>
    </GegevensEditorSection>
  );
}

export function Gegevens2026Editor({
  data,
  updateField,
  employeeId,
}: {
  data: Record<string, any>;
  updateField: (key: string, value: any) => void;
  employeeId: string;
}) {
  const [orgUsers, setOrgUsers] = useState<OrgDirectoryUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<OrgDirectoryUser | null>(null);
  const [creatingReferent, setCreatingReferent] = useState(false);
  const { showSuccess, showError } = useToastHelpers();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (user?.id) setCurrentUserId(user.id);
      const list = await fetchOrgDirectory(supabase);
      if (cancelled) return;
      setOrgUsers(list);
      if (user?.id) {
        setCurrentUser(list.find((u) => u.id === user.id) ?? null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyConsultantFromUser = (user: OrgDirectoryUser | null, userId: string | null) => {
    if (!user && !userId) {
      updateField('consultant_user_id', null);
      return;
    }
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
    if (
      key === 'consultant_name' ||
      key === 'consultant_phone' ||
      key === 'consultant_email'
    ) {
      updateField('consultant_user_id', null);
    }
  };

  const createNewContactPerson = async () => {
    setCreatingReferent(true);
    try {
      const result = await createAndLinkReferentFromTpData(supabase, employeeId, data);
      if (result.error) {
        showError('Contactpersoon niet aangemaakt', result.error);
        return;
      }
      const profileContext = await resolveTPProfileContext(supabase, employeeId);
      for (const key of [
        'client_referent_name',
        'client_referent_phone',
        'client_referent_email',
        'client_referent_function',
        'client_referent_gender',
      ] as const) {
        if (Object.prototype.hasOwnProperty.call(profileContext, key)) {
          updateField(key, profileContext[key]);
        }
      }
      showSuccess('Nieuwe contactpersoon opgeslagen en gekoppeld.');
    } catch (err) {
      showError(
        'Contactpersoon niet aangemaakt',
        err instanceof Error ? err.message : 'Onbekende fout'
      );
    } finally {
      setCreatingReferent(false);
    }
  };

  return (
    <div className="space-y-6">
      <GegevensContextCard data={data} />
      {GEGEVENS_EDITOR_SECTIONS.map((section) => (
        <GegevensEditorSection key={section.id} title={section.title} icon={section.icon}>
          <div className="space-y-4">
            {section.id === 'opdrachtgever' ? (
              <DocumentEmployerNameField
                data={data}
                updateField={updateField}
                label="Werkgever"
              />
            ) : null}
            {section.id === 'adviseur' ? (
              <div className="space-y-3">
                <div>
                  <div className="mb-1 text-xs font-medium text-muted-foreground">
                    Kies collega
                  </div>
                  <OrgUserSelect
                    supabase={supabase}
                    users={orgUsers}
                    value={
                      typeof data.consultant_user_id === 'string'
                        ? data.consultant_user_id
                        : null
                    }
                    currentUserId={currentUserId}
                    placeholder="Selecteer loopbaanadviseur"
                    onChange={(userId, user) => applyConsultantFromUser(user, userId)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!currentUser && !currentUserId}
                  onClick={() => {
                    if (currentUser) {
                      applyConsultantFromUser(currentUser, currentUser.id);
                      return;
                    }
                    if (!currentUserId) return;
                    void supabase
                      .from('users')
                      .select('id, first_name, last_name, email, phone, role, status')
                      .eq('id', currentUserId)
                      .maybeSingle()
                      .then(({ data: me }) => {
                        if (!me) return;
                        applyConsultantFromUser(me as OrgDirectoryUser, me.id);
                      });
                  }}
                >
                  Gebruik mijn gegevens
                </Button>
              </div>
            ) : null}
            {section.rows.map((row, i) => (
              <GegevensEditorRow
                key={`${section.id}-${i}`}
                row={row}
                data={data}
                updateField={section.id === 'adviseur' ? updateConsultantField : updateField}
              />
            ))}
            {section.id === 'opdrachtgever' ? (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <p className="text-xs text-muted-foreground">
                  Wijzigingen worden opgeslagen in het contactpersonenprofiel van de werkgever.
                  Gebruik de knop om een nieuwe contactpersoon aan te maken.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={creatingReferent}
                  onClick={() => void createNewContactPerson()}
                >
                  {creatingReferent ? 'Opslaan…' : 'Opslaan als nieuwe contactpersoon'}
                </Button>
              </div>
            ) : null}
          </div>
        </GegevensEditorSection>
      ))}
    </div>
  );
}

function GegevensLegendaBlock() {
  return (
    <div>
      <SectionBand title="Legenda" />
      <TP2026FieldTable>
        {GEGEVENS_LEGENDA_ITEMS.map(([abbr, desc]) => (
          <DataRow key={abbr} label={abbr} value={desc} compact />
        ))}
      </TP2026FieldTable>
    </div>
  );
}

function GegevensFooter({
  data,
  pageNumber,
}: {
  data: Record<string, any>;
  pageNumber: number;
}) {
  return (
    <FooterIdentity
      lastName={data.last_name}
      firstName={data.first_name}
      dateOfBirth={formatNLDateForDoc(data.date_of_birth)}
      pageNumber={pageNumber}
    />
  );
}

function GegevensPage1({ data, pageNumber }: { data: Record<string, any>; pageNumber: number }) {
  return (
    <A4Page className={`${TP2026_A4_PAGE_CLASS} flex min-h-0 flex-col overflow-hidden`}>
      <A4LogoHeader />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden" data-gegevens-body>
        <div>
          <SectionBand title="Gegevens werknemer" />
          <TP2026FieldTable>
            <DataRow label="Naam" value={<GegevensNaamBlock data={data} />} />
            <DataRow label="Telefoon" value={formatPhoneForDisplay(data.phone)} />
            <DataRow label="E-mail" value={data.email || '—'} />
            <DataRow label="Geboortedatum" value={formatNLDateForDoc(data.date_of_birth)} />
          </TP2026FieldTable>
        </div>

        <div className="mt-7">
          <SectionBand title="Gegevens re-integratietraject 2e spoor" />
          <TP2026FieldTable>
            <DataRow label="Eerste ziektedag" value={formatNLDateForDoc(data.first_sick_day)} />
            <DataRow label="Datum aanmelding" value={formatNLDateForDoc(data.registration_date)} />
            <DataRow label="Datum intakegesprek" value={formatNLDateForDoc(data.intake_date)} />
            <DataRow label="Datum opmaak trajectplan" value={formatNLDateForDoc(data.tp_creation_date)} />
            <DataRow
              label="Arbeidsdeskundig rapport aanwezig bij aanmelding"
              value={<PrintJaNeeChecks value={data.has_ad_report} className="text-[12px]" />}
            />
            <DataRow
              label={adReportDateLabel(isAdReportConcept(data))}
              value={formatNLDateForDoc(data.ad_report_date)}
            />
            <DataRow label="Arbeidsdeskundige" value={data.occupational_doctor_name || '—'} />
            <DataRow
              label={resolveOccupationalDoctorLabel(data.occupational_doctor_org)}
              value={
                data.occupational_doctor_org
                  ? stripLeadingDoctorRolePrefix(String(data.occupational_doctor_org)) || '—'
                  : '—'
              }
            />
            <DataRow label="Datum FML/IZP/LAB" value={formatNLDateForDoc(data.fml_izp_lab_date)} />
          </TP2026FieldTable>
        </div>

        <div className="mt-7">
          <SectionBand title="Gegevens opdrachtgever" />
          <TP2026FieldTable>
            <DataRow label="Werkgever" value={getWerkgeverName(data) || '—'} />
            <DataRow label="Contactpersoon" value={data.client_referent_name || '—'} />
            <DataRow label="Telefoon" value={formatPhoneForDisplay(data.client_referent_phone)} />
            <DataRow label="E-mail" value={data.client_referent_email || '—'} />
          </TP2026FieldTable>
        </div>

        <div className="mt-7">
          <SectionBand title="Loopbaanadviseur" />
          <TP2026FieldTable>
            <DataRow label="Opdrachtnemer" value="ValentineZ" />
            <DataRow label="Loopbaanadviseur" value={data.consultant_name || '—'} />
            <DataRow label="Telefoon" value={formatPhoneForDisplay(data.consultant_phone)} />
            <DataRow label="E-mail" value={data.consultant_email || '—'} />
          </TP2026FieldTable>
        </div>
      </div>

      <GegevensFooter data={data} pageNumber={pageNumber} />
    </A4Page>
  );
}

function GegevensPage2({
  data,
  pageNumber,
  includeLegenda,
}: {
  data: Record<string, any>;
  pageNumber: number;
  includeLegenda: boolean;
}) {
  const vervoertekst = formatTransportation(null, data.transport_type);
  const rijbewijs = formatDriversLicense(data.drivers_license, data.drivers_license_type);
  const pcVaardigheden = formatComputerSkills(
    data.computer_skills,
    data.computer_skills_description
  );
  return (
    <A4Page className={`${TP2026_A4_PAGE_CLASS} flex min-h-0 flex-col overflow-hidden`}>
      <A4LogoHeader />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden" data-gegevens-body>
        <div>
          <SectionBand title="Gegevens re-integratietraject 2e spoor" />
          <TP2026FieldTable>
            <DataRow label="Huidige functie" value={data.current_job || '—'} />
            <DataRow
              label="Werkervaring"
              value={
                normalizeWorkExperienceTitles(data.work_experience, data.current_job) || '—'
              }
            />
            <DataRow
              label="Opleidingsniveau"
              value={formatEducationLevel(
                normalizeEducationLevel(data.education_level) ?? data.education_level,
                data.education_name
              )}
            />
            <DataRow label="Rijbewijs" value={rijbewijs} />
            <DataRow label="Eigen vervoer" value={vervoertekst} />
            <DataRow label="Spreekvaardigheid NL-taal" value={data.dutch_speaking || '—'} />
            <DataRow label="Schrijfvaardigheid NL-taal" value={data.dutch_writing || '—'} />
            <DataRow label="Leesvaardigheid NL-taal" value={data.dutch_reading || '—'} />
            <DataRow label="Beschikking over een PC" value={boolToJaNee(data.has_computer)} />
            <DataRow label="PC-vaardigheden" value={pcVaardigheden} />
            <DataRow
              label="Aantal contracturen"
              value={data.contract_hours ? `${data.contract_hours} uur per week` : '—'}
            />
            <DataRow
              label="Andere werkgever(s)"
              value={formatGegevensOtherEmployers(
                data.other_employers,
                getWerkgeverName(data)
              )}
            />
          </TP2026FieldTable>
        </div>

        <div className="mt-7">
          <SectionBand title="Opdrachtinformatie" />
          <TP2026FieldTable>
            <DataRow label="Trajectsoort" value="Spoor 2 begeleiding" />
            <DataRow
              label="Doelstelling"
              value="Het doel van dit traject is een bevredigend resultaat. Een structurele werkhervatting die zo dicht mogelijk aansluit bij de resterende functionele mogelijkheden."
            />
            <DataRow
              label="Doorlooptijd"
              value={data.tp_lead_time ? `${data.tp_lead_time} weken` : '—'}
            />
            <DataRow label="Startdatum" value={formatNLDateForDoc(data.tp_start_date)} />
            <DataRow label="Einddatum (planning)" value={formatNLDateForDoc(data.tp_end_date)} />
          </TP2026FieldTable>
          <p className="mt-3 text-[11px] italic leading-snug text-[#6d2a96]/90">{NB_DEFAULT_GEEN_AD}</p>
        </div>

        {includeLegenda ? (
          <div className="mt-7">
            <GegevensLegendaBlock />
          </div>
        ) : null}
      </div>

      <GegevensFooter data={data} pageNumber={pageNumber} />
    </A4Page>
  );
}

function GegevensPage3({ data, pageNumber }: { data: Record<string, any>; pageNumber: number }) {
  return (
    <A4Page className={`${TP2026_A4_PAGE_CLASS} flex min-h-0 flex-col overflow-hidden`}>
      <A4LogoHeader />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden" data-gegevens-body>
        <GegevensLegendaBlock />
      </div>
      <GegevensFooter data={data} pageNumber={pageNumber} />
    </A4Page>
  );
}

/** True when Gegevens page 2 body fits with optional Legenda (off-DOM measure). */
export function doesGegevensPage2FitDom(
  data: Record<string, any>,
  includeLegenda: boolean
): boolean {
  if (typeof document === 'undefined') return true;

  const mount = document.createElement('div');
  mount.setAttribute('aria-hidden', 'true');
  mount.style.cssText =
    'position:fixed;left:-12000px;top:0;width:794px;max-width:794px;pointer-events:none;visibility:hidden;z-index:-9999;';
  document.body.appendChild(mount);

  const root = createRoot(mount);
  try {
    flushSync(() => {
      root.render(
        <GegevensPage2 data={data} pageNumber={1} includeLegenda={includeLegenda} />
      );
    });
    const bodyEl = mount.querySelector('[data-gegevens-body]') as HTMLElement | null;
    if (!bodyEl) return true;
    const room = 10;
    return bodyEl.scrollHeight <= bodyEl.clientHeight + room;
  } finally {
    root.unmount();
    mount.remove();
  }
}

export function Gegevens2026A4Pages({
  data,
  printMode = false,
  onPaginationReady,
}: {
  data: Record<string, any>;
  printMode?: boolean;
  onPaginationReady?: () => void;
}) {
  const { getPageNumber, setSectionPageCount } = useTP2026PageNumber();
  const [spillLegenda, setSpillLegenda] = useState(false);

  useLayoutEffect(() => {
    const fitsWithLegenda = doesGegevensPage2FitDom(data, true);
    const spill = !fitsWithLegenda;
    setSpillLegenda(spill);
    setSectionPageCount('gegevens', gegevensPageCountForLegendaSpill(spill));
    onPaginationReady?.();
  }, [data, setSectionPageCount, onPaginationReady]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      setSectionPageCount('gegevens', GEGEVENS_PAGE_COUNT);
    }
  }, [setSectionPageCount]);

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
      {wrap(<GegevensPage1 data={data} pageNumber={getPageNumber('gegevens', 0)} />, 'g1')}
      {wrap(
        <GegevensPage2
          data={data}
          pageNumber={getPageNumber('gegevens', 1)}
          includeLegenda={!spillLegenda}
        />,
        'g2'
      )}
      {spillLegenda
        ? wrap(
            <GegevensPage3 data={data} pageNumber={getPageNumber('gegevens', 2)} />,
            'g3'
          )
        : null}
    </>
  );
}
