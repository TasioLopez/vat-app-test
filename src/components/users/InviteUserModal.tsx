"use client";

import { useState } from "react";

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

  const inviteUser = async () => {
    setLoading(true);
    const res = await fetch("/api/invite-user", {
      method: "POST",
      body: JSON.stringify({ email, first_name: firstName, last_name: lastName, role }),
    });

    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Error inviting user.");
    } else {
      setMessage(data.message || "Invite sent!");
    }

    setLoading(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex justify-center items-center">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
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
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "user" | "admin")}
          className="mb-4 w-full border px-3 py-2 rounded"
        >
          <option value="user">Gebruiker</option>
          <option value="admin">Beheerder</option>
        </select>
        <button
          onClick={inviteUser}
          disabled={loading}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {loading ? "Verzenden..." : "Uitnodiging verzenden"}
        </button>
        {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
        <button
          onClick={() => setOpen(false)}
          className="text-sm text-gray-500 mt-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
