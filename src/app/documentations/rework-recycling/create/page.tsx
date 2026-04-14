"use client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DocBackButton from "@/components/documentations/DocBackButton";
import { ReworkRecyclingRepacking } from "@/components/forms/CFPLA_MaintenanceForms";

export default function Page() {
  return (
    <DashboardLayout>
      <DocBackButton />
      <ReworkRecyclingRepacking />
    </DashboardLayout>
  );
}
