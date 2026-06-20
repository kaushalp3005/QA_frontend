"use client";
import { Gauge } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import { WeighingScaleCalibrationForm } from "@/components/forms/WeighingScaleCalibrationForm";

export default function Page() {
  return (
    <DocFormShell
      title="Weighing Scale Calibration"
      docNo="CFPLA.C6.F.41"
      subtitle="Issue 04 · Rev 03 · 01/10/2025"
      icon={Gauge}
      width="full"
      note="Frequency: Daily — before starting production"
    >
      <WeighingScaleCalibrationForm />
    </DocFormShell>
  );
}
