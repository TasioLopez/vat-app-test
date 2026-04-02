"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { FaArrowLeft, FaPaperPlane } from "react-icons/fa";
import type { HelpLocale } from "@/lib/help/constants";

type Msg = { role: "user" | "assistant"; content: string };

export default function HelpChatPage() {
  const [locale, setLocale] = useState<HelpLocale>("en");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState("");
  const [busy, setBusy] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<
    { id: string; label_en: string; label_nl: string }[]
  >([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadCategories = useCallback(async () => {
    const res = await fetch("/api/help/ticket-categories");
    const j = await res.json();
    setCategories(j.categories || []);
    if (j.categories?.[0]?.id) setCategoryId(j.categories[0].id);
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setBusy(true);
    setStreaming("");

    try {
      const res = await fetch("/api/help/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          locale,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setMessages([...next, { role: "assistant", content: j.error || "Request failed." }]);
        setBusy(false);
        return;
      }

      const reader = res.body?.getReader();
      const dec = new TextDecoder();
      let lineBuf = "";
      let assistantText = "";
      if (!reader) {
        setBusy(false);
        return;
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        lineBuf += dec.decode(value, { stream: true });
        const lines = lineBuf.split("\n");
        lineBuf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const p = JSON.parse(payload);
            if (p.text) {
              assistantText += p.text;
              setStreaming(assistantText);
            }
            if (p.error) {
              assistantText += `\n[Error: ${p.error}]`;
              setStreaming(assistantText);
            }
          } catch {
            /* ignore */
          }
        }
      }

      setMessages([...next, { role: "assistant", content: assistantText }]);
      setStreaming("");
    } catch {
      setMessages([...next, { role: "assistant", content: "Network error." }]);
    } finally {
      setBusy(false);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const openEscalate = async () => {
    await loadCategories();
    setEscalateOpen(true);
  };

  const submitTicket = async () => {
    if (!categoryId || !ticketSubject.trim()) return;
    const transcript = messages.map((m) => ({
      role: m.role,
      content: m.content,
      createdAt: new Date().toISOString(),
    }));
    const res = await fetch("/api/help/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId,
        subject: ticketSubject.trim(),
        description: "Escalated from help chat.",
        escalationChatTranscript: transcript,
      }),
    });
    const j = await res.json();
    if (res.ok) {
      setEscalateOpen(false);
      setTicketSubject("");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Ticket created. You can track it under Help → My tickets (id: ${j.id}).`,
        },
      ]);
    } else {
      alert(j.error || "Failed to create ticket");
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-gradient-to-br from-gray-50 to-purple-50/30">
      <div className="border-b border-purple-100 bg-white/90 px-6 py-4 flex flex-wrap items-center gap-4 justify-between">
        <Link href="/dashboard/help" className="text-purple-700 font-medium inline-flex items-center gap-2">
          <FaArrowLeft /> Help home
        </Link>
        <div className="flex gap-2 items-center">
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as HelpLocale)}
            className="rounded-lg border border-purple-200 px-3 py-2 text-sm"
          >
            <option value="en">English</option>
            <option value="nl">Nederlands</option>
          </select>
          <button
            type="button"
            onClick={openEscalate}
            className="px-4 py-2 rounded-xl bg-purple-100 text-purple-900 text-sm font-semibold"
          >
            Contact support / ticket
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full space-y-4">
        {messages.length === 0 && !streaming ? (
          <p className="text-gray-600 text-center py-12">
            Ask a question about the app. Answers use the knowledge base when possible.
          </p>
        ) : null}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-2xl px-4 py-3 max-w-[90%] ${
              m.role === "user"
                ? "bg-purple-700 text-white ml-auto"
                : "bg-white border border-purple-100 text-gray-800"
            }`}
          >
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
          </div>
        ))}
        {streaming ? (
          <div className="rounded-2xl px-4 py-3 max-w-[90%] bg-white border border-purple-100 text-gray-800">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{streaming}</p>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-purple-100 bg-white p-4 max-w-3xl mx-auto w-full">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            placeholder="Type your question…"
            className="flex-1 rounded-xl border-2 border-purple-200 px-4 py-3 focus:border-purple-500 outline-none resize-none"
          />
          <button
            type="button"
            disabled={busy}
            onClick={send}
            className="self-end px-5 py-3 rounded-xl bg-purple-700 text-white disabled:opacity-50"
          >
            <FaPaperPlane />
          </button>
        </div>
      </div>

      {escalateOpen ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900">Create support ticket</h2>
            <p className="text-sm text-gray-600">
              The full chat thread will be attached. We respond within 3 business days.
            </p>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-lg border border-purple-200 px-3 py-2"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {locale === "nl" ? c.label_nl : c.label_en}
                </option>
              ))}
            </select>
            <label className="block text-sm font-medium text-gray-700">Subject</label>
            <input
              value={ticketSubject}
              onChange={(e) => setTicketSubject(e.target.value)}
              className="w-full rounded-lg border border-purple-200 px-3 py-2"
              placeholder="Short summary"
            />
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setEscalateOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitTicket}
                className="px-4 py-2 rounded-lg bg-purple-700 text-white font-semibold"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
