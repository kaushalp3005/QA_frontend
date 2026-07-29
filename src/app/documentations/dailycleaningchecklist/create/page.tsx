"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import DailyCleaningTypeForm from "@/components/forms/DailyCleaningTypeForm";
import { docsApi } from "@/lib/api/documentations";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";
import { tabsForWarehouse, getTabDef, normalizeDCC, type DCCTabDef, type DCCFloor } from "@/lib/dailyCleaning";

// Map a W202 daily-cleaning doc number (CFPLA.C4.F.54[x]) to the A185 equivalent
// (CFPLB.C4.F.49[x]), preserving the per-section suffix (Floor → 49, Facility → 49b…).
// A number outside that series is already plant-specific (e.g. the A185-only Rack
// Area section, CFPLB.C4.F.49e) and passes through untouched.
function docNoForWarehouse(w202Doc: string, warehouse: string): string {
  const match = w202Doc.match(/^CFPLA\.C4\.F\.54([a-z]?)$/i);
  if (!match) return w202Doc;
  return warehouse === "A185" ? `CFPLB.C4.F.49${match[1] || ""}` : w202Doc;
}

export default function DailyCleaningChecklistCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateFrom = searchParams.get("duplicateFrom");
  const [activeTab, setActiveTab] = useState("floor");
  const warehouse = getStoredWarehouse();
  // Tab strip is plant-specific (A185 has no Service Floor). Resolving `meta`
  // from the visible tabs means a hidden type can never end up selected.
  const tabs = tabsForWarehouse(warehouse);
  const meta = tabs.find((t) => t.key === activeTab) || tabs[0];

  // Duplicate mode: load a saved record's month/floors as a fresh, unsaved entry.
  // initialRecordId is deliberately omitted so the form creates a new record on save.
  const [dupMeta, setDupMeta] = useState<DCCTabDef | null>(null);
  const [dupMonth, setDupMonth] = useState("");
  const [dupFloors, setDupFloors] = useState<DCCFloor[]>([]);
  const [loadingRecord, setLoadingRecord] = useState(!!duplicateFrom);

  useEffect(() => {
    if (!duplicateFrom) return;
    setLoadingRecord(true);
    docsApi.get("dailycleaningchecklist", Number(duplicateFrom))
      .then((res) => {
        const n = normalizeDCC(res.data);
        const def = getTabDef(n.tabCode);
        setDupMeta({
          key: n.tabCode,
          label: n.title,
          title: n.title,
          documentNo: n.documentNo,
          issueDate: n.issueDate,
          issueNo: n.issueNo,
          revDate: n.revDate,
          revNo: n.revNo,
          defaultArea: def?.defaultArea,
          parameters: n.parameters,
        });
        setDupMonth(n.month);
        setDupFloors(n.floors);
      })
      .catch((e) => console.error("Failed to load record to duplicate:", e))
      .finally(() => setLoadingRecord(false));
  }, [duplicateFrom]);

  if (loadingRecord) {
    return (
      <DocFormShell title="Daily Cleaning Checklist" docNo={docNoForWarehouse("CFPLA.C4.F.54", warehouse)} icon={Sparkles} width="full">
        <div className="surface-card p-8 flex items-center justify-center gap-2 text-sm text-ink-500">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading record to duplicate…
        </div>
      </DocFormShell>
    );
  }

  if (duplicateFrom && dupMeta) {
    return (
      <DocFormShell
        title="Daily Cleaning Checklist"
        docNo={docNoForWarehouse(dupMeta.documentNo, warehouse)}
        subtitle={`Duplicating record #${duplicateFrom} — ${dupMeta.title}`}
        icon={Sparkles}
        width="full"
        note={`Duplicating record #${duplicateFrom} — adjust the month/floors as needed, then Submit to save as a new record.`}
      >
        <DailyCleaningTypeForm
          meta={dupMeta}
          formType="dailycleaningchecklist"
          initialMonth={dupMonth}
          initialFloors={dupFloors}
          onDone={() => router.push("/documentations/dailycleaningchecklist")}
        />
      </DocFormShell>
    );
  }

  return (
    <DocFormShell
      title="Daily Cleaning Checklist"
      docNo={docNoForWarehouse(meta.documentNo, warehouse)}
      subtitle="Multi-tab daily housekeeping log · add a floor per tab"
      icon={Sparkles}
      width="full"
    >
      {/* Checklist type tabs */}
      <div className="surface-card p-2 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === tab.key ? "bg-brand-500 text-white shadow-soft" : "text-ink-500 hover:bg-cream-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* key resets the form (and its floors) when switching checklist type */}
      <DailyCleaningTypeForm
        key={activeTab}
        meta={meta}
        formType="dailycleaningchecklist"
        onDone={() => router.push("/documentations/dailycleaningchecklist")}
      />
    </DocFormShell>
  );
}
