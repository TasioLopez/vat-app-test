import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ---- Citation Stripping ----
function stripCitations(text: string): string {
  if (!text) return text;
  // Remove patterns like [4:16/ad_rapportage.pdf] or [page:line/filename.pdf]
  return text
    .replace(/\[\d+:\d+\/[^\]]+\.pdf\]/gi, '')
    .replace(/\s{2,}/g, ' ') // Clean up double spaces
    .trim();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    if (!employeeId) return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });

    // pull some context (no medical)
    const { data: details } = await supabase
      .from("employee_details")
      .select("current_job,work_experience,education_level,computer_skills,drivers_license,has_transport,contract_hours")
      .eq("employee_id", employeeId)
      .single();

    const { data: meta } = await supabase
      .from("tp_meta")
      .select("sociale_achtergrond,visie_werknemer,prognose_bedrijfsarts")
      .eq("employee_id", employeeId)
      .single();

    const system = `
Schrijf twee secties in de stijl/lengte van de voorbeeld-TP's (neutraal, AVG-proof):

1) persoonlijk_profiel — 1 alinea: kernkwaliteiten, vaardigheden/ervaring, werkhouding, randvoorwaarden (uren, vervoer/rijbewijs, digitale vaardigheden), afgestemd op re-integratiekader.
2) zoekprofiel — 1 alinea + korte puntsgewijze aanduiding (max 5) van passende richtingen/functiegebieden. Geen concrete vacatures.

Gebruik uitsluitend de beschikbare context; geen diagnoses. Lever via function-call:
{ persoonlijk_profiel: string, zoekprofiel: string }.
`.trim();

    const user = `
BESCHIKBARE CONTEXT (kan leeg zijn):
details: ${JSON.stringify(details || {})}
meta: ${JSON.stringify(meta || {})}
`.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      tools: [{
        type: "function",
        function: {
          name: "build_profiel_zoekprofiel",
          description: "Bouw profiel en zoekprofiel",
          parameters: {
            type: "object",
            properties: {
              persoonlijk_profiel: { type: "string" },
              zoekprofiel: { type: "string" }
            },
            required: ["persoonlijk_profiel", "zoekprofiel"]
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "build_profiel_zoekprofiel" } }
    });

    const call = completion.choices[0]?.message?.tool_calls?.[0];
    const parsed = JSON.parse(call?.function?.arguments || "{}");

    const persoonlijk_profiel = stripCitations((parsed?.persoonlijk_profiel || "").trim());
    const zoekprofiel = stripCitations((parsed?.zoekprofiel || "").trim());

    await supabase.from("tp_meta").upsert(
      { employee_id: employeeId, persoonlijk_profiel, zoekprofiel } as any,
      { onConflict: "employee_id" }
    );

    return NextResponse.json({ details: { persoonlijk_profiel, zoekprofiel }, autofilled_fields: ["persoonlijk_profiel", "zoekprofiel"] });
  } catch (e: any) {
    console.error("❌ profiel-zoekprofiel error", e);
    return NextResponse.json({ error: "Server error", details: e?.message }, { status: 500 });
  }
}
