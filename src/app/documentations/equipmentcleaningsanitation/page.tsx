"use client";
import { useState } from "react";

const EQUIPMENT_LIST = [
  "Weight Machine", "Sealing Machine", "Foot Sealer", "Strapping Machine", "Shrink Wrap Machine",
  "Web Sealer", "Pet Sealer", "Metal Detector", "Vacuum Machine", "FSS Machine", "Tray Roaster",
  "Flow Wrap Machines", "Oven-Roasting", "Mixers", "Cutter", "Slicer", "X-Ray Machine", "Cup Sealer",
  "Chocolate Enrober", "Dicer", "Blast Freezer", "Deep Freezer", "Sorting Tables", "Roasting Tray",
  "Coating Pan", "Salinity Tank", "Blancher", "Sheet & Cut Machine", "Paddle Mixer", "Pulveriser",
  "Tempering Machine", "Kruger Machine", "Manual Cutter", "Vibro Shifter", "Destoner",
];

type BAStatus = "✓" | "✕" | "";

export default function EquipmentCleaningSanitationRecord() {
  const [month, setMonth] = useState("");
  const [area, setArea] = useState("");
  const [checkedBy, setCheckedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [observations, setObservations] = useState("");
  const [correctiveActions, setCorrectiveActions] = useState("");
  const [selectedDates, setSelectedDates] = useState<number[]>([1, 2, 3, 4, 5]);

  const [grid, setGrid] = useState<Record<string, Record<number, { B: BAStatus; A: BAStatus }>>>(() => {
    const init: Record<string, Record<number, { B: BAStatus; A: BAStatus }>> = {};
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

  const addDate = () => {
    const next = selectedDates.length > 0 ? Math.max(...selectedDates) + 1 : 1;
    if (next <= 31) setSelectedDates((prev) => [...prev, next]);
  };

  return (
    <div className="p-3 sm:p-4 max-w-full mx-auto">
      <div className="border border-gray-300 mb-4">
        <div className="p-2 font-bold text-center border-b border-gray-300">CANDOR FOODS PRIVATE LIMITED</div>
        <div className="p-2 text-sm font-semibold text-center border-b border-gray-300">Format: Equipment Cleaning &amp; Sanitation Record</div>
        <div className="p-2 text-sm text-center">Document No: CFPLA.C4.F.19 | Issue No: 05 | Rev Date: 01/12/2025 | Rev No: 04</div>
      </div>

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

      <p className="text-xs text-gray-400 mb-1 italic sm:hidden">← Swipe to view all columns</p>
      <p className="text-xs text-gray-600 mb-2 italic">Frequency: Before &amp; After Production | Click cell to toggle: ✓ (Done) → ✕ (Not Done) → Empty</p>
      <p className="text-xs text-gray-600 mb-4 italic">Dry cleaning: compressed air | Wet cleaning: wiping with wet, lint-free cloth | Sanitization: 70% IPA</p>

      <div className="overflow-x-auto border border-gray-300 rounded">
        <table className="text-xs">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-2 py-1 sticky left-0 bg-gray-100 z-10">Sr</th>
              <th className="border border-gray-300 px-2 py-1 sticky left-8 bg-gray-100 z-10 min-w-[140px]">Equipment</th>
              {selectedDates.map((d) => (
                <th key={d} className="border border-gray-300 px-1 py-1 text-center" colSpan={2}>
                  {d}
                </th>
              ))}
            </tr>
            <tr>
              <th className="border border-gray-300 sticky left-0 bg-gray-100 z-10"></th>
              <th className="border border-gray-300 sticky left-8 bg-gray-100 z-10"></th>
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
                {selectedDates.map((d) => (
                  <>
                    <td
                      key={`${eq}-${d}-B`}
                      className={`border border-gray-300 px-1 py-0.5 text-center cursor-pointer select-none ${
                        grid[eq]?.[d]?.B === "✓" ? "bg-green-100 text-green-700" : grid[eq]?.[d]?.B === "✕" ? "bg-red-100 text-red-700" : ""
                      }`}
                      onClick={() => toggleStatus(eq, d, "B")}
                    >
                      {grid[eq]?.[d]?.B}
                    </td>
                    <td
                      key={`${eq}-${d}-A`}
                      className={`border border-gray-300 px-1 py-0.5 text-center cursor-pointer select-none ${
                        grid[eq]?.[d]?.A === "✓" ? "bg-green-100 text-green-700" : grid[eq]?.[d]?.A === "✕" ? "bg-red-100 text-red-700" : ""
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
      <button className="mt-4 bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 w-full sm:w-auto text-base">Submit</button>
    </div>
  );
}
