import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Nieuwe opdrachtgever",
};

export default function NewClientLayout({ children }: { children: ReactNode }) {
  return children;
}
