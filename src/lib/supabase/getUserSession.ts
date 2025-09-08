// lib/supabase/getUserSession.ts
import { getSupabaseServerClient } from "./server";

export async function getUserSession() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session;
}
