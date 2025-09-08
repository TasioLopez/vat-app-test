import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import pdf from "pdf-parse";
import type { ChatCompletionMessageParam } from "openai/resources";

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
async function getDocTextByTypes(employeeId: string, candidates: string[]) {
  const { data: docs } = await supabase
    .from("documents")
    .select("type,url,uploaded_at")
    .eq("employee_id", employeeId)
    .order("uploaded_at", { ascending: false });
  if (!docs?.length) return "";
  for (const c of candidates) {
    const hit = docs.find(d => (d.type || "").toLowerCase().includes(c));
    if (!hit?.url) continue;
    const path = extractStoragePath(hit.url);
    if (!path) continue;
    const txt = await readPdfFromStorage(path);
    if (txt && txt.length > 50) return txt;
  }
  return "";
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    if (!employeeId) return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });

    // Prefer FML/IZP/LAB over AD
    const FML = await getDocTextByTypes(employeeId, [
      "fml", "functiemogelijkhedenlijst",
      "izp", "inzetbaarheidsprofiel",
      "lab", "lijst arbeidsmogelijkheden", "arbeidsmogelijkheden en beperkingen"
    ]);
    const AD  = await getDocTextByTypes(employeeId, [
      "ad_rapport","ad-rapport","adrapport","ad_rapportage","ad-rapportage","arbeidsdeskund"
    ]);
    const source = FML ? "fml" : (AD ? "ad" : "");

    if (!FML && !AD) {
      return NextResponse.json({ error: "Geen FML/IZP/LAB of AD-rapport gevonden" }, { status: 200 });
    }

    const system = `
Je bent een NL re-integratie-rapportage assistent.
Maak de sectie "Prognose van de bedrijfsarts" in 1–2 korte alinea's, AVG-proof (geen diagnoses).
- Gebruik ALLEEN tekst uit de bron.
- Als bron FML/IZP/LAB aanwezig is, baseer je daarop; anders op AD-rapport.
- Benoem beknopt: herstelperspectief, belastbaarheid in de tijd, verwachting t.a.v. re-integratie (spoor 1/2).
Lever uitsluiten via function-call: { prognose_bedrijfsarts: string }.
`.trim();

    const user = `
BRON (${source.toUpperCase()}):
${(FML || AD).slice(0, 22000)}
`.trim();

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: system },
      { role: "user", content: user }
    ];

    const tool = {
      type: "function" as const,
      function: {
        name: "build_prognose",
        description: "Bouw prognose in 1–2 alinea's",
        parameters: {
          type: "object",
          properties: { prognose_bedrijfsarts: { type: "string" } },
          required: ["prognose_bedrijfsarts"]
        }
      }
    };

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.1,
      messages,
      tools: [tool],
      tool_choice: { type: "function", function: { name: "build_prognose" } }
    });

    const call = completion.choices[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments || "{}";
    const parsed = JSON.parse(args);
    const text = (parsed?.prognose_bedrijfsarts || "").trim();

    // persist
    await supabase.from("tp_meta").upsert(
      { employee_id: employeeId, prognose_bedrijfsarts: text } as any,
      { onConflict: "employee_id" }
    );

    return NextResponse.json({ details: { prognose_bedrijfsarts: text }, autofilled_fields: ["prognose_bedrijfsarts"] });
  } catch (e: any) {
    console.error("❌ prognose error", e);
    return NextResponse.json({ error: "Server error", details: e?.message }, { status: 500 });
  }
}
