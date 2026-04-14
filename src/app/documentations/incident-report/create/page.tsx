"use client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DocBackButton from "@/components/documentations/DocBackButton";
import { FoodSafetyIncidentReport } from "@/components/forms/CFPLA_FoodSafetyDocForms";

export default function Page() {
  return (
    <DashboardLayout>
      <DocBackButton />
      <FoodSafetyIncidentReport />
    </DashboardLayout>
  );
}
