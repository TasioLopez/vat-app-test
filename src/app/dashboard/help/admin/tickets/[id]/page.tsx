"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { toast } from "sonner";
import { useHelpNotifications } from "@/context/HelpNotificationsContext";
import {
  TICKET_PRIORITY_VALUES,
  TICKET_STATUS_VALUES,
  ticketPriorityLabelNl,
  ticketStatusLabelNl,
} from "@/lib/help/ticket-labels";

export default function AdminTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { refresh: refreshNotifications } = useHelpNotifications();
  const [ticket, setTicket] = useState<Record<string, unknown> | null>(null);
  const [messages, setMessages] = useState<
    { id: string; body: string; is_internal: boolean; author_id: string; created_at: string }[]
  >([]);
  const [reply, setReply] = useState("");
  const [internalReply, setInternalReply] = useState(false);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/help/tickets/${id}`);
    const j = await res.json();
    if (res.ok) {
      setTicket(j.ticket);
      setMessages(j.messages || []);
      setStatus((j.ticket.status as string) || "open");
      setPriority((j.ticket.priority as string) || "normal");
      setInternalNotes((j.ticket.internal_notes as string) || "");
      await fetch(`/api/help/tickets/${id}/mark-read`, { method: "POST" });
      await refreshNotifications();
    } else {
      toast.error(j.error || "Laden mislukt");
    }
  }, [id, refreshNotifications]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchTicket = async () => {
    const res = await fetch(`/api/help/admin/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        priority,
        internalNotes: internalNotes || null,
      }),
    });
    if (!res.ok) {
      const j = await res.json();
      toast.error(j.error || "Bijwerken mislukt");
      return;
    }
    toast.success("Ticket bijgewerkt");
    await load();
    await refreshNotifications();
    if (status === "closed" || status === "resolved") {
      router.push("/dashboard/help/admin/tickets");
    }
  };

  const sendMsg = async () => {
    if (!reply.trim()) return;
    const res = await fetch(`/api/help/tickets/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: reply.trim(), isInternal: internalReply }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(j.error || "Bericht versturen mislukt");
      return;
    }
    setReply("");
    toast.success("Bericht toegevoegd");
    await load();
    await refreshNotifications();
  };

  if (!ticket) return <div className="p-8">Laden…</div>;

  const transcript = ticket.escalation_chat_transcript as
    | { role: string; content: string }[]
    | null
    | undefined;

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <Link href="/dashboard/help/admin/tickets" className="text-purple-700 inline-flex items-center gap-2">
        <FaArrowLeft /> Alle tickets
      </Link>
      <h1 className="text-2xl font-bold">{String(ticket.subject)}</h1>
      <div className="grid sm:grid-cols-2 gap-3 bg-white border border-purple-100 rounded-xl p-4">
        <label className="text-sm">
          Status
          <select
            className="w-full border rounded-lg mt-1 px-2 py-2"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {TICKET_STATUS_VALUES.map((s) => (
              <option key={s} value={s}>
                {ticketStatusLabelNl(s)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Prioriteit
          <select
            className="w-full border rounded-lg mt-1 px-2 py-2"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            {TICKET_PRIORITY_VALUES.map((p) => (
              <option key={p} value={p}>
                {ticketPriorityLabelNl(p)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          Interne notities
          <textarea
            className="w-full border rounded-lg mt-1 px-2 py-2 min-h-[80px]"
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={() => void patchTicket()}
          className="sm:col-span-2 px-4 py-2 bg-purple-700 text-white rounded-lg"
        >
          Ticketvelden opslaan
        </button>
      </div>
      <div className="bg-white border border-purple-100 rounded-xl p-4">
        <h2 className="font-semibold mb-2">Beschrijving</h2>
        <p className="text-gray-700 whitespace-pre-wrap">{String(ticket.description)}</p>
      </div>
      {transcript && transcript.length > 0 ? (
        <div className="bg-white border border-purple-100 rounded-xl p-4">
          <h2 className="font-semibold mb-2">Escalatie: chatgeschiedenis</h2>
          <ul className="text-sm space-y-1">
            {transcript.map((m, i) => (
              <li key={i}>
                <strong>{m.role}:</strong> {m.content}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="space-y-2">
        <h2 className="font-semibold">Discussie</h2>
        {messages.map((m) => (
          <div
            key={m.id}
            className={`text-sm p-3 rounded-lg ${m.is_internal ? "bg-amber-50 border border-amber-100" : "bg-gray-50"}`}
          >
            {m.is_internal ? <span className="text-amber-800 font-medium">Intern · </span> : null}
            {m.body}
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={internalReply} onChange={(e) => setInternalReply(e.target.checked)} />
          Interne notitie (niet zichtbaar voor aanvrager)
        </label>
        <textarea
          className="w-full border rounded-lg p-3"
          rows={3}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
        />
        <button
          type="button"
          onClick={() => void sendMsg()}
          className="px-4 py-2 bg-purple-700 text-white rounded-lg"
        >
          Bericht toevoegen
        </button>
      </div>
    </div>
  );
}
