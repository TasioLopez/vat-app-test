import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { generatePersoonlijkProfiel } from "@/lib/tp/persoonlijk-profiel";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

function isIntakeDoc(type: string | null | undefined): boolean {
  const t = (type || "").toLowerCase();
  return t.includes("intakeformulier") || t.includes("intake-formulier") || t.includes("intake");
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    if (!employeeId) {
      return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });
    }

    const { data: employee } = await supabase
      .from("employees")
      .select("first_name, last_name")
      .eq("id", employeeId)
      .single();

    const { data: details } = await supabase
      .from("employee_details")
      .select("gender, date_of_birth")
      .eq("employee_id", employeeId)
      .single();

    const { data: docs } = await supabase
      .from("documents")
      .select("type, url, uploaded_at")
      .eq("employee_id", employeeId)
      .order("uploaded_at", { ascending: false });

    const intakeDocs = (docs || []).filter((d) => isIntakeDoc(d.type));
    if (intakeDocs.length === 0) {
      return NextResponse.json(
        { error: "Geen intakeformulier gevonden", details: {} },
        { status: 200 }
      );
    }

    const ctx = {
      employee: employee ?? {},
      details: details ?? {},
    };

    let persoonlijk_profiel: string;

    try {
      const result = await generatePersoonlijkProfiel(openai, supabase, ctx, intakeDocs);
      persoonlijk_profiel = result.persoonlijk_profiel;
      if (!persoonlijk_profiel.trim()) {
        return NextResponse.json(
          { error: "Geen profielinformatie gevonden in intakeformulier", details: {} },
          { status: 200 }
        );
      }
    } catch (error) {
      console.error("❌ Persoonlijk profiel generation failed:", error);
      persoonlijk_profiel = `[Persoonlijk profiel voor ${employee?.first_name || "werknemer"} ${employee?.last_name || ""} - AI generatie mislukt, handmatig invullen vereist]`;
    }

    await supabase.from("tp_meta").upsert(
      { employee_id: employeeId, persoonlijk_profiel } as any,
      { onConflict: "employee_id" }
    );

    return NextResponse.json({
      details: { persoonlijk_profiel },
      autofilled_fields: ["persoonlijk_profiel"],
    });
  } catch (err: any) {
    console.error("❌ persoonlijk-profiel route error:", err);
    return NextResponse.json(
      { error: "Server error", details: err?.message },
      { status: 500 }
    );
  }
}
