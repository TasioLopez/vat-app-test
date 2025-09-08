// src/app/signup/page.tsx
'use client';

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="p-6 max-w-md mx-auto">Laden…</div>}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const token = searchParams.get("token") ?? "";

  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [password,  setPassword]  = useState("");
  const [error,     setError]     = useState("");

  // Create the Supabase browser client once
  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  // 🔄 Prefill names
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!email || !token) {
        setError("Ongeldige of verlopen aanmeldlink.");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("first_name, last_name")
        .eq("email", email)
        .eq("signup_token", token)
        .eq("status", "invited")
        .single();

      if (error || !data) {
        setError("Ongeldige of verlopen aanmeldlink.");
        return;
      }

      setFirstName(data.first_name || "");
      setLastName(data.last_name || "");
    };

    fetchUserInfo();
  }, [email, token, supabase]);

  const handleSignup = async () => {
    setError("");

    if (!email || !token) {
      setError("Ongeldige of verlopen aanmeldlink.");
      return;
    }
    if (!password) {
      setError("Voer een wachtwoord in.");
      return;
    }

    const res = await fetch("/api/complete-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token, firstName, lastName, password }),
    });

    const result = await res.json();

    if (!res.ok) {
      setError(result.error || "Er is iets misgegaan. Probeer het opnieuw.");
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-xl font-semibold mb-4">Voltooi uw aanmelding</h1>
      <p className="text-sm mb-2 text-gray-600">Email: {email || "—"}</p>

      <input
        placeholder="Voornaam"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        className="mb-2 w-full border p-2"
      />
      <input
        placeholder="Achternaam"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        className="mb-2 w-full border p-2"
      />
      <input
        type="password"
        placeholder="Wachtwoord"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mb-2 w-full border p-2"
      />

      <button
        onClick={handleSignup}
        className="bg-blue-600 text-white px-4 py-2 rounded w-full"
      >
        Indienen
      </button>

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
}
