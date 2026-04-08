'use client';

import { useState } from 'react';
import { Toaster } from 'sonner';
import Sidebar from '@/components/ui/Sidebar';
import { ResponsiveLayout } from '@/components/layout/ResponsiveLayout';
import { UnsavedChangesGuardProvider } from '@/context/UnsavedChangesGuardContext';
import { HelpNotificationsProvider } from '@/context/HelpNotificationsContext';

export default function ClientLayout({
  children,
  role,
}: {
  children: React.ReactNode;
  role: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <UnsavedChangesGuardProvider>
      <HelpNotificationsProvider role={role}>
        <Toaster richColors position="top-center" />
        <ResponsiveLayout
          collapsed={collapsed}
          sidebar={
            <Sidebar
              collapsed={collapsed}
              setCollapsed={setCollapsed}
              role={role}
            />
          }
        >
          {children}
        </ResponsiveLayout>
      </HelpNotificationsProvider>
    </UnsavedChangesGuardProvider>
  );
}
