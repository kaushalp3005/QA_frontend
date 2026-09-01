"use client";
import TrainingAttendanceSheet from "@/components/forms/CFPLA_C7_F_03_TrainingAttendanceSheet";
import DocBackButton from "@/components/documentations/DocBackButton";
import DocCreateForm from "@/components/documentations/DocCreateForm";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function Page() {
  return (
    <DashboardLayout>
      <DocBackButton />
      <DocCreateForm formType="training-attendance" FormComponent={TrainingAttendanceSheet} />
    </DashboardLayout>
  );
}
