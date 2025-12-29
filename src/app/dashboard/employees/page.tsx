'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Eye } from 'lucide-react';
import { useToastHelpers } from '@/components/ui/Toast';
import ConfirmDeleteModal from '@/components/shared/ConfirmDeleteModal';

export type Employee = Database['public']['Tables']['employees']['Row'] & {
  clients?: Database['public']['Tables']['clients']['Row'];
};
type User = Database['public']['Tables']['users']['Row'];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { showSuccess, showError } = useToastHelpers();
  const router = useRouter();

  useEffect(() => {
    fetchEmployees();
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

  const handleDelete = async () => {
    if (!selectedEmployeeId) return;
    
    try {
      // Delete related records in the correct order (child tables first)
      const deletePromises = [
        supabase.from('tp_docs').delete().eq('employee_id', selectedEmployeeId),
        supabase.from('documents').delete().eq('employee_id', selectedEmployeeId),
        supabase.from('tp_meta').delete().eq('employee_id', selectedEmployeeId),
        supabase.from('employee_details').delete().eq('employee_id', selectedEmployeeId),
        supabase.from('employee_users').delete().eq('employee_id', selectedEmployeeId)
      ];
      
      // Execute all deletions in parallel
      const results = await Promise.allSettled(deletePromises);
      
      // Check for any errors (but continue even if some fail)
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Error deleting from table ${index}:`, result.reason);
        } else if (result.value.error) {
          console.error(`Error deleting from table ${index}:`, result.value.error);
        }
      });
      
      // Finally delete the employee
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

  const groupedByClient = employees.reduce<Record<string, Employee[]>>((acc, emp) => {
    const clientName = emp.clients?.name || 'Unassigned';
    if (!acc[clientName]) acc[clientName] = [];
    acc[clientName].push(emp);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Werknemers</h1>
          <p className="text-muted-foreground mt-2">Beheer werknemers en hun gegevens</p>
        </div>
        <Link href="/dashboard/employees/new">
          <Button>+ Werknemer toevoegen</Button>
        </Link>
      </div>

      {employees.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Geen werknemers om te tonen.</p>
          </div>
        ) : Object.entries(groupedByClient).map(([clientName, group]) => (
        <div key={clientName} className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2">{clientName}</h2>
          <div className="grid gap-4">
            {group.map((employee) => (
              <Card
                key={employee.id}
                className="cursor-pointer hover:shadow-md transition-all duration-200"
                onClick={() => router.push(`/dashboard/employees/${employee.id}`)}
              >
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-card-foreground">
                      {employee.first_name} {employee.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{employee.email}</p>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/dashboard/employees/${employee.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-1" /> Bekijk
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

      <ConfirmDeleteModal
        open={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
