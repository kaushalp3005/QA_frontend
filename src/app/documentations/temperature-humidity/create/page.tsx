"use client";
import { Thermometer } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import { TemperatureHumidityRecord } from "@/components/forms/CFPLA_QCRecordsForms";

export default function Page() {
  return (
    <DocFormShell
      title="Temperature & Humidity Record"
      docNo="CFPLA.C6.F.17"
      subtitle="Frequency: Start, Mid, End of shift"
      icon={Thermometer}
      width="full"
    >
      <TemperatureHumidityRecord />
    </DocFormShell>
  );
}
