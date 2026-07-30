"use client";
import { Package } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import { InwardRawMaterialCheck } from "@/components/forms/CFPLA_QCRecordsForms";
import DocCreateForm from "@/components/documentations/DocCreateForm";

export default function Page() {
  return (
    <DocFormShell
      title="Inward Raw Material Check"
      docNo="CFPLA.C5.F.25"
      icon={Package}
      width="lg"
    >
      <DocCreateForm formType="inward-rm-check" FormComponent={InwardRawMaterialCheck} />
    </DocFormShell>
  );
}
