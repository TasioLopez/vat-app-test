'use client';

import { useParams } from 'next/navigation';
import LegacyTPBuilder from '@/components/tp/LegacyTPBuilder';

export default function TPBuilderPage() {
  const { employeeId } = useParams() as { employeeId: string };
  return <LegacyTPBuilder employeeId={employeeId} />;
}
