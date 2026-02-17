'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Trash2, Pencil, Search, ChevronUp, ChevronDown, Building2, Tag, Mail, Phone, MapPin, User, Users, Briefcase } from 'lucide-react';
import { trackAccess } from '@/lib/tracking';

type SortField = 'name' | 'industry';
type SortDirection = 'asc' | 'desc';

type Client = Database['public']['Tables']['clients']['Row'] & {
  phone?: string | null;
  plaats?: string | null;
};
type Employee = Database['public']['Tables']['employees']['Row'];

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedClients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = clients.filter((c) => {
      if (!q) return true;
      return (
        (c.name?.toLowerCase().includes(q)) ||
        (c.contact_email?.toLowerCase().includes(q)) ||
        (c.industry?.toLowerCase().includes(q)) ||
        (c.plaats?.toLowerCase().includes(q))
      );
    });
    list = [...list].sort((a, b) => {
      const aVal = sortField === 'name' ? (a.name ?? '') : (a.industry ?? '');
      const bVal = sortField === 'name' ? (b.name ?? '') : (b.industry ?? '');
      const cmp = aVal.localeCompare(bVal, undefined, { sensitivity: 'base' });
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [clients, searchQuery, sortField, sortDirection]);

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

      {clients.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 pointer-events-none" />
            <Input
              type="text"
              placeholder="Zoek op naam, e-mail, branche of plaats"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={sortField === 'name' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('name')}
              className="gap-1"
            >
              Naam {sortField === 'name' && (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
            </Button>
            <Button
              variant={sortField === 'industry' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('industry')}
              className="gap-1"
            >
              Branche {sortField === 'industry' && (sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {clients.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Geen werkgevers om te tonen.</p>
          </div>
        ) : filteredAndSortedClients.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Geen werkgevers gevonden die overeenkomen met uw zoekopdracht.</p>
          </div>
        ) : filteredAndSortedClients.map((client) => (
          <Card
            key={client.id}
            clickable
            onClick={() => handleEdit(client)}
            className="hover:shadow-md transition-all duration-200"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4 min-h-[2.5rem]">
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)_auto_auto] gap-4 flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <h2 className="text-lg font-bold text-card-foreground truncate">{client.name}</h2>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <Tag className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground truncate">{client.industry || 'Geen branche geselecteerd'}</p>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground truncate">{client.contact_email || 'Geen contact e-mailadres'}</p>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <Phone className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground truncate">{client.phone || '—'}</p>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground truncate">{client.plaats || '—'}</p>
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
          <div className="bg-white border-2 border-purple-200/50 p-8 rounded-xl shadow-2xl shadow-purple-500/20 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-3xl font-bold mb-6 text-gray-900">Werkgever bewerken</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Client Info Column */}
              <div className="space-y-5">
                <h3 className="flex items-center gap-2 font-semibold text-card-foreground">
                  <Building2 className="w-5 h-5 text-purple-600" />
                  Bedrijfsgegevens
                </h3>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                    <Building2 className="w-4 h-4 shrink-0" />
                    Werkgever naam
                  </label>
                  <Input
                    type="text"
                    value={selectedClient.name}
                    onChange={(e) => setSelectedClient({ ...selectedClient, name: e.target.value })}
                    placeholder="Company Name"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                    <Tag className="w-4 h-4 shrink-0" />
                    Werkgever branche
                  </label>
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
                  <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                    <Mail className="w-4 h-4 shrink-0" />
                    Werkgever email
                  </label>
                  <Input
                    type="email"
                    value={selectedClient.contact_email || ''}
                    onChange={(e) => setSelectedClient({ ...selectedClient, contact_email: e.target.value })}
                    placeholder="Contact Email"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                    <Phone className="w-4 h-4 shrink-0" />
                    Telefoon (algemeen)
                  </label>
                  <Input
                    type="tel"
                    value={selectedClient.phone || ''}
                    onChange={(e) => setSelectedClient({ ...selectedClient, phone: e.target.value })}
                    placeholder="010-1234567"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                    <MapPin className="w-4 h-4 shrink-0" />
                    Plaats
                  </label>
                  <Input
                    type="text"
                    value={selectedClient.plaats || ''}
                    onChange={(e) => setSelectedClient({ ...selectedClient, plaats: e.target.value })}
                    placeholder="Rotterdam"
                  />
                </div>
              </div>

              {/* Referent Info Column */}
              <div className="space-y-5 rounded-lg border border-border bg-muted/20 p-4">
                <h3 className="flex items-center gap-2 font-semibold text-card-foreground">
                  <User className="w-5 h-5 text-purple-600" />
                  Referent
                </h3>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                    <User className="w-4 h-4 shrink-0" />
                    Voornaam referent
                  </label>
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
                  <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                    <User className="w-4 h-4 shrink-0" />
                    Achternaam referent
                  </label>
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
                  <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                    <Phone className="w-4 h-4 shrink-0" />
                    Telefoon referent
                  </label>
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
                  <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                    <Mail className="w-4 h-4 shrink-0" />
                    Email referent
                  </label>
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
                  <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                    <Briefcase className="w-4 h-4 shrink-0" />
                    Functie referent
                  </label>
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

            <div className="mt-8">
              <h3 className="flex items-center gap-2 mb-3 font-semibold text-sm text-card-foreground">
                <Users className="w-5 h-5 text-purple-600" />
                Geassocieerde werknemers
              </h3>
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
