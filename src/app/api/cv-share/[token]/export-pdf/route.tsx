import { NextRequest } from 'next/server';
import chromium from '@sparticuz/chromium';
import fs from 'node:fs';
import path from 'node:path';
import { cookies } from 'next/headers';
import { validateGuestAccess } from '@/lib/cv-share/access';
import { CV_SHARE_SESSION_COOKIE } from '@/lib/cv-share/session';
import { getBaseUrl } from '@/lib/cv-share/base-url';
import { supabaseAdmin } from '@/lib/supabase/serverAdmin';
import { checkRateLimit, rateLimitResponse } from '@/lib/auth/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function resolveLocalChrome(): string | null {
  const candidates =
    process.platform === 'win32'
      ? [
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
          path.join(process.env.LOCALAPPDATA ?? '', 'Google\\Chrome\\Application\\chrome.exe'),
          path.join(process.env.PROGRAMFILES ?? '', 'Google\\Chrome\\Application\\chrome.exe'),
          path.join(process.env['PROGRAMFILES(X86)'] ?? '', 'Google\\Chrome\\Application\\chrome.exe'),
        ]
      : process.platform === 'darwin'
        ? [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
          ]
        : ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium'];

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
    throw new Error('No local Chrome found. Install Google Chrome OR add `puppeteer` as a devDependency.');
  }
  return puppeteerCore.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(CV_SHARE_SESSION_COOKIE)?.value;
  const access = await validateGuestAccess(token, sessionToken);
  if (!access) {
    return new Response(JSON.stringify({ error: 'Toegang geweigerd' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown';
  const rate = await checkRateLimit(`cv-share-export:${access.share.id}:${ip}`, 3600, 10);
  if (!rate.ok) {
    return rateLimitResponse(rate.retryAfterSec);
  }

  const search = req.nextUrl.searchParams;
  const filename = (search.get('filename') || 'CV.pdf').replace(/[^\w.\-]/g, '_');
  const mode = search.get('mode') || 'json';
  const locale = search.get('locale') === 'en' ? 'en' : 'nl';

  const base = getBaseUrl(req);
  const printUrl = `${base}/cv/share/print?token=${encodeURIComponent(token)}&pdf=1&locale=${locale}`;

  let browser: Awaited<ReturnType<typeof launchBrowser>> | null = null;

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

    await page.waitForSelector('.cv-print-root, #cv-print-root', { timeout: 30_000 });
    await page.waitForSelector('#cv-print-root[data-ready="1"]', { timeout: 30_000 });

    await page.evaluate(async () => {
      const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
      if (fonts?.ready) await fonts.ready;
    });

    await page.addStyleTag({
      content: `
        @page { size: A4; margin: 0; }
        html, body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .cv-print-root { margin: 0 !important; }
      `,
    });

    const pdfBuffer = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    const { share } = access;
    const pathKey = `documents/${share.employee_id}/cv-share-${share.cv_document_id}-${Date.now()}.pdf`;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from('documents')
      .upload(pathKey, pdfBuffer, { contentType: 'application/pdf', upsert: false });
    if (uploadErr) console.error('cv-share pdf upload', uploadErr);

    const { data: signedData, error: signedErr } = await supabaseAdmin.storage
      .from('documents')
      .createSignedUrl(pathKey, 60 * 60, { download: filename });
    const signedUrl = signedData?.signedUrl ?? null;
    if (signedErr) console.error('cv-share pdf signed url', signedErr);

    if (mode === 'redirect' && signedUrl) {
      return new Response(null, { status: 307, headers: { Location: signedUrl } });
    }
    if (mode === 'json') {
      return new Response(
        JSON.stringify({ ok: true, path: pathKey, filename, signedUrl }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
      );
    }

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: unknown) {
    console.error('cv-share export-pdf error:', err);
    return new Response(
      JSON.stringify({
        error: 'PDF generation failed',
        detail: String(err instanceof Error ? err.message : err),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  } finally {
    try {
      const pages = (await browser?.pages?.()) || [];
      await Promise.allSettled(pages.map((p) => p.close().catch(() => {})));
      await browser?.close();
    } catch {
      /* ignore */
    }
  }
}
