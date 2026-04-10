import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Nieuwe gebruiker",
};

export default function NewUserLayout({ children }: { children: ReactNode }) {
  return children;
}
