'use client';

import { useState } from 'react';
import Sidebar from '@/components/ui/Sidebar';
import { ResponsiveLayout } from '@/components/layout/ResponsiveLayout';

export default function ClientLayout({
  children,
  role,
}: {
  children: React.ReactNode;
  role: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
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
  );
}
