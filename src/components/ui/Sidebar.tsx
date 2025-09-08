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
      className={`h-screen shadow-md transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      } bg-white dark:bg-gray-900 flex flex-col fixed left-0 top-0 z-10`}
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="p-4 text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white focus:outline-none"
      >
        <FaBars />
      </button>

      {!collapsed && (
        <h2 className="text-md font-semibold px-4 mb-4 text-gray-800 dark:text-white">
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
              className={`flex items-center gap-2 px-3 py-2 rounded transition-all ${
                isActive
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-white"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-2 space-y-2">
        <Link
          href="/dashboard/settings"
          className={`flex items-center gap-2 px-3 py-2 rounded transition-all ${
            pathname === "/dashboard/settings"
              ? "bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-white"
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          <FaCog />
          {!collapsed && <span>Instellingen</span>}
        </Link>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded w-full text-left text-red-600 hover:bg-red-100 dark:hover:bg-red-900 hover:cursor-pointer dark:text-red-400"
        >
          <FaSignOutAlt />
          {!collapsed && <span>Uitloggen</span>}
        </button>
      </div>
    </aside>
  );
}
