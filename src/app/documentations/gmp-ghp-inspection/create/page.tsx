"use client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DocBackButton from "@/components/documentations/DocBackButton";
import { MonthlyGMPGHPInspection } from "@/components/forms/CFPLA_ProductSafetyForms";

export default function Page() {
  return (
    <DashboardLayout>
      <DocBackButton />
      <MonthlyGMPGHPInspection />
    </DashboardLayout>
  );
}
