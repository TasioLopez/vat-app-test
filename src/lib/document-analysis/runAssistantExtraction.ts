import type OpenAI from 'openai';
import { buildOpenAIFile } from '@/lib/openai-file-upload';
import { parseJsonFromAssistant } from './parseJsonResponse';

export type RunAssistantExtractionOptions = {
  buffer: Buffer;
  /** Storage path or filename used for OpenAI extension/MIME rules (docm → docx). */
  storagePath: string;
  /** Used when storagePath has no extension (e.g. type-only label). */
  fallbackName?: string;
  assistantName: string;
  instructions: string;
  userMessage: string;
  model?: string;
};

export async function runAssistantExtraction(
  openai: OpenAI,
  options: RunAssistantExtractionOptions
): Promise<{ rawText: string; parsed: Record<string, unknown> }> {
  const {
    buffer,
    storagePath,
    fallbackName,
    assistantName,
    instructions,
    userMessage,
    model = 'gpt-4o',
  } = options;

  const assistant = await openai.beta.assistants.create({
    name: assistantName,
    instructions,
    model,
    tools: [{ type: 'file_search' }],
  });

  const uploadFile = buildOpenAIFile(buffer, storagePath, fallbackName);

  const uploadedFile = await openai.files.create({
    file: uploadFile,
    purpose: 'assistants',
  });

  try {
    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: 'user',
          content: userMessage,
          attachments: [{ file_id: uploadedFile.id, tools: [{ type: 'file_search' }] }],
        },
      ],
    });

    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistant.id,
    });

    if (run.status !== 'completed') {
      throw new Error(`Assistant run failed: ${run.status}`);
    }

    const messages = await openai.beta.threads.messages.list(thread.id);
    const first = messages.data[0]?.content[0];
    if (first?.type !== 'text') {
      return { rawText: '', parsed: {} };
    }

    const rawText = first.text.value;
    const parsed = parseJsonFromAssistant(rawText);
    return { rawText, parsed };
  } finally {
    await openai.beta.assistants.delete(assistant.id).catch(() => {});
    await openai.files.delete(uploadedFile.id).catch(() => {});
  }
}
