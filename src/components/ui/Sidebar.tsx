"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  FaTachometerAlt,
  FaUsers,
  FaBriefcase,
  FaUserTie,
  FaFileAlt,
  FaCog,
  FaBars,
  FaSignOutAlt,
} from "react-icons/fa";

export default function Sidebar({
  collapsed,
  setCollapsed,
  role,
}: {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  role: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserName = async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error("❌ Failed to get auth user:", authError?.message);
        return;
      }

      const { data, error } = await supabase
        .from("users") // Ensure this is your correct table name
        .select("first_name")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("❌ Failed to fetch user data:", error.message);
      } else {
        setFirstName(data?.first_name ?? null);
      }
    };

    fetchUserName();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("❌ Logout failed:", error.message);
    } else {
      router.push("/login");
    }
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: <FaTachometerAlt /> },
    ...(role === "admin"
      ? [{ name: "Gebruikers", href: "/dashboard/users", icon: <FaUsers /> }]
      : []),
    { name: "Werkgevers", href: "/dashboard/clients", icon: <FaBriefcase /> },
    { name: "Werknemers", href: "/dashboard/employees", icon: <FaUserTie /> },
    { name: "TP Docs", href: "/dashboard/tpdocs", icon: <FaFileAlt /> },
  ];

  return (
    <aside
      className={`h-screen shadow-xl transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      } bg-gradient-to-b from-purple-900 via-purple-800 to-purple-900 border-r border-purple-700/50 flex flex-col relative flex-shrink-0`}
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="p-4 text-white/80 hover:text-white hover:bg-white/10 focus:outline-none transition-all duration-200 rounded-lg mx-2 mt-2"
      >
        <FaBars className="text-xl" />
      </button>

      {!collapsed && (
        <h2 className="text-lg font-bold px-4 mb-6 text-white mt-4">
          {firstName ? `Hi, ${firstName}` : "Welkom"}
        </h2>
      )}

      <nav className="flex-1 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? "bg-white/20 text-white shadow-lg shadow-purple-500/20 backdrop-blur-sm"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {!collapsed && <span className="font-medium">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-2 space-y-2 border-t border-white/10">
        <Link
          href="/dashboard/settings"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
            pathname === "/dashboard/settings"
              ? "bg-white/20 text-white shadow-lg shadow-purple-500/20 backdrop-blur-sm"
              : "text-white/70 hover:text-white hover:bg-white/10"
          }`}
        >
          <FaCog />
          {!collapsed && <span className="font-medium">Instellingen</span>}
        </Link>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left text-white/70 hover:text-white hover:bg-red-500/20 transition-all duration-200"
        >
          <FaSignOutAlt />
          {!collapsed && <span className="font-medium">Uitloggen</span>}
        </button>
      </div>
    </aside>
  );
}
