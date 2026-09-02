import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirectIfBackOfficeBlockedFromDossier } from "@/lib/auth/redirect-back-office-dossier";

export const metadata: Metadata = {
  title: "CV",
};

export default async function CvEmployeeLayout({ children }: { children: ReactNode }) {
  await redirectIfBackOfficeBlockedFromDossier();
  return children;
}
