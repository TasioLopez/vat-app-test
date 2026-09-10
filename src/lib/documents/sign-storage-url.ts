/** Create a short-lived signed URL for a storage object path. */
export async function signStorageUrl(path: string): Promise<string> {
  const res = await fetch('/api/storage/sign-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
  const data = await res.json();
  if (!res.ok || typeof data?.url !== 'string') {
    throw new Error(
      typeof data?.error === 'string' ? data.error : 'Kon document niet openen'
    );
  }
  return data.url;
}
