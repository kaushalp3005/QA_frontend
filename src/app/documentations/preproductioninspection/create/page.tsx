"use client";
import { ListChecks } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import PreProductionInspectionForm from "@/components/forms/PreProductionInspectionForm";

export default function PreProductionInspectionCreatePage() {
  return (
    <DocFormShell
      title="Pre-Production Inspection"
      docNo="CFPLA.C6.F.07"
      subtitle="Issue 03 · Rev 02 · 13/12/2025"
      icon={ListChecks}
      width="full"
    >
      <PreProductionInspectionForm />
    </DocFormShell>
  );
}
