"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

export default function TicketDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [ticket, setTicket] = useState<{
    subject: string;
    description: string;
    status: string;
    category?: { label_en: string; label_nl?: string };
    escalation_chat_transcript: unknown;
  } | null>(null);
  const [messages, setMessages] = useState<
    { id: string; body: string; created_at: string; author_id: string; is_internal: boolean }[]
  >([]);
  const [reply, setReply] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const load = async () => {
    const res = await fetch(`/api/help/tickets/${id}`);
    const j = await res.json();
    if (res.ok) {
      setTicket(j.ticket);
      setMessages(j.messages || []);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const sendReply = async () => {
    if (!reply.trim()) return;
    const res = await fetch(`/api/help/tickets/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: reply.trim(), isInternal: false }),
    });
    if (res.ok) {
      setReply("");
      load();
    }
  };

  if (!ticket) {
    return <div className="p-10 text-gray-500">Loading…</div>;
  }

  const transcript = ticket.escalation_chat_transcript as
    | { role: string; content: string }[]
    | null
    | undefined;

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 to-purple-50/30 p-6 md:p-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/dashboard/help/tickets" className="text-purple-700 font-medium inline-flex items-center gap-2">
          <FaArrowLeft /> All tickets
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{ticket.subject}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {ticket.category?.label_en} · {ticket.status}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-purple-100 p-4">
          <h2 className="font-semibold text-gray-800 mb-2">Description</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
        </div>
        {transcript && transcript.length > 0 ? (
          <div className="bg-white rounded-xl border border-purple-100 p-4">
            <h2 className="font-semibold text-gray-800 mb-2">Chat transcript (escalation)</h2>
            <ul className="space-y-2 text-sm">
              {transcript.map((m, i) => (
                <li key={i} className="border-l-2 border-purple-200 pl-3">
                  <span className="font-medium text-purple-800">{m.role}:</span>{" "}
                  <span className="text-gray-700 whitespace-pre-wrap">{m.content}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-800">Messages</h2>
          {messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-xl p-3 text-sm ${
                m.author_id === userId ? "bg-purple-50 ml-8" : "bg-white border border-purple-100 mr-8"
              }`}
            >
              <p className="whitespace-pre-wrap text-gray-800">{m.body}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(m.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={3}
            className="flex-1 rounded-xl border border-purple-200 px-3 py-2"
            placeholder="Add a follow-up message…"
          />
          <button
            type="button"
            onClick={sendReply}
            className="self-end px-4 py-2 rounded-xl bg-purple-700 text-white font-medium"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
