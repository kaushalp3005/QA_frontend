"use client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DocBackButton from "@/components/documentations/DocBackButton";
import { NonConformingProductReport } from "@/components/forms/CFPLA_MaintenanceForms";
import DocCreateForm from "@/components/documentations/DocCreateForm";

export default function Page() {
  return (
    <DashboardLayout>
      <DocBackButton />
      <DocCreateForm formType="non-conforming-product" FormComponent={NonConformingProductReport} />
    </DashboardLayout>
  );
}
