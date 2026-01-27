'use client';

import { useEffect, useState } from 'react';
import { useTP } from '@/context/TPContext';
import { supabase } from '@/lib/supabase/client';
import { 
  formatEmployeeName, 
  formatEmployeeNameWithoutPrefix,
  formatWorkExperience, 
  formatEducationLevel,
  formatDriversLicense,
  formatTransportation,
  formatComputerSkills,
  filterOtherEmployers
} from '@/lib/utils';
import Image from 'next/image';
import Logo2 from '@/assets/images/logo-2.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TPPreviewWrapper from '@/components/tp/TPPreviewWrapper';

const tdLabel = "py-1 px-2 border-collapse align-top w-[40%] font-bold";
const tdValue = "py-1 px-2 border-collapse align-top";

// helpers
const toISODate = (d: Date) => {
  // build YYYY-MM-DD without timezone surprises
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// accepts 'YYYY-MM-DD', 'DD/MM/YYYY', 'DD-MM-YYYY'
const parseDateFlexible = (v: string): Date | null => {
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const m = v.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (m) {
    const d = Number(m[1]), mo = Number(m[2]), y = Number(m[3]);
    return new Date(y, mo - 1, d);
  }
  const n = new Date(v);
  return isNaN(+n) ? null : n;
};

const addYears = (d: Date, years: number) =>
  new Date(d.getFullYear() + years, d.getMonth(), d.getDate());

const weekDiffCeil = (a: Date, b: Date) =>
  Math.max(0, Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24 * 7)));

// put near the top
const DATE_FIELDS = [
  'date_of_birth',
  'first_sick_day',
  'intake_date',
  'registration_date',
  'tp_creation_date',
  'ad_report_date',
  'fml_izp_lab_date',
  'tp_start_date',
  'tp_end_date',
] as const;


export default function EmployeeInfo({ employeeId }: { employeeId: string }) {
  const { tpData, updateField } = useTP();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autofillLoading, setAutofillLoading] = useState(false);
  const [autofilledFields, setAutofilledFields] = useState<string[]>([]);
  const [savedFields, setSavedFields] = useState<string[]>([]);
  const [autofillMessage, setAutofillMessage] = useState<{type: 'success' | 'warning' | 'error', title: string, content: string} | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);


  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const { data: employee } = await supabase
        .from('employees')
        .select('email, first_name, last_name, client_id')
        .eq('id', employeeId)
        .single();

      const { data: details } = await supabase
        .from('employee_details')
        .select('*')
        .eq('employee_id', employeeId)
        .single();

      const { data: meta } = await supabase
        .from('tp_meta')
        .select('*')
        .eq('employee_id', employeeId)
        .single();

      if (employee) {
        Object.entries(employee).forEach(([key, value]) => updateField(key, value));
      }

      if (details) {
        Object.entries(details).forEach(([key, value]) => updateField(key, value));
      }

      if (meta) {
        // normalize any date-ish fields to YYYY-MM-DD so inputs & effects stay in sync
        const normalized: Record<string, any> = { ...meta };
        (DATE_FIELDS as readonly string[]).forEach((f) => {
          const v = (meta as any)[f];
          if (v) {
            const d = parseDateFlexible(String(v));
            if (d) normalized[f] = toISODate(d);
          }
        });

        Object.entries(normalized).forEach(([key, value]) => updateField(key, value));
      }


      // Fetch client info
      if (employee?.client_id) {
        const { data: client } = await supabase
          .from('clients')
          .select('name, referent_first_name, referent_last_name, referent_phone, referent_email')
          .eq('id', employee.client_id)
          .single();

        if (client) {
          updateField('client_name', client.name);
          updateField('client_referent_name', `${client.referent_first_name} ${client.referent_last_name}`);
          updateField('client_referent_phone', client.referent_phone);
          updateField('client_referent_email', client.referent_email);
        }
      }

      // Fetch current user info (consultant)
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('first_name, last_name, phone, email')
          .eq('id', user.id)
          .single();

        if (profile) {
          updateField('consultant_name', `${profile.first_name} ${profile.last_name}`);
          updateField('consultant_phone', profile.phone);
          updateField('consultant_email', profile.email);
        }
      }

      setLoading(false);
    }

    fetchData();
  }, [employeeId]);

  const handleChange = (field: string, value: any) => {
    // if it's a date field, coerce to YYYY-MM-DD
    if ((DATE_FIELDS as readonly string[]).includes(field)) {
      const d = parseDateFlexible(value);
      updateField(field, d ? toISODate(d) : value); // keep raw if not parseable
    } else {
      updateField(field, value);
    }
    setAutofilledFields(prev => prev.filter(f => f !== field));
  };


  // Calculate start date based on trajectory duration rule
  useEffect(() => {
    const regISO = tpData?.registration_date;
    const intakeISO = tpData?.intake_date;
    const endISO = tpData?.tp_end_date;
    
    if (!regISO || !intakeISO || !endISO) return;
    
    // Calculate potential duration in weeks from registration date
    const regDate = parseDateFlexible(regISO);
    const endDate = parseDateFlexible(endISO);
    if (!regDate || !endDate) return;
    
    const durationWeeks = weekDiffCeil(regDate, endDate);
    
    // Rule: If duration >= 53 weeks, start = intake_date; else start = registration_date
    const startISO = durationWeeks >= 53 ? intakeISO : regISO;
    
    if (tpData.tp_start_date !== startISO) updateField('tp_start_date', startISO);
  }, [tpData.registration_date, tpData.intake_date, tpData.tp_end_date]);

  // End = first_sick_day + 2 years
  useEffect(() => {
    const fsdISO = tpData?.first_sick_day;
    if (!fsdISO) return;
    const DURATION_YEARS = 2; // 2 years after first sick day
    const fsd = parseDateFlexible(fsdISO);
    if (!fsd) return;
    const endISO = toISODate(addYears(fsd, DURATION_YEARS));
    if (tpData.tp_end_date !== endISO) updateField('tp_end_date', endISO);
  }, [tpData.first_sick_day]);

  // Lead time (weeks) = end - start (ceil), shown as text => store as string
  useEffect(() => {
    const start = parseDateFlexible(tpData?.tp_start_date || '');
    const end = parseDateFlexible(tpData?.tp_end_date || '');
    if (!start || !end) return;
    const weeks = weekDiffCeil(start, end);
    if (String(tpData.tp_lead_time) !== String(weeks)) {
      updateField('tp_lead_time', String(weeks));
    }
  }, [tpData.tp_start_date, tpData.tp_end_date]);


  // employee_details columns (add phone, remove first_sick_day)
  const DETAILS_FIELDS = [
    'phone',                      // ✅ moved here
    'date_of_birth', 'current_job', 'work_experience', 'education_level',
    'drivers_license', 'transport_type', 'dutch_speaking', 'dutch_writing', 'dutch_reading',
    'has_computer', 'computer_skills', 'contract_hours', 'other_employers'
  ] as const;

  // tp_meta columns - CONSULTANT FIELDS REMOVED (they come from users table)
  const META_FIELDS = [
    'first_sick_day',
    'tp_lead_time', 'tp_start_date', 'tp_end_date', 'fml_izp_lab_date', 'intake_date', 'registration_date', 'tp_creation_date',
    'ad_report_date', 'occupational_doctor_name', 'occupational_doctor_org', 'has_ad_report'
  ] as const;

  // employees columns (drop phone; keep email here if it's editable)
  const EMPLOYEE_FIELDS = ['email'] as const;


  function pick<T extends object, K extends keyof T>(obj: T, keys: readonly K[]) {
    const out = {} as Pick<T, K>;
    keys.forEach(k => { if (obj[k] !== undefined) (out as any)[k] = obj[k]; });
    return out;
  }

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveOk(false);

    try {
      const detailsPayload = { employee_id: employeeId, ...pick(tpData, DETAILS_FIELDS as any) };
      const metaPayload = { employee_id: employeeId, ...pick(tpData, META_FIELDS as any) };

      const detailsReq =
        supabase.from('employee_details')
          .upsert(detailsPayload, { onConflict: 'employee_id' })
          .select()
          .single();

      const metaReq =
        supabase.from('tp_meta')
          .upsert(metaPayload, { onConflict: 'employee_id' })
          .select()
          .single();

      const employeePatch = pick(tpData, EMPLOYEE_FIELDS as any);
      const employeeReq = Object.keys(employeePatch).length
        ? supabase.from('employees').update(employeePatch).eq('id', employeeId).select().single()
        : null;

      // 👇 Force the array to contain Promises (silences the 3 errors)
      const pending: Promise<any>[] = [
        detailsReq as unknown as Promise<any>,
        metaReq as unknown as Promise<any>,
      ];

      if (employeeReq) pending.push(employeeReq as unknown as Promise<any>);

      const results = await Promise.all(pending);


      const firstError = results.find(r => r?.error)?.error;
      if (firstError) {
        setSaveError(firstError.message || 'Opslaan mislukt.');
        // Show error notification
        setAutofillMessage({
          type: 'error',
          title: '❌ Opslaan Mislukt',
          content: firstError.message || 'Er is een fout opgetreden bij het opslaan.'
        });
        console.warn('Save warning:', firstError);
        return;
      }

      setSaveOk(true);
      
      // Show success notification
      setAutofillMessage({
        type: 'success',
        title: '✅ Opslaan Succesvol',
        content: 'De gegevens zijn succesvol opgeslagen.'
      });
      
      // Mark all current fields as saved (green border)
      const allFieldKeys = [
        ...DETAILS_FIELDS,
        ...META_FIELDS,
        ...EMPLOYEE_FIELDS
      ].map(f => String(f));
      setSavedFields(allFieldKeys);
      
      // Clear saved state and notification after 3 seconds
      setTimeout(() => {
        setSavedFields([]);
        setSaveOk(false);
      }, 3000);
    } catch (e: any) {
      setSaveError(e?.message || 'Onbekende fout.');
      console.warn('Save exception:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleAutofill = async () => {
    setAutofillLoading(true);
    try {
      const res = await fetch(`/api/autofill-tp-2?employeeId=${employeeId}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        const errorMsg = data.error || 'Autofill mislukt';
        setAutofillMessage({
          type: 'error',
          title: '❌ Autofill Mislukt',
          content: errorMsg
        });
        console.error('Autofill error:', data);
        return;
      }

        if (data?.details && Object.keys(data.details).length > 0) {
          // Only update TP metadata fields, NOT employee_details fields
          const tpMetaFields = [
            'first_sick_day', 'registration_date', 'intake_date', 
            'ad_report_date', 'fml_izp_lab_date', 'occupational_doctor_name', 
            'occupational_doctor_org', 'has_ad_report', 'tp_lead_time', 
            'tp_start_date', 'tp_end_date', 'tp_creation_date'
          ];
          
          const filledFields: string[] = [];
          Object.entries(data.details).forEach(([key, value]) => {
            // Only update if it's a TP metadata field and not already filled
            if (tpMetaFields.includes(key) && (!tpData[key] || tpData[key] === null || tpData[key] === '')) {
              updateField(key, value);
              filledFields.push(key);
            }
          });
          
          if (filledFields.length > 0) {
            setAutofilledFields(filledFields);
          
          // Convert database field names to human-readable labels
            const humanReadableFields = filledFields
            .map((field: string) => fieldLabels[field] || field)
            .join(', ');
          
            const message = data.message || `${filledFields.length} velden ingevuld`;
          
          // Show success notification
          setAutofillMessage({
            type: 'success',
            title: '✅ Autofill Succesvol',
            content: `${message}\n\nIngevulde velden:\n${humanReadableFields}`
          });
          } else {
            // Show warning if no new fields were filled
            setAutofillMessage({
              type: 'warning',
              title: '⚠️ Geen Nieuwe Velden',
              content: 'Alle TP metadata velden zijn al ingevuld. Employee profile velden worden niet overschreven.'
            });
          }
        } else {
          // Show warning notification
          setAutofillMessage({
            type: 'warning', 
            title: '⚠️ Geen Gegevens Gevonden',
            content: 'Geen informatie gevonden in de documenten om in te vullen.'
          });
        }
    } catch (err) {
      console.error('❌ Autofill failed:', err);
      setAutofillMessage({
        type: 'error',
        title: '❌ Systeem Fout',
        content: 'Er ging iets mis bij het autofill proces. Controleer de console voor details.'
      });
    } finally {
      setAutofillLoading(false);
    }
  };

  if (loading) return <p>Laden...</p>;

  const boolFields = [
    'drivers_license',
    'has_computer',
    'has_ad_report',
  ];
  
  // Field label mapping for human-readable notifications
  const fieldLabels: { [key: string]: string } = {
    phone: 'Telefoon',
    email: 'Email',
    date_of_birth: 'Geboortedatum',
    current_job: 'Huidige functie',
    work_experience: 'Werkervaring',
    education_level: 'Opleidingsniveau',
    drivers_license: 'Rijbewijs',
    transport_type: 'Eigen vervoer',
    dutch_speaking: 'Spreekvaardigheid NL',
    dutch_writing: 'Schrijfvaardigheid NL',
    dutch_reading: 'Leesvaardigheid NL',
    has_computer: 'Beschikt over PC',
    computer_skills: 'PC-vaardigheden',
    contract_hours: 'Contracturen per week',
    other_employers: 'Andere werkgevers',
    first_sick_day: 'Eerste ziektedag',
    intake_date: 'Datum intakegesprek',
    registration_date: 'Datum aanmelding',
    tp_creation_date: 'Datum opmaak trajectplan',
    ad_report_date: 'Datum AD rapportage',
    occupational_doctor_name: 'Arbeidsdeskundige',
    has_ad_report: 'Arbeidsdeskundig rapport aanwezig bij aanmelding',
    occupational_doctor_org: 'Bedrijfsarts',
    fml_izp_lab_date: 'Datum FML/IZP/LAB',
    tp_lead_time: 'Doorlooptijd (in weken)',
    tp_start_date: 'Startdatum traject',
    tp_end_date: 'Einddatum traject',
  };

  return (
    <>
      {/* Notification */}
      {autofillMessage && (
        <div className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg shadow-xl border ${
          autofillMessage.type === 'success' ? 'bg-success-50 border-success-500 text-success-800' :
          autofillMessage.type === 'warning' ? 'bg-warning-50 border-warning-500 text-warning-800' :
          'bg-error-50 border-error-500 text-error-800'
        }`}>
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold">{autofillMessage.title}</h4>
              <p className="text-sm mt-1 whitespace-pre-line">{autofillMessage.content}</p>
            </div>
            <button
              onClick={() => setAutofillMessage(null)}
              className="ml-4 text-lg font-bold hover:opacity-70 transition-opacity"
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      <div className="flex gap-10 h-full items-start px-6 pt-0 pb-6 overflow-hidden">
      <div className="w-[50%] space-y-3 overflow-y-auto max-h-full pr-2">
        {/* AI Fill and Save buttons at the top */}
        <div className="sticky top-0 backdrop-blur-2xl bg-muted/30 hover:bg-muted/50 z-10 flex items-center gap-3 px-6 py-4 rounded-b-lg border-b border-border transition-all duration-300">
          <Button
            onClick={handleAutofill}
            disabled={autofillLoading}
            variant="secondary"
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {autofillLoading ? 'Automatisch invullen...' : 'Automatisch invullen met AI'}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Opslaan...' : 'Opslaan'}
          </Button>
        </div>

        {/* TP-specific fields only (employee profile fields are already filled before TP) */}
        {Object.entries({
          first_sick_day: 'Eerste ziektedag',
          intake_date: 'Datum intakegesprek',
          registration_date: 'Datum aanmelding',
          tp_creation_date: 'Datum opmaak trajectplan',
          ad_report_date: 'Datum AD rapportage',
          occupational_doctor_name: 'Arbeidsdeskundige',
          has_ad_report: 'Arbeidsdeskundig rapport aanwezig bij aanmelding',
          occupational_doctor_org: 'Bedrijfsarts',
          fml_izp_lab_date: 'Datum FML/IZP/LAB',
          tp_lead_time: 'Doorlooptijd (in weken)',
          tp_start_date: 'Startdatum traject',
          tp_end_date: 'Einddatum traject',
        }).map(([field, label]) => {
          const isBool = boolFields.includes(field);
          const isDate = (DATE_FIELDS as readonly string[]).includes(field);
          const value = tpData[field];

          return (
            <Field
              key={field}
              label={label}
              value={value}
              onChange={(v) => handleChange(field, v)}
              type={isDate ? 'date' : 'text'}
              bool={isBool}
              highlight={autofilledFields.includes(field)}
              saved={savedFields.includes(field)}
            />
          );
        })}

      </div>


      <TPPreviewWrapper>
          <div className="space-y-8">
            {/* Page 1 */}
          <div className="bg-white w-[794px] h-[1123px] shadow-lg border border-border p-10 text-[12px] font-sans mx-auto" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="w-full flex justify-end mb-6">
                <Image src={Logo2} alt="Valentinez Logo" width={120} height={60} />
              </div>
              <h1 className="text-lg font-semibold text-center mb-6">
                Trajectplan re-integratie tweede spoor
              </h1>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Gegevens werknemer */}
              <table className="w-full border-collapse mb-4">
                <tbody className="bg-[#e7e6e6]">
                  <tr><td colSpan={2} className="font-bold text-[#660066] p-2 bg-white">Gegevens werknemer</td></tr>
                  <tr><td className={tdLabel}>Naam</td><td className={tdValue}>{formatEmployeeNameWithoutPrefix(tpData.first_name, tpData.last_name, tpData.gender)}</td></tr>
                  <tr>
                    <td className={tdLabel}>Geslacht</td>
                    <td className={tdValue}>
                      <span className="mr-4">{(tpData.gender === 'Male' || tpData.gender === 'Man') ? '☑ Man' : '☐ Man'}</span>
                      <span>{(tpData.gender === 'Female' || tpData.gender === 'Vrouw') ? '☑ Vrouw' : '☐ Vrouw'}</span>
                    </td>
                  </tr>
                  <tr><td className={tdLabel}>Telefoon</td><td className={tdValue}>{tpData.phone}</td></tr>
                  <tr><td className={tdLabel}>Email</td><td className={tdValue}>{tpData.email}</td></tr>
                  <tr><td className={tdLabel}>Geboortedatum</td><td className={tdValue}>{formatDutchDate(tpData.date_of_birth)}</td></tr>
                </tbody>
              </table>

              {/* Gegevens re-integratietraject */}
              <table className="w-full border-collapse mb-4">
                <tbody className="bg-[#e7e6e6]">
                  <tr><td colSpan={2} className="font-bold text-[#660066] p-2 bg-white">Gegevens re-integratietraject 2e spoor</td></tr>
                  <tr><td className={tdLabel}>Eerste ziektedag</td><td className={tdValue}>{formatDutchDate(tpData.first_sick_day)}</td></tr>
                  <tr><td className={tdLabel}>Datum aanmelding</td><td className={tdValue}>{formatDutchDate(tpData.registration_date)}</td></tr>
                  <tr><td className={tdLabel}>Datum intakegesprek</td><td className={tdValue}>{formatDutchDate(tpData.intake_date)}</td></tr>
                  <tr><td className={tdLabel}>Datum opmaak trajectplan</td><td className={tdValue}>{formatDutchDate(tpData.tp_creation_date)}</td></tr>
                  <tr><td className={tdLabel}>Datum AD Rapportage</td><td className={tdValue}>{formatDutchDate(tpData.ad_report_date) || 'Niet aanwezig'}</td></tr>
                  <tr><td className={tdLabel}>Arbeidsdeskundige</td><td className={tdValue}>{tpData.occupational_doctor_name || 'Niet aanwezig'}</td></tr>
                  <tr>
                    <td className={tdLabel}>Arbeidsdeskundig rapport aanwezig bij aanmelding</td>
                    <td className={tdValue}>
                      {tpData.has_ad_report === true ? '☑ Ja    ☐ Nee' : 
                       tpData.has_ad_report === false ? '☐ Ja    ☑ Nee' : 
                       '☐ Ja    ☐ Nee'}
                    </td>
                  </tr>
                  <tr><td className={tdLabel}>Bedrijfsarts</td><td className={tdValue}>{tpData.occupational_doctor_org}</td></tr>
                  <tr><td className={tdLabel}>Datum FML/IZP/LAB</td><td className={tdValue}>{formatDutchDate(tpData.fml_izp_lab_date)}</td></tr>
                </tbody>
              </table>
              {/* Gegevens opdrachtgever */}
              <table className="w-full border-collapse mb-4">
                <tbody className="bg-[#e7e6e6]">
                  <tr><td colSpan={2} className="font-bold text-[#660066] p-2 bg-white">Gegevens opdrachtgever</td></tr>
                  <tr><td className={tdLabel}>Werkgever</td><td className={tdValue}>{tpData.client_name}</td></tr>
                  <tr><td className={tdLabel}>Contactpersoon</td><td className={tdValue}>{tpData.client_referent_name}</td></tr>
                  <tr><td className={tdLabel}>Telefoon</td><td className={tdValue}>{tpData.client_referent_phone}</td></tr>
                  <tr><td className={tdLabel}>Email</td><td className={tdValue}>{tpData.client_referent_email}</td></tr>
                </tbody>
              </table>

              {/* Gegevens re-integratiebedrijf */}
              <table className="w-full border-collapse mb-4">
                <tbody className="bg-[#e7e6e6]">
                  <tr><td colSpan={2} className="font-bold text-[#660066] p-2 bg-white">Gegevens re-integratiebedrijf</td></tr>
                  <tr><td className={tdLabel}>Opdrachtnemer</td><td className={tdValue}>ValentineZ</td></tr>
                  <tr><td className={tdLabel}>Loopbaanadviseur</td><td className={tdValue}>{tpData.consultant_name}</td></tr>
                  <tr><td className={tdLabel}>Telefoon</td><td className={tdValue}>{tpData.consultant_phone}</td></tr>
                  <tr><td className={tdLabel}>Email</td><td className={tdValue}>{tpData.consultant_email}</td></tr>
                </tbody>
              </table>
              </div>

              {/* Footer on page 1 */}
              <PageFooter
                lastName={tpData.last_name}
                firstName={tpData.first_name}
                dateOfBirth={tpData.date_of_birth}
                pageNumber={1}
              />
            </div>

            {/* Page 2 */}
          <div className="bg-white w-[794px] h-[1123px] shadow-lg border border-border p-10 text-[12px] font-sans mx-auto" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="w-full flex justify-end mb-12">
                <Image src={Logo2} alt="Valentinez Logo" width={120} height={60} />
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Basisgegevens werknemer */}
              <table className="w-full border-collapse mb-4">
                <tbody className="bg-[#e7e6e6]">
                  <tr><td colSpan={2} className="font-bold text-[#660066] p-2 bg-white">Basisgegevens re-integratie werknemer</td></tr>
                  <tr><td className={tdLabel}>Huidige functie</td><td className={tdValue}>{tpData.current_job}</td></tr>
                  <tr><td className={tdLabel}>Werkervaring</td><td className={tdValue}>{formatWorkExperience(tpData.work_experience)}</td></tr>
                  <tr><td className={tdLabel}>Opleidingsniveau</td><td className={tdValue}>{formatEducationLevel(tpData.education_level, tpData.education_name)}</td></tr>
                  <tr><td className={tdLabel}>Rijbewijs</td><td className={tdValue}>{formatDriversLicense(tpData.drivers_license, tpData.drivers_license_type)}</td></tr>
                  <tr><td className={tdLabel}>Eigen vervoer</td><td className={tdValue}>{formatTransportation(null, tpData.transport_type)}</td></tr>
                  <tr><td className={tdLabel}>Spreekvaardigheid NL-taal</td><td className={tdValue}>{tpData.dutch_speaking || '—'}</td></tr>
                  <tr><td className={tdLabel}>Schrijfvaardigheid NL-taal</td><td className={tdValue}>{tpData.dutch_writing || '—'}</td></tr>
                  <tr><td className={tdLabel}>Leesvaardigheid NL-taal</td><td className={tdValue}>{tpData.dutch_reading || '—'}</td></tr>
                  <tr><td className={tdLabel}>Beschikt over een PC</td><td className={tdValue}>{tpData.has_computer ? 'Ja' : 'Nee'}</td></tr>
                  <tr><td className={tdLabel}>PC-vaardigheden</td><td className={tdValue}>{formatComputerSkills(tpData.computer_skills)}</td></tr>
                  <tr><td className={tdLabel}>Aantal contracturen</td><td className={tdValue}>{tpData.contract_hours} uur per week</td></tr>
                  <tr><td className={tdLabel}>Andere werkgever(s)</td><td className={tdValue}>{filterOtherEmployers(tpData.other_employers, tpData.client_name || tpData.employer_name)}</td></tr>
                </tbody>
              </table>

              {/* Opdrachtinformatie */}
              <table className="w-full border-collapse mb-4">
                <tbody className="bg-[#e7e6e6]">
                  <tr><td colSpan={2} className="font-bold text-[#660066] p-2 bg-white">Opdrachtinformatie</td></tr>
                  <tr><td className={tdLabel}>Trajectsoort</td><td className={tdValue}>2e Spoor Traject</td></tr>
                  <tr><td className={tdLabel}>Doelstelling</td><td className={tdValue}>Het doel van dit traject is een bevredigend resultaat. Een structurele werkhervatting die zo dicht mogelijk aansluit bij de resterende functionele mogelijkheden.</td></tr>
                  <tr><td className={tdLabel}>Doorlooptijd</td><td className={tdValue}>{tpData.tp_lead_time}</td></tr>
                  <tr><td className={tdLabel}>Startdatum</td><td className={tdValue}>{formatDutchDate(tpData.tp_start_date)}</td></tr>
                  <tr><td className={tdLabel}>Einddatum (planning)</td><td className={tdValue}>{formatDutchDate(tpData.tp_end_date)}</td></tr>
                </tbody>
              </table>

              <p className="italic text-[10px] text-gray-600 mb-4">
                NB: in het kader van de algemene verordening gegevensbescherming (AVG) worden in deze rapportage geen medische termen en diagnoses vermeld. Voor meer informatie over ons privacyreglement en het klachtenreglement verwijzen wij u naar onze website.
              </p>

              {/* Legenda */}
              <table className="w-full border-collapse">
                <tbody className="bg-[#e7e6e6]">
                  <tr><td colSpan={2} className="font-bold text-[#660066] p-2 bg-white">Legenda</td></tr>
                  <tr><td className={tdLabel}>EZD</td><td className={tdValue}>Eerste ziektedag</td></tr>
                  <tr><td className={tdLabel}>AO</td><td className={tdValue}>Arbeidsdeskundigonderzoek</td></tr>
                  <tr><td className={tdLabel}>AD</td><td className={tdValue}>Arbeidsdeskundig</td></tr>
                  <tr><td className={tdLabel}>BA</td><td className={tdValue}>Bedrijfsarts</td></tr>
                  <tr><td className={tdLabel}>IZP</td><td className={tdValue}>Inzetbaarheidsprofiel</td></tr>
                  <tr><td className={tdLabel}>FML</td><td className={tdValue}>Functiemogelijkhedenlijst</td></tr>
                  <tr><td className={tdLabel}>LAB</td><td className={tdValue}>Lijst arbeidsmogelijkheden en beperkingen</td></tr>
                  <tr><td className={tdLabel}>GBM</td><td className={tdValue}>Geen benutbare mogelijkheden</td></tr>
                  <tr><td className={tdLabel}>TP</td><td className={tdValue}>Trajectplan</td></tr>
                  <tr><td className={tdLabel}>VGR</td><td className={tdValue}>Voortgangsrapportage</td></tr>
                </tbody>
              </table>
              </div>

              {/* Footer on page 2 */}
              <PageFooter
                lastName={tpData.last_name}
                firstName={tpData.first_name}
                dateOfBirth={tpData.date_of_birth}
                pageNumber={2}
              />
            </div>
          </div>
      </TPPreviewWrapper>
    </div>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  bool = false,
  options,
  highlight = false,
  saved = false,
}: {
  label: string;
  value: any;
  onChange: (val: any) => void;
  type?: string;
  bool?: boolean;
  options?: string[];
  highlight?: boolean;
  saved?: boolean;
}) {
  // Priority: saved (green) > highlight (yellow) > default
  const borderColor = saved 
    ? 'border-success-500 bg-success-50 border-2' 
    : highlight 
    ? 'border-warning-500 bg-warning-50 border-2' 
    : 'border-border';
  const inputClass = `w-full border px-3 py-2 rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${borderColor}`;

  // Multi-select for transport
  if (type === 'multiselect' && options) {
    const selectedValues = Array.isArray(value) ? value : [];
    return (
      <div>
        <label className="block text-sm font-bold mb-1.5 text-foreground">{label}</label>
        <div className="space-y-2">
          {options.map((option) => (
            <label key={option} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedValues.includes(option)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange([...selectedValues, option]);
                  } else {
                    onChange(selectedValues.filter((v) => v !== option));
                  }
                }}
                className="rounded border-border text-accent focus:ring-accent"
              />
              <span className="text-sm">{option}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  // Select dropdown
  if (type === 'select' && options) {
    return (
      <div>
        <label className="block text-sm font-bold mb-1.5 text-foreground">{label}</label>
        <select
          className={inputClass}
          value={value || ''}
          onChange={(e) => onChange(e.target.value || null)}
        >
          <option value="">Selecteer</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Boolean field
  if (bool) {
    return (
      <div>
        <label className="block text-sm font-bold mb-1.5 text-foreground">{label}</label>
        <select
          className={inputClass}
          value={value === true ? 'Ja' : value === false ? 'Nee' : ''}
          onChange={(e) => onChange(e.target.value === 'Ja')}
        >
          <option value="">Selecteer</option>
          <option value="Ja">Ja</option>
          <option value="Nee">Nee</option>
        </select>
      </div>
    );
  }

  // Text or date input
  return (
    <div>
      <label className="block text-sm font-bold mb-1.5 text-foreground">{label}</label>
      {type === 'date' ? (
        <Input
          type={type}
          className={borderColor}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
        type={type}
          className={borderColor}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
      )}
    </div>
  );
}

function formatDutchDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

// Page footer component
function PageFooter({ 
  lastName, 
  firstName, 
  dateOfBirth, 
  pageNumber 
}: { 
  lastName?: string | null; 
  firstName?: string | null; 
  dateOfBirth?: string | null; 
  pageNumber: number;
}) {
  const nameText = lastName && firstName 
    ? `Naam: ${lastName} (${firstName})` 
    : lastName 
    ? `Naam: ${lastName}` 
    : "";
  const birthText = formatDutchDate(dateOfBirth) || "";

  return (
    <div 
      className="mt-auto pt-4 border-t border-gray-300 flex justify-between items-center text-[10px] text-gray-700"
      style={{ 
        minHeight: '40px', 
        flexShrink: 0
      }}
    >
      <div>{nameText || "(no name)"}</div>
      <div className="text-center flex-1">{pageNumber}</div>
      <div style={{ minWidth: '120px', textAlign: 'right' }}>
        {birthText || "(geen geboortedatum)"}
      </div>
    </div>
  );
}