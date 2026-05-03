"use client";
import { Compass } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import { TraceabilityReport } from "@/components/forms/CFPLA_QCOperationsForms";

export default function Page() {
  return (
    <DocFormShell
      title="Traceability Report"
      docNo="CFPLA.C3.F.30"
      icon={Compass}
      width="lg"
    >
      <TraceabilityReport />
    </DocFormShell>
  );
}
