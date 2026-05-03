"use client";
import { EyeOff } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import { EyeWashBottleRefillingRecord } from "@/components/forms/CFPLA_QCRecordsForms";

export default function Page() {
  return (
    <DocFormShell
      title="Eye Wash Bottle Refilling"
      docNo="CFPLA.C7.F.27"
      icon={EyeOff}
      width="lg"
    >
      <EyeWashBottleRefillingRecord />
    </DocFormShell>
  );
}
