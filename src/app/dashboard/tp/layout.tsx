/**
 * Trajectplan routes fill the dashboard main column height only (no extra viewport scroll).
 * Builders manage their own inner scrolling for form / preview panes.
 */
export default function DashboardTPLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>;
}
