"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import DailyCleaningTypeForm from "@/components/forms/DailyCleaningTypeForm";
import { docsApi } from "@/lib/api/documentations";
import { DCC_TABS, getTabDef } from "@/lib/dailyCleaning";

export default function DailyCleaningChecklistCreatePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("floor");
  const meta = getTabDef(activeTab) || DCC_TABS[0];

  const handleCreate = async (payload: Record<string, unknown>) => {
    await docsApi.create("dailycleaningchecklist", payload);
    router.push("/documentations/dailycleaningchecklist");
  };

  return (
    <DocFormShell
      title="Daily Cleaning Checklist"
      docNo="CFPLA.C4.F.54"
      subtitle="Multi-tab daily housekeeping log · add a floor per tab"
      icon={Sparkles}
      width="full"
    >
      {/* Checklist type tabs */}
      <div className="surface-card p-2 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {DCC_TABS.map((tab) => (
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
      <DailyCleaningTypeForm key={activeTab} meta={meta} onSubmit={handleCreate} />
    </DocFormShell>
  );
}
