"use client";
import { EmployeeTrainingCard } from "@/components/forms/CFPLA_C7_F_03_TrainingSubForms";
import DocBackButton from "@/components/documentations/DocBackButton";
import DocCreateForm from "@/components/documentations/DocCreateForm";

// Fields the "Make Card" button on the attendance sheet deep-links with.
const PREFILL_FIELDS = ["employee_name", "designation"] as const;

export default function Page() {
  return (
    <div>
      <DocBackButton />
      <DocCreateForm
        formType="training-card"
        FormComponent={EmployeeTrainingCard}
        prefillFields={PREFILL_FIELDS}
      />
    </div>
  );
}
