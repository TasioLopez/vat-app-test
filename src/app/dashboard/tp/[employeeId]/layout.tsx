import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Trajectplan",
};

export default function TPBuilderLayout({ children }: { children: ReactNode }) {
  return children;
}
