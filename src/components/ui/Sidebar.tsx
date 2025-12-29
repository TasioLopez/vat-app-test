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
      className={`h-screen shadow-lg transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      } bg-sidebar border-r border-sidebar-border flex flex-col fixed left-0 top-0 z-10`}
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="p-4 text-sidebar-foreground/70 hover:text-sidebar-foreground focus:outline-none transition-colors duration-200"
      >
        <FaBars />
      </button>

      {!collapsed && (
        <h2 className="text-md font-semibold px-4 mb-4 text-sidebar-foreground">
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
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200 ${
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {!collapsed && <span className="font-medium">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-2 space-y-2 border-t border-sidebar-border">
        <Link
          href="/dashboard/settings"
          className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200 ${
            pathname === "/dashboard/settings"
              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
              : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          }`}
        >
          <FaCog />
          {!collapsed && <span className="font-medium">Instellingen</span>}
        </Link>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-md w-full text-left text-error-600 hover:bg-error-50 dark:hover:bg-error-950/20 hover:cursor-pointer transition-all duration-200"
        >
          <FaSignOutAlt />
          {!collapsed && <span className="font-medium">Uitloggen</span>}
        </button>
      </div>
    </aside>
  );
}
