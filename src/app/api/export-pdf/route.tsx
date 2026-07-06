// src/app/api/export-pdf/route.tsx
import { NextRequest } from "next/server";
import chromium from "@sparticuz/chromium";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { loadTPData } from "@/lib/tp/load";
import { isTPLayoutKey, type TPLayoutKey } from "@/lib/tp/layout";
import { isVGRLayoutKey, type VGRLayoutKey } from "@/lib/vgr/layout";
import { ensureTP2026Shape } from "@/lib/tp2026/mapping";
import { ensureVGRShape } from "@/lib/vgr/mapping";
import { waitForPrintAssets } from "@/lib/pdf/wait-for-print-assets";
import { TP2026_PDF_PRINT_BORDER_CSS } from "@/lib/tp2026/tp2026-colors";
import { verifyEmployeeAccess } from "@/lib/auth/api-auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/auth/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Base URL resolver WITHOUT env usage */
function getBaseUrl(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (proto && host) return `${proto}://${host}`;
  const origin = req.nextUrl?.origin;
  if (origin) return origin;
  throw new Error("Cannot resolve base URL from request.");
}

/** Find a local Chrome (only used if `puppeteer` isn’t installed) — NO env vars */
function resolveLocalChrome(): string | null {
  const candidates =
    process.platform === "win32"
      ? [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
          path.join(process.env.LOCALAPPDATA ?? "", "Google\\Chrome\\Application\\chrome.exe"),
          path.join(process.env.PROGRAMFILES ?? "", "Google\\Chrome\\Application\\chrome.exe"),
          path.join(process.env["PROGRAMFILES(X86)"] ?? "", "Google\\Chrome\\Application\\chrome.exe"),
        ]
      : process.platform === "darwin"
      ? [
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
        ]
      : ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/snap/bin/chromium"];

  for (const p of candidates) if (p && fs.existsSync(p)) return p;
  return null;
}

/** Launch a browser appropriate to the environment */
async function launchBrowser() {
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    const puppeteer = await import("puppeteer-core");
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  // Dev: use system Chrome directly
  try {
    const puppeteerCore = await import("puppeteer-core");
    const executablePath = resolveLocalChrome();
    if (!executablePath) {
      throw new Error(
        "No local Chrome found. Install Google Chrome OR add `puppeteer` as a devDependency."
      );
    }
    return puppeteerCore.launch({
      headless: true,
      executablePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  } catch (error: any) {
    throw new Error(`Failed to launch browser: ${error}`);
  }
}

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams;
  const employeeId = search.get("employeeId");
  const filename = (search.get("filename") || "TP.pdf").replace(/[^\w.\-]/g, "_");
  const mode = search.get("mode") || "json";
  const tpInstanceId = search.get("tpInstanceId");
  const vgrInstanceId = search.get("vgrInstanceId");
  const requestedLayout = search.get("layoutKey");
  const isVgrExport = requestedLayout === "vgr" || Boolean(vgrInstanceId);

  if (!employeeId) {
    return new Response(JSON.stringify({ error: "Missing employeeId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
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
  const { data: { user } } = await ssr.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const employeeAllowed = await verifyEmployeeAccess(ssr, employeeId);
  if (!employeeAllowed) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rate = await checkRateLimit(`export-pdf:${user.id}`, 3600, 20);
  if (!rate.ok) {
    return rateLimitResponse(rate.retryAfterSec);
  }

  const base = getBaseUrl(req);
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (isVgrExport) {
    if (!vgrInstanceId) {
      return new Response(JSON.stringify({ error: "vgrInstanceId is required for VGR export" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: vgrInstance, error: vgrInstanceErr } = await (ssr as any)
      .from("vgr_instances")
      .select("id, employee_id, layout_key, data_json")
      .eq("id", vgrInstanceId)
      .maybeSingle();

    if (
      vgrInstanceErr ||
      !vgrInstance ||
      vgrInstance.employee_id !== employeeId ||
      !isVGRLayoutKey(vgrInstance.layout_key)
    ) {
      return new Response(JSON.stringify({ error: "Invalid vgrInstanceId for employee" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const resolvedVgrLayout = vgrInstance.layout_key as VGRLayoutKey;
    const snapshotData = ensureVGRShape((vgrInstance.data_json || {}) as Record<string, any>);
    const printUrl = `${base}/vgr/print?vgrInstanceId=${encodeURIComponent(vgrInstanceId)}`;
    const pathKey = `documents/${employeeId}/vgr-final-${Date.now()}.pdf`;

    let browser: any = null;

    try {
      browser = await launchBrowser();
      const page = await browser.newPage();
      await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

      const cookieHeader = req.headers.get("cookie") || "";
      if (cookieHeader) {
        await page.setExtraHTTPHeaders({ cookie: cookieHeader });
      }

      await page.goto(printUrl, { waitUntil: "networkidle0", timeout: 60_000 });
      await page.emulateMediaType("print");

      await page.waitForSelector(".vgr-print-root, #vgr-print-root, .tp-print-root", { timeout: 30_000 });
      await page.waitForSelector('#vgr-print-root[data-ready="1"]', { timeout: 30_000 });

      await waitForPrintAssets(page);

      await page.addStyleTag({
        content: `
        @page { size: A4; margin: 0; }
        html, body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .print-page { break-after: page; page-break-after: always; }
        .print-page:last-child { break-after: auto; page-break-after: auto; }
        .tp-print-root, .vgr-print-root { margin: 0 !important; }
        .print\\:shadow-none { box-shadow: none !important; }
        .print\\:border-0 { border: 0 !important; }
        ${TP2026_PDF_PRINT_BORDER_CSS}
      `,
      });

      const pdfBuffer = await page.pdf({
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      });

      let vgrExportId: string | null = null;
      const { data: exportRow, error: exportInsertErr } = await (supabase as any)
        .from("vgr_exports")
        .insert({
          vgr_instance_id: vgrInstanceId,
          layout_key: resolvedVgrLayout,
          snapshot_json: snapshotData,
          filename,
          created_by: user?.id ?? null,
        })
        .select("id")
        .single();
      if (exportInsertErr) console.error("vgr_exports insert error:", exportInsertErr);
      vgrExportId = exportRow?.id ?? null;

      const { error: uploadErr } = await supabase.storage
        .from("documents")
        .upload(pathKey, pdfBuffer, { contentType: "application/pdf", upsert: false });
      if (uploadErr) console.error("Upload error:", uploadErr);

      if (vgrExportId) {
        const { error: exportUpdateErr } = await (supabase as any)
          .from("vgr_exports")
          .update({ storage_path: pathKey })
          .eq("id", vgrExportId);
        if (exportUpdateErr) console.error("vgr_exports update error:", exportUpdateErr);
      }

      const { error: insertErr } = await supabase.from("documents").insert({
        employee_id: employeeId,
        type: "vgr",
        layout_key: resolvedVgrLayout,
        vgr_instance_id: vgrInstanceId,
        vgr_export_id: vgrExportId,
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
        return new Response(
          JSON.stringify({ ok: true, path: pathKey, filename, signedUrl }),
          { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
        );
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
      return new Response(
        JSON.stringify({ error: "PDF generation failed", detail: String(err?.message || err) }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    } finally {
      try {
        const pages = (await browser?.pages?.()) || [];
        await Promise.allSettled(pages.map((p: any) => p.close().catch(() => {})));
        await browser?.close();
      } catch {}
    }
  }

  const layoutKey: TPLayoutKey = isTPLayoutKey(requestedLayout) ? requestedLayout : "tp_legacy";

  let resolvedLayout: TPLayoutKey = layoutKey;
  let snapshotData: Record<string, any> = {};

  if (tpInstanceId) {
    const { data: instance, error: instanceErr } = await (ssr as any)
      .from("tp_instances")
      .select("id, employee_id, layout_key, data_json")
      .eq("id", tpInstanceId)
      .maybeSingle();

    if (instanceErr || !instance || instance.employee_id !== employeeId || !isTPLayoutKey(instance.layout_key)) {
      return new Response(JSON.stringify({ error: "Invalid tpInstanceId for employee" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    resolvedLayout = instance.layout_key as TPLayoutKey;
    snapshotData = ((instance.data_json || {}) as Record<string, any>);
    if (resolvedLayout === "tp_2026") {
      snapshotData = ensureTP2026Shape(snapshotData);
    }
  }

  if (resolvedLayout === "tp_legacy") {
    snapshotData = await loadTPData(employeeId, {
      preferredConsultantUserId: user.id,
      supabase: ssr,
    });
  }

  if (resolvedLayout === "tp_2026" && !tpInstanceId) {
    return new Response(JSON.stringify({ error: "tpInstanceId is required for TP 2026 export" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const printUrl = resolvedLayout === "tp_2026"
    ? `${base}/tp2026/print?tpInstanceId=${encodeURIComponent(tpInstanceId || "")}`
    : `${base}/tp/print?employeeId=${encodeURIComponent(employeeId)}&pdf=1`;

  let browser: any = null;

  try {
    browser = await launchBrowser();

    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

    // forward request cookies (auth)
    const cookieHeader = req.headers.get("cookie") || "";
    if (cookieHeader) {
      await page.setExtraHTTPHeaders({ cookie: cookieHeader });
    }

    await page.goto(printUrl, { waitUntil: "networkidle0", timeout: 60_000 });
    await page.emulateMediaType("print");

    await page.waitForSelector(".tp-print-root, #tp-print-root", { timeout: 30_000 });
    await page.waitForSelector('#tp-print-root[data-ready="1"]', { timeout: 30_000 });

    await waitForPrintAssets(page);

    await page.addStyleTag({
      content: `
        @page { size: A4; margin: 0; }
        html, body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .print-page { break-after: page; page-break-after: always; }
        .print-page:last-child { break-after: auto; page-break-after: auto; }
        .tp-print-root { margin: 0 !important; }
        .print\\:shadow-none { box-shadow: none !important; }
        .print\\:border-0 { border: 0 !important; }
        ${TP2026_PDF_PRINT_BORDER_CSS}
      `,
    });

    const pdfBuffer = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    const pathKey = `documents/${employeeId}/tp-final-${Date.now()}.pdf`;
    let tpExportId: string | null = null;

    if (tpInstanceId) {
      const { data: exportRow, error: exportInsertErr } = await (supabase as any)
        .from("tp_exports")
        .insert({
          tp_instance_id: tpInstanceId,
          layout_key: resolvedLayout,
          snapshot_json: snapshotData,
          filename,
          created_by: user?.id ?? null,
        })
        .select("id")
        .single();
      if (exportInsertErr) console.error("tp_exports insert error:", exportInsertErr);
      tpExportId = exportRow?.id ?? null;
    }

    const { error: uploadErr } = await supabase.storage
      .from("documents")
      .upload(pathKey, pdfBuffer, { contentType: "application/pdf", upsert: false });
    if (uploadErr) console.error("Upload error:", uploadErr);

    if (tpExportId) {
      const { error: exportUpdateErr } = await (supabase as any)
        .from("tp_exports")
        .update({ storage_path: pathKey })
        .eq("id", tpExportId);
      if (exportUpdateErr) console.error("tp_exports update error:", exportUpdateErr);
    }

    const { error: insertErr } = await supabase.from("documents").insert({
      employee_id: employeeId,
      type: "tp",
      layout_key: resolvedLayout,
      tp_instance_id: tpInstanceId,
      tp_export_id: tpExportId,
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
      return new Response(
        JSON.stringify({ ok: true, path: pathKey, filename, signedUrl }),
        { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
      );
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
    return new Response(
      JSON.stringify({ error: "PDF generation failed", detail: String(err?.message || err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  } finally {
    try {
      const pages = (await browser?.pages?.()) || [];
      await Promise.allSettled(pages.map((p: any) => p.close().catch(() => {})));
      await browser?.close();
    } catch {}
  }
}
