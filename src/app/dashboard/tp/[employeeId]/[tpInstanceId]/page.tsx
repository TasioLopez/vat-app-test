import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import LegacyTPBuilder from '@/components/tp/LegacyTPBuilder';
import TP2026Builder from '@/components/tp2026/TP2026Builder';
import { isTPLayoutKey } from '@/lib/tp/layout';

type Params = {
  employeeId: string;
  tpInstanceId: string;
};

export const dynamic = 'force-dynamic';

export default async function TPInstanceBuilderPage({ params }: { params: Promise<Params> }) {
  const { employeeId, tpInstanceId } = await params;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key) => cookieStore.get(key)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  );

  const { data: instance, error } = await (supabase as any)
    .from('tp_instances')
    .select('id, employee_id, layout_key, data_json')
    .eq('id', tpInstanceId)
    .eq('employee_id', employeeId)
    .maybeSingle();

  if (error || !instance || !isTPLayoutKey(instance.layout_key)) {
    notFound();
  }

  if (instance.layout_key === 'tp_legacy') {
    return <LegacyTPBuilder employeeId={employeeId} />;
  }

  if (instance.layout_key !== 'tp_2026') {
    redirect(`/dashboard/tp/${employeeId}`);
  }

  return (
    <TP2026Builder
      employeeId={employeeId}
      tpInstanceId={tpInstanceId}
      initialData={(instance.data_json || {}) as Record<string, any>}
    />
  );
}
