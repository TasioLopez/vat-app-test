// src/components/tp/TPPrintable.tsx
import React from "react";
import { makePreviewNodesWithData, type SectionNode } from "@/components/tp/sections/registry";
import { TPData } from "@/lib/tp/load";

export default function TPPrintable({ data }: { data: TPData }) {
  const sections: SectionNode[] = makePreviewNodesWithData(data);

  return (
    <div id="tp-print-root" className="tp-print-root">
      {sections.map((s) => (
        <React.Fragment key={s.key}>{s.node}</React.Fragment>
      ))}
    </div>
  );
}
