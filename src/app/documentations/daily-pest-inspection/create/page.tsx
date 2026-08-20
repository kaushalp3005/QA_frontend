"use client";
import { Bug } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import DocCreateForm from "@/components/documentations/DocCreateForm";
import DailyPestInspectionReport from "@/components/forms/DailyPestInspectionReport";

export default function Page() {
  return (
    <DocFormShell
      title="Daily Pest Inspection Report"
      docNo="CFPLA.C4.F.47 / CFPLB.C4.RA.04"
      note="One sheet per month, covering every area at the selected plant"
      icon={Bug}
      width="full"
    >
      <DocCreateForm formType="daily-pest-inspection" FormComponent={DailyPestInspectionReport} />
    </DocFormShell>
  );
}
