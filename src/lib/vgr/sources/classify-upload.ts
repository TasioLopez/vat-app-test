import type OpenAI from 'openai';
import { mapEmployeeDocTypeToDossier } from '@/lib/vgr/dossier/map-doc-type';
import type { VgrDossierDocType, VgrDocumentStatus } from '@/lib/vgr/dossier/types';
import { getDocumentExtractionModel } from '@/lib/document-analysis/constants';
import { mapPackDocTypeToEmployee } from './map-pack-to-employee';
import { resolveDocumentDate } from './extract-document-date';
import type { EmployeeDocType } from '@/lib/documents/employee-doc-types';

export const VGR_PACK_DOC_TYPES: VgrDossierDocType[] = [
  'TP',
  'VGR',
  'VGR_BIJLAGE_1',
  'VGR_BIJLAGE_2',
  'AD',
  'FML',
  'IZP',
  'LAB',
  'BA_CONSULT',
  'ACTUEEL_OORDEEL',
  'TEST',
  'GESPREKSAANTEKENINGEN',
  'WERKBOEK',
  'EMAIL',
  'CV',
  'MOTIVATIEBRIEF',
  'SOLLICITATIEBEWIJS',
  'OVERIG',
  'ONBEKEND',
];

export type ClassifyUploadResult = {
  pack_doc_type: VgrDossierDocType;
  app_type: EmployeeDocType;
  document_date: string | null;
  document_status: VgrDocumentStatus;
  classification_evidence: string;
  used_ai: boolean;
};

function isPackDocType(value: unknown): value is VgrDossierDocType {
  return typeof value === 'string' && (VGR_PACK_DOC_TYPES as string[]).includes(value);
}

/** Deterministic classify from filename + optional declared app type (no network). */
export function classifyUploadHeuristic(params: {
  filename: string;
  declaredAppType?: string | null;
  textSnippet?: string | null;
  documentDateHint?: string | null;
}): ClassifyUploadResult {
  const filename = params.filename || 'file';
  const declared = (params.declaredAppType || '').trim();
  // When dumping as "extra"/unknown, prefer filename heuristics over the dump slot.
  const appHint =
    !declared || declared === 'extra' || declared === 'onbekend' ? '' : declared;
  const pack = mapEmployeeDocTypeToDossier(appHint || 'extra', filename);
  const document_date = resolveDocumentDate({
    explicit: params.documentDateHint,
    filename,
    textSnippet: params.textSnippet,
  });
  return {
    pack_doc_type: pack,
    app_type: mapPackDocTypeToEmployee(pack),
    document_date,
    document_status: 'unknown',
    classification_evidence: `heuristic; app_hint=${appHint || '—'}; mapped=${pack}`,
    used_ai: false,
  };
}

const CLASSIFY_INSTRUCTIONS = `Classificeer één werknemersdossierdocument voor ValentineZ VGR.
Kies precies één doc_type uit: ${VGR_PACK_DOC_TYPES.join(', ')}.
Extraheer document_date alleen als die expliciet in bestandsnaam of tekst staat (YYYY-MM-DD); anders null.
document_status: draft | final | unknown.
Geef korte classification_evidence in het Nederlands.
Verzin geen dossierfeiten. Retourneer alleen JSON volgens schema.`;

/**
 * AI refine of CLASSIFY_DOCUMENT. Falls back to heuristic on any failure.
 * Uses filename + optional plain-text snippet (no mandatory PDF vision).
 */
export async function classifyUploadWithAi(params: {
  openai: OpenAI;
  filename: string;
  declaredAppType?: string | null;
  textSnippet?: string | null;
  documentDateHint?: string | null;
}): Promise<ClassifyUploadResult> {
  const heuristic = classifyUploadHeuristic(params);
  try {
    const snippet = String(params.textSnippet || '').slice(0, 6000);
    const response = await params.openai.responses.create({
      model: getDocumentExtractionModel(),
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: CLASSIFY_INSTRUCTIONS }],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: JSON.stringify({
                filename: params.filename,
                declared_app_type: params.declaredAppType || null,
                text_snippet: snippet || null,
                heuristic_doc_type: heuristic.pack_doc_type,
                heuristic_document_date: heuristic.document_date,
              }),
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'vgr_classify_document',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              doc_type: { type: 'string', enum: VGR_PACK_DOC_TYPES },
              document_date: { type: ['string', 'null'] },
              document_status: { type: 'string', enum: ['draft', 'final', 'unknown'] },
              classification_evidence: { type: 'string' },
            },
            required: ['doc_type', 'document_date', 'document_status', 'classification_evidence'],
          },
          strict: true,
        },
      },
    });

    const rawText =
      (response as { output_text?: string }).output_text ||
      extractOutputText(response) ||
      '';
    const parsed = JSON.parse(rawText) as Record<string, unknown>;
    const pack = isPackDocType(parsed.doc_type) ? parsed.doc_type : heuristic.pack_doc_type;
    const document_date =
      resolveDocumentDate({
        explicit: typeof parsed.document_date === 'string' ? parsed.document_date : null,
        filename: params.filename,
        textSnippet: snippet,
      }) || heuristic.document_date;
    const statusRaw = String(parsed.document_status || 'unknown');
    const document_status: VgrDocumentStatus =
      statusRaw === 'draft' || statusRaw === 'final' ? statusRaw : 'unknown';

    return {
      pack_doc_type: pack,
      app_type: mapPackDocTypeToEmployee(pack),
      document_date,
      document_status,
      classification_evidence:
        typeof parsed.classification_evidence === 'string' && parsed.classification_evidence.trim()
          ? parsed.classification_evidence.trim()
          : heuristic.classification_evidence,
      used_ai: true,
    };
  } catch {
    return heuristic;
  }
}

function extractOutputText(response: unknown): string {
  const r = response as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  const parts: string[] = [];
  for (const item of r.output || []) {
    for (const c of item.content || []) {
      if (c.type === 'output_text' && typeof c.text === 'string') parts.push(c.text);
    }
  }
  return parts.join('');
}
