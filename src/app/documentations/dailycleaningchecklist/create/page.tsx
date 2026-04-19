"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// ===================== Reusable Monthly Grid Component =====================
interface MonthlyGridProps {
  title: string;
  documentNo: string;
  issueDate: string;
  issueNo: string;
  revDate: string;
  revNo: string;
  parameters: string[];
  defaultArea?: string;
}

type CellStatus = "\u2713" | "\u2715" | "";

function MonthlyGridChecklist({ title, documentNo, issueDate, issueNo, revDate, revNo, parameters, defaultArea }: MonthlyGridProps) {
  const [month, setMonth] = useState("");
  const [area, setArea] = useState(defaultArea || "");
  const [checkedBy, setCheckedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [observations, setObservations] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");

  const daysInMonth = 31;
  const [grid, setGrid] = useState<Record<string, Record<number, CellStatus>>>(() => {
    const init: Record<string, Record<number, CellStatus>> = {};
    parameters.forEach((p) => {
      init[p] = {};
      for (let d = 1; d <= daysInMonth; d++) init[p][d] = "";
    });
    return init;
  });

  const toggleCell = (param: string, day: number) => {
    setGrid((prev) => {
      const current = prev[param][day];
      const next = current === "" ? "\u2713" : current === "\u2713" ? "\u2715" : "";
      return { ...prev, [param]: { ...prev[param], [day]: next } };
    });
  };

  const markAllOKForDay = (day: number) => {
    setGrid((prev) => {
      const next: Record<string, Record<number, CellStatus>> = {};
      parameters.forEach((p) => {
        next[p] = { ...prev[p], [day]: "\u2713" };
      });
      return next;
    });
  };

  return (
    <div className="p-4 max-w-full mx-auto">
      <div className="border border-gray-300 mb-4">
        <div className="p-2 font-bold text-center border-b border-gray-300">CANDOR FOODS PRIVATE LIMITED</div>
        <div className="p-2 text-sm font-semibold text-center border-b border-gray-300">Document Name: {title}</div>
        <div className="p-2 text-xs text-center">Document No: {documentNo} | Issue Date: {issueDate} | Issue No: {issueNo} | Rev Date: {revDate} | Rev No: {revNo}</div>
      </div>

      <p className="text-xs text-gray-400 mb-1 italic sm:hidden">{'\u2190'} Swipe to view all days</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div><label className="block text-sm font-medium mb-1">Month</label><input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="border rounded px-3 py-2 w-full" /></div>
        <div><label className="block text-sm font-medium mb-1">Area</label><input type="text" value={area} onChange={(e) => setArea(e.target.value)} className="border rounded px-3 py-2 w-full" /></div>
      </div>

      <p className="text-xs text-gray-600 mb-2 italic">Click cells to toggle: {'\u2713'} {'\u2192'} {'\u2715'} {'\u2192'} Empty. Use &quot;All {'\u2713'}&quot; button under each day to mark all parameters for that day.</p>

      <div className="overflow-x-auto border border-gray-300 rounded">
        <table className="text-[10px]">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-1 py-1 sticky left-0 bg-gray-100 z-10 min-w-[160px]">Parameters</th>
              {Array.from({ length: daysInMonth }, (_, i) => (
                <th key={i + 1} className="border border-gray-300 px-1 py-1 text-center min-w-[24px]">{i + 1}</th>
              ))}
            </tr>
            <tr>
              <th className="border border-gray-300 px-1 py-1 sticky left-0 bg-gray-100 z-10 text-[9px] text-gray-500">All {'\u2713'} {'\u2193'}</th>
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                return (
                  <th key={day} className="border border-gray-300 px-0.5 py-0.5 text-center">
                    <button onClick={() => markAllOKForDay(day)} className="text-[8px] bg-green-100 text-green-700 px-1 rounded hover:bg-green-200" title={`Mark all parameters as \u2713 for day ${day}`}>{'\u2713'}</button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {parameters.map((param) => (
              <tr key={param} className="hover:bg-blue-50">
                <td className="border border-gray-300 px-1 py-0.5 sticky left-0 bg-white z-10 font-medium whitespace-nowrap text-xs">{param}</td>
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const val = grid[param]?.[day] || "";
                  return (
                    <td
                      key={day}
                      className={`border border-gray-300 px-0.5 py-0.5 text-center cursor-pointer select-none font-bold ${
                        val === "\u2713" ? "bg-green-100 text-green-700" : val === "\u2715" ? "bg-red-100 text-red-700" : ""
                      }`}
                      onClick={() => toggleCell(param, day)}
                    >
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="bg-gray-50">
              <td className="border border-gray-300 px-1 py-0.5 sticky left-0 bg-gray-50 z-10 font-bold">CHECKED BY</td>
              <td colSpan={daysInMonth} className="border border-gray-300 px-1 py-0.5">
                <input type="text" value={checkedBy} onChange={(e) => setCheckedBy(e.target.value)} className="w-64 border rounded px-1 py-0.5 text-xs" placeholder="Name" />
              </td>
            </tr>
            <tr className="bg-gray-50">
              <td className="border border-gray-300 px-1 py-0.5 sticky left-0 bg-gray-50 z-10 font-bold">VERIFIED BY</td>
              <td colSpan={daysInMonth} className="border border-gray-300 px-1 py-0.5">
                <input type="text" value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} className="w-64 border rounded px-1 py-0.5 text-xs" placeholder="Name" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <div><label className="text-sm font-medium">Observations</label><textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={2} className="border rounded px-3 py-2 w-full" /></div>
        <div><label className="text-sm font-medium">Corrective Action</label><textarea value={correctiveAction} onChange={(e) => setCorrectiveAction(e.target.value)} rows={2} className="border rounded px-3 py-2 w-full" /></div>
      </div>
      <div className="mt-2 text-xs text-gray-500">Prepared By: FST | Approved By: FSTL</div>
      <button className="mt-4 bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 w-full sm:w-auto text-base">Submit</button>
    </div>
  );
}

// ===================== Tab Definitions =====================
const TABS = [
  { key: "floor", label: "Floor" },
  { key: "toilet", label: "Toilet" },
  { key: "facility", label: "Facility Periphery" },
  { key: "changing", label: "Changing Room" },
  { key: "storage", label: "Storage" },
  { key: "service", label: "Service Floor" },
];

export default function DailyCleaningChecklist() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("floor");

  return (
    <div className="p-3 sm:p-4 max-w-full mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        <span>Back</span>
      </button>
      {/* Tab Bar */}
      <div className="flex flex-wrap gap-1 mb-6 border-b border-gray-300">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              activeTab === tab.key
                ? "bg-blue-600 text-white border border-b-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "floor" && (
        <MonthlyGridChecklist
          title="Daily Cleaning Checklist - Floor"
          documentNo="CFPLA.C4.F.54"
          issueDate="01/11/2017"
          issueNo="04"
          revDate="13/12/2025"
          revNo="03"
          parameters={["Floor cleaned", "Walls cleaned", "Strip Curtains Cleaned", "Gaps cleaned floor/door/machines", "Window / Mesh cleaned", "Racks & pallets are cleaned & dust free", "Stairs are cleaned", "No dust on stored product / No Rat droppings", "Rodent Boxes Cleaned", "Sanitization area cleaned", "IPA Stations filled", "Dustbins Empty & Cleaned", "No Cob-webs"]}
        />
      )}
      {activeTab === "toilet" && (
        <MonthlyGridChecklist
          title="Daily Cleaning Checklist - Toilet"
          documentNo="CFPLA.C4.F.54a"
          issueDate="01/11/2017"
          issueNo="03"
          revDate="01/11/2025"
          revNo="02"
          parameters={["Floor Cleaned", "Walls Cleaned", "Wash Basin & mirror Cleaned", "Hand dryer working/Tissue placed", "No Cob-webs", "Cleaning chemicals used", "Efficient Water & no leakage", "Liquid Soap Filled", "Windows /Mesh", "Properly cleaned", "Free from odor", "Dustbin Empty & Cleaned"]}
        />
      )}
      {activeTab === "facility" && (
        <MonthlyGridChecklist
          title="Daily Housekeeping Cleaning Checklist - Facility Periphery & Security Room"
          documentNo="CFPLA.C4.F.54b"
          issueDate="01/11/2017"
          issueNo="02"
          revDate="02/01/2025"
          revNo="01"
          parameters={["Cleaned security cabin and staircase", "Dock area well cleaned & free from scrap", "Empty the dustbins & liners changed", "Cleaning of wall & are cob-web free", "Floors are cleaned", "Gate/shutters/windows mesh are cleaned", "No gaps between shutter, doors and walls", "Nitrogen cylinder/compressed air cylinders area", "Rodaboxes are in places & baited", "All area are free from cob-webs", "Fire Box & extinguishers are in place"]}
        />
      )}
      {activeTab === "changing" && (
        <MonthlyGridChecklist
          title="Daily Housekeeping Cleaning Checklist - Changing Room"
          documentNo="CFPLA.C4.F.54c"
          issueDate="01/11/2017"
          issueNo="02"
          revDate="01/10/2025"
          revNo="01"
          parameters={["Floor", "Wall", "Ceiling", "No Cobwebs", "No personal belongings"]}
        />
      )}
      {activeTab === "storage" && (
        <MonthlyGridChecklist
          title="Daily Cleaning Checklist - Inward/Outward/Storage Area"
          documentNo="CFPLA.C4.F.54d"
          issueDate="01/11/2017"
          issueNo="03"
          revDate="01/11/2025"
          revNo="02"
          parameters={["Floor Cleaned", "Walls Cleaned", "No cob-webs", "Shutter/doors/window cleaned & gap free", "No Dust on Bags", "No pest activity", "Rodent Boxes cleaned", "Strip Curtains Cleaned", "Pallet cleaned & cob-web free", "IPA stations filled", "Material Stacked on clean Pallets and away from wall", "Sample Inspection Room Cleaned", "Lifts/Forklift Cleaned & Cob-Web free"]}
        />
      )}
      {activeTab === "service" && (
        <MonthlyGridChecklist
          title="Daily Cleaning Checklist - FLOOR Service"
          documentNo="CFPLA.C4.F.54e"
          issueDate="01/11/2017"
          issueNo="04"
          revDate="13/12/2025"
          revNo="03"
          defaultArea="Service floor"
          parameters={["Floor Cleaned", "Walls Cleaned", "Strip Curtains Cleaned", "Gaps cleaned floor/door/machines", "Window / Mesh Cleaned", "Racks & pallets are cleaned & dust free", "Stairs are cleaned", "No dust on stored product / No Rat droppings", "Rodent Boxes Cleaned", "Sanitization area cleaned", "Dustbins Empty & Cleaned", "No Cob-webs", "Diesel drums are stored in designated place."]}
        />
      )}
    </div>
  );
}
