'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';
import { 
    FaUserTie, 
    FaUser, 
    FaEnvelope, 
    FaBriefcase,
    FaSpinner,
    FaCheckCircle,
    FaExclamationCircle
} from 'react-icons/fa';

type Client = Database['public']['Tables']['clients']['Row'];

export default function NewEmployeePage() {
    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        client_id: '',
    });
    const [clients, setClients] = useState<Client[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchClients = async () => {
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError || !user) {
                setError('User not authenticated');
                return;
            }

            // Fetch user role
            const { data: userRecord, error: roleError } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single();

            if (roleError || !userRecord) {
                setError('Failed to determine user role');
                return;
            }

            if (userRecord.role === 'admin') {
                // Admin: fetch all clients
                const { data: allClients, error: allError } = await supabase
                    .from('clients')
                    .select('*');

                if (allError || !allClients) {
                    setError('Failed to fetch clients');
                    return;
                }

                setClients(allClients);
            } else {
                // User: fetch associated clients only
                const { data: clientUserLinks, error: linkError } = await supabase
                    .from('user_clients')
                    .select('client_id')
                    .eq('user_id', user.id);

                if (linkError || !clientUserLinks) {
                    setError('Failed to fetch client associations');
                    return;
                }

                const clientIds = clientUserLinks.map((link) => link.client_id);

                if (clientIds.length === 0) {
                    setClients([]);
                    return;
                }

                const { data: userClients, error: clientError } = await supabase
                    .from('clients')
                    .select('*')
                    .in('id', clientIds);

                if (clientError || !userClients) {
                    setError('Failed to load clients');
                    return;
                }

                setClients(userClients);
            }
        };

        fetchClients();
    }, []);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Verify authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (!user) {
            setError('Not authenticated. Please log in again.');
            setLoading(false);
            return;
        }

        // Fetch user role to check if admin
        const { data: userRecord, error: roleError } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (roleError || !userRecord) {
            setError('Failed to verify user role.');
            setLoading(false);
            return;
        }

        const isAdmin = userRecord.role === 'admin';

        // Verify user has client access (skip for admins - they have access to all clients)
        if (form.client_id && !isAdmin) {
            const { data: clientCheck, error: clientCheckError } = await supabase
                .from('user_clients')
                .select('*')
                .eq('user_id', user.id)
                .eq('client_id', form.client_id)
                .single();

            if (!clientCheck) {
                setError('You do not have access to this client.');
                setLoading(false);
                return;
            }
        }

        const { data: newEmployees, error: employeeError } = await supabase
            .from('employees')
            .insert([
                {
                    first_name: form.first_name,
                    last_name: form.last_name,
                    email: form.email || null,
                    client_id: form.client_id || null,
                },
            ])
            .select();

        if (employeeError || !newEmployees || newEmployees.length === 0) {
            setError(employeeError?.message || 'Failed to create employee');
            setLoading(false);
            return;
        }

        const newEmployeeId = newEmployees[0].id;

        const { error: detailsError } = await supabase.from('employee_details').insert([
            { employee_id: newEmployeeId },
        ]);

        if (detailsError) {
            setError('Employee created, but failed to initialize employee details: ' + detailsError.message);
            setLoading(false);
            return;
        }

        // Assign the employee to the user who created it (user is already defined above)
        if (user) {
            const { error: assignmentError } = await supabase.from('employee_users').insert([
                { 
                    user_id: user.id, 
                    employee_id: newEmployeeId,
                    assigned_at: new Date().toISOString()
                },
            ]);

            if (assignmentError) {
                setError('Employee created, but failed to assign to user: ' + assignmentError.message);
                setLoading(false);
                return;
            }
        }

        router.push('/dashboard/employees');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50/30 p-6 animate-in fade-in duration-500">
            <div className="max-w-2xl mx-auto">
                {/* Header Section */}
                <div className="mb-8 animate-in slide-in-from-top-4 duration-700">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
                            <FaUserTie className="text-2xl" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Nieuwe werknemer</h1>
                            <p className="text-gray-600 mt-1">Voeg een nieuwe werknemer toe aan het systeem</p>
                        </div>
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-xl shadow-purple-500/10 border border-purple-200/50 p-8 animate-in slide-in-from-bottom-4 duration-700">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* First Name Field */}
                        <div className="group">
                            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                <FaUser className="text-purple-600" />
                                Voornaam
                                <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    name="first_name"
                                    value={form.first_name}
                                    onChange={handleChange}
                                    onFocus={() => setFocusedField('first_name')}
                                    onBlur={() => setFocusedField(null)}
                                    placeholder="Voer voornaam in"
                                    required
                                    className={`w-full px-4 py-3 pl-12 rounded-xl border-2 transition-all duration-300 ${
                                        focusedField === 'first_name'
                                            ? 'border-purple-500 bg-purple-50/50 shadow-lg shadow-purple-500/20'
                                            : 'border-gray-200 bg-gray-50/50 hover:border-purple-300 hover:bg-white'
                                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-gray-900 placeholder:text-gray-400`}
                                />
                                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300 ${
                                    focusedField === 'first_name' ? 'text-purple-600 scale-110' : 'text-gray-400'
                                }`}>
                                    <FaUser />
                                </div>
                            </div>
                        </div>

                        {/* Last Name Field */}
                        <div className="group">
                            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                <FaUser className="text-purple-600" />
                                Achternaam
                                <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    name="last_name"
                                    value={form.last_name}
                                    onChange={handleChange}
                                    onFocus={() => setFocusedField('last_name')}
                                    onBlur={() => setFocusedField(null)}
                                    placeholder="Voer achternaam in"
                                    required
                                    className={`w-full px-4 py-3 pl-12 rounded-xl border-2 transition-all duration-300 ${
                                        focusedField === 'last_name'
                                            ? 'border-purple-500 bg-purple-50/50 shadow-lg shadow-purple-500/20'
                                            : 'border-gray-200 bg-gray-50/50 hover:border-purple-300 hover:bg-white'
                                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-gray-900 placeholder:text-gray-400`}
                                />
                                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300 ${
                                    focusedField === 'last_name' ? 'text-purple-600 scale-110' : 'text-gray-400'
                                }`}>
                                    <FaUser />
                                </div>
                            </div>
                        </div>

                        {/* Email Field */}
                        <div className="group">
                            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                <FaEnvelope className="text-purple-600" />
                                Email
                            </label>
                            <div className="relative">
                                <input
                                    name="email"
                                    type="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    onFocus={() => setFocusedField('email')}
                                    onBlur={() => setFocusedField(null)}
                                    placeholder="voorbeeld@email.com"
                                    className={`w-full px-4 py-3 pl-12 rounded-xl border-2 transition-all duration-300 ${
                                        focusedField === 'email'
                                            ? 'border-purple-500 bg-purple-50/50 shadow-lg shadow-purple-500/20'
                                            : 'border-gray-200 bg-gray-50/50 hover:border-purple-300 hover:bg-white'
                                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-gray-900 placeholder:text-gray-400`}
                                />
                                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300 ${
                                    focusedField === 'email' ? 'text-purple-600 scale-110' : 'text-gray-400'
                                }`}>
                                    <FaEnvelope />
                                </div>
                            </div>
                        </div>

                        {/* Employer Selection Field */}
                        <div className="group">
                            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                <FaBriefcase className="text-purple-600" />
                                Selecteer werkgever
                                <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <select
                                    name="client_id"
                                    value={form.client_id}
                                    onChange={handleChange}
                                    onFocus={() => setFocusedField('client_id')}
                                    onBlur={() => setFocusedField(null)}
                                    className={`w-full px-4 py-3 pl-12 rounded-xl border-2 transition-all duration-300 appearance-none cursor-pointer ${
                                        focusedField === 'client_id'
                                            ? 'border-purple-500 bg-purple-50/50 shadow-lg shadow-purple-500/20'
                                            : 'border-gray-200 bg-gray-50/50 hover:border-purple-300 hover:bg-white'
                                    } focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-gray-900`}
                                    required
                                >
                                    <option value="">Kies een werkgever...</option>
                                    {clients.map((client) => (
                                        <option key={client.id} value={client.id}>
                                            {client.name}
                                        </option>
                                    ))}
                                </select>
                                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300 pointer-events-none ${
                                    focusedField === 'client_id' ? 'text-purple-600 scale-110' : 'text-gray-400'
                                }`}>
                                    <FaBriefcase />
                                </div>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                                <FaExclamationCircle className="text-red-600 flex-shrink-0" />
                                <p className="text-red-700 text-sm font-medium">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-4 px-6 rounded-xl font-semibold text-white shadow-lg transition-all duration-300 flex items-center justify-center gap-3 ${
                                    loading
                                        ? 'bg-purple-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 hover:shadow-xl hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98]'
                                }`}
                            >
                                {loading ? (
                                    <>
                                        <FaSpinner className="animate-spin" />
                                        <span>Opslaan...</span>
                                    </>
                                ) : (
                                    <>
                                        <FaCheckCircle />
                                        <span>Opslaan werknemer</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
