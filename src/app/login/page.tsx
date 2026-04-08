"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import Image from "next/image";
const Logo = "/branding/vat-app-logo.svg";
import { validateForm, authValidation, type ForgotPasswordFormData } from "@/lib/validation";

export default function LoginPage() {
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetMessage(null);

    try {
      // Validate email
      const validation = validateForm(authValidation.forgotPassword, { email: resetEmail });
      if (!validation.success) {
        const firstError = Object.values(validation.errors || {})[0];
        setResetMessage({ type: 'error', text: firstError || 'Ongeldig e-mailadres' });
        setResetLoading(false);
        return;
      }

      // Check if user exists in the database
      const { data: userRecord, error: userError } = await supabase
        .from("users")
        .select("email, status")
        .eq("email", resetEmail.trim().toLowerCase())
        .maybeSingle();

      if (userError) {
        console.error("Error checking user:", userError);
        setResetMessage({ 
          type: 'error', 
          text: 'Er is een fout opgetreden bij het controleren van je account.' 
        });
        setResetLoading(false);
        return;
      }

      if (!userRecord) {
        // For security, don't reveal if email exists, but log it
        console.warn("Password reset requested for non-existent email:", resetEmail);
        // Still show success message for security (don't reveal if email exists)
        setResetMessage({ 
          type: 'success', 
          text: 'Als dit e-mailadres bestaat in ons systeem, ontvang je een reset link. Controleer je inbox en spam folder.' 
        });
        setResetEmail("");
        setTimeout(() => {
          setShowForgotPassword(false);
          setResetMessage(null);
        }, 5000);
        setResetLoading(false);
        return;
      }

      // Determine the correct redirect URL based on current hostname
      // Always use the current origin to ensure it matches the whitelisted URL in Supabase
      const currentHostname = window.location.hostname;
      const isLocalhost = currentHostname === 'localhost' || currentHostname === '127.0.0.1';
      
      // Use current origin for redirect URL - this must match what's whitelisted in Supabase
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      console.log('Password reset request:', {
        email: resetEmail,
        hostname: currentHostname,
        origin: window.location.origin,
        redirectUrl: redirectUrl,
        isLocalhost: isLocalhost,
        environment: process.env.NODE_ENV
      });

      const { data, error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error("Supabase password reset error:", error);
        
        // Provide more specific error messages
        let errorMessage = 'Er is een fout opgetreden bij het verzenden van de reset link.';
        
        if (error.message.includes('redirect_to')) {
          errorMessage = 'De redirect URL is niet geconfigureerd in Supabase. Neem contact op met de beheerder.';
        } else if (error.message.includes('email')) {
          errorMessage = 'Er is een probleem met het e-mailadres. Controleer of het correct is.';
        } else if (error.message.includes('rate limit') || error.message.includes('too many')) {
          errorMessage = 'Te veel verzoeken. Wacht even en probeer het later opnieuw.';
        } else {
          errorMessage = `Fout: ${error.message}`;
        }
        
        setResetMessage({ type: 'error', text: errorMessage });
        setResetLoading(false);
        return;
      }

      console.log("Password reset email sent successfully:", data);

      setResetMessage({ 
        type: 'success', 
        text: 'Een wachtwoord reset link is verzonden naar je e-mailadres. Controleer je inbox (en spam folder) en klik op de link om je wachtwoord te resetten.' 
      });
      setResetEmail("");
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetMessage(null);
      }, 5000);
    } catch (error: any) {
      console.error("Unexpected error sending reset email:", error);
      setResetMessage({ 
        type: 'error', 
        text: error?.message || 'Er is een onverwachte fout opgetreden. Probeer het later opnieuw of neem contact op met de beheerder.' 
      });
    } finally {
      setResetLoading(false);
    }
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
          
          <button
            type="button"
            onClick={() => setShowForgotPassword(true)}
            className="w-full text-blue-600 hover:text-blue-700 text-sm py-2 transition duration-200"
          >
            Wachtwoord vergeten?
          </button>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-gray-100/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-200 rounded-lg shadow-md p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Wachtwoord Resetten</h3>
            
            {resetMessage && (
              <div className={`mb-4 p-3 rounded ${resetMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {resetMessage.text}
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-mailadres
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Voer je e-mailadres in"
                  required
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetMessage(null);
                    setResetEmail("");
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded transition duration-200"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition duration-200 disabled:opacity-50"
                  disabled={resetLoading}
                >
                  {resetLoading ? 'Verzenden...' : 'Reset Link Verzenden'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
