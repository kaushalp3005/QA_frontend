"use client";
import { useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import { Brush, Plus } from "lucide-react";
import { docsApi } from "@/lib/api/documentations";
import DocFormShell from "@/components/documentations/DocFormShell";
import DocSection from "@/components/documentations/DocSection";

const FORM_TYPE = "equipmentcleaningsanitation";

const EQUIPMENT_LIST = [
  "Weight Machine", "Sealing Machine", "Foot Sealer", "Strapping Machine", "Shrink Wrap Machine",
  "Web Sealer", "Pet Sealer", "Metal Detector", "Vacuum Machine", "FSS Machine", "Tray Roaster",
  "Flow Wrap Machines", "Oven-Roasting", "Mixers", "Cutter", "Slicer", "X-Ray Machine", "Cup Sealer",
  "Chocolate Enrober", "Dicer", "Blast Freezer", "Deep Freezer", "Sorting Tables", "Roasting Tray",
  "Coating Pan", "Salinity Tank", "Blancher", "Sheet & Cut Machine", "Paddle Mixer", "Pulveriser",
  "Tempering Machine", "Kruger Machine", "Manual Cutter", "Vibro Shifter", "Destoner",
];

type BAStatus = "✓" | "✕" | "";
type Grid = Record<string, Record<number, { B: BAStatus; A: BAStatus }>>;

export default function EquipmentCleaningSanitationRecord() {
  const router = useRouter();
  const [month, setMonth] = useState("");
  const [area, setArea] = useState("");
  const [checkedBy, setCheckedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [observations, setObservations] = useState("");
  const [correctiveActions, setCorrectiveActions] = useState("");
  const [selectedDates, setSelectedDates] = useState<number[]>([1, 2, 3, 4, 5]);
  const [recordId, setRecordId] = useState<number | null>(null);
  const [saving, setSaving] = useState<false | "draft" | "final">(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [grid, setGrid] = useState<Grid>(() => {
    const init: Grid = {};
    EQUIPMENT_LIST.forEach((eq) => {
      init[eq] = {};
      for (let d = 1; d <= 31; d++) init[eq][d] = { B: "", A: "" };
    });
    return init;
  });

  const toggleStatus = (eq: string, day: number, phase: "B" | "A") => {
    setGrid((prev) => {
      const current = prev[eq][day][phase];
      const next = current === "" ? "✓" : current === "✓" ? "✕" : "";
      return { ...prev, [eq]: { ...prev[eq], [day]: { ...prev[eq][day], [phase]: next } } };
    });
  };

  const markRowAllOK = (eq: string) => {
    setGrid((prev) => {
      const updated: Record<number, { B: BAStatus; A: BAStatus }> = { ...prev[eq] };
      selectedDates.forEach((d) => { updated[d] = { B: "✓", A: "✓" }; });
      return { ...prev, [eq]: updated };
    });
  };

  const addDate = () => {
    const next = selectedDates.length > 0 ? Math.max(...selectedDates) + 1 : 1;
    if (next <= 31) setSelectedDates((prev) => [...prev, next]);
  };

  const buildPayload = (status: "draft" | "submitted") => ({
    month,
    area,
    checked_by: checkedBy,
    verified_by: verifiedBy,
    observations,
    corrective_action: correctiveActions,
    grid: { selectedDates, cells: grid },
    status,
  });

  const handleSave = async (status: "draft" | "submitted") => {
    setSaving(status === "draft" ? "draft" : "final");
    setMessage(null);
    try {
      const payload = buildPayload(status);
      if (recordId == null) {
        const res = await docsApi.create(FORM_TYPE, payload);
        const newId = res.data?.id as number | undefined;
        if (typeof newId === "number") setRecordId(newId);
      } else {
        await docsApi.update(FORM_TYPE, recordId, payload);
      }
      if (status === "submitted") {
        setMessage({ kind: "ok", text: "Record submitted." });
        setTimeout(() => router.push(`/documentations/${FORM_TYPE}`), 800);
      } else {
        setMessage({ kind: "ok", text: "Draft saved." });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed.";
      setMessage({ kind: "err", text: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DocFormShell
      title="Equipment Cleaning & Sanitation"
      docNo="CFPLA.C4.F.19"
      subtitle="Issue 05 · Rev 04 · 01/12/2025"
      icon={Brush}
      width="full"
      note="Frequency: Before & After Production · Dry: compressed air · Wet: lint-free wipe · Sanitization: 70% IPA"
    >
      {recordId != null && (
        <div className="surface-card p-3 border-l-4 border-warning-500 bg-warning-50 text-xs text-warning-800 font-medium">
          Draft <span className="font-bold">#{recordId}</span> in progress. Use <strong>Submit Partially</strong> to save progress, or <strong>Submit</strong> to finalize.
        </div>
      )}

      <DocSection title="Period & Area">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label-base">Month</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="label-base">Area</label>
            <input type="text" value={area} onChange={(e) => setArea(e.target.value)} className="input-base" />
          </div>
        </div>
        <p className="text-[11px] text-ink-400 italic mt-3">
          Cell legend — <strong>B</strong> = Before production, <strong>A</strong> = After. Click any cell to cycle:{" "}
          <span className="text-success-600 font-bold">✓</span> → <span className="text-danger-600 font-bold">✕</span> → empty.
        </p>
      </DocSection>

      <DocSection
        title="Equipment × Date Grid"
        description={`${EQUIPMENT_LIST.length} equipment × ${selectedDates.length} day${selectedDates.length !== 1 ? "s" : ""}`}
        bleed
        actions={
          <button onClick={addDate} className="btn-primary !py-1.5 !px-3 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Date
          </button>
        }
      >
        <p className="text-[11px] text-ink-400 italic px-4 pt-3 sm:hidden">← Swipe to view all columns</p>
        <div className="overflow-x-auto">
          <table className="text-xs">
            <thead className="bg-cream-100/70 border-b border-cream-300">
              <tr>
                <th className="px-2 py-2 sticky left-0 bg-cream-100 z-10 text-[11px] font-semibold uppercase text-ink-400">Sr</th>
                <th className="px-2 py-2 sticky left-8 bg-cream-100 z-10 min-w-[140px] text-left text-[11px] font-semibold uppercase text-ink-400">Equipment</th>
                <th className="px-1 py-2 sticky left-[188px] bg-cream-100 z-10 text-[10px] font-semibold text-ink-400">Row</th>
                {selectedDates.map((d) => (
                  <th key={d} className="px-1 py-2 text-center text-[11px] font-semibold text-ink-400 border-l border-cream-300" colSpan={2}>
                    {d}
                  </th>
                ))}
              </tr>
              <tr className="border-t border-cream-300">
                <th className="sticky left-0 bg-cream-100 z-10"></th>
                <th className="sticky left-8 bg-cream-100 z-10"></th>
                <th className="sticky left-[188px] bg-cream-100 z-10"></th>
                {selectedDates.map((d) => (
                  <Fragment key={`hdr-${d}`}>
                    <th className="px-1 py-1 text-center text-[10px] text-ink-400 border-l border-cream-300">B</th>
                    <th className="px-1 py-1 text-center text-[10px] text-ink-400">A</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {EQUIPMENT_LIST.map((eq, idx) => (
                <tr key={eq} className="hover:bg-cream-100/60">
                  <td className="px-1 py-1 text-center sticky left-0 bg-cream-50 text-ink-400 font-medium">{idx + 1}</td>
                  <td className="px-2 py-1 sticky left-8 bg-cream-50 font-semibold whitespace-nowrap text-ink-500">{eq}</td>
                  <td className="px-1 py-1 sticky left-[188px] bg-cream-50">
                    <button
                      onClick={() => markRowAllOK(eq)}
                      className="text-[9px] font-semibold bg-success-50 text-success-700 px-1.5 py-0.5 rounded hover:bg-success-100 whitespace-nowrap"
                      title={`Mark all selected dates (B & A) as ✓ for ${eq}`}
                    >
                      All ✓
                    </button>
                  </td>
                  {selectedDates.map((d) => (
                    <Fragment key={`${eq}-${d}`}>
                      <td
                        className={`px-1 py-1 text-center cursor-pointer select-none border-l border-cream-300 font-bold ${
                          grid[eq]?.[d]?.B === "✓" ? "bg-success-50 text-success-700" : grid[eq]?.[d]?.B === "✕" ? "bg-danger-50 text-danger-600" : ""
                        }`}
                        onClick={() => toggleStatus(eq, d, "B")}
                      >
                        {grid[eq]?.[d]?.B}
                      </td>
                      <td
                        className={`px-1 py-1 text-center cursor-pointer select-none font-bold ${
                          grid[eq]?.[d]?.A === "✓" ? "bg-success-50 text-success-700" : grid[eq]?.[d]?.A === "✕" ? "bg-danger-50 text-danger-600" : ""
                        }`}
                        onClick={() => toggleStatus(eq, d, "A")}
                      >
                        {grid[eq]?.[d]?.A}
                      </td>
                    </Fragment>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DocSection>

      <DocSection title="Approvals & Notes">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label-base">Checked By</label>
            <input type="text" value={checkedBy} onChange={(e) => setCheckedBy(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="label-base">Verified By</label>
            <input type="text" value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="label-base">Observations</label>
            <textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={3} className="input-base" />
          </div>
          <div>
            <label className="label-base">Corrective Actions</label>
            <textarea value={correctiveActions} onChange={(e) => setCorrectiveActions(e.target.value)} rows={3} className="input-base" />
          </div>
        </div>
      </DocSection>

      {message && (
        <div className={`surface-card p-3 text-sm font-medium ${message.kind === "ok" ? "border-l-4 border-success-500 text-success-800 bg-success-50" : "border-l-4 border-danger-500 text-danger-700 bg-danger-50"}`}>
          {message.text}
        </div>
      )}

      <div className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-ink-400">
          Prepared By: <span className="font-semibold text-ink-500">FST</span>
          <span className="mx-2 text-cream-300">|</span>
          Approved By: <span className="font-semibold text-ink-500">FSTL</span>
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => handleSave("draft")}
            disabled={saving !== false}
            className="btn-outline"
          >
            {saving === "draft" ? "Saving draft..." : "Submit Partially"}
          </button>
          <button
            onClick={() => handleSave("submitted")}
            disabled={saving !== false}
            className="btn-primary"
          >
            {saving === "final" ? "Submitting..." : "Submit Record"}
          </button>
        </div>
      </div>
    </DocFormShell>
  );
}
