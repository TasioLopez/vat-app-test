import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Help",
};

export default function HelpLayout({ children }: { children: ReactNode }) {
  return children;
}
