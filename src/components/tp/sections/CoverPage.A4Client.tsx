// src/components/tp/sections/CoverPage.A4Client.tsx
"use client";

import { useEffect } from "react";
import { useTP } from "@/context/TPContext";
import CoverPageA4 from "./CoverPage.A4";
import { TPData } from "@/lib/tp/load";

export default function CoverPageA4Client({ employeeId }: { employeeId: string }) {
  // Assumes your TPContext already holds the merged TPData for the active employee.
  // If your context stores multiple employees, select by `employeeId` here.
  const { tpData, setSectionPageCount } = useTP();

  // Report cover page count (always 1 page)
  useEffect(() => {
    setSectionPageCount('cover', 1);
  }, [setSectionPageCount]);

  if (!tpData) return null; // or a skeleton loader
  return <CoverPageA4 data={tpData as TPData} />;
}
