import type { Metadata } from "next";
import type { ReactNode } from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Ticket ${id}`,
  };
}

export default function HelpTicketDetailLayout({ children }: { children: ReactNode }) {
  return children;
}
