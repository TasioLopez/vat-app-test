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
  
  // Remove all citation patterns:
  let cleaned = text
    // Remove [4:16/filename.pdf] style
    .replace(/\[\d+:\d+\/[^\]]+\.pdf\]/gi, '')
    // Remove 【4:13†source】 style (OpenAI file search annotations)
    .replace(/【[^】]+】/g, '')
    // Remove any other bracket annotations with numbers
    .replace(/\[\d+:\d+[^\]]*\]/g, '')
    // Clean up multiple spaces
    .replace(/\s{2,}/g, ' ')
    .trim();
    
  // Don't modify newlines - let the original formatting from AI remain
  return cleaned;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    if (!employeeId) return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });

    const { data: meta } = await supabase
      .from("tp_meta")
      .select("zoekprofiel, praktische_belemmeringen, prognose_bedrijfsarts, persoonlijk_profiel")
      .eq("employee_id", employeeId)
      .single();

    const zoekprofiel = meta?.zoekprofiel || "";
    if (!zoekprofiel) {
      return NextResponse.json({ error: "Geen zoekprofiel beschikbaar; genereer eerst het zoekprofiel." }, { status: 200 });
    }

    const system = `
Bouw de sectie "Visie op plaatsbaarheid" op basis van het zoekprofiel.
- Geef 3–5 concrete functierichtingen/titels met 1 zin motivatie per item, afgestemd op belastbaarheid en praktische randvoorwaarden indien beschikbaar.
- Toon als bullets (•) of korte alinea met opsomming.
- Geen vacatures of loze claims; neutraal/realistisch, AVG-proof.
Lever via function-call: { visie_plaatsbaarheid: string }.
`.trim();

    const user = `
ZOEKPROFIEL:
${zoekprofiel}

(Optionele context)
PRAKTISCHE BELEMMERINGEN: ${meta?.praktische_belemmeringen || "-"}
PROGNOSE BA: ${meta?.prognose_bedrijfsarts || "-"}
PERSOONLIJK PROFIEL: ${meta?.persoonlijk_profiel || "-"}
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
          name: "build_plaatsbaarheid",
          description: "Maak 3–5 functies met onderbouwing",
          parameters: {
            type: "object",
            properties: { visie_plaatsbaarheid: { type: "string" } },
            required: ["visie_plaatsbaarheid"]
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "build_plaatsbaarheid" } }
    });

    const call = completion.choices[0]?.message?.tool_calls?.[0];
    const parsed = JSON.parse(call?.function?.arguments || "{}");
    const visie_plaatsbaarheid = stripCitations((parsed?.visie_plaatsbaarheid || "").trim());

    await supabase.from("tp_meta").upsert(
      { employee_id: employeeId, visie_plaatsbaarheid } as any,
      { onConflict: "employee_id" }
    );

    return NextResponse.json({ details: { visie_plaatsbaarheid }, autofilled_fields: ["visie_plaatsbaarheid"] });
  } catch (e: any) {
    console.error("❌ plaatsbaarheid error", e);
    return NextResponse.json({ error: "Server error", details: e?.message }, { status: 500 });
  }
}
