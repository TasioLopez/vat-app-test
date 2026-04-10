import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Tickets",
};

export default function HelpTicketsLayout({ children }: { children: ReactNode }) {
  return children;
}
