import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Nieuw ticket",
};

export default function NewTicketLayout({ children }: { children: ReactNode }) {
  return children;
}
