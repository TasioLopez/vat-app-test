'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFormDirty } from '@/hooks/useFormDirty';
import { useGuardedRouter } from '@/hooks/useGuardedRouter';
import UnsavedChangesSyncGuard from '@/components/unsaved/UnsavedChangesSyncGuard';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { trackAccess } from '@/lib/tracking';
import { cn } from '@/lib/utils';
import { normalizePhoneForStorage } from '@/lib/phone/format-dutch-display';
import { SELECT_CLASS } from '@/lib/select-class';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft,
  Building2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Tag,
  Trash2,
  Users,
} from 'lucide-react';
import { canOpenEmployeeDossier, type AppRole } from '@/lib/auth/roles';

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

const INDUSTRY_OPTIONS = [
  'Gezondheidszorg',
  'Onderwijs',
  'Financiën',
  'Technologie',
  'Detailhandel',
  'Productie',
  'Bouw',
  'Horeca',
  'Transport',
  'Overig',
];

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = use(params);
  const guardedRouter = useGuardedRouter();

  const [client, setClient] = useState<Client | null>(null);
  const [clientSnapshot, setClientSnapshot] = useState<Client | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [referentsList, setReferentsList] = useState<ReferentRow[]>([]);
  const [newReferent, setNewReferent] = useState<Partial<ReferentRow> | null>(null);
  const [editingReferentId, setEditingReferentId] = useState<string | null>(null);
  const [editingReferentDraft, setEditingReferentDraft] = useState<Partial<ReferentRow>>({});
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [saving, setSaving] = useState(false);
  const [referentToDelete, setReferentToDelete] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);

  const clientEditPayload = client
    ? {
        name: client.name,
        industry: client.industry,
        contact_email: client.contact_email,
        phone: client.phone,
        plaats: client.plaats,
      }
    : null;
  const clientSnapshotPayload = clientSnapshot
    ? {
        name: clientSnapshot.name,
        industry: clientSnapshot.industry,
        contact_email: clientSnapshot.contact_email,
        phone: clientSnapshot.phone,
        plaats: clientSnapshot.plaats,
      }
    : null;
  const isDirty = useFormDirty(clientEditPayload, clientSnapshotPayload);

  const fetchEmployees = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('client_id', id);

    if (!error && data) setEmployees(data);
  }, []);

  const fetchReferents = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('referents' as any)
      .select(
        'id, client_id, first_name, last_name, phone, email, referent_function, gender, is_default, display_order'
      )
      .eq('client_id', id)
      .order('display_order', { ascending: true, nullsFirst: false });
    if (!error && data) setReferentsList(data as unknown as ReferentRow[]);
    else setReferentsList([]);
  }, []);

  const fetchClient = useCallback(async () => {
    setLoadState('loading');

    const {
      data: { user },
      error: sessionError,
    } = await supabase.auth.getUser();

    if (sessionError || !user) {
      setLoadState('failed');
      return;
    }

    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (
      userError ||
      !userRecord ||
      (userRecord.role !== 'admin' &&
        userRecord.role !== 'user' &&
        userRecord.role !== 'back_office')
    ) {
      setUserRole(null);
      setLoadState('failed');
      return;
    }

    setUserRole(userRecord.role as AppRole);

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (error || !data) {
      setLoadState('failed');
      return;
    }

    setClient(data);
    setClientSnapshot({ ...data });
    setNewReferent(null);
    setEditingReferentId(null);
    setEditingReferentDraft({});
    await Promise.all([fetchEmployees(clientId), fetchReferents(clientId)]);
    await trackAccess('client', clientId, false);
    setLoadState('ready');
  }, [clientId, fetchEmployees, fetchReferents]);

  useEffect(() => {
    void fetchClient();
  }, [fetchClient]);

  const saveClient = useCallback(async () => {
    if (!client) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: client.name,
          industry: client.industry,
          contact_email: client.contact_email,
          phone: normalizePhoneForStorage(client.phone),
          plaats: client.plaats || null,
        })
        .eq('id', client.id);

      if (error) throw new Error(error.message);

      await trackAccess('client', client.id, true);
      setClientSnapshot({ ...client });
    } finally {
      setSaving(false);
    }
  }, [client]);

  const handleSave = async () => {
    try {
      await saveClient();
    } catch (err) {
      console.error(err);
    }
  };

  const saveNewReferent = async () => {
    if (!client || (!newReferent?.first_name?.trim() && !newReferent?.last_name?.trim())) return;
    const isFirst = referentsList.length === 0;
    const { error } = await supabase.from('referents' as any).insert({
      client_id: client.id,
      first_name: (newReferent.first_name ?? '').trim() || null,
      last_name: (newReferent.last_name ?? '').trim() || null,
      phone: normalizePhoneForStorage(newReferent.phone as string),
      email: (newReferent.email as string)?.trim() || null,
      referent_function: (newReferent.referent_function as string)?.trim() || null,
      gender: (newReferent.gender as string)?.trim() || null,
      is_default: isFirst,
    });
    if (!error) {
      await fetchReferents(client.id);
      setNewReferent(null);
    }
  };

  const setReferentDefault = async (referentId: string) => {
    if (!client) return;
    const refs = referentsList.map((r) => ({ ...r, is_default: r.id === referentId }));
    for (const r of refs) {
      await supabase
        .from('referents' as any)
        .update({ is_default: r.id === referentId })
        .eq('id', r.id);
    }
    setReferentsList(refs);
  };

  const deleteReferent = async (referentId: string) => {
    if (!client) return;
    const { error } = await supabase.from('referents' as any).delete().eq('id', referentId);
    if (!error) {
      await fetchReferents(client.id);
      setReferentToDelete(null);
    }
  };

  const updateReferent = async (referentId: string, updates: Partial<ReferentRow>) => {
    const { error } = await (supabase as any).from('referents').update(updates).eq('id', referentId);
    if (!error && client) {
      await fetchReferents(client.id);
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
      phone: normalizePhoneForStorage(editingReferentDraft.phone as string),
      email: (editingReferentDraft.email as string)?.trim() || null,
      referent_function: (editingReferentDraft.referent_function as string)?.trim() || null,
      gender: (editingReferentDraft.gender as string)?.trim() || null,
    });
  };

  if (loadState === 'loading') {
    return (
      <div className="min-h-full bg-gray-50 p-8">
        <p className="text-sm text-muted-foreground">Laden…</p>
      </div>
    );
  }

  if (loadState === 'failed' || !client) {
    return (
      <div className="min-h-full space-y-4 bg-gray-50 p-8">
        <button
          type="button"
          onClick={() => guardedRouter.push('/dashboard/clients')}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Terug naar werkgevers
        </button>
        <p className="text-muted-foreground">Werkgever niet gevonden of geen toegang.</p>
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-6 bg-gray-50 p-8">
      <UnsavedChangesSyncGuard isDirty={isDirty} onSave={saveClient} autosave={false} />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => guardedRouter.push('/dashboard/clients')}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Terug naar werkgevers
          </button>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">{client.name || 'Werkgever'}</h1>
        </div>
        <Button onClick={handleSave} disabled={!isDirty || saving}>
          {saving ? 'Opslaan…' : 'Opslaan'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="space-y-5 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-gray-900">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            Bedrijfsgegevens
          </h2>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Building2 className="h-4 w-4 shrink-0" />
              Bedrijfsnaam
            </label>
            <Input
              type="text"
              value={client.name}
              onChange={(e) => setClient({ ...client, name: e.target.value })}
              placeholder="Bedrijfsnaam"
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Tag className="h-4 w-4 shrink-0" />
              Branche
            </label>
            <Select
              value={client.industry || undefined}
              onValueChange={(v) => setClient({ ...client, industry: v })}
            >
              <SelectTrigger className={cn(SELECT_CLASS)}>
                <SelectValue placeholder="Selecteer een branche" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRY_OPTIONS.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Mail className="h-4 w-4 shrink-0" />
              Contact e-mail
            </label>
            <Input
              type="email"
              value={client.contact_email || ''}
              onChange={(e) => setClient({ ...client, contact_email: e.target.value })}
              placeholder="Contact e-mail"
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Phone className="h-4 w-4 shrink-0" />
              Telefoon (algemeen)
            </label>
            <Input
              type="tel"
              value={client.phone || ''}
              onChange={(e) => setClient({ ...client, phone: e.target.value })}
              placeholder="Telefoon"
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              Plaats
            </label>
            <Input
              type="text"
              value={client.plaats || ''}
              onChange={(e) => setClient({ ...client, plaats: e.target.value })}
              placeholder="Plaats"
            />
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-gray-900">
            <Users className="h-5 w-5 text-muted-foreground" />
            Referenten
          </h2>
          <ul className="space-y-3">
            {referentsList.map((r) => (
              <li key={r.id} className="rounded-lg border border-gray-200 bg-gray-50/50 p-3">
                {editingReferentId === r.id ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Voornaam"
                      value={editingReferentDraft.first_name ?? ''}
                      onChange={(e) =>
                        setEditingReferentDraft((p) => ({ ...p, first_name: e.target.value }))
                      }
                    />
                    <Input
                      placeholder="Achternaam"
                      value={editingReferentDraft.last_name ?? ''}
                      onChange={(e) =>
                        setEditingReferentDraft((p) => ({ ...p, last_name: e.target.value }))
                      }
                    />
                    <Input
                      placeholder="Telefoon"
                      value={(editingReferentDraft.phone as string) ?? ''}
                      onChange={(e) =>
                        setEditingReferentDraft((p) => ({ ...p, phone: e.target.value }))
                      }
                    />
                    <Input
                      placeholder="E-mail"
                      value={(editingReferentDraft.email as string) ?? ''}
                      onChange={(e) =>
                        setEditingReferentDraft((p) => ({ ...p, email: e.target.value }))
                      }
                    />
                    <Input
                      placeholder="Functie"
                      value={(editingReferentDraft.referent_function as string) ?? ''}
                      onChange={(e) =>
                        setEditingReferentDraft((p) => ({
                          ...p,
                          referent_function: e.target.value,
                        }))
                      }
                    />
                    <Select
                      value={(editingReferentDraft.gender as string) || undefined}
                      onValueChange={(v) => setEditingReferentDraft((p) => ({ ...p, gender: v }))}
                    >
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
                      <Button type="button" size="sm" onClick={saveEditReferent}>
                        Opslaan
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingReferentId(null);
                          setEditingReferentDraft({});
                        }}
                      >
                        Annuleren
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {[r.first_name, r.last_name].filter(Boolean).join(' ').trim() || 'Naamloos'}
                    </span>
                    {r.referent_function && (
                      <span className="text-muted-foreground">({r.referent_function})</span>
                    )}
                    {r.is_default && (
                      <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                        Standaard
                      </span>
                    )}
                    {r.phone && (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {r.phone}
                      </span>
                    )}
                    {r.email && (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {r.email}
                      </span>
                    )}
                    {r.gender && <span className="text-sm text-muted-foreground">{r.gender}</span>}
                    <div className="ml-auto flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditReferent(r)}
                        title="Bewerken"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!r.is_default && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setReferentDefault(r.id)}
                        >
                          Standaard
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setReferentToDelete(r.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {newReferent ? (
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-dashed border-gray-300 p-3">
              <Input
                placeholder="Voornaam"
                value={newReferent.first_name ?? ''}
                onChange={(e) => setNewReferent((p) => ({ ...p, first_name: e.target.value }))}
              />
              <Input
                placeholder="Achternaam"
                value={newReferent.last_name ?? ''}
                onChange={(e) => setNewReferent((p) => ({ ...p, last_name: e.target.value }))}
              />
              <Input
                placeholder="Telefoon"
                value={(newReferent.phone as string) ?? ''}
                onChange={(e) => setNewReferent((p) => ({ ...p, phone: e.target.value }))}
              />
              <Input
                placeholder="E-mail"
                value={(newReferent.email as string) ?? ''}
                onChange={(e) => setNewReferent((p) => ({ ...p, email: e.target.value }))}
              />
              <Input
                placeholder="Functie"
                value={(newReferent.referent_function as string) ?? ''}
                onChange={(e) =>
                  setNewReferent((p) => ({ ...p, referent_function: e.target.value }))
                }
              />
              <Select
                value={(newReferent.gender as string) || undefined}
                onValueChange={(v) => setNewReferent((p) => ({ ...p, gender: v }))}
              >
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
                <Button type="button" size="sm" onClick={saveNewReferent}>
                  Toevoegen
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setNewReferent(null)}>
                  Annuleren
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setNewReferent({});
                setEditingReferentId(null);
              }}
            >
              + Nieuwe referent
            </Button>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold tracking-tight text-gray-900">
          <Users className="h-5 w-5 text-muted-foreground" />
          Geassocieerde werknemers
        </h2>
        <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
          {employees.length === 0 ? (
            <li className="text-muted-foreground">Geen werknemers gekoppeld</li>
          ) : (
            employees.map((emp) => (
              <li key={emp.id} className="border-b border-gray-100 pb-2 last:border-0">
                {userRole && canOpenEmployeeDossier(userRole) ? (
                  <Link
                    href={`/dashboard/employees/${emp.id}`}
                    className="text-card-foreground hover:underline"
                  >
                    {emp.first_name} {emp.last_name}
                  </Link>
                ) : (
                  <span className="text-card-foreground">
                    {emp.first_name} {emp.last_name}
                  </span>
                )}
                <span className="text-muted-foreground"> – {emp.email}</span>
              </li>
            ))
          )}
        </ul>
      </section>

      <ConfirmDialog
        open={Boolean(referentToDelete)}
        onOpenChange={(open) => {
          if (!open) setReferentToDelete(null);
        }}
        title="Referent verwijderen"
        description="Weet u zeker dat u deze referent wilt verwijderen?"
        confirmLabel="Verwijderen"
        cancelLabel="Annuleren"
        variant="destructive"
        onConfirm={async () => {
          if (referentToDelete) await deleteReferent(referentToDelete);
        }}
      />
    </div>
  );
}
