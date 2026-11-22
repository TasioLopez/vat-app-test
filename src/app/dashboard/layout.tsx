import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import ClientLayout from '@/app/dashboard/ClientLayout';
import { hasVerifiedTotp, isMfaOptionalEmail, needsMfaChallenge } from '@/lib/auth/mfa';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: userData, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error) redirect('/login');

  const skipMfa = isMfaOptionalEmail(user.email);
  if (!skipMfa && !(await hasVerifiedTotp(supabase))) {
    redirect('/mfa/setup');
  }
  if (!skipMfa && (await needsMfaChallenge(supabase))) {
    redirect('/login?reason=session_expired');
  }

  return <ClientLayout role={userData.role}>{children}</ClientLayout>;
}
