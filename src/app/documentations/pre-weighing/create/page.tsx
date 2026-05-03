"use client";
import { Scale } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import { PreWeighingCheckRecord } from "@/components/forms/CFPLA_QCOperationsForms";

export default function Page() {
  return (
    <DocFormShell
      title="Pre Weighing Check"
      docNo="CFPLA.C6.F.34"
      subtitle="Issue Date 13/05/2025"
      icon={Scale}
      width="lg"
    >
      <PreWeighingCheckRecord />
    </DocFormShell>
  );
}
