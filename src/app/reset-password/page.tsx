"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import Image from "next/image";
const Logo = "/branding/vat-app-logo.svg";
import PasswordStrengthIndicator from "@/components/ui/PasswordStrengthIndicator";
import { validateForm, passwordValidation } from "@/lib/validation";

function ResetPasswordContent() {
  const router = useRouter();
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
        // Ensure PKCE/hash callback from the email link is applied to storage before we validate
        await supabase.auth.getSession();
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Controleer reset link...</p>
        </div>
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="flex flex-col items-center space-y-4">
          <Image
            src={Logo}
            alt="Valentinez Logo"
            width={64}
            height={64}
            className="rounded-2xl"
          />
          <h1 className="flex text-3xl font-semibold text-gray-800 mb-6">
            <p className="font-bold">V</p> alentinez <p className="font-bold ml-2"> A</p> ssist <p className="font-bold ml-2"> T</p> ool
          </h1>
          <h2 className="text-xl font-medium text-center">Wachtwoord Reset</h2>
          
          {message && (
            <div className={`w-full max-w-xs mt-4 p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {message.text}
            </div>
          )}

          <div className="mt-6 text-center w-full max-w-xs">
            <button
              onClick={() => router.push("/login")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition duration-200"
            >
              Terug naar Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="flex flex-col items-center space-y-4">
        <Image
          src={Logo}
          alt="Valentinez Logo"
          width={64}
          height={64}
          className="rounded-2xl"
        />
        <h1 className="flex text-3xl font-semibold text-gray-800 mb-6">
          <p className="font-bold">V</p> alentinez <p className="font-bold ml-2"> A</p> ssist <p className="font-bold ml-2"> T</p> ool
        </h1>
        {message && (
          <div className={`w-full max-w-xs mb-4 p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleResetPassword} className="w-full max-w-xs bg-white shadow-md rounded-lg p-6 border border-gray-200 space-y-4">
          <h2 className="text-xl font-medium text-center">Nieuw Wachtwoord</h2>
          <p className="text-sm text-gray-600 text-center">
            Voer een nieuw sterk wachtwoord in voor je account
          </p>
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

        <div className="mt-4 text-center w-full max-w-xs">
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Laden...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
