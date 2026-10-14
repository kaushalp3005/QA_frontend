"use client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DocBackButton from "@/components/documentations/DocBackButton";
import { GlassBrittleCheckRecord } from "@/components/forms/GlassBrittleForms";
import DocCreateForm from "@/components/documentations/DocCreateForm";

export default function Page() {
  return (
    <DashboardLayout>
      <DocBackButton />
      <DocCreateForm formType="glass-brittle-check" FormComponent={GlassBrittleCheckRecord} />
    </DashboardLayout>
  );
}
