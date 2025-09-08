import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import pdf from "pdf-parse";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

function extractStoragePath(url: string): string | null {
  const m = url.match(/\/object\/(?:public|sign)\/documents\/(.+)$/);
  if (m?.[1]) return m[1];
  if (url?.startsWith("documents/")) return url.slice("documents/".length);
  if (url && !url.includes("://") && !url.includes("object/")) return url;
  return null;
}
async function readPdfFromStorage(path: string) {
  const { data: file } = await supabase.storage.from("documents").download(path);
  if (!file) return "";
  const buf = Buffer.from(await file.arrayBuffer());
  try { const p = await pdf(buf); return (p.text || "").trim(); } catch { return ""; }
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
    const praktische_belemmeringen = (parsed?.praktische_belemmeringen || "").trim();

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
