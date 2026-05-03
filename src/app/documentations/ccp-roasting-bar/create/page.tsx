"use client";
import { Flame } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import { CCPRoastingBarLine } from "@/components/forms/CFPLA_QCOperationsForms";

export default function Page() {
  return (
    <DocFormShell
      title="CCP Roasting (Bar Line)"
      docNo="CFPLA.C2.F.43"
      subtitle="Monitoring & Verification of CCP — Roasting Temp & Time"
      icon={Flame}
      width="full"
    >
      <CCPRoastingBarLine />
    </DocFormShell>
  );
}
