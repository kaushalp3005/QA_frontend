"use client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DocBackButton from "@/components/documentations/DocBackButton";
import { WaterAnalysisRecord } from "@/components/forms/CFPLA_FoodSafetyDocForms";

export default function Page() {
  return (
    <DashboardLayout>
      <DocBackButton />
      <WaterAnalysisRecord />
    </DashboardLayout>
  );
}
