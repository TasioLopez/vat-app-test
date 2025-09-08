import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import pdf from "pdf-parse";
import type { ChatCompletionMessageParam } from "openai/resources";

// ---- INIT ----
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ---- helpers ----
function extractStoragePath(url: string): string | null {
  const m = url.match(/\/object\/(?:public|sign)\/documents\/(.+)$/);
  if (m?.[1]) return m[1];
  if (url?.startsWith("documents/")) return url.slice("documents/".length);
  if (url && !url.includes("://") && !url.includes("object/")) return url;
  return null;
}

async function readPdfFromStorage(path: string): Promise<string> {
  const { data: file } = await supabase.storage.from("documents").download(path);
  if (!file) return "";
  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const parsed = await pdf(buf);
    return (parsed.text || "").trim();
  } catch {
    return "";
  }
}

async function getIntakeText(employeeId: string) {
  const { data: docs } = await supabase
    .from("documents")
    .select("type,url,uploaded_at")
    .eq("employee_id", employeeId)
    .order("uploaded_at", { ascending: false });

  if (!docs?.length) return "";

  // Tolerant to naming variants
  const candidates = ["intakeformulier", "intake-formulier", "intake"];
  for (const c of candidates) {
    const hit = docs.find(d => (d.type || "").toLowerCase().includes(c));
    if (!hit?.url) continue;
    const path = extractStoragePath(hit.url);
    if (!path) continue;
    const text = await readPdfFromStorage(path);
    if (text && text.length > 50) return text;
  }
  return "";
}

// ---- ROUTE ----
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    if (!employeeId) return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });

    const INTAKE = await getIntakeText(employeeId);
    if (!INTAKE) {
      return NextResponse.json({ error: "Geen intakeformulier gevonden of niet leesbaar" }, { status: 200 });
    }

    // (Optional) bring in some small context from profile for tone/anchoring
    const { data: details } = await supabase
      .from("employee_details")
      .select("education_level, work_experience, dutch_speaking, dutch_writing, dutch_reading, has_transport, contract_hours")
      .eq("employee_id", employeeId)
      .single();

    const systemPrompt = `
Je bent een NL re-integratie-rapportage assistent.
Schrijf twee secties op basis van het INTAKEFORMULIER, in dezelfde stijl/structuur en lengte als de voorbeeld-TP's:

1) "sociale_achtergrond": 1–3 korte alinea's. Context werknemer: werk-/opleidingsachtergrond, thuissituatie/ondersteuning indien relevant, taal/rijbewijs/vervoer/uren-indicatie wanneer expliciet uit intake blijkt. Geen medische details of diagnoses. Zakelijk/AVG-proof.
2) "visie_werknemer": 1–2 korte alinea's. Samenvatting van houding/motivatie/wensen, belemmeringen in eigen woorden, bereidheid tot 2e spoor (onderzoeken, scholing, trajectdoel). Zakelijk/AVG-proof.

Geen hallucinaties: neem alleen op wat expliciet of logisch uit de intake volgt. Als specifieke info ontbreekt, laat het weg (niet invullen met aannames).
Lever UITSLUITEND een function call met JSON: { sociale_achtergrond: string, visie_werknemer: string }.
`.trim();

    const userPrompt = `
CONTEXT (kan summier zijn; gebruik primair de intake-tekst):
- details (optioneel): ${JSON.stringify(details || {}, null, 2)}

INTAKEFORMULIER (bron):
${INTAKE.slice(0, 22000)}
`.trim();

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const tool = {
      type: "function" as const,
      function: {
        name: "build_sociale_en_visie",
        description: "Bouw sociale_achtergrond en visie_werknemer (strings).",
        parameters: {
          type: "object",
          properties: {
            sociale_achtergrond: { type: "string" },
            visie_werknemer: { type: "string" },
          },
          required: ["sociale_achtergrond", "visie_werknemer"],
        },
      },
    };

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.1,
      messages,
      tools: [tool],
      tool_choice: { type: "function", function: { name: "build_sociale_en_visie" } },
    });

    const call = completion.choices[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments;
    if (!args) return NextResponse.json({ error: "Geen tekst gegenereerd" }, { status: 200 });

    let parsed: { sociale_achtergrond?: string; visie_werknemer?: string } | null = null;
    try { parsed = JSON.parse(args); } catch { parsed = null; }

    const sociale_achtergrond = (parsed?.sociale_achtergrond || "").trim();
    const visie_werknemer = (parsed?.visie_werknemer || "").trim();

    // Persist conveniently in tp_meta (optional)
    await supabase.from("tp_meta").upsert(
      {
        employee_id: employeeId,
        sociale_achtergrond,
        visie_werknemer,
      } as any,
      { onConflict: "employee_id" }
    );

    return NextResponse.json({
      details: { sociale_achtergrond, visie_werknemer },
      autofilled_fields: ["sociale_achtergrond", "visie_werknemer"],
    });
  } catch (err: any) {
    console.error("❌ sociale-visie route error:", err);
    return NextResponse.json({ error: "Server error", details: err?.message }, { status: 500 });
  }
}
