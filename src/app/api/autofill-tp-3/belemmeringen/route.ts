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

function extractStoragePath(url: string): string | null {
  const m = url.match(/\/object\/(?:public|sign)\/documents\/(.+)$/);
  if (m?.[1]) return m[1];
  if (url?.startsWith("documents/")) return url.slice("documents/".length);
  if (url && !url.includes("://") && !url.includes("object/")) return url;
  return null;
}
// Simple PDF text extraction that works 100% in Vercel
async function readPdfFromStorage(path: string) {
  const { data: file } = await supabase.storage.from("documents").download(path);
  if (!file) return "";
  const buf = Buffer.from(await file.arrayBuffer());
  
  try {
    // Convert buffer to string and extract readable text
    const bufferString = buf.toString('utf8');
    
    // Look for specific patterns from intake documents
    const patterns = [
      /belemmeringen[^:]*:\s*([^\n\r]+)/i,
      /knelpunten[^:]*:\s*([^\n\r]+)/i,
      /vervoer[^:]*:\s*([^\n\r]+)/i,
      /rijbewijs[^:]*:\s*([^\n\r]+)/i,
      /taal[^:]*:\s*([^\n\r]+)/i,
      /zorgtaken[^:]*:\s*([^\n\r]+)/i,
      /werktijden[^:]*:\s*([^\n\r]+)/i,
      /uren[^:]*:\s*([^\n\r]+)/i,
      /hulpmiddelen[^:]*:\s*([^\n\r]+)/i,
      /digitaal[^:]*:\s*([^\n\r]+)/i,
      /reistijd[^:]*:\s*([^\n\r]+)/i,
      /intake[^:]*:\s*([^\n\r]+)/i
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
      console.log('📄 TP Belemmeringen PDF extraction successful, found patterns:', extractedInfo.length);
      return text;
    }
    
    // Fallback: extract any readable text
    const readableText = bufferString.match(/[A-Za-z0-9\s\-\.\,\:\;\(\)]{10,}/g);
    if (readableText && readableText.length > 0) {
      const text = readableText.join(' ');
      console.log('📄 TP Belemmeringen PDF extraction successful, extracted readable text');
      return text;
    }
    
    return "";
  } catch (error: any) {
    console.error('TP Belemmeringen PDF extraction failed:', error.message);
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
  const variants = ["intakeformulier","intake-formulier","intake"];
  for (const v of variants) {
    const hit = docs.find(d => (d.type || "").toLowerCase().includes(v));
    if (!hit?.url) continue;
    const path = extractStoragePath(hit.url);
    if (!path) continue;
    const t = await readPdfFromStorage(path);
    if (t && t.length > 50) return t;
  }
  return "";
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    if (!employeeId) return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });

    const INTAKE = await getIntakeText(employeeId);
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
        { role: "user", content: INTAKE.slice(0, 22000) }
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
  } catch (e: any) {
    console.error("❌ belemmeringen error", e);
    return NextResponse.json({ error: "Server error", details: e?.message }, { status: 500 });
  }
}
