'use client';

import { useState, useEffect, use } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Map, Compass } from 'lucide-react';
import DocumentModal from '@/components/DocumentModal';
import { useToastHelpers } from '@/components/ui/Toast';

type Employee = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    client_id: string;
};

type EmployeeDetails = {
    employee_id: string;
    gender?: string;
    phone?: string;
    date_of_birth?: string;
    current_job?: string;
    work_experience?: string;
    education_level?: string;
    drivers_license?: boolean;
    has_transport?: boolean;
    dutch_speaking?: boolean;
    dutch_writing?: boolean;
    dutch_reading?: boolean;
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

const DOC_TYPES = ['intakeformulier', 'ad_rapportage', 'fml_izp', 'overig'];
const DOC_LABELS: Record<string, string> = {
    intakeformulier: 'Intakeformulier',
    ad_rapportage: 'AD Rapport',
    fml_izp: 'FML/IZP',
    overig: 'Overig'
};

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

    useEffect(() => {
        fetchEmployee();
        fetchEmployeeDetails();
        fetchClients();
        fetchUserRole();
        fetchDocuments();
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
        if (data.client_id) {
            fetchClient(data.client_id);
        }
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
            setEmployeeDetails(data);
            if (data.autofilled_fields) {
                setAutofilledFields(new Set(data.autofilled_fields));
            }
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

    const saveEmployeeInfo = async () => {
        if (!employee) return;

        setUpdating(true);
        try {
            const { error } = await supabase
                .from('employees')
                .update(employee)
                .eq('id', employeeId);

            if (error) {
                console.error('Error updating employee:', error);
                showError('Fout bij opslaan', 'Er is een fout opgetreden bij het opslaan van de werknemer informatie.');
                return;
            }

            showSuccess('Werknemer informatie opgeslagen!');
        } catch (err) {
            console.error('Error saving employee info:', err);
            showError('Fout bij opslaan', 'Er is een onverwachte fout opgetreden bij het opslaan van de werknemer informatie.');
        } finally {
            setUpdating(false);
        }
    };

    const saveDetails = async () => {
        if (!employeeDetails) return;

        setUpdating(true);
        try {
            const { error } = await supabase
                .from('employee_details')
                .upsert([employeeDetails], { onConflict: 'employee_id' });

            if (error) {
                console.error('Error saving details:', error);
                showError('Fout bij opslaan', 'Er is een fout opgetreden bij het opslaan van het profiel.');
                return;
            }

            showSuccess('Profiel opgeslagen!');
        } catch (err) {
            console.error('Error saving details:', err);
            showError('Fout bij opslaan', 'Er is een onverwachte fout opgetreden bij het opslaan van het profiel.');
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
            if (details && Object.keys(details).length > 0) {
                const fields = Object.keys(details);

                // Create a new updated version of the employeeDetails object
                const updatedDetails: EmployeeDetails = {
                    ...(employeeDetails || {}),
                    ...details,
                    employee_id: employeeId,
                    autofilled_fields: fields,
                };

                // Update local state to reflect changes in UI
                setEmployeeDetails(updatedDetails);
                setAutofilledFields(new Set(fields));

                // Persist to Supabase
                await supabase
                    .from('employee_details')
                    .upsert([updatedDetails], { onConflict: 'employee_id' });

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

    const fieldClass = (field: keyof EmployeeDetails) =>
        `w-full border border-gray-500/30 p-2 rounded ${autofilledFields.has(field) ? 'border-yellow-500' : ''}`;

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
                                    <select className="w-full border border-gray-500/30 p-2 rounded" value={employee.client_id || ''} onChange={(e) => { setEmployee({ ...employee, client_id: e.target.value }); fetchClient(e.target.value); }}>
                                        <option value="">Selecteer werkgever</option>
                                        {clients.map((client) => (
                                            <option key={client.id} value={client.id}>{client.name}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input className="w-full border border-gray-500/30 p-2 rounded bg-gray-100 text-gray-500" value={clientName || ''} disabled />
                                )}
                                <div className="flex gap-2 mt-4">
                                    <button onClick={() => window.location.href = `/dashboard/tp/${employeeId}`} className="flex border-2 border-indigo-600 font-semibold text-indigo-600 px-4 py-2 rounded items-center gap-2 hover:bg-indigo-600 hover:text-white hover:cursor-pointer transition"><Map className="w-4 h-4" />Trajectplan</button>
                                    <button onClick={() => window.location.href = `/dashboard/vgr/${employeeId}`} className="flex border-2 border-purple-600 font-semibold text-purple-600 px-4 py-2 rounded items-center gap-2 hover:bg-purple-600 hover:text-white hover:cursor-pointer transition"><Compass className="w-4 h-4" />VGR</button>
                                </div>
                                <button onClick={saveEmployeeInfo} className="mt-4 bg-blue-600 font-semibold text-white px-4 py-2 rounded hover:bg-blue-700 hover:text-white hover:cursor-pointer transition" disabled={updating}>
                                    {updating ? 'Opslaan...' : 'Opslaan informatie'}
                                </button>
                            </div>

                            <div className="flex flex-col gap-2 w-2/5">
                                <select className={fieldClass('gender')} value={employeeDetails?.gender || ''} onChange={e => handleDetailChange('gender', e.target.value)} >
                                    <option value="">Geslacht selecteren</option>
                                    <option value="Male">Man</option>
                                    <option value="Female">Vrouw</option>
                                    <option value="Other">Anders</option>
                                </select>
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
            <div className="bg-white p-4 rounded shadow space-y-4">
                <div className="flex justify-between">
                    <h2 className="text-lg font-semibold">Werknemersprofiel</h2>
                    <button onClick={autofillWithAI} disabled={aiLoading} className={`bg-green-600 text-white font-semibold px-4 py-2 rounded hover:bg-green-700 hover:cursor-pointer transition ${aiLoading ? 'opacity-50' : ''}`}>
                        {aiLoading ? 'AI uitvoeren...': 'Invullen met AI'}
                    </button>
                </div>

                <input className={fieldClass('current_job')} placeholder="Huidig ​​werk" value={employeeDetails?.current_job || ''} onChange={e => handleDetailChange('current_job', e.target.value)} />
                <textarea className={fieldClass('work_experience')} placeholder="Werkervaring" value={employeeDetails?.work_experience || ''} onChange={e => handleDetailChange('work_experience', e.target.value)} />
                <select className={fieldClass('education_level')} value={employeeDetails?.education_level || ''} onChange={e => handleDetailChange('education_level', e.target.value)}>
                    <option value="">Selecteer opleidingsniveau</option>
                    {['Praktijkonderwijs', 'VMBO', 'HAVO', 'VWO', 'MBO', 'HBO', 'WO'].map(level => (
                        <option key={level} value={level}>{level}</option>
                    ))}
                </select>

                <div className='flex p-2'>
                    {[['drivers_license', 'Rijbewijs'], ['has_transport', 'Eigen vervoer'], ['dutch_speaking', 'NL Spreken'], ['dutch_writing', 'NL Schrijven'], ['dutch_reading', 'NL Lezen'], ['has_computer', 'Heeft PC']].map(([key, label]) => (
                        <label key={key} className="flex items-center space-x-2 w-1/2">
                            <input type="checkbox" checked={Boolean(employeeDetails?.[key as keyof EmployeeDetails])} onChange={e => handleDetailChange(key as keyof EmployeeDetails, e.target.checked)} />
                            <span className={autofilledFields.has(key) ? 'text-yellow-500' : ''}>{label}</span>
                        </label>
                    ))}
                </div>

                <select className={fieldClass('computer_skills')} value={employeeDetails?.computer_skills || ''} onChange={e => handleDetailChange('computer_skills', e.target.value)}>
                    <option value="">Selecteer computervaardigheden</option>
                    <option value="1">1 - Geen</option>
                    <option value="2">2 - Basis (e-mail, browsen)</option>
                    <option value="3">3 - Gemiddeld (Word, Excel)</option>
                    <option value="4">4 - Geavanceerd (meerdere programma's)</option>
                    <option value="5">5 - Expert (IT-gerelateerde vaardigheden)</option>
                </select>

                <input className={fieldClass('contract_hours')} type="number" placeholder="Contracturen" value={employeeDetails?.contract_hours || ''} onChange={e => handleDetailChange('contract_hours', Number(e.target.value))} />
                <textarea className={fieldClass('other_employers')} placeholder="Andere werkgevers" value={employeeDetails?.other_employers || ''} onChange={e => handleDetailChange('other_employers', e.target.value)} />

                <button onClick={saveDetails} className="bg-blue-600 text-white font-semibold px-4 py-2 rounded hover:bg-blue-700 hover:text-white hover:cursor-pointer transition" disabled={updating}>
                    {updating ? 'Opslaan...' : 'Profiel Opslaan'}
                </button>
            </div>

            {activeDocType && (
                <DocumentModal
                    type={activeDocType}
                    employeeId={employeeId}
                    existingDoc={documents.find(d => d.type === activeDocType) || null}
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