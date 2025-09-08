"use client";

import { makePreviewNodes } from "@/components/tp/sections/registry";

export default function TPPreview({ employeeId }: { employeeId: string }) {
  const nodes = makePreviewNodes(employeeId);

  return (
    <div
      id="tp-preview-root"
      className="tp-print-root mx-auto w-full max-w-[900px] space-y-8"
    >
      {nodes.map((s, i) => (
        <section key={s.key ?? i} className="w-full">
          {/* A4 page container lives inside registry (print-page) */}
          {s.node}
        </section>
      ))}
    </div>
  );
}
