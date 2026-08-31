"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sun, Loader2 } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import { LuxMonitoringRecord } from "@/components/forms/CFPLA_QCOperationsForms";
import { docsApi } from "@/lib/api/documentations";

export default function Page() {
  const searchParams = useSearchParams();
  const duplicateFrom = searchParams.get("duplicateFrom");
  const [initialData, setInitialData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(!!duplicateFrom);

  useEffect(() => {
    if (!duplicateFrom) return;
    setLoading(true);
    docsApi.get("lux-monitoring", Number(duplicateFrom))
      // Strip `id` — the form treats a record id as "this is an existing row" and
      // would UPDATE the source record instead of inserting a new one.
      .then((res) => {
        const { id, ...rest } = res.data || {};
        setInitialData(rest);
      })
      .catch((e) => console.error("Failed to load record to duplicate:", e))
      .finally(() => setLoading(false));
  }, [duplicateFrom]);

  return (
    <DocFormShell
      title="Lux Monitoring Record"
      docNo="CFPLA.C4.F.32"
      icon={Sun}
      width="lg"
      note={duplicateFrom ? `Duplicating record #${duplicateFrom} — adjust the date/readings as needed, then Submit to save as a new record.` : undefined}
    >
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-ink-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading record to duplicate…</span>
        </div>
      ) : (
        <LuxMonitoringRecord initialData={initialData || undefined} />
      )}
    </DocFormShell>
  );
}
