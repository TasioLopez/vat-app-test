/**
 * Split markdown into chunks for embedding (roughly 400–1200 chars each).
 */
const MAX_CHUNK = 1200;
const MIN_CHUNK = 200;

export function chunkMarkdown(body: string): string[] {
  const text = (body || "").trim();
  if (!text) return [];

  const blocks = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";

  const flush = () => {
    const t = current.trim();
    if (t.length >= MIN_CHUNK || chunks.length === 0) {
      if (t) chunks.push(t);
    } else if (chunks.length > 0) {
      chunks[chunks.length - 1] = `${chunks[chunks.length - 1]}\n\n${t}`;
    }
    current = "";
  };

  for (const block of blocks) {
    const b = block.trim();
    if (!b) continue;
    if ((current + "\n\n" + b).length > MAX_CHUNK && current.length >= MIN_CHUNK) {
      flush();
    }
    if (b.length > MAX_CHUNK) {
      flush();
      for (let i = 0; i < b.length; i += MAX_CHUNK) {
        chunks.push(b.slice(i, i + MAX_CHUNK));
      }
      continue;
    }
    current = current ? `${current}\n\n${b}` : b;
    if (current.length >= MAX_CHUNK) flush();
  }
  flush();

  return chunks.length ? chunks : [text.slice(0, MAX_CHUNK)];
}
