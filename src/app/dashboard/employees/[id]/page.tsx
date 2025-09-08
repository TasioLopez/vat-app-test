'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';
import DocumentModal from '@/components/DocumentModal';
import { Compass, Map } from 'lucide-react';

const DOC_TYPES = ['intakeformulier', 'ad_rapportage', 'fml_izp', 'extra'] as const;

const DOC_LABELS: Record<DocType, string> = {
    intakeformulier: 'Intakeformulier',
    ad_rapportage: 'AD Rapportage',
    fml_izp: 'FML / IZP',
    extra: 'Extra Document',
};

type DocType = (typeof DOC_TYPES)[number];

type Employee = Database['public']['Tables']['employees']['Row'];
type EmployeeDetails = Database['public']['Tables']['employee_details']['Row'];
type Document = Database['public']['Tables']['documents']['Row'];
type Client = Database['public']['Tables']['clients']['Row'];

export default function EmployeeDetailPage() {
    const { id } = useParams();
    const employeeId = id as string;

    const [employee, setEmployee] = useState<Employee | null>(null);
    const [employeeDetails, setEmployeeDetails] = useState<EmployeeDetails | null>(null);
    const [autofilledFields, setAutofilledFields] = useState<Set<string>>(new Set());
    const [documents, setDocuments] = useState<Document[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [clientName, setClientName] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null);
    const [updating, setUpdating] = useState(false);
    const [activeDocType, setActiveDocType] = useState<DocType | null>(null);
    const [aiLoading, setAiLoading] = useState(false);

    useEffect(() => {
        if (employeeId) {
            fetchEmployee();
            fetchEmployeeDetails();
            fetchDocuments();
            fetchUserRoleAndClients();
        }
    }, [employeeId]);

    const fetchUserRoleAndClients = async () => {
        const { data: authUser } = await supabase.auth.getUser();
        const userId = authUser?.user?.id;
        if (!userId) return;

        const { data: user } = await supabase.from('users').select('role').eq('id', userId).single();
        if (user?.role === 'admin') {
            setUserRole('admin');
            const { data: allClients } = await supabase.from('clients').select('*');
            if (allClients) setClients(allClients);
        } else {
            setUserRole('user');
        }
    };

    const fetchEmployee = async () => {
        const { data } = await supabase.from('employees').select('*').eq('id', employeeId).single();
        setEmployee(data);
        if (data?.client_id) fetchClient(data.client_id);
    };

    const fetchClient = async (clientId: string) => {
        const { data } = await supabase.from('clients').select('name').eq('id', clientId).single();
        if (data) setClientName(data.name);
    };

    const fetchEmployeeDetails = async () => {
        const { data } = await supabase
            .from('employee_details')
            .select('*')
            .eq('employee_id', employeeId)
            .single();

        if (data) {
            setEmployeeDetails(data);
            setAutofilledFields(new Set(data.autofilled_fields || []));
        }
    };

    const fetchDocuments = async () => {
        try {
            const res = await fetch('/api/documents/get', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employee_id: employeeId }),
            });

            const json = await res.json();
            if (res.ok) setDocuments(json.documents || []);
            else console.error('Failed to fetch documents:', json.error);
        } catch (err) {
            console.error('Error fetching documents:', err);
        }
    };

    const handleDetailChange = (field: keyof EmployeeDetails, value: any) => {
        if (!employeeDetails) return;
        setEmployeeDetails({ ...employeeDetails, [field]: value });
        setAutofilledFields(prev => {
            const next = new Set(prev);
            next.delete(field);
            return next;
        });
    };

    const saveDetails = async () => {
        if (!employeeDetails) return;
        setUpdating(true);

        const { error } = await supabase
            .from('employee_details')
            .upsert([{ ...employeeDetails, employee_id: employeeId, autofilled_fields: [] }], {
                onConflict: 'employee_id',
            });

        if (!error) await fetchEmployeeDetails();
        setUpdating(false);
    };

    const saveEmployeeInfo = async () => {
        if (!employee || !employeeDetails) return;
        setUpdating(true);

        const { error: employeeError } = await supabase
            .from('employees')
            .update({
                first_name: employee.first_name,
                last_name: employee.last_name,
                email: employee.email,
                client_id: employee.client_id,
            })
            .eq('id', employee.id);

        const { error: detailsError } = await supabase
            .from('employee_details')
            .upsert([{
                employee_id: employeeId,
                gender: employeeDetails.gender,
                phone: employeeDetails.phone,
                date_of_birth: employeeDetails.date_of_birth,
            }], {
                onConflict: 'employee_id',
            });

        if (!employeeError && !detailsError) {
            await fetchEmployee();
            await fetchEmployeeDetails();
        }

        setUpdating(false);
    };

    const autofillWithAI = async () => {
        setAiLoading(true);
        try {
            const res = await fetch(`/api/autofill-employee-info?employeeId=${employeeId}`);
            const json = await res.json();

            if (json.details) {
                const fields = Object.keys(json.details);

                // Create a new updated version of the employeeDetails object
                const updatedDetails: EmployeeDetails = {
                    ...(employeeDetails || {}),
                    ...json.details,
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
            }
        } catch (err) {
            console.error('Autofill failed:', err);
        } finally {
            setAiLoading(false);
        }
    };


    const fieldClass = (field: keyof EmployeeDetails) =>
        `w-full border border-gray-500/30 p-2 rounded ${autofilledFields.has(field) ? 'border-yellow-500' : ''}`;

    return (
        <div className="p-4 space-y-6">
            <h1 className="text-xl font-bold">Employee Details</h1>

            {employee && (
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-col bg-white p-4 rounded shadow flex-1 space-y-4 w-2/5">
                        <h2 className="text-lg font-semibold mb-4">Gegevens werknemer</h2>
                        <div className="flex justify-between">
                            <div className="flex-col space-y-2 w-3/5 pr-2">
                                <input className="w-full border border-gray-500/30 p-2 rounded" placeholder="First Name" value={employee.first_name || ''} onChange={(e) => setEmployee({ ...employee, first_name: e.target.value })} />
                                <input className="w-full border border-gray-500/30 p-2 rounded" placeholder="Last Name" value={employee.last_name || ''} onChange={(e) => setEmployee({ ...employee, last_name: e.target.value })} />
                                <input className="w-full border border-gray-500/30 p-2 rounded" placeholder="Email" value={employee.email || ''} onChange={(e) => setEmployee({ ...employee, email: e.target.value })} />
                                {userRole === 'admin' ? (
                                    <select className="w-full border border-gray-500/30 p-2 rounded" value={employee.client_id || ''} onChange={(e) => { setEmployee({ ...employee, client_id: e.target.value }); fetchClient(e.target.value); }}>
                                        <option value="">Select Employer</option>
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
                                    <option value="">Geslacht selecteeren</option>
                                    <option value="Male">Man</option>
                                    <option value="Female">Vrouw</option>
                                    <option value="Other">Anders</option>
                                </select>
                                <input className={fieldClass('phone')} placeholder="Phone" value={employeeDetails?.phone || ''} onChange={e => handleDetailChange('phone', e.target.value)} />
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
