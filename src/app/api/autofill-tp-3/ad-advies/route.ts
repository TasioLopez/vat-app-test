import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { getEmployeeDocumentContext } from "@/lib/document-analysis";

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

    const AD = await getEmployeeDocumentContext(
      openai,
      supabase,
      employeeId,
      ["ad_rapport", "ad-rapport", "adrapport", "ad_rapportage", "ad-rapportage", "arbeidsdeskund"],
      `Extraheer uit dit arbeidsdeskundig rapport het volledige advies over passende arbeid, conclusies en aanbevelingen (sectie 7 of vergelijkbaar). Geen medische diagnoses.`
    );

    if (!AD) return NextResponse.json({ error: "Geen AD-rapport gevonden" }, { status: 200 });

    const system = `
Extraheer het advies over 'passende arbeid' uit het Arbeidsdeskundig rapport.
Output 1 compacte alinea (of 3–6 bullets) met de essentie van het advies, zonder medische details.
Lever via function-call: { advies_ad_passende_arbeid: string }.
`.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.1,
      messages: [
        { role: "system", content: system },
        { role: "user", content: AD }
      ],
      tools: [{
        type: "function",
        function: {
          name: "build_ad_advies",
          description: "Samenvatting/quote van AD-advies passende arbeid",
          parameters: {
            type: "object",
            properties: { advies_ad_passende_arbeid: { type: "string" } },
            required: ["advies_ad_passende_arbeid"]
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "build_ad_advies" } }
    });

    const call = completion.choices[0]?.message?.tool_calls?.[0];
    const parsed = JSON.parse(call?.function?.arguments || "{}");
    const advies_ad_passende_arbeid = stripCitations((parsed?.advies_ad_passende_arbeid || "").trim());

    await supabase.from("tp_meta").upsert(
      { employee_id: employeeId, advies_ad_passende_arbeid } as any,
      { onConflict: "employee_id" }
    );

    return NextResponse.json({
      details: { advies_ad_passende_arbeid },
      autofilled_fields: ["advies_ad_passende_arbeid"]
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("❌ ad-advies error", e);
    return NextResponse.json({ error: "Server error", details: message }, { status: 500 });
  }
}
