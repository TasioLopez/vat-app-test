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
    <div className="p-8 space-y-8 bg-gradient-to-br from-gray-50 to-purple-50/30">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Gebruikers beheren</h1>
          <p className="text-lg text-gray-600">Beheer gebruikers en hun toegangsrechten</p>
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
