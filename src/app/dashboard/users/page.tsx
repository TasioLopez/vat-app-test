// src/app/dashboard/users/page.tsx
"use client";

import UsersTable from "@/components/users/UsersTable";
import { useState } from "react";
import InviteUserModal from "@/components/users/InviteUserModal";
import { Button } from '@/components/ui/button';


export default function UsersPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-8 space-y-8 bg-gradient-to-br from-gray-50 to-purple-50/30">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Gebruikers beheren</h1>
          <p className="text-lg text-gray-600">Beheer gebruikers en hun toegangsrechten</p>
        </div>
        <Button onClick={() => setOpen(true)} size="lg">
          + Uitnodigen
        </Button>
      </div>
      <UsersTable />
      <InviteUserModal open={open} setOpen={setOpen} />
    </div>
  );
}
