import OpenAI from "openai";
import { getSessionUserWithRole } from "@/lib/help/auth";
import { rateLimitChat } from "@/lib/help/rate-limit";
import { chatBodySchema } from "@/lib/help/schemas";
import { buildSystemPrompt } from "@/lib/help/prompts";
import { retrieveContext } from "@/lib/help/retrieval";
import { CHAT_MODEL } from "@/lib/help/constants";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const session = await getSessionUserWithRole();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const limited = rateLimitChat(session.userId);
  if (!limited.ok) {
    return new Response(
      JSON.stringify({ error: "Too many requests", retryAfter: limited.retryAfter }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = chatBodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid body", details: parsed.error.flatten() }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { messages, locale } = parsed.data;
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const query = lastUser?.content?.trim() || "";

  const { chunks, lowConfidence } = await retrieveContext(query, locale);
  const systemPrompt = buildSystemPrompt(locale, chunks, lowConfidence);

  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
  ];

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const stream = await openai.chat.completions.create({
    model: CHAT_MODEL,
    stream: true,
    temperature: 0.3,
    max_tokens: 2500,
    messages: openaiMessages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const part of stream) {
          const d = part.choices[0]?.delta?.content;
          if (d) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: d })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (e) {
        console.error("help chat stream", e);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
