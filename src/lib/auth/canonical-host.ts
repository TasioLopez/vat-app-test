import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Force production apex → www so auth cookies / PKCE verifiers stay on one host.
 * Staging and other hosts are left unchanged.
 */
export function redirectApexToWww(request: NextRequest): NextResponse | null {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  if (host !== "vat-app.nl") return null;

  const url = request.nextUrl.clone();
  url.hostname = "www.vat-app.nl";
  url.protocol = "https:";
  // Preserve path + query (incl. ?code= / ?token_hash=) across the hop.
  return NextResponse.redirect(url, 308);
}
