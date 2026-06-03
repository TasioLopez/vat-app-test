export function parseJsonFromAssistant(responseText: string): Record<string, unknown> {
  if (!responseText || typeof responseText !== 'string') {
    console.warn('⚠️ Empty or invalid response text');
    return {};
  }

  let cleanedResponse = responseText.trim();
  cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  const firstBrace = cleanedResponse.indexOf('{');
  if (firstBrace === -1) {
    console.warn('⚠️ No JSON object found in response. Response preview:', cleanedResponse.substring(0, 200));
    return {};
  }

  let braceCount = 0;
  let lastBrace = -1;
  for (let i = firstBrace; i < cleanedResponse.length; i++) {
    if (cleanedResponse[i] === '{') braceCount++;
    if (cleanedResponse[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        lastBrace = i;
        break;
      }
    }
  }

  if (lastBrace === -1) {
    console.warn('⚠️ No matching closing brace found. Response preview:', cleanedResponse.substring(0, 200));
    return {};
  }

  cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);

  try {
    const parsed = JSON.parse(cleanedResponse);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('⚠️ JSON parsing error:', message);
    console.warn('📄 Attempted to parse:', cleanedResponse.substring(0, 200));
    return {};
  }
}
