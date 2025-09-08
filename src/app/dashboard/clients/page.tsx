'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Trash2, Pencil } from 'lucide-react';


type Client = Database['public']['Tables']['clients']['Row'];
type Employee = Database['public']['Tables']['employees']['Row'];

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const {
      data: { user },
      error: sessionError
    } = await supabase.auth.getUser();

    if (sessionError || !user) return console.error('User session error:', sessionError);

    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (userError || !userRecord) return console.error('User fetch error:', userError);

    if (userRecord.role === 'admin' || userRecord.role === 'user') {
      setUserRole(userRecord.role);
    } else {
      setUserRole(null);
    }

    if (userRecord.role === 'admin') {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) setClients(data);
    } else {
      const { data: userClients, error: ucError } = await supabase
        .from('user_clients')
        .select('client_id')
        .eq('user_id', user.id);

      if (ucError || !userClients) return console.error('user_clients error:', ucError);

      const clientIds = userClients.map((uc) => uc.client_id);

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .in('id', clientIds)
        .order('created_at', { ascending: false });

      if (!error && data) setClients(data);
    }
  };

  const fetchEmployees = async (clientId: string) => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('client_id', clientId);

    if (!error && data) setEmployees(data);
  };

  const handleEdit = async (client: Client) => {
    if (userRole !== 'admin') return;
    setSelectedClient(client);
    await fetchEmployees(client.id);
  };

  const handleDeleteClick = (client: Client) => {
    if (userRole !== 'admin') return;
    setClientToDelete(client);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!clientToDelete) return;
    const { error } = await supabase.from('clients').delete().eq('id', clientToDelete.id);
    if (!error) {
      setClients((prev) => prev.filter((c) => c.id !== clientToDelete.id));
      setShowDeleteModal(false);
      setClientToDelete(null);
    }
  };

  const handleSave = async () => {
    if (!selectedClient) return;
    const { error } = await supabase
      .from('clients')
      .update({
        name: selectedClient.name,
        industry: selectedClient.industry,
        contact_email: selectedClient.contact_email,
        referent_first_name: selectedClient.referent_first_name || null,
        referent_last_name: selectedClient.referent_last_name || null,
        referent_phone: selectedClient.referent_phone || null,
        referent_email: selectedClient.referent_email || null,
      })
      .eq('id', selectedClient.id);

    if (!error) {
      await fetchClients();
      setSelectedClient(null);
    }
  };


  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Werkgevers</h1>
        {userRole === 'admin' && (
          <Link href="/dashboard/clients/new">
            <Button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 hover:cursor-pointer">+ Nieuwe werkgever</Button>
          </Link>
        )}
      </div>

      <div className="space-y-8">
        {clients.length === 0 ? (
          <p className="text-gray-500 text-center mt-10">Geen werkgevers om te tonen.</p>
        ) : clients.map((client) => (
          <div
            key={client.id}
            onClick={() => handleEdit(client)}
            className="border border-indigo-600/10 rounded-lg p-6 flex justify-between items-start shadow-sm hover:bg-gray-50 hover:border-indigo-600/50 transition cursor-pointer"
          >
            <div className="flex items-center gap-10 ml-4">
              <div>
                <h2 className="text-lg font-bold">{client.name}</h2>
              </div>
              <div>
                <p className="text-md text-gray-600">{client.industry || 'Geen branche geselecteerd'}</p>
              </div>
              <div>
                <p className="text-md text-gray-500">{client.contact_email || 'Geen contact e-mailadres'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">
                  Gemaakt op: {client.created_at ? new Date(client.created_at).toLocaleString() : '—'}
                </p>
              </div>
            </div>

            {userRole === 'admin' && (
              <div className="flex gap-2 self-center mr-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  onClick={() => handleEdit(client)}
                  className="bg-blue-600 hover:bg-blue-700 hover:cursor-pointer"
                >
                  <Pencil className="w-4 h-4 mr-2" /> Bewerken
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDeleteClick(client)}
                  className="hover:cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {selectedClient && userRole === 'admin' && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded w-full max-w-xl">
            <h2 className="text-xl font-bold mb-4">Werkgever bewerken</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Client Info Column */}
              <div className="space-y-3">
                <p className='text-xs text-gray-400'>Werkgever naam</p>
                <input
                  type="text"
                  value={selectedClient.name}
                  onChange={(e) => setSelectedClient({ ...selectedClient, name: e.target.value })}
                  className="w-full border p-2 rounded"
                  placeholder="Company Name"
                />
                <p className='text-xs text-gray-400'>Werkgever branche</p>
                <select
                  value={selectedClient.industry || ''}
                  onChange={(e) => setSelectedClient({ ...selectedClient, industry: e.target.value })}
                  className="w-full border p-2 rounded"
                >
                  <option value="">Selecteer een branche</option>
                  {[
                    'Gezondheidszorg', 'Onderwijs', 'Financiën', 'Technologie', 'Detailhandel',
                    'Productie', 'Bouw', 'Horeca', 'Transport', 'Overig'
                  ].map((industry) => (
                    <option key={industry} value={industry}>{industry}</option>
                  ))}
                </select>
                <p className='text-xs text-gray-400'>Werkgever email</p>
                <input
                  type="email"
                  value={selectedClient.contact_email || ''}
                  onChange={(e) => setSelectedClient({ ...selectedClient, contact_email: e.target.value })}
                  className="w-full border p-2 rounded"
                  placeholder="Contact Email"
                />
              </div>

              {/* Referent Info Column */}
              <div className="space-y-3">
                <p className='text-xs text-gray-400'>Voornaam referent</p>
                <input
                  type="text"
                  value={selectedClient.referent_first_name || ''}
                  onChange={(e) =>
                    setSelectedClient({ ...selectedClient, referent_first_name: e.target.value })
                  }
                  className="w-full border p-2 rounded"
                  placeholder="Referent First Name"
                />
                <p className='text-xs text-gray-400'>Achternaam referent</p>
                <input
                  type="text"
                  value={selectedClient.referent_last_name || ''}
                  onChange={(e) =>
                    setSelectedClient({ ...selectedClient, referent_last_name: e.target.value })
                  }
                  className="w-full border p-2 rounded"
                  placeholder="Referent Last Name"
                />
                <p className='text-xs text-gray-400'>Telefoon referent</p>
                <input
                  type="tel"
                  value={selectedClient.referent_phone || ''}
                  onChange={(e) =>
                    setSelectedClient({ ...selectedClient, referent_phone: e.target.value })
                  }
                  className="w-full border p-2 rounded"
                  placeholder="Referent Phone"
                />
                <p className='text-xs text-gray-400'>Email referent</p>
                <input
                  type="email"
                  value={selectedClient.referent_email || ''}
                  onChange={(e) =>
                    setSelectedClient({ ...selectedClient, referent_email: e.target.value })
                  }
                  className="w-full border p-2 rounded"
                  placeholder="Referent Email"
                />
              </div>
            </div>

            <h3 className="mt-6 mb-2 font-semibold text-sm">Geassocieerde werknemers</h3>
            <ul className="max-h-40 overflow-y-auto text-sm text-gray-700">
              {employees.length === 0 ? (
                <li className="text-gray-400">Geen werknemers gekoppeld</li>
              ) : (
                employees.map((emp) => (
                  <li key={emp.id} className="border-b py-1">
                    {emp.first_name} {emp.last_name} – {emp.email}
                  </li>
                ))
              )}
            </ul>

            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => setSelectedClient(null)}
                className="px-4 py-2 rounded border border-gray-300"
              >
                Annuleren
              </button>
              <button onClick={handleSave} className="px-4 py-2 rounded bg-green-600 text-white">
                Opslaan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && clientToDelete && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded w-full max-w-sm text-center">
            <h2 className="text-lg font-semibold mb-4">Bevestig verwijderen</h2>
            <p className="text-sm mb-6">
              Weet u zeker dat u wilt <strong>{clientToDelete.name}</strong> verwijderen?
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded border border-gray-300"
              >
                Annuleren
              </button>
              <button onClick={handleDelete} className="px-4 py-2 rounded bg-red-600 text-white">
                Verwijderen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
