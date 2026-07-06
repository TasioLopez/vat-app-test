import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { requireEmployeeAutofillAccess } from '@/lib/auth/autofill-access';
import { generateSocialeAchtergrond } from "@/lib/tp/sociale-achtergrond";

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
    const access = await requireEmployeeAutofillAccess(req);
    if (access instanceof NextResponse) return access;
    const { employeeId } = access;

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

    let sociale_achtergrond: string;

    try {
      const result = await generateSocialeAchtergrond(openai, supabase, ctx, intakeDocs);
      sociale_achtergrond = result.sociale_achtergrond;
      if (!sociale_achtergrond.trim()) {
        return NextResponse.json(
          {
            error: "Geen sociaal-maatschappelijke informatie gevonden in intakeformulier",
            details: {},
          },
          { status: 200 }
        );
      }
    } catch (error) {
      console.error("❌ Sociale achtergrond generation failed:", error);
      sociale_achtergrond = `[Sociale achtergrond voor ${employee?.first_name || "werknemer"} ${employee?.last_name || ""} - AI generatie mislukt, handmatig invullen vereist]`;
    }

    await supabase.from("tp_meta").upsert(
      { employee_id: employeeId, sociale_achtergrond } as any,
      { onConflict: "employee_id" }
    );

    return NextResponse.json({
      details: { sociale_achtergrond },
      autofilled_fields: ["sociale_achtergrond"],
    });
  } catch (err: any) {
    console.error("❌ sociale-achtergrond route error:", err);
    return NextResponse.json(
      { error: "Server error", details: err?.message },
      { status: 500 }
    );
  }
}
