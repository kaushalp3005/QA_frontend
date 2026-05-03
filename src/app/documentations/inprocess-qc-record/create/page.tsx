"use client";
import { ClipboardCheck } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import { InprocessQualityCheckRecord } from "@/components/forms/CFPLA_QCRecordsForms";

export default function Page() {
  return (
    <DocFormShell
      title="In-process Quality Check"
      docNo="CFPLA.C6.F.18"
      subtitle="Rev Date 01/10/2025"
      icon={ClipboardCheck}
      width="full"
    >
      <InprocessQualityCheckRecord />
    </DocFormShell>
  );
}
