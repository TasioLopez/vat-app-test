'use client';

import { useState } from "react";

export default function AddUserPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleInvite = async () => {
    const res = await fetch("/api/invite-user", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    setMessage(data.message || data.error || "");
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Gebruiker uitnodigen</h1>
      <input
        className="border p-2 mr-2"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email@example.com"
      />
      <button
        onClick={handleInvite}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Uitnodiging verzenden
      </button>
      {message && <p className="mt-4 text-green-600">{message}</p>}
    </div>
  );
}
