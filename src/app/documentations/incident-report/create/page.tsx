"use client";
import { AlertTriangle } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import { FoodSafetyIncidentReport } from "@/components/forms/CFPLA_FoodSafetyDocForms";
import DocCreateForm from "@/components/documentations/DocCreateForm";

export default function Page() {
  return (
    <DocFormShell
      title="Food Safety Incident Report"
      docNo="CFPLA.C5.F.05"
      subtitle="Issue 02 · Rev 01 · 10/01/2025"
      icon={AlertTriangle}
      width="full"
    >
      <DocCreateForm formType="incident-report" FormComponent={FoodSafetyIncidentReport} />
    </DocFormShell>
  );
}
