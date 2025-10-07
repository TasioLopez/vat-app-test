// src/app/layout.tsx
"use client";

import "@/styles/globals.css";
import { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
