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
async function getAdText(employeeId: string) {
  const { data: docs } = await supabase
    .from("documents")
    .select("type,url,uploaded_at")
    .eq("employee_id", employeeId)
    .order("uploaded_at", { ascending: false });
  if (!docs?.length) return "";
  const variants = ["ad_rapport","ad-rapport","adrapport","ad_rapportage","ad-rapportage","arbeidsdeskund"];
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

    const AD = await getAdText(employeeId);
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
        { role: "user", content: AD.slice(0, 22000) }
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
    const advies_ad_passende_arbeid = (parsed?.advies_ad_passende_arbeid || "").trim();

    await supabase.from("tp_meta").upsert(
      { employee_id: employeeId, advies_ad_passende_arbeid } as any,
      { onConflict: "employee_id" }
    );

    return NextResponse.json({ details: { advies_ad_passende_arbeid }, autofilled_fields: ["advies_ad_passende_arbeid"] });
  } catch (e: any) {
    console.error("❌ ad-advies error", e);
    return NextResponse.json({ error: "Server error", details: e?.message }, { status: 500 });
  }
}
