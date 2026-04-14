/**
 * Validates `next` for /auth/callback to prevent open redirects.
 * Only same-origin paths under an allowlist are returned.
 */
export function getSafeAuthRedirectPath(
  raw: string | null,
  fallback: string
): string {
  if (!raw || typeof raw !== "string") return fallback;

  try {
    const trimmed = decodeURIComponent(raw.trim());
    if (trimmed.includes("://") || trimmed.startsWith("//") || !trimmed.startsWith("/")) {
      return fallback;
    }

    const pathOnly = trimmed.split("?")[0]?.split("#")[0] ?? "";
    if (!pathOnly.startsWith("/")) return fallback;

    if (
      pathOnly === "/signup" ||
      pathOnly === "/reset-password" ||
      pathOnly === "/dashboard"
    ) {
      return pathOnly;
    }

    if (/^\/dashboard\//.test(pathOnly) && pathOnly.length < 400) {
      return pathOnly;
    }

    return fallback;
  } catch {
    return fallback;
  }
}
