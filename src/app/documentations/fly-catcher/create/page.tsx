"use client";
import { Bug } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import { DailyFlyCatcherCheck } from "@/components/forms/CFPLA_QCOperationsForms";
import DocCreateForm from "@/components/documentations/DocCreateForm";

/**
 * A recreated sheet starts each Flies Qty 0.5 above or below the source value
 * (sign picked at random, floored at 0). Blank quantities stay blank. These are
 * starting values only: the form makes the user confirm every row against the
 * actual catch before it will save (see `confirmReadings`).
 */
function shiftFliesWeight(value: unknown): unknown {
  if (value === "" || value == null || Number.isNaN(Number(value))) return value;
  const offset = Math.random() < 0.5 ? -0.5 : 0.5;
  return Math.max(0, Math.round((Number(value) + offset) * 10) / 10);
}

const shiftDuplicate = (record: Record<string, any>) =>
  Array.isArray(record.rows)
    ? { ...record, rows: record.rows.map((r: Record<string, any>) => ({ ...r, flies_weight: shiftFliesWeight(r.flies_weight) })) }
    : record;

const DUPLICATE_FORM_PROPS = { confirmReadings: true };

export default function Page() {
  return (
    <DocFormShell
      title="Daily Fly Catcher Check"
      docNo="CFPLA.C7.F.37"
      icon={Bug}
      width="full"
    >
      <DocCreateForm
        formType="fly-catcher"
        FormComponent={DailyFlyCatcherCheck}
        transformDuplicate={shiftDuplicate}
        duplicateFormProps={DUPLICATE_FORM_PROPS}
      />
    </DocFormShell>
  );
}
