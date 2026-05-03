"use client";
import { Users } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import { FoodSafetyMeeting } from "@/components/forms/CFPLA_FoodSafetyDocForms";

export default function Page() {
  return (
    <DocFormShell
      title="Food Safety Meeting Minutes"
      docNo="CFPLA.C.F.09"
      subtitle="Issue 03 · Rev 02 · 10/01/2025"
      icon={Users}
      width="lg"
    >
      <FoodSafetyMeeting />
    </DocFormShell>
  );
}
