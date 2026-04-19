"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { docsApi } from "@/lib/api/documentations";

const FORM_TYPE = "equipmentcleaningsanitation";

const EQUIPMENT_LIST = [
  "Weight Machine", "Sealing Machine", "Foot Sealer", "Strapping Machine", "Shrink Wrap Machine",
  "Web Sealer", "Pet Sealer", "Metal Detector", "Vacuum Machine", "FSS Machine", "Tray Roaster",
  "Flow Wrap Machines", "Oven-Roasting", "Mixers", "Cutter", "Slicer", "X-Ray Machine", "Cup Sealer",
  "Chocolate Enrober", "Dicer", "Blast Freezer", "Deep Freezer", "Sorting Tables", "Roasting Tray",
  "Coating Pan", "Salinity Tank", "Blancher", "Sheet & Cut Machine", "Paddle Mixer", "Pulveriser",
  "Tempering Machine", "Kruger Machine", "Manual Cutter", "Vibro Shifter", "Destoner",
];

type BAStatus = "\u2713" | "\u2715" | "";
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
      const next = current === "" ? "\u2713" : current === "\u2713" ? "\u2715" : "";
      return { ...prev, [eq]: { ...prev[eq], [day]: { ...prev[eq][day], [phase]: next } } };
    });
  };

  const markRowAllOK = (eq: string) => {
    setGrid((prev) => {
      const updated: Record<number, { B: BAStatus; A: BAStatus }> = { ...prev[eq] };
      selectedDates.forEach((d) => { updated[d] = { B: "\u2713", A: "\u2713" }; });
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
    <div className="p-3 sm:p-4 max-w-full mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        <span>Back</span>
      </button>
      <div className="border border-gray-300 mb-4">
        <div className="p-2 font-bold text-center border-b border-gray-300">CANDOR FOODS PRIVATE LIMITED</div>
        <div className="p-2 text-sm font-semibold text-center border-b border-gray-300">Format: Equipment Cleaning &amp; Sanitation Record</div>
        <div className="p-2 text-sm text-center">Document No: CFPLA.C4.F.19 | Issue No: 05 | Rev Date: 01/12/2025 | Rev No: 04</div>
      </div>

      {recordId != null && (
        <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
          Draft #{recordId} in progress. Click <strong>Submit Partially</strong> to save progress, or <strong>Submit</strong> to finalize.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Month</label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="border rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Area</label>
          <input type="text" value={area} onChange={(e) => setArea(e.target.value)} className="border rounded px-3 py-2 w-full" />
        </div>
      </div>

      <p className="text-xs text-gray-400 mb-1 italic sm:hidden">{'\u2190'} Swipe to view all columns</p>
      <p className="text-xs text-gray-600 mb-2 italic">Frequency: Before &amp; After Production | Click cell to toggle: {'\u2713'} (Done) {'\u2192'} {'\u2715'} (Not Done) {'\u2192'} Empty</p>
      <p className="text-xs text-gray-600 mb-4 italic">Dry cleaning: compressed air | Wet cleaning: wiping with wet, lint-free cloth | Sanitization: 70% IPA</p>

      <div className="overflow-x-auto border border-gray-300 rounded">
        <table className="text-xs">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-2 py-1 sticky left-0 bg-gray-100 z-10">Sr</th>
              <th className="border border-gray-300 px-2 py-1 sticky left-8 bg-gray-100 z-10 min-w-[140px]">Equipment</th>
              <th className="border border-gray-300 px-1 py-1 sticky left-[188px] bg-gray-100 z-10 text-[9px] text-gray-500">All {'\u2713'}</th>
              {selectedDates.map((d) => (
                <th key={d} className="border border-gray-300 px-1 py-1 text-center" colSpan={2}>
                  {d}
                </th>
              ))}
            </tr>
            <tr>
              <th className="border border-gray-300 sticky left-0 bg-gray-100 z-10"></th>
              <th className="border border-gray-300 sticky left-8 bg-gray-100 z-10"></th>
              <th className="border border-gray-300 sticky left-[188px] bg-gray-100 z-10"></th>
              {selectedDates.map((d) => (
                <>
                  <th key={`${d}-b`} className="border border-gray-300 px-1 py-0.5 text-center text-[10px]">B</th>
                  <th key={`${d}-a`} className="border border-gray-300 px-1 py-0.5 text-center text-[10px]">A</th>
                </>
              ))}
            </tr>
          </thead>
          <tbody>
            {EQUIPMENT_LIST.map((eq, idx) => (
              <tr key={eq} className="hover:bg-blue-50">
                <td className="border border-gray-300 px-1 py-0.5 text-center sticky left-0 bg-white">{idx + 1}</td>
                <td className="border border-gray-300 px-1 py-0.5 sticky left-8 bg-white font-medium whitespace-nowrap">{eq}</td>
                <td className="border border-gray-300 px-1 py-0.5 sticky left-[188px] bg-white">
                  <button
                    onClick={() => markRowAllOK(eq)}
                    className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded hover:bg-green-200 whitespace-nowrap"
                    title={`Mark all selected dates (B & A) as \u2713 for ${eq}`}
                  >
                    All {'\u2713'}
                  </button>
                </td>
                {selectedDates.map((d) => (
                  <>
                    <td
                      key={`${eq}-${d}-B`}
                      className={`border border-gray-300 px-1 py-0.5 text-center cursor-pointer select-none ${
                        grid[eq]?.[d]?.B === "\u2713" ? "bg-green-100 text-green-700" : grid[eq]?.[d]?.B === "\u2715" ? "bg-red-100 text-red-700" : ""
                      }`}
                      onClick={() => toggleStatus(eq, d, "B")}
                    >
                      {grid[eq]?.[d]?.B}
                    </td>
                    <td
                      key={`${eq}-${d}-A`}
                      className={`border border-gray-300 px-1 py-0.5 text-center cursor-pointer select-none ${
                        grid[eq]?.[d]?.A === "\u2713" ? "bg-green-100 text-green-700" : grid[eq]?.[d]?.A === "\u2715" ? "bg-red-100 text-red-700" : ""
                      }`}
                      onClick={() => toggleStatus(eq, d, "A")}
                    >
                      {grid[eq]?.[d]?.A}
                    </td>
                  </>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={addDate} className="mt-2 bg-green-600 text-white px-4 py-2.5 rounded text-sm hover:bg-green-700 w-full sm:w-auto">+ Add Date Column</button>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <div>
          <label className="block text-sm font-medium mb-1">Checked By</label>
          <input type="text" value={checkedBy} onChange={(e) => setCheckedBy(e.target.value)} className="border rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Verified By</label>
          <input type="text" value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} className="border rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Observations</label>
          <textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={2} className="border rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Corrective Actions</label>
          <textarea value={correctiveActions} onChange={(e) => setCorrectiveActions(e.target.value)} rows={2} className="border rounded px-3 py-2 w-full" />
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-500">Prepared By: FST | Approved By: FSTL</div>

      {message && (
        <div className={`mt-4 px-3 py-2 rounded text-sm ${message.kind === "ok" ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
          {message.text}
        </div>
      )}

      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => handleSave("draft")}
          disabled={saving !== false}
          className="bg-amber-500 text-white px-5 py-2.5 rounded hover:bg-amber-600 disabled:opacity-50 text-sm font-medium w-full sm:w-auto"
        >
          {saving === "draft" ? "Saving draft..." : "Submit Partially"}
        </button>
        <button
          onClick={() => handleSave("submitted")}
          disabled={saving !== false}
          className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 disabled:opacity-50 text-base w-full sm:w-auto"
        >
          {saving === "final" ? "Submitting..." : "Submit"}
        </button>
      </div>
    </div>
  );
}
