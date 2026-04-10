import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Nieuw artikel",
};

export default function HelpAdminNewArticleLayout({ children }: { children: ReactNode }) {
  return children;
}
