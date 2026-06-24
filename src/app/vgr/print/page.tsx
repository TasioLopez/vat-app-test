import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import VGRPrintableClient from '@/components/vgr/VGRPrintableClient';

export const dynamic = 'force-dynamic';

type SearchParams = { vgrInstanceId?: string };

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const vgrInstanceId = searchParams.vgrInstanceId;
  if (!vgrInstanceId) throw new Error('vgrInstanceId is required');

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
    .select('id, data_json, layout_key')
    .eq('id', vgrInstanceId)
    .eq('layout_key', 'vgr')
    .single();

  if (error || !instance) throw new Error('VGR instance not found');

  return <VGRPrintableClient data={(instance.data_json || {}) as Record<string, any>} />;
}
