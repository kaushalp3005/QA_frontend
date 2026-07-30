"use client";
import { EmployeeTrainingCard } from "@/components/forms/CFPLA_C7_F_03_TrainingSubForms";
import DocBackButton from "@/components/documentations/DocBackButton";
import DocCreateForm from "@/components/documentations/DocCreateForm";

export default function Page() {
  return (
    <div>
      <DocBackButton />
      <DocCreateForm formType="training-card" FormComponent={EmployeeTrainingCard} />
    </div>
  );
}
