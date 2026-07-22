"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Gauge, Loader2 } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import { WeighingScaleCalibrationForm } from "@/components/forms/WeighingScaleCalibrationForm";
import { docsApi } from "@/lib/api/documentations";

export default function Page() {
  const searchParams = useSearchParams();
  const duplicateFrom = searchParams.get("duplicateFrom");
  const [initialData, setInitialData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(!!duplicateFrom);

  useEffect(() => {
    if (!duplicateFrom) return;
    setLoading(true);
    docsApi.get("weighingscalecalibration", Number(duplicateFrom))
      .then((res) => setInitialData(res.data))
      .catch((e) => console.error("Failed to load record to duplicate:", e))
      .finally(() => setLoading(false));
  }, [duplicateFrom]);

  return (
    <DocFormShell
      title="Weighing Scale Calibration"
      docNo="CFPLA.C6.F.41"
      subtitle="Issue 04 · Rev 03 · 01/10/2025"
      icon={Gauge}
      width="full"
      note={duplicateFrom ? `Duplicating record #${duplicateFrom} — adjust as needed, then Submit to save as a new record.` : "Frequency: Daily — before starting production"}
    >
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-ink-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading record to duplicate…</span>
        </div>
      ) : (
        <WeighingScaleCalibrationForm initialData={initialData || undefined} />
      )}
    </DocFormShell>
  );
}
