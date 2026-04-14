"use client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DocBackButton from "@/components/documentations/DocBackButton";
import { NewProductVerification } from "@/components/forms/CFPLA_ProductSafetyForms";

export default function Page() {
  return (
    <DashboardLayout>
      <DocBackButton />
      <NewProductVerification />
    </DashboardLayout>
  );
}
