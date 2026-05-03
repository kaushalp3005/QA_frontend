"use client";
import { Droplets } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import { WaterAnalysisRecord } from "@/components/forms/CFPLA_FoodSafetyDocForms";

export default function Page() {
  return (
    <DocFormShell
      title="Water Analysis Record"
      docNo="CFPLA.C4.F.04"
      subtitle="Issue 02 · Rev 01 · 01/08/2025"
      icon={Droplets}
      width="full"
    >
      <WaterAnalysisRecord />
    </DocFormShell>
  );
}
