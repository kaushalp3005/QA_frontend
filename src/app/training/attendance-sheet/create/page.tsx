"use client";
import TrainingAttendanceSheet from "@/components/forms/CFPLA_C7_F_03_TrainingAttendanceSheet";
import DocBackButton from "@/components/documentations/DocBackButton";
import DocCreateForm from "@/components/documentations/DocCreateForm";

export default function Page() {
  return (
    <div>
      <DocBackButton />
      <DocCreateForm formType="training-attendance" FormComponent={TrainingAttendanceSheet} />
    </div>
  );
}
