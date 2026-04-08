"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Image from "next/image";
import {
  FaTachometerAlt,
  FaUsers,
  FaBriefcase,
  FaUserTie,
  FaFileAlt,
  FaCog,
  FaBars,
  FaSignOutAlt,
  FaLifeRing,
  FaTools,
  FaChevronLeft,
} from "react-icons/fa";
import { useUnsavedChangesGuard } from "@/context/UnsavedChangesGuardContext";

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
  const { attemptNavigate } = useUnsavedChangesGuard();

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
      attemptNavigate("/login");
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
    { name: "Help", href: "/dashboard/help", icon: <FaLifeRing /> },
    ...(role === "admin"
      ? [{ name: "Helpbeheer", href: "/dashboard/help/admin", icon: <FaTools /> }]
      : []),
  ];

  return (
    <aside
      className={`h-screen shadow-xl transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      } bg-gradient-to-b from-purple-900 via-purple-800 to-purple-900 border-r border-purple-700/50 flex flex-col fixed left-0 top-0 z-10 flex-shrink-0`}
    >
      <div
        className={`flex w-full shrink-0 items-center px-2 pb-1 pt-2 ${
          collapsed ? "justify-center" : "justify-between gap-2"
        }`}
      >
        {collapsed ? (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="shrink-0 rounded-lg p-2 text-white/80 transition-all duration-200 hover:bg-white/10 hover:text-white focus:outline-none"
            aria-expanded={false}
            aria-label="Menu openen"
          >
            <FaBars className="text-xl" />
          </button>
        ) : (
          <>
            <div className="flex min-w-0 flex-1 items-center pl-1">
              <Image
                src="/branding/vat-app-logo.svg"
                alt="Valentinez Assist Tool"
                width={88}
                height={36}
                className="h-auto w-auto max-h-9 max-w-[88px] object-contain object-left"
                sizes="88px"
                priority
              />
            </div>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="shrink-0 rounded-lg p-2 text-white/80 transition-all duration-200 hover:bg-white/10 hover:text-white focus:outline-none"
              aria-expanded={true}
              aria-label="Menu sluiten"
            >
              <FaChevronLeft className="text-xl" aria-hidden />
            </button>
          </>
        )}
      </div>

      {!collapsed && (
        <h2 className="mb-6 mt-4 px-4 text-lg font-bold text-white">
          {firstName ? `Hi, ${firstName}` : "Welkom"}
        </h2>
      )}

      <nav className="flex-1 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => {
                e.preventDefault();
                attemptNavigate(item.href);
              }}
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
          onClick={(e) => {
            e.preventDefault();
            attemptNavigate("/dashboard/settings");
          }}
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
