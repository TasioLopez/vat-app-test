// src/app/dashboard/users/page.tsx
"use client";

import UsersTable from "@/components/users/UsersTable";
import { useState } from "react";
import InviteUserModal from "@/components/users/InviteUserModal";
import { Button } from '@/components/ui/button';


export default function UsersPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Gebruikers beheren</h1>
        <Button
          onClick={() => setOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 hover:cursor-pointer"
        >
          + Uitnodigen
        </Button>
      </div>
      <UsersTable />
      <InviteUserModal open={open} setOpen={setOpen} />
    </div>
  );
}
