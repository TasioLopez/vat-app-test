import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Debug user",
};

export default function DebugUserLayout({ children }: { children: ReactNode }) {
  return children;
}
