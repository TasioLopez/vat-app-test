// src/components/tp/sections/registry.tsx
import React from "react";
import { TPData } from "@/lib/tp/load";

// Types
export type SectionKey = "cover" | "empinfo" | "part3" | "bijlage";
export type TP2026SectionKey =
  | "cover2026"
  | "gegevens2026"
  | "basis2026"
  | "bijlage12026"
  | "bijlage22026"
  | "bijlage32026";
export type RegistrySectionKey = SectionKey | TP2026SectionKey;
export type TPLayoutRegistryKey = "tp_legacy" | "tp_2026";
type WithEmployeeId = React.ComponentType<{ employeeId: string }>;
type WithData = React.ComponentType<{ data: TPData }>;

// registry.tsx
export type SectionConfig = {
  key: RegistrySectionKey;
  title: string;
  Edit: WithEmployeeId;
  Preview: WithEmployeeId;        // client preview
  PreviewWithData: WithData;      // server print/export
  selfPages?: boolean;            // ⬅ NEW: component returns its own <section class="print-page"> blocks
};


// Edit components (inputs)
import CoverPageEdit from "@/components/tp/sections/CoverPage";
import EmployeeInfoEdit from "@/components/tp/sections/EmployeeInfo";
import Section3Edit from "@/components/tp/sections/Section3";
import BijlageEdit from "@/components/tp/sections/Bijlage";

// Data-driven A4 components (server-safe)
import CoverPageA4 from "@/components/tp/sections/CoverPage.A4";
import EmployeeInfoA4 from "@/components/tp/sections/EmployeeInfo.A4";
import Section3A4 from "@/components/tp/sections/Section3.A4";
import BijlageA4 from "@/components/tp/sections/Bijlage.A4";

// Client wrappers for on-screen preview (take employeeId)
import CoverPageA4Client from "@/components/tp/sections/CoverPage.A4Client";
import EmployeeInfoA4Client from "@/components/tp/sections/EmployeeInfo.A4Client";
import Section3A4Client from "@/components/tp/sections/Section3.A4Client";
import BijlageA4Client from "@/components/tp/sections/Bijlage.A4Client";

export const TP_SECTIONS: SectionConfig[] = [
  {
    key: "cover",
    title: "Voorblad",
    Edit: CoverPageEdit,
    Preview: CoverPageA4Client,
    PreviewWithData: CoverPageA4,
    selfPages: true,        // cover returns its own print-page (optional, set true if it does)
  },
  {
    key: "empinfo",
    title: "Gegevens werknemer",
    Edit: EmployeeInfoEdit,
    Preview: EmployeeInfoA4Client,
    PreviewWithData: EmployeeInfoA4,
    selfPages: true,        // ⬅ IMPORTANT
  },
  {
    key: "part3",
    title: "TP Part 3",
    Edit: Section3Edit,
    Preview: Section3A4Client,
    PreviewWithData: Section3A4,
    selfPages: true,        // ⬅ IMPORTANT
  },
  {
    key: "bijlage",
    title: "Bijlage 1",
    Edit: BijlageEdit,
    Preview: BijlageA4Client,
    PreviewWithData: BijlageA4,
    selfPages: true,        // ⬅ IMPORTANT
  },
];

const TP2026Placeholder: WithEmployeeId = function TP2026Placeholder() {
  return <div className="p-6 text-sm text-muted-foreground">TP 2026 section is rendered in the TP 2026 builder flow.</div>;
};

const TP2026PlaceholderWithData: WithData = function TP2026PlaceholderWithData() {
  return <section className="print-page"><div className="p-6 text-sm">TP 2026 printable section placeholder.</div></section>;
};

export const TP_2026_SECTIONS: SectionConfig[] = [
  { key: "cover2026", title: "01 Voorblad", Edit: TP2026Placeholder, Preview: TP2026Placeholder, PreviewWithData: TP2026PlaceholderWithData, selfPages: true },
  { key: "gegevens2026", title: "02 Gegevens", Edit: TP2026Placeholder, Preview: TP2026Placeholder, PreviewWithData: TP2026PlaceholderWithData, selfPages: true },
  { key: "basis2026", title: "03 Basisdocument", Edit: TP2026Placeholder, Preview: TP2026Placeholder, PreviewWithData: TP2026PlaceholderWithData, selfPages: true },
  { key: "bijlage12026", title: "Bijlage 1", Edit: TP2026Placeholder, Preview: TP2026Placeholder, PreviewWithData: TP2026PlaceholderWithData, selfPages: true },
  { key: "bijlage22026", title: "Bijlage 2", Edit: TP2026Placeholder, Preview: TP2026Placeholder, PreviewWithData: TP2026PlaceholderWithData, selfPages: true },
  { key: "bijlage32026", title: "Bijlage 3", Edit: TP2026Placeholder, Preview: TP2026Placeholder, PreviewWithData: TP2026PlaceholderWithData, selfPages: true },
];

function getSectionsForLayout(layoutKey: TPLayoutRegistryKey): SectionConfig[] {
  return layoutKey === "tp_2026" ? TP_2026_SECTIONS : TP_SECTIONS;
}

// Helpers
export type SectionNode = { key: string; title: string; node: React.ReactNode };

export function makeEditNodes(employeeId: string, layoutKey: TPLayoutRegistryKey = "tp_legacy"): SectionNode[] {
  return getSectionsForLayout(layoutKey).map((s) => ({
    key: s.key,
    title: s.title,
    node: <s.Edit employeeId={employeeId} />,
  }));
}

export function makePreviewNodes(employeeId: string, layoutKey: TPLayoutRegistryKey = "tp_legacy"): SectionNode[] {
  return getSectionsForLayout(layoutKey).map((s) => ({
    key: s.key,
    title: s.title,
    node: s.selfPages
      ? <s.Preview employeeId={employeeId} />
      : (
        <section className="print-page">
          <s.Preview employeeId={employeeId} />
        </section>
      ),
  }));
}

export function makePreviewNodesWithData(data: TPData, layoutKey: TPLayoutRegistryKey = "tp_legacy"): SectionNode[] {
  return getSectionsForLayout(layoutKey).map((s) => ({
    key: s.key,
    title: s.title,
    node: s.selfPages
      ? <s.PreviewWithData data={data} />
      : (
        <section className="print-page">
          <s.PreviewWithData data={data} />
        </section>
      ),
  }));
}
