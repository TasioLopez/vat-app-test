// src/app/api/export-pdf/route.tsx
import { NextRequest } from "next/server";
import chromium from "@sparticuz/chromium";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

// ✅ NEW: get session user (optional, used for robust fallback)
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ----------------------------------------------------------------------------------
// URL + Chrome helpers
function getBaseUrl(req: NextRequest) {
    const env = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, "");
    if (env) return env;

    const proto =
        req.headers.get("x-forwarded-proto") ??
        (process.env.NODE_ENV === "production" ? "https" : "http");
    const host =
        req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
    return `${proto}://${host}`;
}

function resolveLocalChrome(): string | null {
    const envPath =
        process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH || "";
    if (envPath && fs.existsSync(envPath)) return envPath;

    const candidates =
        process.platform === "win32"
            ? [
                "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
                "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
                path.join(
                    process.env.LOCALAPPDATA ?? "",
                    "Google\\Chrome\\Application\\chrome.exe"
                ),
            ]
            : process.platform === "darwin"
                ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
                : ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"];

    for (const p of candidates) if (p && fs.existsSync(p)) return p;
    return null;
}
// ----------------------------------------------------------------------------------


export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams;
  const employeeId = search.get("employeeId");
  const filename = (search.get("filename") || "TP.pdf").replace(/[^\w.\-]/g, "_");
  const mode = search.get("mode") || "json";

  if (!employeeId) {
    return new Response(JSON.stringify({ error: "Missing employeeId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ✅ Read current session user from the incoming request cookies (server side)
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
  const { data: { user } } = await ssr.auth.getUser();

  const base = getBaseUrl(req);

  // ✅ Add fallback user id in the print URL (so /tp/print can pass it to loadTP if SSR fails)
  const printUrl =
    `${base}/tp/print?employeeId=${encodeURIComponent(employeeId)}&pdf=1` +
    (user?.id ? `&u=${encodeURIComponent(user.id)}` : "");

  let browser: import("puppeteer-core").Browser | null = null;

  try {
    const puppeteer = await import("puppeteer-core");

    if (process.env.NODE_ENV !== "production") {
      const executablePath = resolveLocalChrome();
      if (!executablePath) {
        throw new Error("Could not find a local Chrome. Install Google Chrome or set PUPPETEER_EXECUTABLE_PATH to the Chrome binary.");
      }
      browser = await puppeteer.launch({
        headless: true,
        executablePath,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    } else {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          ...chromium.args,
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--font-render-hinting=medium",
          "--disable-gpu",
        ],
        executablePath: await chromium.executablePath(),
      });
    }

    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

    // ✅ CRITICAL: forward the user's cookies to the headless browser request
    const cookieHeader = req.headers.get("cookie") || "";
    if (cookieHeader) {
      await page.setExtraHTTPHeaders({ cookie: cookieHeader });
    }

    await page.goto(printUrl, { waitUntil: "networkidle0", timeout: 60_000 });
    await page.emulateMediaType("print");

    await page.waitForSelector(".tp-print-root, #tp-print-root", { timeout: 30_000 });
    await page.waitForSelector('#tp-print-root[data-ready="1"]', { timeout: 30_000 });

    await page.evaluate(async () => {
      // @ts-ignore
      if (document.fonts?.ready) await (document as any).fonts.ready;
    });

    await page.addStyleTag({
      content: `
        @page { size: A4; margin: 0; }
        html, body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .print-page { break-after: page; page-break-after: always; }
        .print-page:last-child { break-after: auto; page-break-after: auto; }
        .tp-print-root { margin: 0 !important; }
        .print\\:shadow-none { box-shadow: none !important; }
        .print\\:border-0 { border: 0 !important; }
      `,
    });

    const pdfBuffer = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    // ... Supabase storage code unchanged ...
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const pathKey = `documents/${employeeId}/tp-final-${Date.now()}.pdf`;

    const { error: uploadErr } = await supabase.storage
      .from("documents")
      .upload(pathKey, pdfBuffer, { contentType: "application/pdf", upsert: false });
    if (uploadErr) console.error("Upload error:", uploadErr);

    const { error: insertErr } = await supabase.from("documents").insert({
      employee_id: employeeId,
      type: "tp",
      name: filename,
      url: pathKey,
      uploaded_at: new Date().toISOString(),
    });
    if (insertErr) console.error("Insert documents row failed:", insertErr);

    const { data: signedData, error: signedErr } = await supabase.storage
      .from("documents")
      .createSignedUrl(pathKey, 60 * 60, { download: filename });
    const signedUrl = signedData?.signedUrl ?? null;
    if (signedErr) console.error("Signed URL failed:", signedErr);

    if (mode === "redirect" && signedUrl) {
      return new Response(null, { status: 307, headers: { Location: signedUrl } });
    }
    if (mode === "json") {
      return new Response(JSON.stringify({ ok: true, path: pathKey, filename, signedUrl }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("export-pdf error:", err);
    return new Response(JSON.stringify({ error: "PDF generation failed", detail: String(err?.message || err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    try { await browser?.close(); } catch {}
  }
}
