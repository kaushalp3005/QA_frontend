"use client";
import { Truck } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import { OutgoingVehicleInspection } from "@/components/forms/CFPLA_MaintenanceForms";

export default function Page() {
  return (
    <DocFormShell
      title="Outgoing Vehicle Inspection"
      docNo="CFPLA.C5.F.46"
      icon={Truck}
      width="md"
    >
      <OutgoingVehicleInspection />
    </DocFormShell>
  );
}
