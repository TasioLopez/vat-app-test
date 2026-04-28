import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import TP2026Printable from '@/components/tp2026/TP2026Printable';

export const dynamic = 'force-dynamic';

type SearchParams = { tpInstanceId?: string };

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const tpInstanceId = searchParams.tpInstanceId;
  if (!tpInstanceId) throw new Error('tpInstanceId is required');

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
    .select('id, data_json, layout_key')
    .eq('id', tpInstanceId)
    .eq('layout_key', 'tp_2026')
    .single();

  if (error || !instance) throw new Error('TP 2026 instance not found');

  return <TP2026Printable data={(instance.data_json || {}) as Record<string, any>} />;
}
