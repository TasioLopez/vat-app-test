// src/app/dashboard/users/page.tsx
"use client";

import UsersTable from "@/components/users/UsersTable";
import { useState } from "react";
import InviteUserModal from "@/components/users/InviteUserModal";
import { Button } from '@/components/ui/button';


export default function UsersPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gebruikers beheren</h1>
          <p className="text-muted-foreground mt-2">Beheer gebruikers en hun toegangsrechten</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          + Uitnodigen
        </Button>
      </div>
      <UsersTable />
      <InviteUserModal open={open} setOpen={setOpen} />
    </div>
  );
}
