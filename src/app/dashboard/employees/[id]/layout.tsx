import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Werknemer",
};

export default function EmployeeDetailLayout({ children }: { children: ReactNode }) {
  return children;
}
