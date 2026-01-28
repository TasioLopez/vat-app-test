'use client';

import { useState, useEffect, use } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Map, Compass, Sparkles, Save, Briefcase, GraduationCap, Car, Languages, Computer, Clock, Building2, FileText } from 'lucide-react';
import DocumentModal from '@/components/DocumentModal';
import { useToastHelpers } from '@/components/ui/Toast';
import { parseWorkExperience } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

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
    education_name?: string;
    drivers_license?: boolean;
    drivers_license_type?: string;
    transport_type?: string[];
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
            // Parse work_experience if it's a JSON array string
            const parsedData = {
                ...data,
                work_experience: data.work_experience ? parseWorkExperience(data.work_experience) : data.work_experience
            };
            setEmployeeDetails(parsedData);
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
            // Normalize work_experience to plain string (not JSON array)
            const normalizedWorkExperience = employeeDetails.work_experience 
                ? parseWorkExperience(employeeDetails.work_experience)
                : employeeDetails.work_experience;

            // Ensure transport_type is saved as array
            const payload = {
                ...employeeDetails,
                work_experience: normalizedWorkExperience,
                transport_type: Array.isArray(employeeDetails.transport_type) 
                    ? employeeDetails.transport_type 
                    : (typeof employeeDetails.transport_type === 'string' && employeeDetails.transport_type 
                        ? [employeeDetails.transport_type] 
                        : null)
            };
            
            const { error } = await supabase
                .from('employee_details')
                .upsert([payload], { onConflict: 'employee_id' });

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

    const saveAllInfo = async () => {
        if (!employee || !employeeDetails) return;

        setUpdating(true);
        try {
            // Save employee basic info
            const { error: employeeError } = await supabase
                .from('employees')
                .update(employee)
                .eq('id', employeeId);

            if (employeeError) {
                console.error('Error updating employee:', employeeError);
                showError('Fout bij opslaan', 'Er is een fout opgetreden bij het opslaan van de werknemer informatie.');
                return;
            }

            // Normalize work_experience to plain string (not JSON array)
            const normalizedWorkExperience = employeeDetails.work_experience 
                ? parseWorkExperience(employeeDetails.work_experience)
                : employeeDetails.work_experience;

            // Save employee details (including gender)
            // Ensure transport_type is saved as array
            const detailsPayload = {
                ...employeeDetails,
                work_experience: normalizedWorkExperience,
                transport_type: Array.isArray(employeeDetails.transport_type) 
                    ? employeeDetails.transport_type 
                    : (typeof employeeDetails.transport_type === 'string' && employeeDetails.transport_type 
                        ? [employeeDetails.transport_type] 
                        : null)
            };
            
            const { error: detailsError } = await supabase
                .from('employee_details')
                .upsert([detailsPayload], { onConflict: 'employee_id' });

            if (detailsError) {
                console.error('Error saving details:', detailsError);
                showError('Fout bij opslaan', 'Er is een fout opgetreden bij het opslaan van het profiel.');
                return;
            }

            showSuccess('Werknemer informatie opgeslagen!');
        } catch (err) {
            console.error('Error saving all info:', err);
            showError('Fout bij opslaan', 'Er is een onverwachte fout opgetreden bij het opslaan van de werknemer informatie.');
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

                // Ensure transport_type is handled as array
                const processedDetails: any = { ...details };
                if (processedDetails.transport_type) {
                    if (!Array.isArray(processedDetails.transport_type)) {
                        // Convert string to array if needed
                        processedDetails.transport_type = typeof processedDetails.transport_type === 'string' 
                            ? [processedDetails.transport_type] 
                            : [];
                    }
                }

                // Create a new updated version of the employeeDetails object
                const updatedDetails: EmployeeDetails = {
                    ...(employeeDetails || {}),
                    ...processedDetails,
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
        `w-full border-2 border-purple-200 p-3 rounded-lg bg-white transition-all duration-200 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 hover:border-purple-300 ${autofilledFields.has(field) ? 'border-yellow-400 bg-yellow-50/30' : ''}`;

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
                                <Button 
                                    onClick={saveAllInfo} 
                                    disabled={updating}
                                    className="mt-4 w-full"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    {updating ? 'Opslaan...' : 'Opslaan informatie'}
                                </Button>
                            </div>

                            <div className="flex flex-col gap-2 w-2/5">
                                <select className={fieldClass('gender')} value={employeeDetails?.gender || ''} onChange={e => handleDetailChange('gender', e.target.value)} >
                                    <option value="">Geslacht selecteren</option>
                                    <option value="Man">Man</option>
                                    <option value="Vrouw">Vrouw</option>
                                    <option value="Anders">Anders</option>
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
                        <select 
                            className={fieldClass('education_level')} 
                            value={employeeDetails?.education_level || ''} 
                            onChange={e => handleDetailChange('education_level', e.target.value)}
                        >
                            <option value="">Selecteer opleidingsniveau</option>
                            {['Praktijkonderwijs', 'VMBO', 'HAVO', 'VWO', 'MBO 1', 'MBO 2', 'MBO 3', 'MBO 4', 'HBO', 'WO'].map(level => (
                                <option key={level} value={level}>{level}</option>
                            ))}
                        </select>
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

                {/* Conditional input for license type */}
                {employeeDetails?.drivers_license && (
                    <div className="space-y-2 group transition-all duration-300">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Car className="w-4 h-4 text-purple-600" />
                            Rijbewijstype
                        </label>
                        <select 
                            className={fieldClass('drivers_license_type')} 
                            value={employeeDetails?.drivers_license_type || ''} 
                            onChange={e => handleDetailChange('drivers_license_type', e.target.value)}
                        >
                            <option value="">Selecteer rijbewijstype</option>
                            <option value="B">B (Auto)</option>
                            <option value="C">C (Vrachtwagen)</option>
                            <option value="D">D (Bus)</option>
                            <option value="E">E (Aanhangwagen)</option>
                            <option value="A">A (Motor)</option>
                        </select>
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
                            <select 
                                className={fieldClass('dutch_speaking')} 
                                value={employeeDetails?.dutch_speaking || ''} 
                                onChange={e => handleDetailChange('dutch_speaking', e.target.value || null)}
                            >
                                <option value="">Selecteer...</option>
                                <option value="Niet goed">Niet goed</option>
                                <option value="Gemiddeld">Gemiddeld</option>
                                <option value="Goed">Goed</option>
                            </select>
                        </div>
                        <div className="space-y-2 group">
                            <label className="text-xs text-gray-500 font-medium">Schrijfvaardigheid</label>
                            <select 
                                className={fieldClass('dutch_writing')} 
                                value={employeeDetails?.dutch_writing || ''} 
                                onChange={e => handleDetailChange('dutch_writing', e.target.value || null)}
                            >
                                <option value="">Selecteer...</option>
                                <option value="Niet goed">Niet goed</option>
                                <option value="Gemiddeld">Gemiddeld</option>
                                <option value="Goed">Goed</option>
                            </select>
                        </div>
                        <div className="space-y-2 group">
                            <label className="text-xs text-gray-500 font-medium">Leesvaardigheid</label>
                            <select 
                                className={fieldClass('dutch_reading')} 
                                value={employeeDetails?.dutch_reading || ''} 
                                onChange={e => handleDetailChange('dutch_reading', e.target.value || null)}
                            >
                                <option value="">Selecteer...</option>
                                <option value="Niet goed">Niet goed</option>
                                <option value="Gemiddeld">Gemiddeld</option>
                                <option value="Goed">Goed</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Computer Skills */}
                <div className="space-y-2 group">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Computer className="w-4 h-4 text-purple-600" />
                        Computervaardigheden
                    </label>
                    <select 
                        className={fieldClass('computer_skills')} 
                        value={employeeDetails?.computer_skills || ''} 
                        onChange={e => handleDetailChange('computer_skills', e.target.value)}
                    >
                        <option value="">Selecteer computervaardigheden</option>
                        <option value="1">1 - Geen</option>
                        <option value="2">2 - Basis (e-mail, browsen)</option>
                        <option value="3">3 - Gemiddeld (Word, Excel)</option>
                        <option value="4">4 - Geavanceerd (meerdere programma's)</option>
                        <option value="5">5 - Expert (IT-gerelateerde vaardigheden)</option>
                    </select>
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
                
                {/* Previous Employers */}
                <div className="space-y-2 group">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-purple-600" />
                        Vorige werkgevers
                    </label>
                    <Textarea 
                        className={fieldClass('other_employers') + ' min-h-[100px]'} 
                        placeholder="Vul hier alleen vorige werkgevers in, niet de huidige werkgever..." 
                        value={employeeDetails?.other_employers || ''} 
                        onChange={e => handleDetailChange('other_employers', e.target.value)} 
                    />
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <span className="text-purple-500">ℹ️</span>
                        Vul hier alleen vorige werkgevers in, niet de huidige werkgever ({clientName})
                    </p>
                </div>

                <Button 
                    onClick={saveDetails} 
                    disabled={updating}
                    className="w-full md:w-auto"
                    size="lg"
                >
                    <Save className="w-4 h-4 mr-2" />
                    {updating ? 'Opslaan...' : 'Profiel Opslaan'}
                </Button>
            </div>

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