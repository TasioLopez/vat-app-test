import HelpAdminSubnav from "@/components/help/HelpAdminSubnav";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUserWithRole, isAdmin } from "@/lib/help/auth";

export const metadata: Metadata = {
  title: "Help beheer",
};

export default async function HelpAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUserWithRole();
  if (!session || !isAdmin(session.role)) {
    redirect("/dashboard/help");
  }

  return (
    <div className="min-h-full flex flex-col md:flex-row bg-gray-50">
      <aside className="md:w-56 bg-white border-b md:border-b-0 md:border-r border-gray-200 p-4 space-y-2 shrink-0">
        <HelpAdminSubnav />
      </aside>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
