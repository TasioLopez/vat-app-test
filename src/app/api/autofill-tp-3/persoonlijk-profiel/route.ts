import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { serviceRoleSupabase as supabase } from '@/lib/supabase/service-role';
import { loadWorkerFacts } from '@/lib/employee/save-worker-facts';
import { getValidatedIntakeForEmployee } from '@/lib/intake/tp-hydrate';
import { intakeTextForPersoonlijkProfiel } from '@/lib/intake/tp-source';
import { requireEmployeeAutofillAccess } from '@/lib/auth/autofill-access';
import { generatePersoonlijkProfiel } from "@/lib/tp/persoonlijk-profiel";

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
      .select(
        "gender, date_of_birth, drivers_license_type, transport_type, dutch_speaking, dutch_writing, dutch_reading, computer_skills, computer_skills_description, has_computer"
      )
      .eq("employee_id", employeeId)
      .single();

    const { data: docs } = await supabase
      .from("documents")
      .select("type, url, uploaded_at")
      .eq("employee_id", employeeId)
      .order("uploaded_at", { ascending: false });

    const intakeDocs = (docs || []).filter((d) => isIntakeDoc(d.type));
    const validated = await getValidatedIntakeForEmployee(supabase, employeeId);
    const intake = validated?.data ?? null;
    const intakeText = intake ? intakeTextForPersoonlijkProfiel(intake) : '';
    const loadedFacts = await loadWorkerFacts(supabase, employeeId);
    const workerFacts = {
      ...(details ?? {}),
      ...(loadedFacts.snapshot?.values ?? {}),
    };
    if (intakeDocs.length === 0 && !intakeText) {
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
      const result = await generatePersoonlijkProfiel(
        openai,
        supabase,
        ctx,
        intakeDocs,
        intake,
        workerFacts
      );
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
