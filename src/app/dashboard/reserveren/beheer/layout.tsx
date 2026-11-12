import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth/roles';
import { getSessionUserWithRole } from '@/lib/help/auth';

export const metadata: Metadata = {
  title: 'Reserveren beheer',
};

export default async function ReserverenBeheerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUserWithRole();
  if (!session || !isAdmin(session.role)) {
    redirect('/dashboard/reserveren');
  }

  return children;
}
