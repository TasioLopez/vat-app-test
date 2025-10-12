"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

export default function DebugUserPage() {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const checkUser = async () => {
      try {
        // Get Supabase Auth user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          setError("No authenticated user found");
          setLoading(false);
          return;
        }

        // Get user record from users table
        const { data: userRecord, error: dbError } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        setUserInfo({
          authUser: {
            id: user.id,
            email: user.email,
            created_at: user.created_at,
            email_confirmed_at: user.email_confirmed_at
          },
          dbUser: userRecord,
          dbError: dbError?.message
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [supabase]);

  const fixUserRecord = async () => {
    if (!userInfo?.authUser) return;

    try {
      const { error } = await supabase
        .from("users")
        .upsert({
          id: userInfo.authUser.id,
          email: userInfo.authUser.email,
          status: "confirmed",
          role: "standard", // Default role
          first_name: "",
          last_name: ""
        });

      if (error) {
        setError(`Failed to create user record: ${error.message}`);
      } else {
        setError(null);
        // Refresh the page to reload user info
        window.location.reload();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading user information...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">User Debug Information</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            Error: {error}
          </div>
        )}

        {userInfo && (
          <div className="space-y-6">
            {/* Supabase Auth User Info */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Supabase Auth User</h2>
              <pre className="bg-gray-100 p-4 rounded overflow-auto">
                {JSON.stringify(userInfo.authUser, null, 2)}
              </pre>
            </div>

            {/* Database User Record */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Database User Record</h2>
              {userInfo.dbUser ? (
                <pre className="bg-gray-100 p-4 rounded overflow-auto">
                  {JSON.stringify(userInfo.dbUser, null, 2)}
                </pre>
              ) : (
                <div className="text-red-600">
                  <p>No user record found in database!</p>
                  <p className="text-sm mt-2">Error: {userInfo.dbError}</p>
                  <button
                    onClick={fixUserRecord}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Create User Record
                  </button>
                </div>
              )}
            </div>

            {/* Status Check */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Login Status Check</h2>
              <div className="space-y-2">
                <p>✅ Supabase Auth User: {userInfo.authUser ? "Found" : "Missing"}</p>
                <p>{userInfo.dbUser ? "✅" : "❌"} Database User Record: {userInfo.dbUser ? "Found" : "Missing"}</p>
                {userInfo.dbUser && (
                  <p>{userInfo.dbUser.status === "confirmed" ? "✅" : "❌"} Status: {userInfo.dbUser.status}</p>
                )}
                {userInfo.dbUser && (
                  <p>✅ Role: {userInfo.dbUser.role}</p>
                )}
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => router.push("/login")}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Back to Login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
