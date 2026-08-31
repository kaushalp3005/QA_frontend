"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ListChecks, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DocFormShell from "@/components/documentations/DocFormShell";
import PreProductionInspectionForm from "@/components/forms/PreProductionInspectionForm";
import { getStoredWarehouse, type WarehouseCode } from "@/components/ui/WarehouseSelector";
import { docsApi } from "@/lib/api/documentations";

export default function PreProductionInspectionCreatePage() {
  // Read the warehouse client-side; A185 uses the CFPLB.C6.F.47 checklist,
  // every other warehouse keeps the CFPLA.C6.F.07 one. Wait until it resolves
  // so the form mounts once with the correct variant (no wrong-variant flash).
  const [warehouse, setWarehouse] = useState<WarehouseCode | null>(null);
  useEffect(() => {
    setWarehouse(getStoredWarehouse());
  }, []);

  const searchParams = useSearchParams();
  const duplicateFrom = searchParams.get("duplicateFrom");
  const [initialData, setInitialData] = useState<Record<string, any> | null>(null);
  const [loadingRecord, setLoadingRecord] = useState(!!duplicateFrom);

  useEffect(() => {
    if (!duplicateFrom) return;
    setLoadingRecord(true);
    docsApi.get("preproductioninspection", Number(duplicateFrom))
      // Strip `id` — the form treats a record id as "this is an existing row" and
      // would UPDATE the source record instead of inserting a new one.
      .then((res) => {
        const { id, ...rest } = res.data || {};
        setInitialData(rest);
      })
      .catch((e) => console.error("Failed to load record to duplicate:", e))
      .finally(() => setLoadingRecord(false));
  }, [duplicateFrom]);

  if (warehouse === null || loadingRecord) {
    return (
      <DashboardLayout>
        <div className="surface-card p-8 flex items-center justify-center gap-2 text-sm text-ink-500">
          <Loader2 className="w-5 h-5 animate-spin" /> {loadingRecord ? "Loading record to duplicate…" : "Loading…"}
        </div>
      </DashboardLayout>
    );
  }

  const isA185 = warehouse === "A185";

  return (
    <DocFormShell
      title="Pre-Production Inspection"
      docNo={isA185 ? "CFPLB.C6.F.47" : "CFPLA.C6.F.07"}
      subtitle={isA185 ? "Issue 03 · Rev 02 · 02/02/2026" : "Issue 03 · Rev 02 · 13/12/2025"}
      icon={ListChecks}
      width="full"
      note={duplicateFrom ? `Duplicating record #${duplicateFrom} — adjust as needed, then Submit to save as a new record.` : undefined}
    >
      <PreProductionInspectionForm variant={isA185 ? "A185" : "W202"} initialData={initialData || undefined} />
    </DocFormShell>
  );
}
