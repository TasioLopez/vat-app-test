// src/app/layout.tsx

import "@/styles/globals.css";
import { ReactNode } from "react";
import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui/Toast";
import { StagingEnvironmentBanner } from "@/components/ui/StagingEnvironmentBanner";
import { Montserrat } from "next/font/google";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ValentineZ Assist Tool",
    template: "%s | ValentineZ Assist Tool",
  },
  icons: {
    icon: "/branding/vat-app-logo.svg",
    shortcut: "/branding/vat-app-logo.svg",
    apple: "/branding/vat-app-logo.svg",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nl" className={montserrat.variable}>
      <body className="font-sans antialiased">
        <StagingEnvironmentBanner />
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
