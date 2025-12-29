'use client';

import { useState } from "react";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Gebruiker uitnodigen</h1>
        <p className="text-muted-foreground">Nodig een nieuwe gebruiker uit via e-mail</p>
      </div>
      <div className="flex gap-3 items-end max-w-md">
        <div className="flex-1">
          <label className="text-sm font-medium text-muted-foreground mb-1 block">E-mailadres</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
          />
        </div>
        <Button onClick={handleInvite}>
          Uitnodiging verzenden
        </Button>
      </div>
      {message && <p className="text-success-600">{message}</p>}
    </div>
  );
}
