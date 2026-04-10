// src/app/layout.tsx

import "@/styles/globals.css";
import { ReactNode } from "react";
import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui/Toast";
import { Montserrat } from "next/font/google";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "VAT App",
    template: "%s | VAT App",
  },
  icons: {
    icon: "/branding/vat-app-logo.svg",
    shortcut: "/branding/vat-app-logo.svg",
    apple: "/branding/vat-app-logo.svg",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
