function trimTrailingSlash(origin: string): string {
  return origin.replace(/\/+$/, "");
}

export function normalizeAuthOrigin(origin: string): string {
  try {
    const url = new URL(origin);

    // Keep one canonical production host.
    if (url.hostname === "vat-app.nl") {
      url.hostname = "www.vat-app.nl";
    }

    return trimTrailingSlash(url.toString());
  } catch {
    return trimTrailingSlash(origin);
  }
}

export function getConfiguredServerAuthOrigin(): string | null {
  const fromPrivate = process.env.AUTH_REDIRECT_ORIGIN;
  if (fromPrivate && fromPrivate.trim()) {
    return normalizeAuthOrigin(fromPrivate.trim());
  }

  const fromPublic = process.env.NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN;
  if (fromPublic && fromPublic.trim()) {
    return normalizeAuthOrigin(fromPublic.trim());
  }

  return null;
}

export function getConfiguredClientAuthOrigin(): string | null {
  const fromPublic = process.env.NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN;
  if (fromPublic && fromPublic.trim()) {
    return normalizeAuthOrigin(fromPublic.trim());
  }
  return null;
}
