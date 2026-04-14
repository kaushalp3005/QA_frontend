"use client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DocBackButton from "@/components/documentations/DocBackButton";
import { TemperatureHumidityRecord } from "@/components/forms/CFPLA_QCRecordsForms";

export default function Page() {
  return (
    <DashboardLayout>
      <DocBackButton />
      <TemperatureHumidityRecord />
    </DashboardLayout>
  );
}
