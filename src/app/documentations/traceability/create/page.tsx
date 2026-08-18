"use client";
import { useState } from "react";
import { Compass } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import { TraceabilityReport } from "@/components/forms/CFPLA_QCOperationsForms";
import { type DocReview } from "@/components/forms/DocumentsReviewChecklist";
import MockRecall from "@/components/forms/CFPLA_C3_F_31_MockRecall";
import DocCreateForm from "@/components/documentations/DocCreateForm";

/** The two halves of the exercise, each filed as its own record. */
const TABS = [
  { key: "traceability", label: "Traceability Record", title: "Traceability Report", docNo: "CFPLA.C3.F.30" },
  { key: "mock-recall", label: "Mock Recall", title: "Mock Recall", docNo: "CFPLA.C3.F.31" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function Page() {
  const [activeTab, setActiveTab] = useState<TabKey>("traceability");
  const meta = TABS.find((t) => t.key === activeTab) ?? TABS[0];
  // One Documents Review Checklist for both tabs: the two formats review the
  // same documents for the same batch, so an answer given on either side is the
  // answer on both — supporting photos included — and each record still files
  // its own copy.
  const [docChecks, setDocChecks] = useState<DocReview>({});

  return (
    <DocFormShell title={meta.title} docNo={meta.docNo} icon={Compass} width="lg">
      <div className="surface-card p-2 overflow-x-auto">
        <div className="flex gap-1 min-w-max" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
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

      {/* Both panels stay mounted — switching tabs must not discard a part-typed
          form or the draft id the traceability report holds after a partial save. */}
      <div hidden={activeTab !== "traceability"}>
        <DocCreateForm
          formType="traceability"
          FormComponent={TraceabilityReport}
          formProps={{ docChecks, onDocChecksChange: setDocChecks }}
        />
      </div>

      <div hidden={activeTab !== "mock-recall"} className="space-y-5">
        <MockRecall docChecks={docChecks} onDocChecksChange={setDocChecks} />
      </div>
    </DocFormShell>
  );
}
