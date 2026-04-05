/**
 * Resolves a kb-media storage path to a short-lived signed URL (public read path).
 */
export async function fetchKbMediaSignedUrl(path: string): Promise<string | null> {
  const res = await fetch("/api/help/kb-media/sign-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  if (!res.ok) return null;
  const j: unknown = await res.json();
  if (j && typeof j === "object" && "url" in j && typeof (j as { url: unknown }).url === "string") {
    return (j as { url: string }).url;
  }
  return null;
}
