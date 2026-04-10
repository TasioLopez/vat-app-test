import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Nieuwe werknemer",
};

export default function NewEmployeeLayout({ children }: { children: ReactNode }) {
  return children;
}
