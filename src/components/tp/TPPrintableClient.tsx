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
    if (!root) return;
    
    // Wait longer for pagination to complete, especially for sections with images
    const checkReady = () => {
      // Check if all sections have rendered their print-page elements
      const printPages = root.querySelectorAll('.print-page');
      const expectedSections = 4; // cover, empinfo, part3, bijlage
      
      if (printPages.length >= expectedSections) {
        // Additional delay to ensure pagination measurement is complete
        setTimeout(() => {
          root.setAttribute("data-ready", "1");
        }, 500);
      } else {
        // Retry after a short delay
        setTimeout(checkReady, 200);
      }
    };
    
    // Start checking after initial render
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        checkReady();
      });
    });
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
