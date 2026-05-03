"use client";
import { Eye } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import { MonthlyGMPGHPInspection } from "@/components/forms/CFPLA_ProductSafetyForms";

export default function Page() {
  return (
    <DocFormShell
      title="Monthly GMP & GHP Inspection"
      docNo="CFPLA.C3.F.15"
      subtitle="Issue 5 · Rev 4 · 28/08/2025"
      icon={Eye}
      width="lg"
    >
      <MonthlyGMPGHPInspection />
    </DocFormShell>
  );
}
