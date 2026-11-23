'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Trash2, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { canDeleteClients, canManageClients, type AppRole } from '@/lib/auth/roles';

type SortField = 'name' | 'industry';
type SortDirection = 'asc' | 'desc';

type Client = Database['public']['Tables']['clients']['Row'] & {
  phone?: string | null;
  plaats?: string | null;
};

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
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

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="inline h-4 w-4" />
    ) : (
      <ChevronDown className="inline h-4 w-4" />
    );
  };

  const filteredAndSortedClients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = clients.filter((c) => {
      if (!q) return true;
      return (
        c.name?.toLowerCase().includes(q) ||
        c.contact_email?.toLowerCase().includes(q) ||
        c.industry?.toLowerCase().includes(q) ||
        c.plaats?.toLowerCase().includes(q)
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
    void fetchClients();
  }, []);

  const fetchClients = async () => {
    const {
      data: { user },
      error: sessionError,
    } = await supabase.auth.getUser();

    if (sessionError || !user) return console.error('User session error:', sessionError);

    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (userError || !userRecord) return console.error('User fetch error:', userError);

    if (
      userRecord.role === 'admin' ||
      userRecord.role === 'user' ||
      userRecord.role === 'back_office'
    ) {
      setUserRole(userRecord.role as AppRole);
    } else {
      setUserRole(null);
    }

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setClients(data);
  };

  const handleDeleteClick = (client: Client) => {
    if (!userRole || !canDeleteClients(userRole)) return;
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

  return (
    <div className="min-h-full space-y-6 bg-gray-50 p-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">Werkgevers</h1>
        {userRole && canManageClients(userRole) && (
          <Link href="/dashboard/clients/new">
            <Button>+ Nieuwe werkgever</Button>
          </Link>
        )}
      </div>

      {clients.length > 0 && (
        <div className="flex w-full max-w-md items-center">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Zoek op bedrijfsnaam, e-mail, branche of plaats"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      )}

      {clients.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Geen werkgevers om te tonen.</p>
        </div>
      ) : filteredAndSortedClients.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">
            Geen werkgevers gevonden die overeenkomen met uw zoekopdracht.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('name')}
                >
                  Bedrijfsnaam <SortIcon field="name" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('industry')}
                >
                  Branche <SortIcon field="industry" />
                </TableHead>
                <TableHead>Contact e-mail</TableHead>
                <TableHead>Telefoon</TableHead>
                <TableHead>Plaats</TableHead>
                {userRole && canDeleteClients(userRole) && (
                  <TableHead className="text-right">Acties</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedClients.map((client) => (
                <TableRow
                  key={client.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                >
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.industry || '—'}</TableCell>
                  <TableCell>{client.contact_email || '—'}</TableCell>
                  <TableCell>{client.phone || '—'}</TableCell>
                  <TableCell>{client.plaats || '—'}</TableCell>
                  {userRole && canDeleteClients(userRole) && (
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteClick(client)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={showDeleteModal && Boolean(clientToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setShowDeleteModal(false);
            setClientToDelete(null);
          }
        }}
        title="Bevestig verwijderen"
        description={
          clientToDelete
            ? `Weet u zeker dat u ${clientToDelete.name} wilt verwijderen?`
            : undefined
        }
        confirmLabel="Verwijderen"
        cancelLabel="Annuleren"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
