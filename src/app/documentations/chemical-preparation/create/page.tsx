"use client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DocBackButton from "@/components/documentations/DocBackButton";
import { ChemicalPreparationRecord } from "@/components/forms/CFPLA_MaintenanceForms";

export default function Page() {
  return (
    <DashboardLayout>
      <DocBackButton />
      <ChemicalPreparationRecord />
    </DashboardLayout>
  );
}
