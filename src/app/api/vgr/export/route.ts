/**
 * Phase 4 — export format negotiation (D05 PDF-only / T17 missing DOCX).
 * PDF generation remains `/api/export-pdf`; this route refuses DOCX honestly
 * and returns carrier metadata for the UI.
 */
import { NextRequest } from 'next/server';
import { resolveVgrExportFormat } from '@/lib/vgr/export';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const formatParam = req.nextUrl.searchParams.get('format') || 'pdf';
  const result = resolveVgrExportFormat(formatParam);

  if (!result.ok) {
    return new Response(
      JSON.stringify({
        ok: false,
        format: result.format,
        code: result.code,
        message: result.message,
        house_style_exact: false,
        carrier: result.carrier,
      }),
      { status: 409, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      format: result.format,
      house_style_exact: true,
      template_version: result.template_version,
      carrier: result.carrier,
      // Clients should call the existing PDF pipeline with layoutKey=vgr.
      pdf_export_path: '/api/export-pdf',
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

export async function POST(req: NextRequest) {
  let body: { format?: string } = {};
  try {
    body = (await req.json()) as { format?: string };
  } catch {
    body = {};
  }
  const result = resolveVgrExportFormat(body.format || 'pdf');
  if (!result.ok) {
    return new Response(
      JSON.stringify({
        ok: false,
        format: result.format,
        code: result.code,
        message: result.message,
        house_style_exact: false,
        carrier: result.carrier,
      }),
      { status: 409, headers: { 'Content-Type': 'application/json' } },
    );
  }
  return new Response(
    JSON.stringify({
      ok: true,
      format: result.format,
      house_style_exact: true,
      template_version: result.template_version,
      carrier: result.carrier,
      pdf_export_path: '/api/export-pdf',
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}
