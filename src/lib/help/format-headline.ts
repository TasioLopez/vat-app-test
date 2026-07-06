/** Escape HTML and render ts_headline **markers** as <strong> (no raw HTML). */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatSearchHeadline(headline: string): string {
  const escaped = escapeHtml(headline);
  return escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}
