'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';

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
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // DEBUG: Verify authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        console.log('Auth check:', { user: user?.id, email: user?.email, authError });
        
        if (!user) {
            setError('Not authenticated. Please log in again.');
            setLoading(false);
            return;
        }

        // DEBUG: Verify user has client access
        if (form.client_id) {
            const { data: clientCheck, error: clientCheckError } = await supabase
                .from('user_clients')
                .select('*')
                .eq('user_id', user.id)
                .eq('client_id', form.client_id)
                .single();
            console.log('Client access check:', { clientCheck, clientCheckError });
            
            if (!clientCheck) {
                setError('You do not have access to this client.');
                setLoading(false);
                return;
            }
        }

        console.log('Attempting to insert employee with:', {
            first_name: form.first_name,
            last_name: form.last_name,
            email: form.email,
            client_id: form.client_id,
            user_id: user.id
        });

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

        console.log('Insert result:', { newEmployees, employeeError });

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
        <div className="p-6 max-w-md mx-auto">
            <h1 className="text-2xl font-semibold mb-4">Nieuwe werknemer</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    name="first_name"
                    value={form.first_name}
                    onChange={handleChange}
                    placeholder="Voornaam"
                    required
                    className="w-full border border-gray-500/30 p-2 rounded"
                />
                <input
                    name="last_name"
                    value={form.last_name}
                    onChange={handleChange}
                    placeholder="Achternaam"
                    required
                    className="w-full border border-gray-500/30 p-2 rounded"
                />
                <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Email"
                    className="w-full border border-gray-500/30 p-2 rounded"
                />

                <select
                    name="client_id"
                    value={form.client_id}
                    onChange={handleChange}
                    className="w-full border border-gray-500/30 p-2 rounded"
                    required
                >
                    <option value="">Selecteer werkgever</option>
                    {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                            {client.name}
                        </option>
                    ))}
                </select>

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <button
                    type="submit"
                    disabled={loading}
                    className="bg-green-600 text-white px-4 py-2 rounded w-full"
                >
                    {loading ? 'Opslaan...' : 'Opslaan werknemer'}
                </button>
            </form>
        </div>
    );
}
