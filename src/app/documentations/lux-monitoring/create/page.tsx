"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sun, Loader2 } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import { LuxMonitoringRecord } from "@/components/forms/CFPLA_QCOperationsForms";
import { docsApi } from "@/lib/api/documentations";

const LUX_READING_KEYS = ["r1", "r2", "r3", "r4", "r5"] as const;

/**
 * A duplicated record starts each reading 45–51 lux above or below the source
 * value (sign picked at random, floored at 0). Blank readings stay blank. These
 * are starting values only: the form makes the user confirm every row against
 * the actual reading before it will save (see `confirmReadings`).
 */
function shiftReading(value: unknown): unknown {
  if (value === "" || value == null || Number.isNaN(Number(value))) return value;
  const magnitude = 45 + Math.floor(Math.random() * 7); // 45..51 inclusive
  const offset = Math.random() < 0.5 ? -magnitude : magnitude;
  return String(Math.max(0, Math.round(Number(value) + offset)));
}

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
        if (Array.isArray(rest.rows)) {
          rest.rows = rest.rows.map((r: Record<string, any>) => {
            const shifted = { ...r };
            LUX_READING_KEYS.forEach((k) => { shifted[k] = shiftReading(r[k]); });
            return shifted;
          });
        }
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
      note={duplicateFrom ? `Duplicating record #${duplicateFrom} — R1–R5 are pre-filled at ±45–51 from that record. Check each row against the actual reading, tick Confirmed, then Submit to save as a new record.` : undefined}
    >
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-ink-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading record to duplicate…</span>
        </div>
      ) : (
        <LuxMonitoringRecord initialData={initialData || undefined} confirmReadings={!!duplicateFrom && !!initialData} />
      )}
    </DocFormShell>
  );
}
