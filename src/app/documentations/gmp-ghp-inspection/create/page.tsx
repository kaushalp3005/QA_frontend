"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, Loader2 } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import { MonthlyGMPGHPInspection } from "@/components/forms/CFPLA_ProductSafetyForms";
import { docsApi } from "@/lib/api/documentations";

export default function Page() {
  // "Recreate": when ?duplicateFrom=<id> is present, load that record and
  // pre-fill the form as a brand-new entry. We strip `id` so the form saves a
  // new record instead of overwriting the original.
  const searchParams = useSearchParams();
  const duplicateFrom = searchParams.get("duplicateFrom");
  const [initialData, setInitialData] = useState<Record<string, any> | null>(null);
  const [loadingRecord, setLoadingRecord] = useState(!!duplicateFrom);

  useEffect(() => {
    if (!duplicateFrom) return;
    setLoadingRecord(true);
    docsApi.get("gmp-ghp-inspection", Number(duplicateFrom))
      .then((res) => {
        const { id, ...rest } = res.data || {};
        setInitialData(rest);
      })
      .catch((e) => console.error("Failed to load record to duplicate:", e))
      .finally(() => setLoadingRecord(false));
  }, [duplicateFrom]);

  return (
    <DocFormShell
      title="Monthly GMP & GHP Inspection"
      docNo="CFPLA.C3.F.15"
      subtitle="Issue 5 · Rev 4 · 28/08/2025"
      icon={Eye}
      width="lg"
      note={duplicateFrom ? `Duplicating record #${duplicateFrom} — adjust as needed, then Submit to save as a new record.` : undefined}
    >
      {loadingRecord ? (
        <div className="surface-card p-8 flex items-center justify-center gap-2 text-sm text-ink-500">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading record to duplicate…
        </div>
      ) : (
        <MonthlyGMPGHPInspection initialData={initialData || undefined} />
      )}
    </DocFormShell>
  );
}
