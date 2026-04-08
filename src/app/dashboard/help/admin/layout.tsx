import HelpAdminSubnav from "@/components/help/HelpAdminSubnav";
import { redirect } from "next/navigation";
import { getSessionUserWithRole, isAdmin } from "@/lib/help/auth";

export default async function HelpAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUserWithRole();
  if (!session || !isAdmin(session.role)) {
    redirect("/dashboard/help");
  }

  return (
    <div className="min-h-full flex flex-col md:flex-row bg-gradient-to-br from-gray-50 to-purple-50/30">
      <aside className="md:w-56 bg-white/90 border-b md:border-b-0 md:border-r border-purple-100 p-4 space-y-2 shrink-0">
        <HelpAdminSubnav />
      </aside>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
