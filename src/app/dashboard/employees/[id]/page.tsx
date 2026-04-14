'use client';

import { useState, useEffect, use, useMemo } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Map, Compass, Sparkles, Save, Briefcase, GraduationCap, Car, Languages, Computer, Clock, Building2, FileText } from 'lucide-react';
import DocumentModal from '@/components/DocumentModal';
import { useToastHelpers } from '@/components/ui/Toast';
import { parseWorkExperience } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { trackAccess } from '@/lib/tracking';
import { cn } from '@/lib/utils';
import { SELECT_CLASS } from '@/lib/select-class';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Employee = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    client_id: string;
    referent_id?: string | null;
};

type EditableEmployeePayload = Pick<Employee, 'first_name' | 'last_name' | 'email' | 'client_id' | 'referent_id'>;

type Referent = {
    id: string;
    first_name: string | null;
    last_name: string | null;
    referent_function: string | null;
    phone?: string | null;
    email?: string | null;
    gender?: string | null;
};

type EmployeeDetails = {
    employee_id: string;
    gender?: string;
    phone?: string;
    date_of_birth?: string;
    current_job?: string;
    work_experience?: string;
    education_level?: string;
    education_name?: string;
    drivers_license?: boolean;
    drivers_license_type?: string[] | null;
    transport_type?: string[] | null;
    dutch_speaking?: string;
    dutch_writing?: string;
    dutch_reading?: string;
    has_computer?: boolean;
    computer_skills?: string;
    contract_hours?: number;
    other_employers?: string;
    autofilled_fields?: string[];
};

type Client = {
    id: string;
    name: string;
};

type Document = {
    employee_id: string | null;
    id: string;
    name: string | null;
    type: string | null;
    uploaded_at: string | null;
    url: string;
};

const DOC_TYPES = ['intakeformulier', 'ad_rapportage', 'fml_izp', 'extra'];
const DOC_LABELS: Record<string, string> = {
    intakeformulier: 'Intakeformulier',
    ad_rapportage: 'AD Rapport',
    fml_izp: 'FML/IZP',
    extra: 'Overig'
};

const EMPLOYEE_DETAILS_FIELD_KEYS: (keyof EmployeeDetails)[] = [
    'gender',
    'phone',
    'date_of_birth',
    'current_job',
    'work_experience',
    'education_level',
    'education_name',
    'drivers_license',
    'drivers_license_type',
    'transport_type',
    'dutch_speaking',
    'dutch_writing',
    'dutch_reading',
    'has_computer',
    'computer_skills',
    'contract_hours',
    'other_employers',
    'autofilled_fields',
];

const EDITABLE_EMPLOYEE_FIELD_KEYS: (keyof EditableEmployeePayload)[] = [
    'first_name',
    'last_name',
    'email',
    'client_id',
    'referent_id',
];

function normalizeStringArray(value: unknown): string[] | null {
    if (!value) return null;
    if (Array.isArray(value)) {
        const clean = value
            .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
            .map((item) => item.trim());
        return clean.length > 0 ? [...clean].sort() : null;
    }
    if (typeof value === 'string' && value.trim()) {
        return [value.trim()];
    }
    return null;
}

function toEditableEmployeePayload(employee: Employee): EditableEmployeePayload {
    const filtered = Object.fromEntries(
        EDITABLE_EMPLOYEE_FIELD_KEYS.map((key) => [key, employee[key] ?? null])
    ) as EditableEmployeePayload;
    return filtered;
}

function toEmployeeDetailsPayload(
    details: Partial<EmployeeDetails> | null | undefined,
    employeeId: string
): EmployeeDetails {
    const filtered = Object.fromEntries(
        EMPLOYEE_DETAILS_FIELD_KEYS
            .map((key) => [key, details?.[key]])
            .filter(([, value]) => value !== undefined)
    ) as Partial<EmployeeDetails>;

    return {
        employee_id: employeeId,
        ...filtered,
    };
}

function toNormalizedDetailsPayload(
    details: Partial<EmployeeDetails> | null | undefined,
    employeeId: string
): EmployeeDetails {
    const normalizedWorkExperience = details?.work_experience
        ? parseWorkExperience(details.work_experience)
        : details?.work_experience;

    const normalizedDetails: Partial<EmployeeDetails> = {
        ...details,
        work_experience: normalizedWorkExperience,
        transport_type: normalizeStringArray(details?.transport_type),
        drivers_license_type: normalizeStringArray(details?.drivers_license_type),
    };

    return toEmployeeDetailsPayload(normalizedDetails, employeeId);
}

function arePayloadsEqual<T>(left: T | null, right: T | null): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
}

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: employeeId } = use(params);
    const { showSuccess, showError } = useToastHelpers();
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const [employee, setEmployee] = useState<Employee | null>(null);
    const [employeeDetails, setEmployeeDetails] = useState<EmployeeDetails | null>(null);
    const [clients, setClients] = useState<Client[]>([]);
    const [clientName, setClientName] = useState<string>('');
    const [userRole, setUserRole] = useState<string>('');
    const [updating, setUpdating] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [autofilledFields, setAutofilledFields] = useState<Set<string>>(new Set());
    const [documents, setDocuments] = useState<Document[]>([]);
    const [activeDocType, setActiveDocType] = useState<string | null>(null);
    const [referents, setReferents] = useState<Referent[]>([]);
    const [suggestedReferent, setSuggestedReferent] = useState<{ first_name: string; last_name: string; referent_function?: string; phone?: string; email?: string; gender?: string } | null>(null);
    const [referentExists, setReferentExists] = useState(false);
    const [existingReferentId, setExistingReferentId] = useState<string | null>(null);
    const [savedEmployeeSnapshot, setSavedEmployeeSnapshot] = useState<EditableEmployeePayload | null>(null);
    const [savedDetailsSnapshot, setSavedDetailsSnapshot] = useState<EmployeeDetails | null>(null);

    useEffect(() => {
        fetchEmployee();
        fetchEmployeeDetails();
        fetchClients();
        fetchUserRole();
        fetchDocuments();
        // Track when employee page is opened
        if (employeeId) {
            trackAccess('employee', employeeId, false);
        }
    }, [employeeId]);

    const fetchEmployee = async () => {
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('id', employeeId)
            .single();

        if (error) {
            console.error('Error fetching employee:', error);
            return;
        }

        setEmployee(data);
        setSavedEmployeeSnapshot(toEditableEmployeePayload(data));
        if (data.client_id) {
            fetchClient(data.client_id);
            fetchReferents(data.client_id);
        } else {
            setReferents([]);
        }
    };

    const fetchReferents = async (clientId: string) => {
        const { data, error } = await supabase
            .from('referents' as any)
            .select('id, first_name, last_name, referent_function, phone, email, gender')
            .eq('client_id', clientId)
            .order('display_order', { ascending: true, nullsFirst: false });

        if (error) {
            console.error('Error fetching referents:', error);
            setReferents([]);
            return;
        }
        setReferents(data || []);
    };

    const fetchEmployeeDetails = async () => {
        const { data, error } = await supabase
            .from('employee_details')
            .select('*')
            .eq('employee_id', employeeId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching employee details:', error);
            return;
        }

        if (data) {
            // Parse work_experience if it's a JSON array string
            // Parse drivers_license_type if it's a JSON array string
            let parsedLicenseType = data.drivers_license_type;
            if (parsedLicenseType && typeof parsedLicenseType === 'string') {
                try {
                    const parsed = JSON.parse(parsedLicenseType);
                    if (Array.isArray(parsed)) {
                        parsedLicenseType = parsed;
                    }
                } catch {
                    // Not a JSON string, keep as is (might be a single string value)
                    parsedLicenseType = parsedLicenseType ? [parsedLicenseType] : null;
                }
            }
            
            const parsedData = {
                ...data,
                work_experience: data.work_experience ? parseWorkExperience(data.work_experience) : data.work_experience,
                drivers_license_type: parsedLicenseType
            };
            setEmployeeDetails(parsedData);
            setSavedDetailsSnapshot(toNormalizedDetailsPayload(parsedData, employeeId));
            if (data.autofilled_fields) {
                setAutofilledFields(new Set(data.autofilled_fields));
            }
        } else {
            setSavedDetailsSnapshot(null);
        }
    };

    const fetchClients = async () => {
        const { data, error } = await supabase
            .from('clients')
            .select('*');

        if (error) {
            console.error('Error fetching clients:', error);
            return;
        }

        setClients(data || []);
    };

    const fetchClient = async (clientId: string) => {
        const { data, error } = await supabase
            .from('clients')
            .select('name')
            .eq('id', clientId)
            .single();

        if (error) {
            console.error('Error fetching client:', error);
            return;
        }

        setClientName(data?.name || '');
    };

    const fetchUserRole = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data, error } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single();

            if (error) {
                console.error('Error fetching user role:', error);
                return;
            }

            setUserRole(data?.role || '');
        }
    };

    const fetchDocuments = async () => {
        try {
            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .eq('employee_id', employeeId);

            if (error) {
                console.error('Fout bij ophalen documenten:', error);
                return;
            }

            setDocuments(data || []);
        } catch (err) {
            console.error('Fout bij ophalen documenten:', err);
        }
    };

    const handleDetailChange = (field: keyof EmployeeDetails, value: any) => {
        setEmployeeDetails(prev => ({
            ...prev,
            [field]: value,
            employee_id: employeeId
        }));
    };

    const currentEmployeePayload = useMemo(
        () => (employee ? toEditableEmployeePayload(employee) : null),
        [employee]
    );
    const currentDetailsPayload = useMemo(
        () => (employeeDetails ? toNormalizedDetailsPayload(employeeDetails, employeeId) : null),
        [employeeDetails, employeeId]
    );

    const isEmployeeDirty = useMemo(() => {
        if (!currentEmployeePayload || !savedEmployeeSnapshot) return false;
        return !arePayloadsEqual(currentEmployeePayload, savedEmployeeSnapshot);
    }, [currentEmployeePayload, savedEmployeeSnapshot]);

    const isDetailsDirty = useMemo(() => {
        if (!savedDetailsSnapshot && !currentDetailsPayload) return false;
        return !arePayloadsEqual(currentDetailsPayload, savedDetailsSnapshot);
    }, [currentDetailsPayload, savedDetailsSnapshot]);

    const hasUnsavedChanges = isEmployeeDirty || isDetailsDirty;

    const saveUnified = async () => {
        if (!employee) return;

        const shouldSaveEmployee = isEmployeeDirty && currentEmployeePayload;
        const shouldSaveDetails = isDetailsDirty && currentDetailsPayload;

        if (!shouldSaveEmployee && !shouldSaveDetails) {
            showSuccess('Geen wijzigingen om op te slaan.');
            return;
        }

        setUpdating(true);
        try {
            const operations: Promise<{ type: 'employee' | 'details'; error: any }>[] = [];

            if (shouldSaveEmployee) {
                operations.push(
                    supabase
                        .from('employees')
                        .update(currentEmployeePayload)
                        .eq('id', employeeId)
                        .then(({ error }) => ({ type: 'employee' as const, error }))
                );
            }

            if (shouldSaveDetails) {
                operations.push(
                    supabase
                        .from('employee_details')
                        .upsert([currentDetailsPayload], { onConflict: 'employee_id' })
                        .then(({ error }) => ({ type: 'details' as const, error }))
                );
            }

            const results = await Promise.all(operations);
            const employeeResult = results.find((result) => result.type === 'employee');
            const detailsResult = results.find((result) => result.type === 'details');

            const employeeSaved = Boolean(employeeResult && !employeeResult.error);
            const detailsSaved = Boolean(detailsResult && !detailsResult.error);

            if (employeeSaved && currentEmployeePayload) {
                setSavedEmployeeSnapshot(currentEmployeePayload);
            }

            if (detailsSaved && currentDetailsPayload) {
                setSavedDetailsSnapshot(currentDetailsPayload);
                await trackAccess('employee', employeeId, true);
            }

            if ((employeeResult?.error || detailsResult?.error) && !employeeSaved && !detailsSaved) {
                const errorMessage = employeeResult?.error?.message || detailsResult?.error?.message || 'Er is een fout opgetreden bij het opslaan.';
                showError('Fout bij opslaan', errorMessage);
                return;
            }

            if (employeeSaved && detailsSaved) {
                showSuccess('Werknemer en profiel opgeslagen!');
                return;
            }

            if (employeeSaved) {
                showSuccess('Werknemer informatie opgeslagen!');
                if (detailsResult?.error) {
                    showError('Profiel niet opgeslagen', detailsResult.error.message || 'Er is een fout opgetreden bij het opslaan van het profiel.');
                }
                return;
            }

            if (detailsSaved) {
                showSuccess('Profiel opgeslagen!');
                if (employeeResult?.error) {
                    showError('Werknemer informatie niet opgeslagen', employeeResult.error.message || 'Er is een fout opgetreden bij het opslaan van de werknemer informatie.');
                }
            }
        } catch (err) {
            console.error('Error saving unified data:', err);
            showError('Fout bij opslaan', 'Er is een onverwachte fout opgetreden bij het opslaan.');
        } finally {
            setUpdating(false);
        }
    };

    const autofillWithAI = async () => {
        setAiLoading(true);
        try {
            const res = await fetch(`/api/autofill-employee-info-working?employeeId=${employeeId}`);
            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || `HTTP ${res.status}: ${res.statusText}`);
            }

            // Handle both response formats
            const details = json.details || json.data?.details;
            const data = json.data || json;
            if (details && Object.keys(details).length > 0) {
                const fields = EMPLOYEE_DETAILS_FIELD_KEYS.filter((key) =>
                    Object.prototype.hasOwnProperty.call(details, key)
                );

                // Suggested referent from autofill (for "Quick create and set" / "Set as contactperson")
                const suggested = data.suggested_referent;
                if (suggested && (suggested.first_name || suggested.last_name)) {
                    setSuggestedReferent({
                        first_name: suggested.first_name || '',
                        last_name: suggested.last_name || '',
                        referent_function: suggested.referent_function,
                        phone: suggested.phone,
                        email: suggested.email,
                        gender: suggested.gender,
                    });
                    setReferentExists(Boolean(data.referent_exists));
                    setExistingReferentId(data.existing_referent_id ?? null);
                } else {
                    setSuggestedReferent(null);
                    setReferentExists(false);
                    setExistingReferentId(null);
                }

                // Ensure transport_type and drivers_license_type are handled as arrays
                const processedDetails: any = { ...details };
                if (processedDetails.transport_type) {
                    if (!Array.isArray(processedDetails.transport_type)) {
                        // Convert string to array if needed
                        processedDetails.transport_type = typeof processedDetails.transport_type === 'string' 
                            ? [processedDetails.transport_type] 
                            : [];
                    }
                }
                // Add similar handling for drivers_license_type
                if (processedDetails.drivers_license_type) {
                    if (!Array.isArray(processedDetails.drivers_license_type)) {
                        processedDetails.drivers_license_type = typeof processedDetails.drivers_license_type === 'string' 
                            ? [processedDetails.drivers_license_type] 
                            : null;
                    }
                }

                // Create a new updated version of the employeeDetails object
                const updatedDetails: EmployeeDetails = {
                    ...(employeeDetails || {}),
                    ...toEmployeeDetailsPayload(processedDetails, employeeId),
                    employee_id: employeeId,
                    autofilled_fields: fields,
                };

                // Update local state to reflect changes in UI
                setEmployeeDetails(updatedDetails);
                setAutofilledFields(new Set(fields));

                // Persist to Supabase
                const { error: persistError } = await supabase
                    .from('employee_details')
                    .upsert([toEmployeeDetailsPayload(updatedDetails, employeeId)], { onConflict: 'employee_id' });

                if (persistError) {
                    console.error('Error persisting autofilled details:', persistError);
                    showError('Autofill deels mislukt', 'AI velden zijn gevonden, maar opslaan in het profiel is mislukt.');
                    return;
                }

                setSavedDetailsSnapshot(toNormalizedDetailsPayload(updatedDetails, employeeId));
                showSuccess('AI autofill succesvol uitgevoerd!');
            } else {
                showError('Geen documenten gevonden', 'Er zijn geen documenten gevonden of geen bruikbare informatie gevonden in de documenten.');
            }
        } catch (err) {
            console.error('Autofill mislukt:', err);
            const errorMessage = err instanceof Error ? err.message : 'Onbekende fout opgetreden';
            showError('Autofill mislukt', errorMessage);
        } finally {
            setAiLoading(false);
        }
    };

    const applySuggestedReferentCreate = async () => {
        if (!suggestedReferent || !employee?.client_id) return;
        setUpdating(true);
        try {
            const { data: existingList } = await supabase.from('referents' as any).select('id').eq('client_id', employee.client_id);
            const isFirst = !existingList || existingList.length === 0;
            const { data: newRef, error: insertErr } = await supabase
                .from('referents' as any)
                .insert({
                    client_id: employee.client_id,
                    first_name: suggestedReferent.first_name,
                    last_name: suggestedReferent.last_name,
                    referent_function: suggestedReferent.referent_function ?? null,
                    phone: suggestedReferent.phone ?? null,
                    email: suggestedReferent.email ?? null,
                    gender: suggestedReferent.gender ?? null,
                    is_default: isFirst,
                })
                .select('id')
                .single();
            if (insertErr) {
                showError('Fout', 'Kon contactpersoon niet aanmaken.');
                return;
            }
            const { error: updateErr } = await supabase.from('employees').update({ referent_id: newRef.id }).eq('id', employeeId);
            if (updateErr) {
                showError('Fout', 'Kon werknemer niet koppelen aan contactpersoon.');
                return;
            }
            setEmployee(prev => prev ? { ...prev, referent_id: newRef.id } : null);
            setSavedEmployeeSnapshot((prev) => (prev ? { ...prev, referent_id: newRef.id } : prev));
            setSuggestedReferent(null);
            setReferentExists(false);
            setExistingReferentId(null);
            await fetchReferents(employee.client_id);
            showSuccess('Contactpersoon aangemaakt en gekoppeld.');
        } catch (e) {
            console.error(e);
            showError('Fout', 'Er is iets misgegaan.');
        } finally {
            setUpdating(false);
        }
    };

    const applySuggestedReferentSet = async () => {
        if (!existingReferentId || !employee) return;
        setUpdating(true);
        try {
            const { error } = await supabase.from('employees').update({ referent_id: existingReferentId }).eq('id', employeeId);
            if (error) {
                showError('Fout', 'Kon contactpersoon niet koppelen.');
                return;
            }
            setEmployee(prev => prev ? { ...prev, referent_id: existingReferentId } : null);
            setSavedEmployeeSnapshot((prev) => (prev ? { ...prev, referent_id: existingReferentId } : prev));
            setSuggestedReferent(null);
            setReferentExists(false);
            setExistingReferentId(null);
            if (employee.client_id) await fetchReferents(employee.client_id);
            showSuccess('Contactpersoon gekoppeld.');
        } catch (e) {
            console.error(e);
            showError('Fout', 'Er is iets misgegaan.');
        } finally {
            setUpdating(false);
        }
    };

    const fieldClass = (field: keyof EmployeeDetails) =>
        `w-full border-2 border-purple-200 p-3 rounded-lg bg-white transition-all duration-200 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 hover:border-purple-300 ${autofilledFields.has(field) ? 'border-yellow-400 bg-yellow-50/30' : ''}`;
    const selectFieldClass = (field: keyof EmployeeDetails) =>
        cn(SELECT_CLASS, autofilledFields.has(field) && '!border-yellow-400 bg-yellow-50/30');

    return (
        <div className="p-4 space-y-6">
            <h1 className="text-xl font-bold">Werknemer Details</h1>

            {employee && (
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-col bg-white p-4 rounded shadow flex-1 space-y-4 w-2/5">
                        <h2 className="text-lg font-semibold mb-4">Gegevens werknemer</h2>
                        <div className="flex justify-between">
                            <div className="flex-col space-y-2 w-3/5 pr-2">
                                <input className="w-full border border-gray-500/30 p-2 rounded" placeholder="Voornaam" value={employee.first_name || ''} onChange={(e) => setEmployee({ ...employee, first_name: e.target.value })} />
                                <input className="w-full border border-gray-500/30 p-2 rounded" placeholder="Achternaam" value={employee.last_name || ''} onChange={(e) => setEmployee({ ...employee, last_name: e.target.value })} />
                                <input className="w-full border border-gray-500/30 p-2 rounded" placeholder="E-mail" value={employee.email || ''} onChange={(e) => setEmployee({ ...employee, email: e.target.value })} />
                                {userRole === 'admin' ? (
                                    <Select value={employee.client_id || undefined} onValueChange={(v) => { setEmployee({ ...employee, client_id: v, referent_id: v ? employee.referent_id : null }); fetchClient(v); if (v) fetchReferents(v); else setReferents([]); }}>
                                        <SelectTrigger className={SELECT_CLASS}>
                                            <SelectValue placeholder="Selecteer werkgever" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {clients.map((client) => (
                                                <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <input className="w-full border border-gray-500/30 p-2 rounded bg-gray-100 text-gray-500" value={clientName || ''} disabled />
                                )}
                                {employee.client_id ? (
                                    <div className="space-y-1">
                                        <label className="text-sm text-gray-600">Contactpersoon</label>
                                        <Select
                                            value={employee.referent_id ?? '__none__'}
                                            onValueChange={async (v) => {
                                                const refId = v === '__none__' ? null : v;
                                                setEmployee(prev => prev ? { ...prev, referent_id: refId } : null);
                                                const { error } = await supabase.from('employees').update({ referent_id: refId }).eq('id', employeeId);
                                                if (error) showError('Fout', 'Kon contactpersoon niet bijwerken.');
                                                else {
                                                    setSavedEmployeeSnapshot((prev) => (prev ? { ...prev, referent_id: refId } : prev));
                                                    showSuccess('Contactpersoon bijgewerkt.');
                                                }
                                            }}
                                        >
                                            <SelectTrigger className={SELECT_CLASS}>
                                                <SelectValue placeholder="— Geen / Default —" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="__none__">— Geen / Default —</SelectItem>
                                                {referents.map((r) => (
                                                    <SelectItem key={r.id} value={r.id}>
                                                        {[r.first_name, r.last_name].filter(Boolean).join(' ').trim() || 'Naamloos'}
                                                        {r.referent_function ? ` (${r.referent_function})` : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ) : null}
                                <div className="flex gap-2 mt-4">
                                    <button onClick={() => window.location.href = `/dashboard/tp/${employeeId}`} className="flex border-2 border-indigo-600 font-semibold text-indigo-600 px-4 py-2 rounded items-center gap-2 hover:bg-indigo-600 hover:text-white hover:cursor-pointer transition"><Map className="w-4 h-4" />Trajectplan</button>
                                    <button onClick={() => window.location.href = `/dashboard/vgr/${employeeId}`} className="flex border-2 border-purple-600 font-semibold text-purple-600 px-4 py-2 rounded items-center gap-2 hover:bg-purple-600 hover:text-white hover:cursor-pointer transition"><Compass className="w-4 h-4" />VGR</button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 w-2/5">
                                <Select value={employeeDetails?.gender || undefined} onValueChange={(v) => handleDetailChange('gender', v)}>
                                    <SelectTrigger className={selectFieldClass('gender')}>
                                        <SelectValue placeholder="Geslacht selecteren" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Man">Man</SelectItem>
                                        <SelectItem value="Vrouw">Vrouw</SelectItem>
                                        <SelectItem value="Anders">Anders</SelectItem>
                                    </SelectContent>
                                </Select>
                                <input className={fieldClass('phone')} placeholder="Telefoon" value={employeeDetails?.phone || ''} onChange={e => handleDetailChange('phone', e.target.value)} />
                                <input className={fieldClass('date_of_birth')} type="date" value={employeeDetails?.date_of_birth || ''} onChange={e => handleDetailChange('date_of_birth', e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded shadow w-full lg:w-[400px]">
                        <h2 className="text-lg font-semibold mb-4">Documenten</h2>
                        <div className="grid grid-cols-2 gap-2">
                            {DOC_TYPES.map(type => {
                                const doc = documents.find(d => d.type?.toLowerCase().trim() === type);
                                return (
                                    <div
                                        key={type}
                                        onClick={() => setActiveDocType(type)}
                                        className={`rounded p-4 text-sm bg-gray-50 cursor-pointer hover:bg-gray-100 ${doc ? 'border-2 border-green-600' : 'border border-gray-500/30'
                                            }`}
                                    >
                                        <p className="font-semibold mb-1">{DOC_LABELS[type]}</p>
                                        {doc ? <p className="text-green-600">Geüpload</p> : <p className="text-gray-400">Niet geüpload</p>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Worker Profile Section */}
            <div className="bg-white p-6 rounded-lg shadow-md space-y-6 border border-purple-100">
                <div className="flex justify-between items-center pb-4 border-b border-purple-200">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-600" />
                        Werknemersprofiel
                    </h2>
                    <Button 
                        onClick={autofillWithAI} 
                        disabled={aiLoading}
                        variant="secondary"
                        className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                    >
                        <Sparkles className={`w-4 h-4 mr-2 ${aiLoading ? 'animate-pulse' : ''}`} />
                        {aiLoading ? 'AI uitvoeren...' : 'Invullen met AI'}
                    </Button>
                </div>

                {suggestedReferent && (employee?.client_id) && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 flex flex-wrap items-center gap-2">
                        <span className="text-sm text-gray-700">
                            Contactpersoon uit document: <strong>{[suggestedReferent.first_name, suggestedReferent.last_name].filter(Boolean).join(' ').trim() || '—'}</strong>
                            {referentExists ? (
                                <Button type="button" variant="secondary" size="sm" className="ml-2" onClick={applySuggestedReferentSet} disabled={updating}>
                                    Als contactpersoon koppelen
                                </Button>
                            ) : (
                                <Button type="button" variant="secondary" size="sm" className="ml-2" onClick={applySuggestedReferentCreate} disabled={updating}>
                                    Aanmaken en koppelen als contactpersoon
                                </Button>
                            )}
                        </span>
                    </div>
                )}

                {/* Current Job */}
                <div className="space-y-2 group">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-purple-600" />
                        Huidig werk
                    </label>
                    <Input 
                        className={fieldClass('current_job')} 
                        placeholder="Bijv. Jobcoach/stagebegeleider" 
                        value={employeeDetails?.current_job || ''} 
                        onChange={e => handleDetailChange('current_job', e.target.value)} 
                    />
                </div>

                {/* Work Experience */}
                <div className="space-y-2 group">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-purple-600" />
                        Werkervaring
                    </label>
                    <Textarea 
                        className={fieldClass('work_experience') + ' min-h-[100px]'} 
                        placeholder="Beschrijf de werkervaring..." 
                        value={employeeDetails?.work_experience || ''} 
                        onChange={e => handleDetailChange('work_experience', e.target.value)} 
                    />
                </div>
                
                {/* Education */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 group">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-purple-600" />
                            Opleidingsniveau
                        </label>
                        <Select value={employeeDetails?.education_level || undefined} onValueChange={(v) => handleDetailChange('education_level', v)}>
                            <SelectTrigger className={selectFieldClass('education_level')}>
                                <SelectValue placeholder="Selecteer opleidingsniveau" />
                            </SelectTrigger>
                            <SelectContent>
                                {['Praktijkonderwijs', 'VMBO', 'LTS', 'HAVO', 'VWO', 'MBO 1', 'MBO 2', 'MTS', 'MBO 3', 'MBO 4', 'HBO', 'WO'].map(level => (
                                    <SelectItem key={level} value={level}>{level}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2 group">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-purple-600" />
                            Specialisatie
                        </label>
                        <Input 
                            className={fieldClass('education_name')} 
                            placeholder="Bijv. Kappersopleiding" 
                            value={employeeDetails?.education_name || ''} 
                            onChange={e => handleDetailChange('education_name', e.target.value)} 
                        />
                    </div>
                </div>

                {/* Checkboxes for drivers_license and has_computer */}
                <div className='flex gap-6 p-4 bg-purple-50/50 rounded-lg border border-purple-100'>
                    {([
                        { key: 'drivers_license', label: 'Rijbewijs', Icon: Car },
                        { key: 'has_computer', label: 'Heeft PC', Icon: Computer }
                    ] as const).map(({ key, label, Icon }) => (
                        <label 
                            key={key} 
                            className="flex items-center space-x-3 cursor-pointer group/checkbox p-3 rounded-lg hover:bg-white transition-colors duration-200 flex-1"
                        >
                            <input 
                                type="checkbox" 
                                checked={Boolean(employeeDetails?.[key as keyof EmployeeDetails])} 
                                onChange={e => handleDetailChange(key as keyof EmployeeDetails, e.target.checked)}
                                className="w-5 h-5 rounded border-2 border-purple-300 text-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 cursor-pointer transition-all checked:bg-purple-600 checked:border-purple-600"
                            />
                            <div className="flex items-center gap-2">
                                <Icon className={`w-4 h-4 ${autofilledFields.has(key) ? 'text-yellow-500' : 'text-purple-600'}`} />
                                <span className={`font-medium ${autofilledFields.has(key) ? 'text-yellow-600' : 'text-gray-700'}`}>{label}</span>
                            </div>
                        </label>
                    ))}
                </div>

                {/* Multi-select driver's license types */}
                {employeeDetails?.drivers_license && (
                    <div className="p-4 bg-purple-50/50 rounded-lg border border-purple-100">
                        <label className="block text-sm font-semibold mb-3 flex items-center gap-2 text-gray-700">
                            <Car className="w-4 h-4 text-purple-600" />
                            Rijbewijstype
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                            {[
                                { value: 'B', label: 'B (Auto)' },
                                { value: 'C', label: 'C (Vrachtwagen)' },
                                { value: 'C1', label: 'C1 (Middelgrote vrachtwagen)' },
                                { value: 'D', label: 'D (Bus)' },
                                { value: 'D1', label: 'D1 (Kleine bus)' },
                                { value: 'E', label: 'E (Aanhangwagen)' },
                                { value: 'A', label: 'A (Motor)' },
                                { value: 'AM', label: 'AM (Bromfiets)' },
                                { value: 'A1', label: 'A1 (Motor beperkt)' },
                                { value: 'A2', label: 'A2 (Motor beperkt)' },
                                { value: 'BE', label: 'BE (Auto + Aanhangwagen)' },
                                { value: 'CE', label: 'CE (Vrachtwagen + Aanhangwagen)' },
                                { value: 'DE', label: 'DE (Bus + Aanhangwagen)' },
                                { value: 'T', label: 'T (Trekker)' },
                            ].map((option) => {
                                const selected = Array.isArray(employeeDetails?.drivers_license_type) 
                                    ? employeeDetails.drivers_license_type.includes(option.value)
                                    : false;
                                return (
                                    <label 
                                        key={option.value} 
                                        className={`flex items-center space-x-2 cursor-pointer p-3 rounded-lg border-2 transition-all duration-200 ${
                                            selected 
                                                ? 'border-purple-500 bg-purple-100 shadow-md' 
                                                : 'border-purple-200 bg-white hover:border-purple-300 hover:bg-purple-50'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selected}
                                            onChange={(e) => {
                                                const currentTypes = Array.isArray(employeeDetails?.drivers_license_type) 
                                                    ? employeeDetails.drivers_license_type 
                                                    : [];
                                                if (e.target.checked) {
                                                    handleDetailChange('drivers_license_type', [...currentTypes, option.value]);
                                                } else {
                                                    handleDetailChange('drivers_license_type', currentTypes.filter(t => t !== option.value));
                                                }
                                            }}
                                            className="sr-only"
                                        />
                                        <span className={`text-sm font-medium ${selected ? 'text-purple-700' : 'text-gray-700'}`}>
                                            {option.label}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Multi-select transport */}
                <div className="p-4 bg-purple-50/50 rounded-lg border border-purple-100">
                    <label className="block text-sm font-semibold mb-3 flex items-center gap-2 text-gray-700">
                        <Car className="w-4 h-4 text-purple-600" />
                        Eigen vervoer
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        {['Auto', 'Fiets', 'Bromfiets', 'Motor', 'OV'].map((option) => {
                            const selected = Array.isArray(employeeDetails?.transport_type) 
                                ? employeeDetails.transport_type.includes(option)
                                : false;
                            return (
                                <label 
                                    key={option} 
                                    className={`flex items-center space-x-2 cursor-pointer p-3 rounded-lg border-2 transition-all duration-200 ${
                                        selected 
                                            ? 'border-purple-500 bg-purple-100 shadow-md' 
                                            : 'border-purple-200 bg-white hover:border-purple-300 hover:bg-purple-50'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selected}
                                        onChange={(e) => {
                                            const current = Array.isArray(employeeDetails?.transport_type) 
                                                ? employeeDetails.transport_type 
                                                : (typeof employeeDetails?.transport_type === 'string' && employeeDetails.transport_type 
                                                    ? [employeeDetails.transport_type] 
                                                    : []);
                                            if (e.target.checked) {
                                                handleDetailChange('transport_type', [...current, option]);
                                            } else {
                                                handleDetailChange('transport_type', current.filter(v => v !== option));
                                            }
                                        }}
                                        className="rounded border-border text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                                    />
                                    <span className={`text-sm font-medium ${selected ? 'text-purple-700' : 'text-gray-600'} ${autofilledFields.has('transport_type') ? 'text-yellow-600' : ''}`}>
                                        {option}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </div>

                {/* Language proficiency dropdowns - Side by side */}
                <div className="space-y-3">
                    <label className="block text-sm font-semibold flex items-center gap-2 text-gray-700">
                        <Languages className="w-4 h-4 text-purple-600" />
                        Nederlandse taalvaardigheid
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2 group">
                            <label className="text-xs text-gray-500 font-medium">Spreekvaardigheid</label>
                            <Select value={employeeDetails?.dutch_speaking || undefined} onValueChange={(v) => handleDetailChange('dutch_speaking', v || null)}>
                                <SelectTrigger className={selectFieldClass('dutch_speaking')}>
                                    <SelectValue placeholder="Selecteer..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Niet goed">Niet goed</SelectItem>
                                    <SelectItem value="Gemiddeld">Gemiddeld</SelectItem>
                                    <SelectItem value="Goed">Goed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 group">
                            <label className="text-xs text-gray-500 font-medium">Schrijfvaardigheid</label>
                            <Select value={employeeDetails?.dutch_writing || undefined} onValueChange={(v) => handleDetailChange('dutch_writing', v || null)}>
                                <SelectTrigger className={selectFieldClass('dutch_writing')}>
                                    <SelectValue placeholder="Selecteer..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Niet goed">Niet goed</SelectItem>
                                    <SelectItem value="Gemiddeld">Gemiddeld</SelectItem>
                                    <SelectItem value="Goed">Goed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 group">
                            <label className="text-xs text-gray-500 font-medium">Leesvaardigheid</label>
                            <Select value={employeeDetails?.dutch_reading || undefined} onValueChange={(v) => handleDetailChange('dutch_reading', v || null)}>
                                <SelectTrigger className={selectFieldClass('dutch_reading')}>
                                    <SelectValue placeholder="Selecteer..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Niet goed">Niet goed</SelectItem>
                                    <SelectItem value="Gemiddeld">Gemiddeld</SelectItem>
                                    <SelectItem value="Goed">Goed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Computer Skills */}
                <div className="space-y-2 group">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Computer className="w-4 h-4 text-purple-600" />
                        Computervaardigheden
                    </label>
                    <Select value={employeeDetails?.computer_skills || undefined} onValueChange={(v) => handleDetailChange('computer_skills', v)}>
                        <SelectTrigger className={selectFieldClass('computer_skills')}>
                            <SelectValue placeholder="Selecteer computervaardigheden" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">1 - Geen</SelectItem>
                            <SelectItem value="2">2 - Basis (e-mail, browsen)</SelectItem>
                            <SelectItem value="3">3 - Gemiddeld (Word, Excel)</SelectItem>
                            <SelectItem value="4">4 - Geavanceerd (meerdere programma's)</SelectItem>
                            <SelectItem value="5">5 - Expert (IT-gerelateerde vaardigheden)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Contract Hours */}
                <div className="space-y-2 group">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-purple-600" />
                        Contracturen
                    </label>
                    <Input 
                        className={fieldClass('contract_hours')} 
                        type="number" 
                        placeholder="Bijv. 40" 
                        value={employeeDetails?.contract_hours || ''} 
                        onChange={e => handleDetailChange('contract_hours', Number(e.target.value))} 
                    />
                </div>
                
                {/* Other Employers */}
                <div className="space-y-2 group">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-purple-600" />
                        Andere werkgevers
                    </label>
                    <Textarea 
                        className={fieldClass('other_employers') + ' min-h-[100px]'} 
                        placeholder="Vul hier andere huidige werkgevers in (bij meerdere banen), niet de hoofdwerkgever..." 
                        value={employeeDetails?.other_employers || ''} 
                        onChange={e => handleDetailChange('other_employers', e.target.value)} 
                    />
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <span className="text-purple-500">ℹ️</span>
                        Vul hier alleen andere huidige werkgevers in (bij meerdere banen), niet de hoofdwerkgever ({clientName})
                    </p>
                </div>

            </div>

            <Button
                onClick={saveUnified}
                disabled={updating}
                aria-label="Opslaan werknemer en profiel"
                className={cn(
                    'fixed bottom-6 right-6 z-50 h-12 rounded-full px-5 shadow-xl transition-all duration-200',
                    'opacity-60 hover:opacity-100 focus-visible:opacity-100',
                    hasUnsavedChanges ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-muted text-foreground'
                )}
            >
                <Save className="w-4 h-4 mr-2" />
                {updating ? 'Opslaan...' : hasUnsavedChanges ? 'Alles opslaan' : 'Alles opgeslagen'}
            </Button>

            {activeDocType && (
                <DocumentModal
                    type={activeDocType}
                    employeeId={employeeId}
                    existingDoc={documents.find(d => d.type?.toLowerCase().trim() === activeDocType) || null}
                    onClose={() => setActiveDocType(null)}
                    onUploaded={fetchDocuments}
                    onDeleted={() => {
                        fetchDocuments();
                        setActiveDocType(null);
                    }}
                />
            )}
        </div>
    );
}