"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { SELECT_CLASS } from "@/lib/select-class";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function InviteUserModal({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (b: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<"form" | "success">("form");

  const resetForm = () => {
    setEmail("");
    setFirstName("");
    setLastName("");
    setRole("user");
    setMessage("");
  };

  useEffect(() => {
    if (open) return;
    setStep("form");
    resetForm();
  }, [open]);

  const inviteUser = async () => {
    if (!email || !firstName || !lastName) return;
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/invite-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ email, first_name: firstName, last_name: lastName, role }),
    });

    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Error inviting user.");
    } else {
      setMessage(data.message || "Invite sent!");
      setStep("success");
    }

    setLoading(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex justify-center items-center">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
        {step === "form" ? (
          <>
            <h2 className="text-xl font-semibold mb-4">Gebruiker uitnodigen</h2>
            <input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-2 w-full border px-3 py-2 rounded"
            />
            <input
              placeholder="Voornaam"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mb-2 w-full border px-3 py-2 rounded"
            />
            <input
              placeholder="Achternaam"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mb-2 w-full border px-3 py-2 rounded"
            />
            <Select value={role} onValueChange={(v) => setRole(v as "user" | "admin")}>
              <SelectTrigger className={cn("mb-4", SELECT_CLASS)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Gebruiker</SelectItem>
                <SelectItem value="admin">Beheerder</SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={inviteUser}
              disabled={loading || !email || !firstName || !lastName}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Verzenden..." : "Uitnodiging verzenden"}
            </button>
            {message && <p className="mt-2 text-sm text-red-600">{message}</p>}
            <button onClick={() => setOpen(false)} className="text-sm text-gray-500 mt-2">
              Cancel
            </button>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold mb-2">Uitnodiging verzonden</h2>
            <p className="text-sm text-gray-600 mb-5">
              De uitnodiging is succesvol verzonden naar {email}.
            </p>
            <button
              onClick={() => {
                setStep("form");
                resetForm();
              }}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Nog iemand uitnodigen
            </button>
            <button onClick={() => setOpen(false)} className="text-sm text-gray-500 mt-3">
              Sluiten
            </button>
          </>
        )}
      </div>
    </div>
  );
}
