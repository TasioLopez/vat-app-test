import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { isStagingEnv } from '@/lib/auth/staging-only';
import { INTAKE_LAYOUT_KEY } from '@/lib/intake/schema';
import IntakeBuilder from '@/components/intake/IntakeBuilder';

type Params = {
  employeeId: string;
  intakeInstanceId: string;
};

export const dynamic = 'force-dynamic';

export default async function IntakeInstancePage({ params }: { params: Promise<Params> }) {
  if (!isStagingEnv()) notFound();

  const { employeeId, intakeInstanceId } = await params;

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
    .from('intake_instances')
    .select('id, employee_id, layout_key, data_json, validated_at')
    .eq('id', intakeInstanceId)
    .eq('employee_id', employeeId)
    .maybeSingle();

  if (error || !instance || instance.layout_key !== INTAKE_LAYOUT_KEY) {
    notFound();
  }

  return (
    <IntakeBuilder
      employeeId={employeeId}
      intakeInstanceId={intakeInstanceId}
      initialData={instance.data_json || {}}
      initialValidatedAt={instance.validated_at ?? null}
    />
  );
}
