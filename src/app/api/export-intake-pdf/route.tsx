import { NextRequest } from 'next/server';
import chromium from '@sparticuz/chromium';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { assertStagingOnly } from '@/lib/auth/staging-only';
import { verifyEmployeeAccess } from '@/lib/auth/api-auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/auth/rate-limit';
import { waitForPrintAssets } from '@/lib/pdf/wait-for-print-assets';
import { ensureIntakeShape, INTAKE_LAYOUT_KEY } from '@/lib/intake/schema';
import {
  contentDispositionAttachment,
  sanitizeDownloadFilename,
} from '@/lib/tp/export-filename';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function getBaseUrl(req: NextRequest) {
  const proto = req.headers.get('x-forwarded-proto');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (proto && host) return `${proto}://${host}`;
  const origin = req.nextUrl?.origin;
  if (origin) return origin;
  throw new Error('Cannot resolve base URL from request.');
}

function resolveLocalChrome(): string | null {
  const candidates =
    process.platform === 'win32'
      ? [
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
          path.join(process.env.LOCALAPPDATA ?? '', 'Google\\Chrome\\Application\\chrome.exe'),
        ]
      : process.platform === 'darwin'
        ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
        : ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];

  for (const p of candidates) if (p && fs.existsSync(p)) return p;
  return null;
}

async function launchBrowser() {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    const puppeteer = await import('puppeteer-core');
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const puppeteerCore = await import('puppeteer-core');
  const executablePath = resolveLocalChrome();
  if (!executablePath) {
    throw new Error('No local Chrome found for PDF export.');
  }
  return puppeteerCore.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

export async function GET(req: NextRequest) {
  const blocked = assertStagingOnly();
  if (blocked) return blocked;

  const search = req.nextUrl.searchParams;
  const employeeId = search.get('employeeId');
  const intakeInstanceId = search.get('intakeInstanceId');
  const mode = search.get('mode') || 'json';

  if (!employeeId || !intakeInstanceId) {
    return new Response(JSON.stringify({ error: 'Missing employeeId or intakeInstanceId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const cookieStore = await cookies();
  const ssr = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key) => cookieStore.get(key)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  );

  const {
    data: { user },
  } = await ssr.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const allowed = await verifyEmployeeAccess(ssr, employeeId);
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const rate = await checkRateLimit(`export-intake-pdf:${user.id}`, 3600, 20);
  if (!rate.ok) return rateLimitResponse(rate.retryAfterSec);

  const { data: instance, error: instanceErr } = await (ssr as any)
    .from('intake_instances')
    .select('id, employee_id, layout_key, data_json')
    .eq('id', intakeInstanceId)
    .maybeSingle();

  if (
    instanceErr ||
    !instance ||
    instance.employee_id !== employeeId ||
    instance.layout_key !== INTAKE_LAYOUT_KEY
  ) {
    return new Response(JSON.stringify({ error: 'Invalid intakeInstanceId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const snapshot = ensureIntakeShape(instance.data_json || {});
  const nameSlug =
    snapshot.s1.employee_name.replace(/[^\w\-]+/g, '_').slice(0, 40) || 'intake';
  const filename = sanitizeDownloadFilename(`Intakeformulier_${nameSlug}.pdf`);
  const base = getBaseUrl(req);
  const printUrl = `${base}/intake/print?intakeInstanceId=${encodeURIComponent(intakeInstanceId)}`;
  const pathKey = `documents/${employeeId}/intake-final-${Date.now()}.pdf`;

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let browser: any = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    const cookieHeader = req.headers.get('cookie') || '';
    if (cookieHeader) {
      await page.setExtraHTTPHeaders({ cookie: cookieHeader });
    }

    await page.goto(printUrl, { waitUntil: 'networkidle0', timeout: 60_000 });
    await page.emulateMediaType('print');
    await page.waitForSelector('#intake-print-root[data-ready="1"]', { timeout: 30_000 });
    await waitForPrintAssets(page);

    await page.addStyleTag({
      content: `
        @page { size: A4; margin: 12mm; }
        html, body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `,
    });

    const pdfBuffer = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
    });

    let exportId: string | null = null;
    const { data: exportRow, error: exportInsertErr } = await (supabase as any)
      .from('intake_exports')
      .insert({
        intake_instance_id: intakeInstanceId,
        layout_key: INTAKE_LAYOUT_KEY,
        snapshot_json: snapshot,
        filename,
        created_by: user.id,
      })
      .select('id')
      .single();
    if (exportInsertErr) console.error('intake_exports insert error:', exportInsertErr);
    exportId = exportRow?.id ?? null;

    const { error: uploadErr } = await supabase.storage
      .from('documents')
      .upload(pathKey, pdfBuffer, { contentType: 'application/pdf', upsert: false });
    if (uploadErr) console.error('Upload error:', uploadErr);

    if (exportId) {
      await (supabase as any)
        .from('intake_exports')
        .update({ storage_path: pathKey })
        .eq('id', exportId);
    }

    const { error: insertErr } = await supabase.from('documents').insert({
      employee_id: employeeId,
      type: 'intake',
      layout_key: INTAKE_LAYOUT_KEY,
      intake_instance_id: intakeInstanceId,
      intake_export_id: exportId,
      name: filename,
      url: pathKey,
      uploaded_at: new Date().toISOString(),
    });
    if (insertErr) console.error('Insert documents row failed:', insertErr);

    const { data: signedData, error: signedErr } = await supabase.storage
      .from('documents')
      .createSignedUrl(pathKey, 60 * 60, { download: filename });
    if (signedErr) console.error('Signed URL failed:', signedErr);
    const signedUrl = signedData?.signedUrl ?? null;

    if (mode === 'json') {
      return new Response(JSON.stringify({ ok: true, path: pathKey, filename, signedUrl }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': contentDispositionAttachment(filename),
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('export-intake-pdf failed', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Export mislukt' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
