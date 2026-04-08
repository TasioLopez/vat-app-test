"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHelpNotifications } from "@/context/HelpNotificationsContext";

const links = [
  { href: "/dashboard/help/admin", label: "Overzicht" },
  { href: "/dashboard/help/admin/categories", label: "Categorieën" },
  { href: "/dashboard/help/admin/articles", label: "Artikelen" },
  { href: "/dashboard/help/admin/tickets", label: "Tickets" },
  { href: "/dashboard/help/admin/insights", label: "Inzichten" },
];

export default function HelpAdminSubnav() {
  const pathname = usePathname();
  const { adminTicketUnread } = useHelpNotifications();

  return (
    <>
      <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide px-2">Helpbeheer</p>
      {links.map((l) => {
        const isActive = pathname === l.href || pathname.startsWith(`${l.href}/`);
        const showTicketsPill = l.href === "/dashboard/help/admin/tickets" && adminTicketUnread > 0;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm hover:bg-purple-50 hover:text-purple-800 ${
              isActive ? "bg-purple-100 text-purple-900 font-medium" : "text-gray-700"
            }`}
          >
            <span>{l.label}</span>
            {showTicketsPill ? (
              <span className="shrink-0 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-purple-900">
                {adminTicketUnread > 99 ? "99+" : adminTicketUnread}
              </span>
            ) : null}
          </Link>
        );
      })}
      <Link
        href="/dashboard/help"
        className="block px-3 py-2 mt-4 text-sm text-purple-700 font-medium"
      >
        ← Help voor gebruikers
      </Link>
    </>
  );
}
