import { NextRequest } from "next/server";
import OpenAI from "openai";
import { handleAPIError, createSuccessResponse, validateRequiredFields, validateUUID } from "@/lib/api-utils";
import { OpenAIService } from "@/lib/openai-service";
import { SupabaseService } from "@/lib/supabase-service";
import { getEmployeeDocumentContext } from "@/lib/document-analysis";
import { requireEmployeeAutofillAccess } from "@/lib/auth/autofill-access";
import { NextResponse } from "next/server";

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
    const access = await requireEmployeeAutofillAccess(req);
    if (access instanceof NextResponse) return access;
    const { employeeId } = access;

    validateRequiredFields({ employeeId }, ['employeeId']);
    validateUUID(employeeId, 'Employee ID');

    const supabaseService = SupabaseService.getInstance();
    const openaiService = OpenAIService.getInstance();
    const supabase = supabaseService.getClient();

    const fmlMatchers = [
      "fml", "functiemogelijkhedenlijst",
      "izp", "inzetbaarheidsprofiel",
      "lab", "lijst arbeidsmogelijkheden", "arbeidsmogelijkheden en beperkingen"
    ];
    const adMatchers = [
      "ad_rapport", "ad-rapport", "adrapport", "ad_rapportage", "ad-rapportage", "arbeidsdeskund"
    ];

    const prognoseFocus = `Extraheer uit dit document alle tekst relevant voor een prognose van de bedrijfsarts: herstelperspectief, belastbaarheid, re-integratie (spoor 1/2), beperkingen in algemene termen. Geen diagnoses.`;

    let sourceText = await getEmployeeDocumentContext(
      openai,
      supabase,
      employeeId,
      fmlMatchers,
      prognoseFocus
    );
    let source = "fml";

    if (!sourceText) {
      sourceText = await getEmployeeDocumentContext(
        openai,
        supabase,
        employeeId,
        adMatchers,
        prognoseFocus
      );
      source = "ad";
    }

    if (!sourceText) {
      return createSuccessResponse(
        { prognose_bedrijfsarts: "" },
        "Geen FML/IZP/LAB of AD-rapport gevonden"
      );
    }

    const systemPrompt = `
Je bent een NL re-integratie-rapportage assistent.
Maak de sectie "Prognose van de bedrijfsarts" in 1–2 korte alinea's, AVG-proof (geen diagnoses).
- Gebruik ALLEEN tekst uit de bron.
- Als bron FML/IZP/LAB aanwezig is, baseer je daarop; anders op AD-rapport.
- Benoem beknopt: herstelperspectief, belastbaarheid in de tijd, verwachting t.a.v. re-integratie (spoor 1/2).
Lever uitsluiten via function-call: { prognose_bedrijfsarts: string }.
`.trim();

    const userPrompt = `
BRON (${source.toUpperCase()}):
${sourceText}
`.trim();

    const toolSchema = {
      type: "function" as const,
      function: {
        name: "build_prognose",
        description: "Bouw prognose in 1–2 alinea's",
        parameters: {
          type: "object" as const,
          properties: { prognose_bedrijfsarts: { type: "string" as const } },
          required: ["prognose_bedrijfsarts"]
        }
      }
    };

    const result = await openaiService.generateContent(
      systemPrompt,
      userPrompt,
      toolSchema,
      { temperature: 0.1 }
    );

    const text = (result?.prognose_bedrijfsarts || "").trim();

    // Persist to database
    await supabaseService.upsertTPMeta(employeeId!, { prognose_bedrijfsarts: text });

    return createSuccessResponse(
      { prognose_bedrijfsarts: stripCitations(text) },
      "Prognose successfully generated"
    );
  } catch (error: any) {
    return handleAPIError(error);
  }
}
