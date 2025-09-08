'use client';

import { useState } from 'react';
import Sidebar from '@/components/ui/Sidebar';

export default function ClientLayout({
  children,
  role,
}: {
  children: React.ReactNode;
  role: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} role={role} />
      <main
        className={`transition-all duration-300 min-h-screen bg-gray-50 p-6 w-full ${
          collapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        {children}
      </main>
    </div>
  );
}
