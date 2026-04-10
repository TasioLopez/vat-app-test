import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Categorieën",
};

export default function HelpAdminCategoriesLayout({ children }: { children: ReactNode }) {
  return children;
}
