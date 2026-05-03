"use client";
import { Bug } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import { DailyFlyCatcherCheck } from "@/components/forms/CFPLA_QCOperationsForms";

export default function Page() {
  return (
    <DocFormShell
      title="Daily Fly Catcher Check"
      docNo="CFPLA.C7.F.37"
      icon={Bug}
      width="full"
    >
      <DailyFlyCatcherCheck />
    </DocFormShell>
  );
}
