import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import BookingCalendar from '@/components/booking/BookingCalendar';
import { getSessionUserWithRole } from '@/lib/help/auth';

export const metadata: Metadata = {
  title: 'Reserveren',
};

export default async function ReserverenPage() {
  const session = await getSessionUserWithRole();
  if (!session) redirect('/login');

  return <BookingCalendar role={session.role} userId={session.userId} />;
}
