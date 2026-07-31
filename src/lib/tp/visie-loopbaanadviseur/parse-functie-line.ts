/**
 * Parse a Visie LA functie bullet into title + description.
 * Prefers colon separator; falls back to spaced en/em dash (legacy), never ASCII hyphen.
 */
export function parseFunctieLine(line: string): { title: string; description: string } | null {
  const content = line.trim().replace(/^[•☑✓\-]\s*/, '');
  if (!content) return null;

  const boldColon = content.match(/^\*\*(.+?)\*\*\s*:\s*(.+)$/);
  if (boldColon) {
    return { title: boldColon[1].trim(), description: boldColon[2].trim() };
  }

  const plainColon = content.match(/^(.+?)\s*:\s*(.+)$/);
  if (plainColon) {
    return { title: plainColon[1].trim(), description: plainColon[2].trim() };
  }

  const boldDash = content.match(/^\*\*(.+?)\*\*\s+[–—]\s+(.+)$/);
  if (boldDash) {
    return { title: boldDash[1].trim(), description: boldDash[2].trim() };
  }

  const plainDash = content.match(/^(.+?)\s+[–—]\s+(.+)$/);
  if (plainDash) {
    return { title: plainDash[1].trim(), description: plainDash[2].trim() };
  }

  const boldOnly = content.match(/^\*\*(.+?)\*\*$/);
  if (boldOnly) {
    return { title: boldOnly[1].trim(), description: '' };
  }

  return { title: content, description: '' };
}
