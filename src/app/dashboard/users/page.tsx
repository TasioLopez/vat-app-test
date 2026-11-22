"use client";

import UsersTable from "@/components/users/UsersTable";
import { useEffect, useState } from "react";
import InviteUserModal from "@/components/users/InviteUserModal";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import { canInviteUsers } from "@/lib/auth/roles";

export default function UsersPage() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      setRole(data?.role ?? null);
    };
    void load();
  }, []);

  const showInvite = role != null && canInviteUsers(role);

  return (
    <div className="space-y-6 bg-gray-50 p-6 md:p-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Gebruikers</h1>
          <p className="mt-1 text-sm text-gray-600">Beheer gebruikers en hun toegangsrechten</p>
        </div>
        {showInvite ? (
          <Button onClick={() => setOpen(true)} size="lg">
            + Uitnodigen
          </Button>
        ) : null}
      </div>
      <UsersTable />
      {showInvite ? <InviteUserModal open={open} setOpen={setOpen} /> : null}
    </div>
  );
}
