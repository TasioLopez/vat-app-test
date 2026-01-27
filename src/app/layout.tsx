// src/app/layout.tsx
"use client";

import "@/styles/globals.css";
import { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { Montserrat } from "next/font/google";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

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
