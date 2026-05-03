"use client";
import { Siren } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import { EmergencyMockDrill } from "@/components/forms/CFPLA_ProductSafetyForms";

export default function Page() {
  return (
    <DocFormShell
      title="Emergency Fire Evacuation Mock Drill"
      docNo="CFPLA.C4.F.14"
      subtitle="Issue 03 · Rev 02 · 02/02/2025"
      icon={Siren}
      width="md"
    >
      <EmergencyMockDrill />
    </DocFormShell>
  );
}
