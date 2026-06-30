/** Remove OpenAI file_search citations and bracket annotations from assistant text. */
export function stripAssistantArtifacts(text: string): string {
  if (!text) return text;
  return text
    .replace(/【[^】]+】/g, '')
    .replace(/\[\d+:\d+\/[^\]]+\.pdf\]/gi, '')
    .replace(/\[\d+:\d+[^\]]*\]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Strip citation artifacts from string values in a parsed extraction object. */
export function stripAssistantArtifactsFromRecord(
  record: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'string') {
      out[key] = stripAssistantArtifacts(value);
    } else if (Array.isArray(value)) {
      out[key] = value.map((item) =>
        typeof item === 'string' ? stripAssistantArtifacts(item) : item
      );
    } else if (value != null && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = stripAssistantArtifactsFromRecord(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}
