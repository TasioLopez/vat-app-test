import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import VGRBuilder from '@/components/vgr/VGRBuilder';
import { isVGRLayoutKey } from '@/lib/vgr/layout';

type Params = {
  employeeId: string;
  vgrInstanceId: string;
};

export const dynamic = 'force-dynamic';

export default async function VGRInstanceBuilderPage({ params }: { params: Promise<Params> }) {
  const { employeeId, vgrInstanceId } = await params;

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
    .from('vgr_instances')
    .select('id, employee_id, layout_key, data_json')
    .eq('id', vgrInstanceId)
    .eq('employee_id', employeeId)
    .maybeSingle();

  if (error || !instance || !isVGRLayoutKey(instance.layout_key)) {
    notFound();
  }

  return (
    <VGRBuilder
      employeeId={employeeId}
      vgrInstanceId={vgrInstanceId}
      initialData={(instance.data_json || {}) as Record<string, any>}
    />
  );
}
