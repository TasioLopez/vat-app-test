'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';
import Sidebar from '@/components/ui/Sidebar';
import { ResponsiveLayout } from '@/components/layout/ResponsiveLayout';
import { UnsavedChangesGuardProvider } from '@/context/UnsavedChangesGuardContext';
import { HelpNotificationsProvider } from '@/context/HelpNotificationsContext';
import SessionGuard from '@/components/auth/SessionGuard';

export default function ClientLayout({
  children,
  role,
}: {
  children: React.ReactNode;
  role: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const isCvRoute = pathname?.startsWith('/dashboard/cv');
  const isSettingsRoute = pathname?.startsWith('/dashboard/settings');

  return (
    <UnsavedChangesGuardProvider>
      <HelpNotificationsProvider role={role}>
        <SessionGuard>
          <Toaster richColors position="top-center" />
          <ResponsiveLayout
            collapsed={collapsed}
            className={isCvRoute ? 'bg-gray-100' : isSettingsRoute ? 'bg-gray-50' : undefined}
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
        </SessionGuard>
      </HelpNotificationsProvider>
    </UnsavedChangesGuardProvider>
  );
}
