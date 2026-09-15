import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { isStagingEnv } from '@/lib/auth/staging-only';
import { INTAKE_LAYOUT_KEY, createEmptyIntakeData } from '@/lib/intake/schema';

type Params = { employeeId: string };

export const dynamic = 'force-dynamic';

export default async function IntakeEntryPage({ params }: { params: Promise<Params> }) {
  if (!isStagingEnv()) notFound();

  const { employeeId } = await params;

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await (supabase as any)
    .from('intake_instances')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('layout_key', INTAKE_LAYOUT_KEY)
    .eq('status', 'draft')
    .maybeSingle();

  let intakeInstanceId = existing?.id as string | undefined;

  if (!intakeInstanceId) {
    const { data: inserted, error } = await (supabase as any)
      .from('intake_instances')
      .insert({
        employee_id: employeeId,
        layout_key: INTAKE_LAYOUT_KEY,
        title: 'Intakeformulier',
        status: 'draft',
        data_json: createEmptyIntakeData(),
        created_by: user?.id ?? null,
        updated_by: user?.id ?? null,
      })
      .select('id')
      .single();

    if (error || !inserted?.id) {
      throw new Error('Could not create intake draft');
    }
    intakeInstanceId = inserted.id;
  }

  redirect(`/dashboard/intake/${employeeId}/${intakeInstanceId}`);
}
