// lib/supabase/getUserSession.ts
import { getSupabaseServerClient } from "./server";

export async function getUserSession() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  return { user };
}
