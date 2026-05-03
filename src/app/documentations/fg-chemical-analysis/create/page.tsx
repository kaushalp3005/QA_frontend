"use client";
import { Beaker } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import { FinishedGoodChemicalAnalysis } from "@/components/forms/CFPLA_QCRecordsForms";

export default function Page() {
  return (
    <DocFormShell
      title="Finished Good Chemical Analysis"
      docNo="CFPLA.C5.F.26"
      icon={Beaker}
      width="md"
    >
      <FinishedGoodChemicalAnalysis />
    </DocFormShell>
  );
}
