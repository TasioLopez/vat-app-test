"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import Image from "next/image";
import Logo from "@/assets/images/valentinez-logo.png";

export default function LoginPage() {
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const {
      data: authData,
      error: loginError,
    } = await supabase.auth.signInWithPassword({ email, password });

    if (loginError || !authData.session?.user) {
      alert("Ongeldige inloggegevens.");
      return;
    }

    const userId = authData.session.user.id;

    if (!userId || typeof userId !== "string") {
      alert("Unexpected error: Missing or invalid user ID.");
      await supabase.auth.signOut();
      return;
    }

    const { data: userRecord, error: fetchError } = await supabase
      .from("users")
      .select("role, status")
      .eq("id", userId.trim())
      .maybeSingle();

    if (fetchError) {
      alert("Er ging iets mis tijdens de verificatie.");
      await supabase.auth.signOut();
      return;
    }

    if (!userRecord) {
      alert("Unauthorized: Your account is not whitelisted.");
      await supabase.auth.signOut();
      return;
    }

    if (userRecord.status !== "confirmed") {
      alert("Account not confirmed. Contact admin.");
      await supabase.auth.signOut();
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="flex flex-col items-center space-y-4">
        {/* Icon */}
        <Image
          src={Logo}
          alt="Valentinez Logo"
          width={64}
          height={64}
          className="rounded-2xl"
        />

        {/* Title */}
        <h1 className="flex text-3xl font-semibold text-gray-800 mb-12">
          <p className="font-bold">V</p> alentinez <p className="font-bold ml-2"> A</p> ssist <p className="font-bold ml-2"> T</p> ool
        </h1>

        {/* Login Form */}
        <form
          onSubmit={handleLogin}
          className="w-full max-w-xs bg-white p-6 rounded-lg shadow-md space-y-4"
        >
          <h2 className="text-xl font-medium text-center">Inloggen</h2>

          <input
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            type="password"
            placeholder="Wachtwoord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition duration-200"
          >
            Inloggen
          </button>
        </form>
      </div>
    </div>
  );
}
