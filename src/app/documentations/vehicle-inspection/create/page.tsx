"use client";
import { Truck } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import { IncomingVehicleInspection } from "@/components/forms/CFPLA_QCOperationsForms";

export default function Page() {
  return (
    <DocFormShell
      title="Incoming Vehicle Inspection"
      docNo="CFPLA.C3.F.45"
      subtitle="Issue 04 · Rev 03 · 05/10/2023"
      icon={Truck}
      width="md"
    >
      <IncomingVehicleInspection />
    </DocFormShell>
  );
}
