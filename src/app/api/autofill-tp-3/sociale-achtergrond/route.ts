import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import type { ChatCompletionMessageParam } from "openai/resources";

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
    .replace(/ {2,}/g, ' ')
    .trim();
}

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
    const bufferString = buf.toString('utf8');
    const readableText = bufferString.match(/[A-Za-z0-9\s\-\.,:;()]{10,}/g);
    if (readableText && readableText.length > 0) return readableText.join(' ');
    return "";
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    if (!employeeId) return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });

    const INTAKE = await getIntakeText(employeeId);
    if (!INTAKE) {
      return NextResponse.json({ error: "Geen intakeformulier gevonden of niet leesbaar" }, { status: 200 });
    }

    const systemPrompt = `
Je bent een NL re-integratie-rapportage assistent.
Schrijf uitsluitend de sectie "sociale_achtergrond" op basis van het INTAKEFORMULIER.
- 1–3 korte alinea's met dubbele newlines tussen alinea's.
- Neem alleen op wat expliciet in de intake staat: woon-/thuissituatie en ondersteuning, sociale context/activiteiten, relevante praktische zaken (taal/rijbewijs/vervoer/uren) indien expliciet genoemd.
- Geen medische details of diagnoses. Zakelijk en AVG-proof.
Lever UITSLUITEND een function call met JSON: { sociale_achtergrond: string }.
`.trim();

    const userPrompt = `INTAKEFORMULIER:\n${INTAKE.slice(0, 22000)}`.trim();

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const tool = {
      type: "function" as const,
      function: {
        name: "build_sociale_achtergrond",
        description: "Bouw sociale_achtergrond (string).",
        parameters: {
          type: "object",
          properties: { sociale_achtergrond: { type: "string" } },
          required: ["sociale_achtergrond"],
        },
      },
    };

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.1,
      messages,
      tools: [tool],
      tool_choice: { type: "function", function: { name: "build_sociale_achtergrond" } },
    });

    const call = completion.choices[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments;
    if (!args) return NextResponse.json({ error: "Geen tekst gegenereerd" }, { status: 200 });

    let parsed: { sociale_achtergrond?: string } | null = null;
    try { parsed = JSON.parse(args); } catch { parsed = null; }

    const sociale_achtergrond = stripCitations((parsed?.sociale_achtergrond || '').trim());

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
    return NextResponse.json({ error: "Server error", details: err?.message }, { status: 500 });
  }
}


