'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trash2, Eye, Search, Filter, Grid, List, ChevronUp, ChevronDown } from 'lucide-react';
import { useToastHelpers } from '@/components/ui/Toast';
import ConfirmDeleteModal from '@/components/shared/ConfirmDeleteModal';
import { cn } from '@/lib/utils';
import { SELECT_CLASS } from '@/lib/select-class';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OrgUserSelect } from '@/components/users/OrgUserSelect';
import {
  fetchOrgDirectory,
  formatOrgUserDisplayName,
  orgUsersById,
  type OrgDirectoryUser,
} from '@/lib/users/org-directory';

export type Employee = Database['public']['Tables']['employees']['Row'] & {
  clients?: Database['public']['Tables']['clients']['Row'];
};

type SortField = 'name' | 'email' | 'client' | 'created_at' | 'owner';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'table' | 'cards';
type OwnerFilterMode = 'mine' | 'all' | 'colleague' | 'unassigned';

const OWNER_FILTER_STORAGE_KEY = 'werknemers.ownerFilter';

function readStoredOwnerFilter(): { mode: OwnerFilterMode; colleagueId: string | null } {
  if (typeof window === 'undefined') return { mode: 'mine', colleagueId: null };
  try {
    const raw = localStorage.getItem(OWNER_FILTER_STORAGE_KEY);
    if (!raw) return { mode: 'mine', colleagueId: null };
    const parsed = JSON.parse(raw) as { mode?: OwnerFilterMode; colleagueId?: string | null };
    const mode = parsed.mode;
    if (mode === 'mine' || mode === 'all' || mode === 'colleague' || mode === 'unassigned') {
      return { mode, colleagueId: parsed.colleagueId ?? null };
    }
  } catch {
    /* ignore */
  }
  return { mode: 'mine', colleagueId: null };
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [orgUsers, setOrgUsers] = useState<OrgDirectoryUser[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [ownerFilterMode, setOwnerFilterMode] = useState<OwnerFilterMode>('mine');
  const [colleagueUserId, setColleagueUserId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const { showSuccess, showError } = useToastHelpers();
  const router = useRouter();

  useEffect(() => {
    const stored = readStoredOwnerFilter();
    setOwnerFilterMode(stored.mode);
    setColleagueUserId(stored.colleagueId);
    fetchEmployees();
    fetchClients();
    void fetchOrgDirectory(supabase).then(setOrgUsers);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        OWNER_FILTER_STORAGE_KEY,
        JSON.stringify({ mode: ownerFilterMode, colleagueId: colleagueUserId })
      );
    } catch {
      /* ignore */
    }
  }, [ownerFilterMode, colleagueUserId]);

  const ownerById = useMemo(() => orgUsersById(orgUsers), [orgUsers]);

  const fetchEmployees = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setCurrentUserId(user.id);

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = userData?.role || 'user';
    setUserRole(role);

    const { data, error } = await supabase
      .from('employees')
      .select('*, clients(name)')
      .order('created_at', { ascending: false });

    if (!error && data) setEmployees(data as Employee[]);
  };

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('id, name')
      .order('name');

    if (!error && data) {
      setClients(data);
    }
  };

  const ownerDisplayName = (ownerId: string | null | undefined) => {
    if (!ownerId) return '—';
    const u = ownerById.get(ownerId);
    return u ? formatOrgUserDisplayName(u) : '—';
  };

  const handleDelete = async () => {
    if (!selectedEmployeeId) return;
    
    try {
      const deletePromises = [
        supabase.from('tp_docs').delete().eq('employee_id', selectedEmployeeId),
        supabase.from('documents').delete().eq('employee_id', selectedEmployeeId),
        supabase.from('tp_meta').delete().eq('employee_id', selectedEmployeeId),
        supabase.from('employee_details').delete().eq('employee_id', selectedEmployeeId),
        supabase.from('employee_users').delete().eq('employee_id', selectedEmployeeId)
      ];
      
      const results = await Promise.allSettled(deletePromises);
      
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Error deleting from table ${index}:`, result.reason);
        } else if (result.value.error) {
          console.error(`Error deleting from table ${index}:`, result.value.error);
        }
      });
      
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', selectedEmployeeId);
        
      if (!error) {
        setEmployees((prev) => prev.filter((emp) => emp.id !== selectedEmployeeId));
        setShowDeleteModal(false);
        setSelectedEmployeeId(null);
        showSuccess('Werknemer succesvol verwijderd!');
      } else {
        console.error('Error deleting employee:', error);
        showError('Fout bij verwijderen', 'Er is een fout opgetreden bij het verwijderen van de werknemer. Probeer het opnieuw.');
      }
    } catch (error) {
      console.error('Unexpected error during deletion:', error);
      showError('Onverwachte fout', 'Er is een onverwachte fout opgetreden. Probeer het opnieuw.');
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 inline ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 inline ml-1" />
    );
  };

  // Filter and sort employees
  const filteredAndSortedEmployees = useMemo(() => {
    let filtered = employees.filter((emp) => {
      const matchesSearch = searchQuery === '' || 
        `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.clients?.name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesClient = selectedClient === 'all' || emp.client_id === selectedClient;

      let matchesOwner = true;
      if (ownerFilterMode === 'mine') {
        matchesOwner = !!currentUserId && emp.owner_id === currentUserId;
      } else if (ownerFilterMode === 'colleague') {
        matchesOwner = !!colleagueUserId && emp.owner_id === colleagueUserId;
      } else if (ownerFilterMode === 'unassigned') {
        matchesOwner = !emp.owner_id;
      }

      return matchesSearch && matchesClient && matchesOwner;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = `${a.first_name} ${a.last_name}`.toLowerCase();
          bValue = `${b.first_name} ${b.last_name}`.toLowerCase();
          break;
        case 'email':
          aValue = a.email?.toLowerCase() || '';
          bValue = b.email?.toLowerCase() || '';
          break;
        case 'client':
          aValue = a.clients?.name?.toLowerCase() || '';
          bValue = b.clients?.name?.toLowerCase() || '';
          break;
        case 'owner':
          aValue = ownerDisplayName(a.owner_id).toLowerCase();
          bValue = ownerDisplayName(b.owner_id).toLowerCase();
          break;
        case 'created_at':
          aValue = new Date(a.created_at || 0).getTime();
          bValue = new Date(b.created_at || 0).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [
    employees,
    searchQuery,
    selectedClient,
    ownerFilterMode,
    colleagueUserId,
    currentUserId,
    sortField,
    sortDirection,
    ownerById,
  ]);

  const groupedByClient = useMemo(() => {
    return filteredAndSortedEmployees.reduce<Record<string, Employee[]>>((acc, emp) => {
    const clientName = emp.clients?.name || 'Unassigned';
    if (!acc[clientName]) acc[clientName] = [];
    acc[clientName].push(emp);
    return acc;
  }, {});
  }, [filteredAndSortedEmployees]);

  return (
    <div className="p-8 space-y-6 bg-gradient-to-br from-gray-50 to-purple-50/30">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Werknemers</h1>
          <p className="text-lg text-gray-600">
            Beheer werknemers en hun gegevens ({filteredAndSortedEmployees.length} {filteredAndSortedEmployees.length === 1 ? 'werknemer' : 'werknemers'})
          </p>
        </div>
        <Link href="/dashboard/employees/new">
          <Button size="lg">+ Werknemer toevoegen</Button>
        </Link>
      </div>

      {/* Filters and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-4 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:flex-initial sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Zoek op naam, email of werkgever..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Client Filter */}
          {clients.length > 0 && (
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className={cn(SELECT_CLASS, 'w-full sm:w-48 px-10')}>
                  <SelectValue placeholder="Alle werkgevers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle werkgevers</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Owner filter */}
          <Select
            value={ownerFilterMode}
            onValueChange={(v) => setOwnerFilterMode(v as OwnerFilterMode)}
          >
            <SelectTrigger className={cn(SELECT_CLASS, 'w-full sm:w-48')}>
              <SelectValue placeholder="Eigenaar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mine">Mijn dossiers</SelectItem>
              <SelectItem value="all">Alle</SelectItem>
              <SelectItem value="colleague">Collega</SelectItem>
              <SelectItem value="unassigned">Zonder eigenaar</SelectItem>
            </SelectContent>
          </Select>
          {ownerFilterMode === 'colleague' ? (
            <OrgUserSelect
              supabase={supabase}
              users={orgUsers}
              value={colleagueUserId}
              currentUserId={currentUserId}
              placeholder="Kies collega"
              className="w-full sm:w-56"
              onChange={(id) => setColleagueUserId(id)}
            />
          ) : null}
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 border-2 border-purple-200 rounded-lg p-1">
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="gap-2"
          >
            <List className="w-4 h-4" />
            Tabel
          </Button>
          <Button
            variant={viewMode === 'cards' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('cards')}
            className="gap-2"
          >
            <Grid className="w-4 h-4" />
            Kaarten
          </Button>
        </div>
      </div>

      {/* Content */}
      {filteredAndSortedEmployees.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-lg text-gray-500">
            {searchQuery || selectedClient !== 'all' || ownerFilterMode !== 'all'
              ? 'Geen werknemers gevonden die overeenkomen met uw filters.' 
              : 'Geen werknemers om te tonen.'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-purple-100/50"
                onClick={() => handleSort('name')}
              >
                Naam <SortIcon field="name" />
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-purple-100/50"
                onClick={() => handleSort('email')}
              >
                Email <SortIcon field="email" />
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-purple-100/50"
                onClick={() => handleSort('client')}
              >
                Werkgever <SortIcon field="client" />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-purple-100/50"
                onClick={() => handleSort('owner')}
              >
                Eigenaar <SortIcon field="owner" />
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-purple-100/50"
                onClick={() => handleSort('created_at')}
              >
                Toegevoegd <SortIcon field="created_at" />
              </TableHead>
              <TableHead className="text-right">Acties</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedEmployees.map((employee) => (
              <TableRow 
                key={employee.id}
                className="cursor-pointer"
                onClick={() => router.push(`/dashboard/employees/${employee.id}`)}
              >
                <TableCell className="font-semibold">
                      {employee.first_name} {employee.last_name}
                </TableCell>
                <TableCell>{employee.email}</TableCell>
                <TableCell>{employee.clients?.name || '—'}</TableCell>
                <TableCell>{ownerDisplayName(employee.owner_id)}</TableCell>
                <TableCell>
                  {employee.created_at 
                    ? new Date(employee.created_at).toLocaleDateString('nl-NL')
                    : '—'}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/dashboard/employees/${employee.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-2" /> Bekijk
                    </Button>
                    {userRole === 'admin' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelectedEmployeeId(employee.id);
                          setShowDeleteModal(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        /* Card View (Grouped by Client) */
        <div className="space-y-8">
          {Object.entries(groupedByClient).map(([clientName, group]) => (
            <div key={clientName} className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 border-b-2 border-purple-200 pb-3">
                {clientName} ({group.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {group.map((employee) => (
                  <Card
                    key={employee.id}
                    className="cursor-pointer hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-200"
                    onClick={() => router.push(`/dashboard/employees/${employee.id}`)}
                    hover
                  >
                    <CardContent className="p-6">
                      <div className="mb-4">
                        <p className="text-lg font-bold text-gray-900">
                          {employee.first_name} {employee.last_name}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">{employee.email}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Eigenaar: {ownerDisplayName(employee.owner_id)}
                        </p>
                      </div>
                      <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/employees/${employee.id}`)}
                          className="flex-1"
                        >
                          <Eye className="w-4 h-4 mr-2" /> Bekijk
                        </Button>
                        {userRole === 'admin' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedEmployeeId(employee.id);
                            setShowDeleteModal(true);
                          }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                        )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
        </div>
      )}

      <ConfirmDeleteModal
        open={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
