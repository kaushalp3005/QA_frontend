"use client";
import { Siren } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import MockRecall from "@/components/forms/CFPLA_C3_F_31_MockRecall";
import DocCreateForm from "@/components/documentations/DocCreateForm";

/*
 * Standalone Mock Recall entry. The same format is also reachable as the second
 * tab of the Traceability Report create page, where the two halves of one
 * exercise are filled in together and share a Documents Review Checklist —
 * both write the same `mock-recall` record type.
 */
export default function Page() {
  return (
    <DocFormShell
      title="Mock Recall"
      docNo="CFPLA.C3.F.31"
      subtitle="Issue 03 · Rev 02 · 01/10/2025"
      icon={Siren}
      width="lg"
    >
      <DocCreateForm formType="mock-recall" FormComponent={MockRecall} />
    </DocFormShell>
  );
}
