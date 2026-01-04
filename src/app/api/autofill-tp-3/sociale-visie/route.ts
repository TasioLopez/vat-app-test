import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import type { ChatCompletionMessageParam } from "openai/resources";

// ---- INIT ----
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

// ---- helpers ----
function extractStoragePath(url: string): string | null {
  const m = url.match(/\/object\/(?:public|sign)\/documents\/(.+)$/);
  if (m?.[1]) return m[1];
  if (url?.startsWith("documents/")) return url.slice("documents/".length);
  if (url && !url.includes("://") && !url.includes("object/")) return url;
  return null;
}

// Simple PDF text extraction that works 100% in Vercel
async function readPdfFromStorage(path: string): Promise<string> {
  const { data: file } = await supabase.storage.from("documents").download(path);
  if (!file) return "";
  const buf = Buffer.from(await file.arrayBuffer());
  
  try {
    // Convert buffer to string and extract readable text
    const bufferString = buf.toString('utf8');
    
    // Look for specific patterns from intake documents
    const patterns = [
      /sociale[^:]*achtergrond[^:]*:\s*([^\n\r]+)/i,
      /visie[^:]*werknemer[^:]*:\s*([^\n\r]+)/i,
      /thuissituatie[^:]*:\s*([^\n\r]+)/i,
      /ondersteuning[^:]*:\s*([^\n\r]+)/i,
      /motivatie[^:]*:\s*([^\n\r]+)/i,
      /houding[^:]*:\s*([^\n\r]+)/i,
      /belemmeringen[^:]*:\s*([^\n\r]+)/i,
      /bereidheid[^:]*:\s*([^\n\r]+)/i,
      /intake[^:]*:\s*([^\n\r]+)/i,
      /opleiding[^:]*:\s*([^\n\r]+)/i,
      /werkervaring[^:]*:\s*([^\n\r]+)/i
    ];
    
    const extractedInfo: string[] = [];
    
    for (const pattern of patterns) {
      const match = bufferString.match(pattern);
      if (match) {
        extractedInfo.push(`${pattern.source}: ${match[1]}`);
      }
    }
    
    if (extractedInfo.length > 0) {
      const text = extractedInfo.join('\n');
      console.log('📄 TP Sociale Visie PDF extraction successful, found patterns:', extractedInfo.length);
      return text;
    }
    
    // Fallback: extract any readable text
    const readableText = bufferString.match(/[A-Za-z0-9\s\-\.\,\:\;\(\)]{10,}/g);
    if (readableText && readableText.length > 0) {
      const text = readableText.join(' ');
      console.log('📄 TP Sociale Visie PDF extraction successful, extracted readable text');
      return text;
    }
    
    return "";
  } catch (error: any) {
    console.error('TP Sociale Visie PDF extraction failed:', error.message);
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
      .select("education_level, work_experience, dutch_speaking, dutch_writing, dutch_reading, transport_type, contract_hours")
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

    const sociale_achtergrond = stripCitations((parsed?.sociale_achtergrond || "").trim());
    const visie_werknemer = stripCitations((parsed?.visie_werknemer || "").trim());

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
