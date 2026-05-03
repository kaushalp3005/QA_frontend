"use client";
import { Sun } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import { LuxMonitoringRecord } from "@/components/forms/CFPLA_QCOperationsForms";

export default function Page() {
  return (
    <DocFormShell
      title="Lux Monitoring Record"
      docNo="CFPLA.C4.F.32"
      icon={Sun}
      width="lg"
    >
      <LuxMonitoringRecord />
    </DocFormShell>
  );
}
