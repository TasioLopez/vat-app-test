// src/app/tp/print/page.tsx
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { loadTPData } from "@/lib/tp/load";
import TPPrintableClient from "@/components/tp/TPPrintableClient";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: { employeeId?: string } }) {
  const employeeId = searchParams?.employeeId;
  if (!employeeId) throw new Error("Employee ID is required");

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

  const { data: { user } } = await supabase.auth.getUser();

  const data = await loadTPData(employeeId, {
    preferredConsultantUserId: user?.id,
  });

  return <TPPrintableClient employeeId={employeeId} data={data} />;
}
