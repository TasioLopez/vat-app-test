// src/components/tp/TPPrintableClient.tsx
"use client";

import React, { useEffect } from "react";
import { TPProvider } from "@/context/TPContext";
import { makePreviewNodes } from "@/components/tp/sections/registry";
import type { TPData } from "@/lib/tp/load";

type Props = { employeeId: string; data: TPData };

export default function TPPrintableClient({ employeeId, data }: Props) {
  // Use the same client Preview components you use in the builder.
  // They already handle measurement-based pagination and emit multiple .print-page sections.
  const sections = makePreviewNodes(employeeId);

  // Tell Puppeteer "pagination is done" after the client paginators have measured and split.
  useEffect(() => {
    const root = document.getElementById("tp-print-root");
    // two rAFs lets layout + pagination state settle
    requestAnimationFrame(() =>
      requestAnimationFrame(() => root?.setAttribute("data-ready", "1"))
    );
  }, [employeeId, data]);

  return (
    <TPProvider initialData={data}>
      <div id="tp-print-root" className="tp-print-root">
        {sections.map((s) => (
          // IMPORTANT: Do NOT wrap; each client section returns its own <section class="print-page">…</section>
          <React.Fragment key={s.key}>{s.node}</React.Fragment>
        ))}
      </div>
    </TPProvider>
  );
}
