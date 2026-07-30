"use client";
import { Thermometer } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import { TemperatureHumidityRecord } from "@/components/forms/CFPLA_QCRecordsForms";
import DocCreateForm from "@/components/documentations/DocCreateForm";

export default function Page() {
  return (
    <DocFormShell
      title="Temperature & Humidity Record"
      docNo="CFPLA.C6.F.17"
      subtitle="Frequency: Start, Mid, End of shift"
      icon={Thermometer}
      width="full"
    >
      <DocCreateForm formType="temperature-humidity" FormComponent={TemperatureHumidityRecord} />
    </DocFormShell>
  );
}
