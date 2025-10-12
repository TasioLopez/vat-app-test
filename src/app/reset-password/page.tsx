"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import Image from "next/image";
import Logo from "@/assets/images/valentinez-logo.png";
import PasswordStrengthIndicator from "@/components/ui/PasswordStrengthIndicator";
import { validateForm, passwordValidation, type ResetPasswordFormData } from "@/lib/validation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check if we have a valid session from the reset link
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          setMessage({ 
            type: 'error', 
            text: 'Ongeldige of verlopen reset link. Vraag een nieuwe reset link aan.' 
          });
          setIsValidSession(false);
        } else {
          setIsValidSession(true);
        }
      } catch (error) {
        console.error("Error checking session:", error);
        setMessage({ 
          type: 'error', 
          text: 'Er is een fout opgetreden. Probeer het opnieuw.' 
        });
        setIsValidSession(false);
      } finally {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, [supabase]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Validate password reset form
      const validation = validateForm(
        passwordValidation.resetPassword,
        { newPassword, confirmPassword }
      );

      if (!validation.success) {
        const firstError = Object.values(validation.errors || {})[0];
        setMessage({ type: 'error', text: firstError || 'Validatiefout' });
        return;
      }

      // Update password using Supabase
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      setMessage({ 
        type: 'success', 
        text: 'Wachtwoord succesvol gewijzigd! Je wordt doorgestuurd naar de login pagina.' 
      });

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error) {
      console.error("Error resetting password:", error);
      setMessage({ type: 'error', text: 'Er is een fout opgetreden bij het resetten van het wachtwoord.' });
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Controleer reset link...</p>
        </div>
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="w-full max-w-md bg-white shadow rounded-lg p-6">
          <div className="flex flex-col items-center space-y-4">
            <Image
              src={Logo}
              alt="Valentinez Logo"
              width={48}
              height={48}
              className="rounded-xl"
            />
            <h1 className="text-xl font-semibold text-gray-800">Wachtwoord Reset</h1>
          </div>
          
          {message && (
            <div className={`mt-4 p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {message.text}
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push("/login")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition duration-200"
            >
              Terug naar Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white shadow rounded-lg p-6">
        <div className="flex flex-col items-center space-y-4 mb-6">
          <Image
            src={Logo}
            alt="Valentinez Logo"
            width={48}
            height={48}
            className="rounded-xl"
          />
          <h1 className="text-xl font-semibold text-gray-800">Nieuw Wachtwoord</h1>
          <p className="text-sm text-gray-600 text-center">
            Voer een nieuw sterk wachtwoord in voor je account
          </p>
        </div>
        
        {message && (
          <div className={`mb-4 p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nieuw wachtwoord
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Voer nieuw wachtwoord in"
              required
            />
            <PasswordStrengthIndicator password={newPassword} />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bevestig nieuw wachtwoord
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Bevestig nieuw wachtwoord"
              required
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-sm text-red-600 mt-1">Wachtwoorden komen niet overeen</p>
            )}
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
          >
            {loading ? 'Wachtwoord opslaan...' : 'Wachtwoord Opslaan'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => router.push("/login")}
            className="text-blue-600 hover:text-blue-700 text-sm transition duration-200"
          >
            Terug naar Login
          </button>
        </div>
      </div>
    </div>
  );
}
