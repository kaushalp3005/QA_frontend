"use client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DocBackButton from "@/components/documentations/DocBackButton";
import { PreWeighingCheckRecord } from "@/components/forms/CFPLA_QCOperationsForms";

export default function Page() {
  return (
    <DashboardLayout>
      <DocBackButton />
      <PreWeighingCheckRecord />
    </DashboardLayout>
  );
}
