import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirectIfBackOfficeBlockedFromDossier } from "@/lib/auth/redirect-back-office-dossier";

export const metadata: Metadata = {
  title: "Trajectplan",
};

export default async function TPBuilderLayout({ children }: { children: ReactNode }) {
  await redirectIfBackOfficeBlockedFromDossier();
  return children;
}
