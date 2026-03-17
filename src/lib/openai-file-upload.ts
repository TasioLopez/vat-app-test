/**
 * Returns filename and MIME type safe for OpenAI files.create().
 * Normalizes .docm to .docx (OpenAI does not accept .docm extension).
 */
export function getOpenAIFileParams(pathOrFilename: string): {
  filename: string;
  mimeType: string;
} {
  const DOCX_MIME =
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const filename = pathOrFilename.includes("/")
    ? pathOrFilename.split("/").pop()!
    : pathOrFilename;
  const lower = filename.toLowerCase();
  if (lower.endsWith(".docm")) {
    return {
      filename: filename.slice(0, -5) + ".docx",
      mimeType: DOCX_MIME,
    };
  }
  if (lower.endsWith(".docx")) {
    return { filename, mimeType: DOCX_MIME };
  }
  return { filename, mimeType: "application/pdf" };
}
