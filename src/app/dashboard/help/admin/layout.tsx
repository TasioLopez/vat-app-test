import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUserWithRole, isAdmin } from "@/lib/help/auth";

export default async function HelpAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUserWithRole();
  if (!session || !isAdmin(session.role)) {
    redirect("/dashboard/help");
  }

  const links = [
    { href: "/dashboard/help/admin", label: "Overview" },
    { href: "/dashboard/help/admin/categories", label: "Categories" },
    { href: "/dashboard/help/admin/articles", label: "Articles" },
    { href: "/dashboard/help/admin/tickets", label: "Tickets" },
    { href: "/dashboard/help/admin/insights", label: "Insights" },
  ];

  return (
    <div className="min-h-full flex flex-col md:flex-row bg-gradient-to-br from-gray-50 to-purple-50/30">
      <aside className="md:w-56 bg-white/90 border-b md:border-b-0 md:border-r border-purple-100 p-4 space-y-2 shrink-0">
        <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide px-2">Help admin</p>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-800"
          >
            {l.label}
          </Link>
        ))}
        <Link
          href="/dashboard/help"
          className="block px-3 py-2 mt-4 text-sm text-purple-700 font-medium"
        >
          ← User Help
        </Link>
      </aside>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
