// app/dashboard/layout.tsx
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import ClientLayout from '@/app/dashboard/ClientLayout';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) redirect('/login');

  const { data: userData, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (error) redirect('/login');

  return (
    <ClientLayout role={userData.role}>
      {children}
    </ClientLayout>
  );
}
