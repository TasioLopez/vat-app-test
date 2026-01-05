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

export type Employee = Database['public']['Tables']['employees']['Row'] & {
  clients?: Database['public']['Tables']['clients']['Row'];
};
type User = Database['public']['Tables']['users']['Row'];

type SortField = 'name' | 'email' | 'client' | 'created_at';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'table' | 'cards';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const { showSuccess, showError } = useToastHelpers();
  const router = useRouter();

  useEffect(() => {
    fetchEmployees();
    fetchClients();
  }, []);

  const fetchEmployees = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = userData?.role || 'user';
    setUserRole(role);

    if (role === 'admin') {
      const { data, error } = await supabase
        .from('employees')
        .select('*, clients(name)')
        .order('created_at', { ascending: false });

      if (!error && data) setEmployees(data as Employee[]);
    } else {
      const { data, error } = await supabase
        .from('employee_users')
        .select('employee_id, employees(*, clients(name))')
        .eq('user_id', user.id);

      if (!error && data) {
        const associated = data.map((row) => row.employees).filter(Boolean) as Employee[];
        setEmployees(associated);
      }
    }
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
      // Search filter
      const matchesSearch = searchQuery === '' || 
        `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.clients?.name?.toLowerCase().includes(searchQuery.toLowerCase());

      // Client filter
      const matchesClient = selectedClient === 'all' || emp.client_id === selectedClient;

      return matchesSearch && matchesClient;
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
  }, [employees, searchQuery, selectedClient, sortField, sortDirection]);

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
          {userRole === 'admin' && clients.length > 0 && (
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="flex h-10 w-full sm:w-48 rounded-lg border-2 border-purple-200 bg-white px-10 py-2 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:border-purple-500 hover:border-purple-300"
              >
                <option value="all">Alle werkgevers</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
          )}
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
            {searchQuery || selectedClient !== 'all' 
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
              {userRole === 'admin' && (
                <TableHead 
                  className="cursor-pointer hover:bg-purple-100/50"
                  onClick={() => handleSort('client')}
                >
                  Werkgever <SortIcon field="client" />
                </TableHead>
              )}
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
                {userRole === 'admin' && (
                  <TableCell>{employee.clients?.name || '—'}</TableCell>
                )}
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
