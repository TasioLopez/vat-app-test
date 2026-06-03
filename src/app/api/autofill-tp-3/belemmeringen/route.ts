import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { getIntakeContextForTp } from "@/lib/document-analysis";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

function stripCitations(text: string): string {
  if (!text) return text;
  return text
    .replace(/\[\d+:\d+\/[^\]]+\.pdf\]/gi, '')
    .replace(/【[^】]+】/g, '')
    .replace(/\[\d+:\d+[^\]]*\]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    if (!employeeId) return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });

    const INTAKE = await getIntakeContextForTp(
      openai,
      supabase,
      employeeId,
      `Extraheer uit het intakeformulier alle niet-medische praktische knelpunten relevant voor re-integratie (vervoer/rijbewijs, taalniveau, zorgtaken, werktijden/uren, hulpmiddelen, digitale vaardigheden, reistijd, energie/belastbaarheid in dagelijks leven). Geen diagnoses.`
    );

    if (!INTAKE) return NextResponse.json({ error: "Geen intakeformulier gevonden" }, { status: 200 });

    const system = `
Bouw de sectie "Praktische belemmeringen" als korte puntsgewijze opsomming (3–8 punten), AVG-proof.
Neem ALLEEN niet-medische, praktische knelpunten uit de intake op (bijv. vervoer/rijbewijs, taalniveau, zorgtaken, werktijden/uren, hulpmiddelen, digitale vaardigheden, reistijd).
Geen diagnoses, geen aannames. Lever via function-call: { praktische_belemmeringen: string }.
`.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.1,
      messages: [
        { role: "system", content: system },
        { role: "user", content: INTAKE }
      ],
      tools: [{
        type: "function",
        function: {
          name: "build_belemmeringen",
          description: "Opsomming praktische belemmeringen",
          parameters: {
            type: "object",
            properties: { praktische_belemmeringen: { type: "string" } },
            required: ["praktische_belemmeringen"]
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "build_belemmeringen" } }
    });

    const call = completion.choices[0]?.message?.tool_calls?.[0];
    const parsed = JSON.parse(call?.function?.arguments || "{}");
    const praktische_belemmeringen = stripCitations((parsed?.praktische_belemmeringen || "").trim());

    await supabase.from("tp_meta").upsert(
      { employee_id: employeeId, praktische_belemmeringen } as any,
      { onConflict: "employee_id" }
    );

    return NextResponse.json({ details: { praktische_belemmeringen }, autofilled_fields: ["praktische_belemmeringen"] });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("❌ belemmeringen error", e);
    return NextResponse.json({ error: "Server error", details: message }, { status: 500 });
  }
}
