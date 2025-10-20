import { NextRequest } from "next/server";
import { handleAPIError, createSuccessResponse, validateRequiredFields, validateUUID, ValidationError } from "@/lib/api-utils";
import { OpenAIService } from "@/lib/openai-service";
import { SupabaseService } from "@/lib/supabase-service";

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
  const supabaseService = SupabaseService.getInstance();
  const supabase = supabaseService.getClient();
  const { data: file } = await supabase.storage.from("documents").download(path);
  if (!file) return "";
  const buf = Buffer.from(await file.arrayBuffer());
  
  try {
    // Convert buffer to string and extract readable text
    const bufferString = buf.toString('utf8');
    
    // Look for specific patterns from TP documents
    const patterns = [
      /prognose[^:]*:\s*([^\n\r]+)/i,
      /herstel[^:]*:\s*([^\n\r]+)/i,
      /belastbaarheid[^:]*:\s*([^\n\r]+)/i,
      /re-integratie[^:]*:\s*([^\n\r]+)/i,
      /spoor[^:]*:\s*([^\n\r]+)/i,
      /bedrijfsarts[^:]*:\s*([^\n\r]+)/i,
      /arbeidsdeskundig[^:]*:\s*([^\n\r]+)/i,
      /fml[^:]*:\s*([^\n\r]+)/i,
      /izp[^:]*:\s*([^\n\r]+)/i,
      /inzetbaarheidsprofiel[^:]*:\s*([^\n\r]+)/i
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
      console.log('📄 TP Prognose PDF extraction successful, found patterns:', extractedInfo.length);
      return text;
    }
    
    // Fallback: extract any readable text
    const readableText = bufferString.match(/[A-Za-z0-9\s\-\.\,\:\;\(\)]{10,}/g);
    if (readableText && readableText.length > 0) {
      const text = readableText.join(' ');
      console.log('📄 TP Prognose PDF extraction successful, extracted readable text');
      return text;
    }
    
    return "";
  } catch (error: any) {
    console.error('TP Prognose PDF extraction failed:', error.message);
    return "";
  }
}
async function getDocTextByTypes(employeeId: string, candidates: string[]) {
  const supabaseService = SupabaseService.getInstance();
  const supabase = supabaseService.getClient();
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
    
    // Validate input
    validateRequiredFields({ employeeId }, ['employeeId']);
    validateUUID(employeeId!, 'Employee ID');

    const supabaseService = SupabaseService.getInstance();
    const openaiService = OpenAIService.getInstance();

    // Prefer FML/IZP/LAB over AD
    const FML = await getDocTextByTypes(employeeId!, [
      "fml", "functiemogelijkhedenlijst",
      "izp", "inzetbaarheidsprofiel",
      "lab", "lijst arbeidsmogelijkheden", "arbeidsmogelijkheden en beperkingen"
    ]);
    const AD = await getDocTextByTypes(employeeId!, [
      "ad_rapport","ad-rapport","adrapport","ad_rapportage","ad-rapportage","arbeidsdeskund"
    ]);
    const source = FML ? "fml" : (AD ? "ad" : "");

    if (!FML && !AD) {
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
${(FML || AD).slice(0, 22000)}
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
