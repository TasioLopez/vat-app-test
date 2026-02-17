'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Trash2, Pencil } from 'lucide-react';
import { trackAccess } from '@/lib/tracking';


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
    // Track when client is opened
    await trackAccess('client', client.id, false);
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
        phone: selectedClient.phone || null,
        plaats: selectedClient.plaats || null,
        referent_first_name: selectedClient.referent_first_name || null,
        referent_last_name: selectedClient.referent_last_name || null,
        referent_phone: selectedClient.referent_phone || null,
        referent_email: selectedClient.referent_email || null,
        referent_function: selectedClient.referent_function || null,
      })
      .eq('id', selectedClient.id);

    if (!error) {
      // Track modification
      await trackAccess('client', selectedClient.id, true);
      await fetchClients();
      setSelectedClient(null);
    }
  };


  return (
    <div className="p-8 space-y-8 bg-gradient-to-br from-gray-50 to-purple-50/30">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Werkgevers</h1>
          <p className="text-lg text-gray-600">Beheer werkgevers en hun gegevens</p>
        </div>
        {userRole === 'admin' && (
          <Link href="/dashboard/clients/new">
            <Button size="lg">+ Nieuwe werkgever</Button>
          </Link>
        )}
      </div>

      <div className="space-y-4">
        {clients.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Geen werkgevers om te tonen.</p>
          </div>
        ) : clients.map((client) => (
          <Card
            key={client.id}
            clickable
            onClick={() => handleEdit(client)}
            className="hover:shadow-md transition-all duration-200"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-8">
                  <div>
                    <h2 className="text-lg font-bold text-card-foreground">{client.name}</h2>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{client.industry || 'Geen branche geselecteerd'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{client.contact_email || 'Geen contact e-mailadres'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{client.phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{client.plaats || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Gemaakt op: {client.created_at ? new Date(client.created_at).toLocaleString() : '—'}
                    </p>
                  </div>
                </div>

                {userRole === 'admin' && (
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(client)}
                    >
                      <Pencil className="w-4 h-4 mr-2" /> Bewerken
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteClick(client)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Modal */}
      {selectedClient && userRole === 'admin' && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/50 flex justify-center items-center z-50 p-4">
          <div className="bg-white border-2 border-purple-200/50 p-8 rounded-xl shadow-2xl shadow-purple-500/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-3xl font-bold mb-6 text-gray-900">Werkgever bewerken</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Client Info Column */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Werkgever naam</label>
                  <Input
                    type="text"
                    value={selectedClient.name}
                    onChange={(e) => setSelectedClient({ ...selectedClient, name: e.target.value })}
                    placeholder="Company Name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Werkgever branche</label>
                  <select
                    value={selectedClient.industry || ''}
                    onChange={(e) => setSelectedClient({ ...selectedClient, industry: e.target.value })}
                    className="flex h-10 w-full rounded-lg border-2 border-purple-200 bg-white px-4 py-2 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:border-purple-500 hover:border-purple-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Selecteer een branche</option>
                    {[
                      'Gezondheidszorg', 'Onderwijs', 'Financiën', 'Technologie', 'Detailhandel',
                      'Productie', 'Bouw', 'Horeca', 'Transport', 'Overig'
                    ].map((industry) => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Werkgever email</label>
                  <Input
                    type="email"
                    value={selectedClient.contact_email || ''}
                    onChange={(e) => setSelectedClient({ ...selectedClient, contact_email: e.target.value })}
                    placeholder="Contact Email"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Telefoon (algemeen)</label>
                  <Input
                    type="tel"
                    value={selectedClient.phone || ''}
                    onChange={(e) => setSelectedClient({ ...selectedClient, phone: e.target.value })}
                    placeholder="010-1234567"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Plaats</label>
                  <Input
                    type="text"
                    value={selectedClient.plaats || ''}
                    onChange={(e) => setSelectedClient({ ...selectedClient, plaats: e.target.value })}
                    placeholder="Rotterdam"
                  />
                </div>
              </div>

              {/* Referent Info Column */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Voornaam referent</label>
                  <Input
                    type="text"
                    value={selectedClient.referent_first_name || ''}
                    onChange={(e) =>
                      setSelectedClient({ ...selectedClient, referent_first_name: e.target.value })
                    }
                    placeholder="Referent First Name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Achternaam referent</label>
                  <Input
                    type="text"
                    value={selectedClient.referent_last_name || ''}
                    onChange={(e) =>
                      setSelectedClient({ ...selectedClient, referent_last_name: e.target.value })
                    }
                    placeholder="Referent Last Name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Telefoon referent</label>
                  <Input
                    type="tel"
                    value={selectedClient.referent_phone || ''}
                    onChange={(e) =>
                      setSelectedClient({ ...selectedClient, referent_phone: e.target.value })
                    }
                    placeholder="Referent Phone"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Email referent</label>
                  <Input
                    type="email"
                    value={selectedClient.referent_email || ''}
                    onChange={(e) =>
                      setSelectedClient({ ...selectedClient, referent_email: e.target.value })
                    }
                    placeholder="Referent Email"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Functie referent</label>
                  <Input
                    type="text"
                    value={selectedClient.referent_function || ''}
                    onChange={(e) =>
                      setSelectedClient({ ...selectedClient, referent_function: e.target.value })
                    }
                    placeholder="bijv. Teammanager"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="mb-3 font-semibold text-sm text-card-foreground">Geassocieerde werknemers</h3>
              <ul className="max-h-40 overflow-y-auto text-sm space-y-2 border border-border rounded-md p-3 bg-muted/30">
                {employees.length === 0 ? (
                  <li className="text-muted-foreground">Geen werknemers gekoppeld</li>
                ) : (
                  employees.map((emp) => (
                    <li key={emp.id} className="border-b border-border pb-2 last:border-0">
                      <span className="text-card-foreground">{emp.first_name} {emp.last_name}</span>
                      <span className="text-muted-foreground"> – {emp.email}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="mt-8 flex justify-end gap-4 pt-6 border-t border-purple-200/50">
              <Button variant="outline" onClick={() => setSelectedClient(null)} size="lg">
                Annuleren
              </Button>
              <Button onClick={handleSave} size="lg">
                Opslaan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && clientToDelete && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/50 flex justify-center items-center z-50 p-4">
          <div className="bg-white border-2 border-red-200/50 p-8 rounded-xl shadow-2xl shadow-red-500/20 w-full max-w-sm text-center">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Bevestig verwijderen</h2>
            <p className="text-base mb-8 text-gray-600">
              Weet u zeker dat u wilt <strong className="text-gray-900">{clientToDelete.name}</strong> verwijderen?
            </p>
            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)} size="lg">
                Annuleren
              </Button>
              <Button variant="destructive" onClick={handleDelete} size="lg">
                Verwijderen
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
