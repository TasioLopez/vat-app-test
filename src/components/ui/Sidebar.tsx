"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  UserRound,
  FileText,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  LifeBuoy,
  Wrench,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";
import { useUnsavedChangesGuard } from "@/context/UnsavedChangesGuardContext";
import { useHelpNotifications } from "@/context/HelpNotificationsContext";
import { canAccessUsersAdmin, isAdmin } from "@/lib/auth/roles";

type NavItem = {
  name: string;
  href: string;
  icon: ReactNode;
  badge?: "help" | "helpAdmin";
};

type NavGroup = {
  id: string;
  label?: string;
  items: NavItem[];
};

export default function Sidebar({
  collapsed,
  setCollapsed,
  role,
  variant = "desktop",
  onNavigate,
}: {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  role: string;
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { attemptNavigate } = useUnsavedChangesGuard();
  const { userTicketUnread, adminTicketUnread } = useHelpNotifications();
  const isMobile = variant === "mobile";
  const showLabels = isMobile || !collapsed;

  const [firstName, setFirstName] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(
    () => pathname.startsWith("/dashboard/help")
  );
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const fetchUserName = async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) return;

      const { data } = await supabase
        .from("users")
        .select("first_name")
        .eq("id", user.id)
        .single();

      setFirstName(data?.first_name ?? null);
    };

    fetchUserName();
  }, []);

  useEffect(() => {
    if (pathname.startsWith("/dashboard/help")) setHelpOpen(true);
  }, [pathname]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) attemptNavigate("/login");
  };

  const go = (href: string) => {
    attemptNavigate(href);
    onNavigate?.();
  };

  const groups: NavGroup[] = [
    {
      id: "home",
      items: [
        {
          name: "Dashboard",
          href: "/dashboard",
          icon: <LayoutDashboard className="h-5 w-5" />,
        },
      ],
    },
    {
      id: "werk",
      label: "Werk",
      items: [
        {
          name: "Werknemers",
          href: "/dashboard/employees",
          icon: <UserRound className="h-5 w-5" />,
        },
        {
          name: "Werkgevers",
          href: "/dashboard/clients",
          icon: <Briefcase className="h-5 w-5" />,
        },
        {
          name: "Reserveren",
          href: "/dashboard/reserveren",
          icon: <CalendarDays className="h-5 w-5" />,
        },
      ],
    },
    {
      id: "documenten",
      label: "Documenten",
      items: [
        {
          name: "Documenten",
          href: "/dashboard/tpdocs",
          icon: <FileText className="h-5 w-5" />,
        },
      ],
    },
    {
      id: "support",
      label: "Support",
      items: [
        {
          name: "Help",
          href: "/dashboard/help",
          icon: <LifeBuoy className="h-5 w-5" />,
          badge: "help",
        },
      ],
    },
    ...(canAccessUsersAdmin(role)
      ? [
          {
            id: "beheer",
            label: "Beheer",
            items: [
              {
                name: "Gebruikers",
                href: "/dashboard/users",
                icon: <Users className="h-5 w-5" />,
              },
            ],
          } satisfies NavGroup,
        ]
      : []),
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/dashboard/help") {
      return (
        pathname === "/dashboard/help" ||
        (pathname.startsWith("/dashboard/help/") &&
          !pathname.startsWith("/dashboard/help/admin"))
      );
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const badgeFor = (badge?: NavItem["badge"]) => {
    if (badge === "help") return userTicketUnread;
    if (badge === "helpAdmin") return adminTicketUnread;
    return 0;
  };

  const linkClass = (active: boolean) =>
    `relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
      active
        ? "bg-white/15 text-white"
        : "text-white/75 hover:bg-white/10 hover:text-white"
    } ${showLabels ? "" : "justify-center"}`;

  const renderItem = (item: NavItem) => {
    const active = isActive(item.href);
    const badgeCount = badgeFor(item.badge);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={(e) => {
          e.preventDefault();
          go(item.href);
        }}
        className={linkClass(active)}
        title={!showLabels ? item.name : undefined}
      >
        <span className="relative shrink-0">
          {item.icon}
          {!showLabels && badgeCount > 0 ? (
            <span
              className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-amber-400"
              aria-hidden
            />
          ) : null}
        </span>
        {showLabels && <span className="min-w-0 flex-1 font-medium">{item.name}</span>}
        {showLabels && badgeCount > 0 ? (
          <span className="shrink-0 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-[var(--color-primary-900)]">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <aside
      className={`flex h-full flex-col overflow-x-hidden border-r border-white/10 bg-[var(--color-primary-800)] ${
        isMobile
          ? "w-full"
          : `fixed left-0 top-0 z-10 h-screen flex-shrink-0 transition-[width] duration-200 ${
              collapsed ? "w-16" : "w-64"
            }`
      }`}
    >
      <div
        className={`flex w-full shrink-0 items-center px-3 pb-2 pt-3 ${
          showLabels ? "justify-between gap-2" : "justify-center"
        }`}
      >
        {showLabels ? (
          <>
            <div className="flex min-w-0 flex-1 items-center pl-1">
              <Image
                src="/branding/vat-app-logo.svg"
                alt="ValentineZ Assist Tool"
                width={88}
                height={36}
                className="h-auto w-auto max-h-9 max-w-[88px] object-contain object-left"
                sizes="88px"
                priority
              />
            </div>
            {isMobile ? (
              <button
                type="button"
                onClick={onNavigate}
                className="shrink-0 rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white"
                aria-label="Menu sluiten"
              >
                <X className="h-5 w-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="shrink-0 rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white"
                aria-label="Menu inklappen"
              >
                <PanelLeftClose className="h-5 w-5" />
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="shrink-0 rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Menu uitklappen"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-2 pb-3 pt-2">
        {groups.map((group) => (
          <div key={group.id} className="space-y-1">
            {group.label && showLabels ? (
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/45">
                {group.label}
              </p>
            ) : null}
            {group.items.map((item) => {
              if (item.href === "/dashboard/help" && isAdmin(role)) {
                const helpActive =
                  pathname === "/dashboard/help" ||
                  pathname.startsWith("/dashboard/help/");
                const adminActive = pathname.startsWith("/dashboard/help/admin");
                return (
                  <div key={item.href} className="space-y-1">
                    <div className="flex items-stretch gap-1">
                      <Link
                        href={item.href}
                        onClick={(e) => {
                          e.preventDefault();
                          go(item.href);
                        }}
                        className={`${linkClass(
                          helpActive && !adminActive
                        )} min-w-0 flex-1`}
                        title={!showLabels ? item.name : undefined}
                      >
                        <span className="relative shrink-0">
                          {item.icon}
                          {!showLabels && userTicketUnread > 0 ? (
                            <span
                              className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-amber-400"
                              aria-hidden
                            />
                          ) : null}
                        </span>
                        {showLabels && (
                          <span className="min-w-0 flex-1 font-medium">{item.name}</span>
                        )}
                        {showLabels && userTicketUnread > 0 ? (
                          <span className="shrink-0 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-[var(--color-primary-900)]">
                            {userTicketUnread > 99 ? "99+" : userTicketUnread}
                          </span>
                        ) : null}
                      </Link>
                      {showLabels ? (
                        <button
                          type="button"
                          onClick={() => setHelpOpen((o) => !o)}
                          className="rounded-lg px-2 text-white/70 hover:bg-white/10 hover:text-white"
                          aria-expanded={helpOpen}
                          aria-label="Helpbeheer tonen"
                        >
                          {helpOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      ) : null}
                    </div>
                    {showLabels && helpOpen ? (
                      <Link
                        href="/dashboard/help/admin"
                        onClick={(e) => {
                          e.preventDefault();
                          go("/dashboard/help/admin");
                        }}
                        className={`${linkClass(adminActive)} pl-10`}
                      >
                        <Wrench className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 flex-1 font-medium">Helpbeheer</span>
                        {adminTicketUnread > 0 ? (
                          <span className="shrink-0 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-[var(--color-primary-900)]">
                            {adminTicketUnread > 99 ? "99+" : adminTicketUnread}
                          </span>
                        ) : null}
                      </Link>
                    ) : null}
                  </div>
                );
              }
              return renderItem(item);
            })}
          </div>
        ))}
      </nav>

      <div className="relative border-t border-white/10 p-2">
        <button
          type="button"
          onClick={() => setUserMenuOpen((o) => !o)}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-white/80 hover:bg-white/10 hover:text-white ${
            showLabels ? "" : "justify-center"
          }`}
          aria-expanded={userMenuOpen}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white">
            {(firstName?.[0] ?? "U").toUpperCase()}
          </span>
          {showLabels ? (
            <>
              <span className="min-w-0 flex-1 truncate font-medium">
                {firstName ?? "Account"}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform ${
                  userMenuOpen ? "rotate-180" : ""
                }`}
              />
            </>
          ) : null}
        </button>

        {userMenuOpen ? (
          <div
            className={`absolute bottom-full mb-1 space-y-1 rounded-lg border border-white/10 bg-[var(--color-primary-900)] p-1 shadow-lg ${
              showLabels ? "left-2 right-2" : "left-full ml-2 w-44"
            }`}
          >
            <Link
              href="/dashboard/settings"
              onClick={(e) => {
                e.preventDefault();
                setUserMenuOpen(false);
                go("/dashboard/settings");
              }}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white"
            >
              <Settings className="h-4 w-4" />
              Instellingen
            </Link>
            <button
              type="button"
              onClick={() => {
                setUserMenuOpen(false);
                handleLogout();
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-white/80 hover:bg-red-500/20 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Uitloggen
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
