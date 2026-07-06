import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { getIntakeContextForTp } from "@/lib/document-analysis";
import { requireEmployeeAutofillAccess } from '@/lib/auth/autofill-access';
import { PRACTISCHE_BELEMMERINGEN_DEFAULT } from "@/lib/tp2026/mapping";

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

const INTAKE_BELEMMERINGEN_FOCUS = `
Extraheer UITSLUITEND de ingevulde tekst uit sectie 17 "Bijzonderheden", subveld "Praktische belemmeringen:" (Juni V5 intakeformulier).
Neem NIET op: de algemene vraag "Zijn er bijzonderheden waar ik rekening mee moet houden", het blok "Algemene informatie", opleidingen, vervoer, rijbewijs, talen, of andere secties.
Als het subveld ontbreekt (oud formulier zonder sectie 17) of leeg is: geef een lege string.
`.trim();

export async function GET(req: NextRequest) {
  try {
    const access = await requireEmployeeAutofillAccess(req);
    if (access instanceof NextResponse) return access;
    const { employeeId } = access;

    const INTAKE = await getIntakeContextForTp(
      openai,
      supabase,
      employeeId,
      INTAKE_BELEMMERINGEN_FOCUS
    );

    if (!INTAKE) return NextResponse.json({ error: "Geen intakeformulier gevonden" }, { status: 200 });

    const system = `
Extraheer uitsluitend de tekst onder "Praktische belemmeringen:" in sectie 17 "Bijzonderheden" van het intakeformulier.
Kopieer de tekst letterlijk over — geen herschrijven, samenvatten of nieuwe opsommingen tenzij die al in het formulier staan.
Neem GEEN tekst op uit "Zijn er bijzonderheden waar ik rekening mee moet houden", "Algemene informatie", of andere secties.
Als het veld ontbreekt (oudere intakeformulieren) of leeg is: geef een lege string.
Lever via function-call: { praktische_belemmeringen: string }.
`.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0,
      messages: [
        { role: "system", content: system },
        { role: "user", content: INTAKE }
      ],
      tools: [{
        type: "function",
        function: {
          name: "extract_belemmeringen",
          description: "Letterlijke tekst uit sectie 17 Praktische belemmeringen",
          parameters: {
            type: "object",
            properties: { praktische_belemmeringen: { type: "string" } },
            required: ["praktische_belemmeringen"]
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "extract_belemmeringen" } }
    });

    const call = completion.choices[0]?.message?.tool_calls?.[0];
    const parsed = JSON.parse(call?.function?.arguments || "{}");
    const extracted = stripCitations((parsed?.praktische_belemmeringen || "").trim());
    const praktische_belemmeringen = extracted || PRACTISCHE_BELEMMERINGEN_DEFAULT;

    await supabase.from("tp_meta").upsert(
      { employee_id: employeeId, praktische_belemmeringen } as any,
      { onConflict: "employee_id" }
    );

    return NextResponse.json({ details: { praktische_belemmeringen }, autofilled_fields: ["praktische_belemmeringen"] });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("❌ belemmeringen error", e);
    return NextResponse.json({ error: "Server error", details: message }, { status: 500 });
  }
}
