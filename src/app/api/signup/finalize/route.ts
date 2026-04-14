import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const service = createClient(
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { firstName, lastName } = await req.json();
    const firstNameNorm = String(firstName ?? "").trim();
    const lastNameNorm = String(lastName ?? "").trim();
    const emailNorm = String(user.email ?? "").trim().toLowerCase();

    if (!firstNameNorm || !lastNameNorm || !emailNorm) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const { data: existingRow, error: existingErr } = await service
      .from("users")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (existingErr) {
      return NextResponse.json({ error: existingErr.message }, { status: 500 });
    }

    const metadataRole = user.user_metadata?.role === "admin" ? "admin" : "user";
    const role = existingRow?.role ?? metadataRole;

    if (existingRow?.id === user.id) {
      const { error: updateErr } = await service
        .from("users")
        .update({
          email: emailNorm,
          first_name: firstNameNorm,
          last_name: lastNameNorm,
          role,
          status: "confirmed",
        })
        .eq("id", user.id);

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
    } else {
      const { data: existingByEmailRows, error: byEmailErr } = await service
        .from("users")
        .select("id, role")
        .eq("email", emailNorm);

      if (byEmailErr) {
        return NextResponse.json({ error: byEmailErr.message }, { status: 500 });
      }

      if ((existingByEmailRows ?? []).length > 0) {
        const roleByEmail = existingByEmailRows?.[0]?.role ?? role;
        const { error: updateByEmailErr } = await service
          .from("users")
          .update({
            id: user.id,
            first_name: firstNameNorm,
            last_name: lastNameNorm,
            role: roleByEmail,
            status: "confirmed",
          })
          .eq("email", emailNorm);

        if (updateByEmailErr) {
          return NextResponse.json({ error: updateByEmailErr.message }, { status: 500 });
        }
      } else {
        const { error: insertErr } = await service.from("users").insert({
          id: user.id,
          email: emailNorm,
          first_name: firstNameNorm,
          last_name: lastNameNorm,
          role,
          status: "confirmed",
        });

        if (insertErr) {
          return NextResponse.json({ error: insertErr.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ message: "Signup finalized." });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Unexpected signup finalize error." },
      { status: 500 }
    );
  }
}
