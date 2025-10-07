// src/app/tp/print/page.tsx
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { loadTPData } from "@/lib/tp/load";
import TPPrintableClient from "@/components/tp/TPPrintableClient";

export const dynamic = "force-dynamic";

// Next.js 15 searchParams type
type SearchParams = { employeeId?: string; u?: string };

export default async function Page(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const employeeId = searchParams.employeeId;
  
  if (!employeeId) throw new Error("Employee ID is required");

  // SSR Supabase session (Next 15+: cookies() can be awaited)
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

  // Fallback to ?u=<userId> if SSR auth/user is unavailable
  const preferredConsultantUserId = user?.id ?? searchParams.u ?? undefined;

  const data = await loadTPData(employeeId, { preferredConsultantUserId });

  return <TPPrintableClient employeeId={employeeId} data={data} />;
}
