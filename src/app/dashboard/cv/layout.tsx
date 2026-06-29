/** Gray canvas behind CV hub, editor, and template picker (scroll area stays gray). */
export default function CvDashboardLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-full bg-gray-100">{children}</div>;
}
