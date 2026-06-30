import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { resolveReferentForEmployee } from "@/lib/referents";
import { generateInleiding } from "@/lib/tp/inleiding";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    if (!employeeId) {
      return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });
    }

    const { data: employee } = await supabase
      .from("employees")
      .select("first_name, last_name, client_id, referent_id")
      .eq("id", employeeId)
      .single();

    const { data: details } = await supabase
      .from("employee_details")
      .select("current_job, gender, contract_hours, date_of_birth")
      .eq("employee_id", employeeId)
      .single();

    const { data: meta } = await supabase
      .from("tp_meta")
      .select("*, intake_date")
      .eq("employee_id", employeeId)
      .single();

    const { data: client } = await supabase
      .from("clients")
      .select("name")
      .eq("id", employee?.client_id)
      .single();

    const referent = await resolveReferentForEmployee(supabase, {
      referent_id: employee?.referent_id,
      client_id: employee?.client_id,
    });

    const { data: docs } = await supabase
      .from("documents")
      .select("type, url, uploaded_at")
      .eq("employee_id", employeeId)
      .order("uploaded_at", { ascending: false });

    if (!docs?.length) {
      return NextResponse.json({ error: "Geen documenten gevonden" }, { status: 200 });
    }

    const ctx = {
      employee: employee ?? {},
      details: details ?? {},
      meta: meta ?? {},
      client: client ?? {},
      referent,
    };

    let inleiding: string;
    let inleiding_sub: string;

    try {
      const result = await generateInleiding(openai, supabase, ctx, docs);
      inleiding = result.inleiding;
      inleiding_sub = result.inleiding_sub;
    } catch (error) {
      console.error("❌ Inleiding generation failed:", error);
      inleiding = `[Inleiding voor ${employee?.first_name || "werknemer"} ${employee?.last_name || ""} - AI generatie mislukt, handmatig invullen vereist]`;
      inleiding_sub = "";
    }

    await supabase.from("tp_meta").upsert(
      {
        employee_id: employeeId,
        inleiding,
        inleiding_sub,
      } as any,
      { onConflict: "employee_id" }
    );

    return NextResponse.json({
      details: { inleiding, inleiding_sub },
      autofilled_fields: ["inleiding", "inleiding_sub"],
    });
  } catch (err: any) {
    console.error("❌ Autofill inleiding error:", err);
    return NextResponse.json(
      { error: "Server error", details: err?.message },
      { status: 500 }
    );
  }
}
