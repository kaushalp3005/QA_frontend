"use client";
import { CalendarRange } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import { MonthlyGMPSchedule } from "@/components/forms/CFPLA_QCRecordsForms";

export default function Page() {
  return (
    <DocFormShell
      title="Monthly GMP & GHP Inspection Schedule"
      docNo="CFPLA.C3.F.23"
      icon={CalendarRange}
      width="md"
    >
      <MonthlyGMPSchedule />
    </DocFormShell>
  );
}
