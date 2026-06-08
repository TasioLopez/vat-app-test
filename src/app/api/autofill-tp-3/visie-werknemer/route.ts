import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { generateVisieWerknemer } from "@/lib/tp/visie-werknemer";

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
      .select("gender")
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

    let visie_werknemer: string;

    try {
      const result = await generateVisieWerknemer(openai, supabase, ctx, intakeDocs);
      visie_werknemer = result.visie_werknemer;
      if (!visie_werknemer.trim()) {
        return NextResponse.json(
          { error: "Geen visie-informatie gevonden in intakeformulier", details: {} },
          { status: 200 }
        );
      }
    } catch (error) {
      console.error("❌ Visie werknemer generation failed:", error);
      visie_werknemer = `[Visie van werknemer voor ${employee?.first_name || "werknemer"} ${employee?.last_name || ""} - AI generatie mislukt, handmatig invullen vereist]`;
    }

    await supabase.from("tp_meta").upsert(
      { employee_id: employeeId, visie_werknemer } as any,
      { onConflict: "employee_id" }
    );

    return NextResponse.json({
      details: { visie_werknemer },
      autofilled_fields: ["visie_werknemer"],
    });
  } catch (err: any) {
    console.error("❌ visie-werknemer route error:", err);
    return NextResponse.json(
      { error: "Server error", details: err?.message },
      { status: 500 }
    );
  }
}
