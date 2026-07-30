"use client";
import { Beaker } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import { FinishedGoodChemicalAnalysis } from "@/components/forms/CFPLA_QCRecordsForms";
import DocCreateForm from "@/components/documentations/DocCreateForm";

export default function Page() {
  return (
    <DocFormShell
      title="Finished Good Chemical Analysis"
      docNo="CFPLA.C5.F.26"
      icon={Beaker}
      width="md"
    >
      <DocCreateForm formType="fg-chemical-analysis" FormComponent={FinishedGoodChemicalAnalysis} />
    </DocFormShell>
  );
}
