"use client";
import { PackageCheck } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import { NewProductVerification } from "@/components/forms/CFPLA_ProductSafetyForms";

export default function Page() {
  return (
    <DocFormShell
      title="New Product Verification"
      docNo="CFPLA.C5.F.13"
      subtitle="Issue 01 · Issue Date 02/01/2025"
      icon={PackageCheck}
      width="lg"
    >
      <NewProductVerification />
    </DocFormShell>
  );
}
