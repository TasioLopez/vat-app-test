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
import { cn } from '@/lib/utils';
import { SELECT_CLASS } from '@/lib/select-class';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type SortField = 'name' | 'industry';
type SortDirection = 'asc' | 'desc';

type Client = Database['public']['Tables']['clients']['Row'] & {
  phone?: string | null;
  plaats?: string | null;
};
type Employee = Database['public']['Tables']['employees']['Row'];

type ReferentRow = {
  id: string;
  client_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  referent_function: string | null;
  gender: string | null;
  is_default: boolean;
  display_order: number | null;
};

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
  const [referentsList, setReferentsList] = useState<ReferentRow[]>([]);
  const [newReferent, setNewReferent] = useState<Partial<ReferentRow> | null>(null);
  const [editingReferentId, setEditingReferentId] = useState<string | null>(null);
  const [editingReferentDraft, setEditingReferentDraft] = useState<Partial<ReferentRow>>({});

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

  const fetchReferents = async (clientId: string) => {
    const { data, error } = await supabase
      .from('referents' as any)
      .select('id, client_id, first_name, last_name, phone, email, referent_function, gender, is_default, display_order')
      .eq('client_id', clientId)
      .order('display_order', { ascending: true, nullsFirst: false });
    if (!error && data) setReferentsList(data as unknown as ReferentRow[]);
    else setReferentsList([]);
  };

  const handleEdit = async (client: Client) => {
    setSelectedClient(client);
    setNewReferent(null);
    setEditingReferentId(null);
    await fetchEmployees(client.id);
    await fetchReferents(client.id);
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
      })
      .eq('id', selectedClient.id);

    if (!error) {
      await trackAccess('client', selectedClient.id, true);
      await fetchClients();
      setSelectedClient(null);
    }
  };

  const saveNewReferent = async () => {
    if (!selectedClient || !newReferent?.first_name?.trim() && !newReferent?.last_name?.trim()) return;
    const isFirst = referentsList.length === 0;
    const { error } = await supabase.from('referents' as any).insert({
      client_id: selectedClient.id,
      first_name: (newReferent.first_name ?? '').trim() || null,
      last_name: (newReferent.last_name ?? '').trim() || null,
      phone: (newReferent.phone as string)?.trim() || null,
      email: (newReferent.email as string)?.trim() || null,
      referent_function: (newReferent.referent_function as string)?.trim() || null,
      gender: (newReferent.gender as string)?.trim() || null,
      is_default: isFirst,
    });
    if (!error) {
      await fetchReferents(selectedClient.id);
      setNewReferent(null);
    }
  };

  const setReferentDefault = async (referentId: string) => {
    if (!selectedClient) return;
    const refs = referentsList.map((r) => ({ ...r, is_default: r.id === referentId }));
    for (const r of refs) {
      await supabase.from('referents' as any).update({ is_default: r.id === referentId }).eq('id', r.id);
    }
    setReferentsList(refs);
  };

  const deleteReferent = async (referentId: string) => {
    if (!selectedClient) return;
    const { error } = await supabase.from('referents' as any).delete().eq('id', referentId);
    if (!error) await fetchReferents(selectedClient.id);
  };

  const updateReferent = async (referentId: string, updates: Partial<ReferentRow>) => {
    const { error } = await (supabase as any).from('referents').update(updates).eq('id', referentId);
    if (!error && selectedClient) {
      await fetchReferents(selectedClient.id);
      setEditingReferentId(null);
      setEditingReferentDraft({});
    }
  };

  const startEditReferent = (r: ReferentRow) => {
    setEditingReferentId(r.id);
    setEditingReferentDraft({
      first_name: r.first_name,
      last_name: r.last_name,
      phone: r.phone,
      email: r.email,
      referent_function: r.referent_function,
      gender: r.gender,
    });
    setNewReferent(null);
  };

  const saveEditReferent = async () => {
    if (!editingReferentId) return;
    await updateReferent(editingReferentId, {
      first_name: (editingReferentDraft.first_name ?? '').trim() || null,
      last_name: (editingReferentDraft.last_name ?? '').trim() || null,
      phone: (editingReferentDraft.phone as string)?.trim() || null,
      email: (editingReferentDraft.email as string)?.trim() || null,
      referent_function: (editingReferentDraft.referent_function as string)?.trim() || null,
      gender: (editingReferentDraft.gender as string)?.trim() || null,
    });
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

      {/* Edit Modal – open for admin and for users (associated clients); users can edit referents only */}
      {selectedClient && (
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
                    disabled={userRole !== 'admin'}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                    <Tag className="w-4 h-4 shrink-0" />
                    Werkgever branche
                  </label>
                  <Select
                    value={selectedClient.industry || undefined}
                    onValueChange={(v) => setSelectedClient({ ...selectedClient, industry: v })}
                    disabled={userRole !== 'admin'}
                  >
                    <SelectTrigger className={cn(SELECT_CLASS)}>
                      <SelectValue placeholder="Selecteer een branche" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        'Gezondheidszorg', 'Onderwijs', 'Financiën', 'Technologie', 'Detailhandel',
                        'Productie', 'Bouw', 'Horeca', 'Transport', 'Overig'
                      ].map((industry) => (
                        <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    disabled={userRole !== 'admin'}
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
                    disabled={userRole !== 'admin'}
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
                    disabled={userRole !== 'admin'}
                  />
                </div>
              </div>

              {/* Referenten */}
              <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
                <h3 className="flex items-center gap-2 font-semibold text-card-foreground">
                  <Users className="w-5 h-5 text-purple-600" />
                  Referenten
                </h3>
                <ul className="space-y-3">
                  {referentsList.map((r) => (
                    <li key={r.id} className="rounded border border-border/50 bg-background p-3">
                      {editingReferentId === r.id ? (
                        <div className="grid grid-cols-2 gap-2">
                          <Input placeholder="Voornaam" value={editingReferentDraft.first_name ?? ''} onChange={(e) => setEditingReferentDraft((p) => ({ ...p, first_name: e.target.value }))} />
                          <Input placeholder="Achternaam" value={editingReferentDraft.last_name ?? ''} onChange={(e) => setEditingReferentDraft((p) => ({ ...p, last_name: e.target.value }))} />
                          <Input placeholder="Telefoon" value={(editingReferentDraft.phone as string) ?? ''} onChange={(e) => setEditingReferentDraft((p) => ({ ...p, phone: e.target.value }))} />
                          <Input placeholder="E-mail" value={(editingReferentDraft.email as string) ?? ''} onChange={(e) => setEditingReferentDraft((p) => ({ ...p, email: e.target.value }))} />
                          <Input placeholder="Functie" value={(editingReferentDraft.referent_function as string) ?? ''} onChange={(e) => setEditingReferentDraft((p) => ({ ...p, referent_function: e.target.value }))} />
                          <Select value={(editingReferentDraft.gender as string) || undefined} onValueChange={(v) => setEditingReferentDraft((p) => ({ ...p, gender: v }))}>
                            <SelectTrigger className={SELECT_CLASS}>
                              <SelectValue placeholder="Geslacht" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Man">Man</SelectItem>
                              <SelectItem value="Vrouw">Vrouw</SelectItem>
                              <SelectItem value="Anders">Anders</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="col-span-2 flex gap-2">
                            <Button type="button" size="sm" onClick={saveEditReferent}>Opslaan</Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => { setEditingReferentId(null); setEditingReferentDraft({}); }}>Annuleren</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{[r.first_name, r.last_name].filter(Boolean).join(' ').trim() || 'Naamloos'}</span>
                          {r.referent_function && <span className="text-muted-foreground">({r.referent_function})</span>}
                          {r.is_default && <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">Standaard</span>}
                          {r.phone && <span className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{r.phone}</span>}
                          {r.email && <span className="text-sm text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{r.email}</span>}
                          {r.gender && <span className="text-sm text-muted-foreground">{r.gender}</span>}
                          <div className="ml-auto flex gap-1">
                            <Button type="button" variant="ghost" size="sm" onClick={() => startEditReferent(r)} title="Bewerken"><Pencil className="w-4 h-4" /></Button>
                            {!r.is_default && (
                              <Button type="button" variant="outline" size="sm" onClick={() => setReferentDefault(r.id)}>Standaard</Button>
                            )}
                            <Button type="button" variant="ghost" size="sm" onClick={() => deleteReferent(r.id)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                {newReferent ? (
                  <div className="grid grid-cols-2 gap-2 rounded border border-dashed border-border p-3">
                    <Input placeholder="Voornaam" value={newReferent.first_name ?? ''} onChange={(e) => setNewReferent((p) => ({ ...p, first_name: e.target.value }))} />
                    <Input placeholder="Achternaam" value={newReferent.last_name ?? ''} onChange={(e) => setNewReferent((p) => ({ ...p, last_name: e.target.value }))} />
                    <Input placeholder="Telefoon" value={(newReferent.phone as string) ?? ''} onChange={(e) => setNewReferent((p) => ({ ...p, phone: e.target.value }))} />
                    <Input placeholder="E-mail" value={(newReferent.email as string) ?? ''} onChange={(e) => setNewReferent((p) => ({ ...p, email: e.target.value }))} />
                    <Input placeholder="Functie" value={(newReferent.referent_function as string) ?? ''} onChange={(e) => setNewReferent((p) => ({ ...p, referent_function: e.target.value }))} />
                    <Select value={(newReferent.gender as string) || undefined} onValueChange={(v) => setNewReferent((p) => ({ ...p, gender: v }))}>
                      <SelectTrigger className={SELECT_CLASS}>
                        <SelectValue placeholder="Geslacht" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Man">Man</SelectItem>
                        <SelectItem value="Vrouw">Vrouw</SelectItem>
                        <SelectItem value="Anders">Anders</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="col-span-2 flex gap-2">
                      <Button type="button" size="sm" onClick={saveNewReferent}>Toevoegen</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setNewReferent(null)}>Annuleren</Button>
                    </div>
                  </div>
                ) : (
                  <Button type="button" variant="outline" size="sm" onClick={() => { setNewReferent({}); setEditingReferentId(null); }}>+ Nieuwe referent</Button>
                )}
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
                {userRole === 'admin' ? 'Annuleren' : 'Sluiten'}
              </Button>
              {userRole === 'admin' && (
                <Button onClick={handleSave} size="lg">
                  Opslaan
                </Button>
              )}
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
