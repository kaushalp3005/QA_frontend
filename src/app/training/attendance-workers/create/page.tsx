"use client";
import { TrainingAttendanceWorkers } from "@/components/forms/CFPLA_C7_F_03_TrainingSubForms";
import DocBackButton from "@/components/documentations/DocBackButton";
import DocCreateForm from "@/components/documentations/DocCreateForm";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function Page() {
  return (
    <DashboardLayout>
      <DocBackButton />
      <DocCreateForm formType="training-attendance-workers" FormComponent={TrainingAttendanceWorkers} />
    </DashboardLayout>
  );
}
