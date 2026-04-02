'use client';

import { useState } from 'react';
import Sidebar from '@/components/ui/Sidebar';
import { ResponsiveLayout } from '@/components/layout/ResponsiveLayout';
import { UnsavedChangesGuardProvider } from '@/context/UnsavedChangesGuardContext';

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
    </UnsavedChangesGuardProvider>
  );
}
