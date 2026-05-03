"use client";
import { Cross } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import { FirstAidBoxRecord } from "@/components/forms/CFPLA_QCOperationsForms";

export default function Page() {
  return (
    <DocFormShell
      title="First Aid Box Record"
      docNo="CFPLA.C7.F.29"
      subtitle="Issue 02 · Rev 01/10/2025"
      icon={Cross}
      width="lg"
    >
      <FirstAidBoxRecord />
    </DocFormShell>
  );
}
