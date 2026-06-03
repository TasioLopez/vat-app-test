'use client';

import type { LucideIcon } from 'lucide-react';

export function GegevensEditorSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
        <Icon className="h-4 w-4 shrink-0 text-[#6d2a96]" aria-hidden />
        <h3 className="text-sm font-semibold text-[#6d2a96]">{title}</h3>
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </div>
  );
}

export function GegevensSubsectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</p>
  );
}
