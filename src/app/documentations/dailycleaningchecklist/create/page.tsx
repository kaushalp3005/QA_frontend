"use client";
import { useState } from "react";
import { Sparkles, Check, X as XIcon } from "lucide-react";
import DocFormShell from "@/components/documentations/DocFormShell";
import DocSection from "@/components/documentations/DocSection";

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

type CellStatus = "✓" | "✕" | "";

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
      const next = current === "" ? "✓" : current === "✓" ? "✕" : "";
      return { ...prev, [param]: { ...prev[param], [day]: next } };
    });
  };

  const markAllOKForDay = (day: number) => {
    setGrid((prev) => {
      const next: Record<string, Record<number, CellStatus>> = {};
      parameters.forEach((p) => {
        next[p] = { ...prev[p], [day]: "✓" };
      });
      return next;
    });
  };

  return (
    <div className="space-y-5">
      <DocSection title={title} description={`${documentNo} · Issue ${issueNo} · Rev ${revNo} · ${revDate}`}>
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
          Click cells to toggle: <span className="text-success-600 font-bold">✓</span> → <span className="text-danger-600 font-bold">✕</span> → empty.
          Use the day header button to mark every parameter ✓ for that day.
        </p>
      </DocSection>

      <DocSection title="Daily Status Grid" description={`${parameters.length} parameters × ${daysInMonth} days`} bleed>
        <p className="text-[11px] text-ink-400 italic px-4 pt-3 sm:hidden">← Swipe to view all days</p>
        <div className="overflow-x-auto">
          <table className="text-[10px]">
            <thead className="bg-cream-100/70 border-b border-cream-300">
              <tr>
                <th className="px-2 py-2 sticky left-0 bg-cream-100 z-10 min-w-[160px] text-left text-[11px] font-semibold tracking-wider uppercase text-ink-400">
                  Parameter
                </th>
                {Array.from({ length: daysInMonth }, (_, i) => (
                  <th key={i + 1} className="px-1 py-2 text-center min-w-[24px] text-[11px] font-semibold text-ink-400">{i + 1}</th>
                ))}
              </tr>
              <tr className="border-t border-cream-300">
                <th className="px-2 py-1 sticky left-0 bg-cream-100 z-10 text-[9px] text-ink-400 text-left">All ✓ ↓</th>
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  return (
                    <th key={day} className="px-0.5 py-0.5 text-center">
                      <button
                        onClick={() => markAllOKForDay(day)}
                        className="text-[9px] bg-success-50 text-success-700 px-1 rounded hover:bg-success-100"
                        title={`Mark all parameters ✓ for day ${day}`}
                      >
                        ✓
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {parameters.map((param) => (
                <tr key={param} className="hover:bg-cream-100/60">
                  <td className="px-2 py-1 sticky left-0 bg-cream-50 z-10 font-semibold whitespace-nowrap text-xs text-ink-500">{param}</td>
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const val = grid[param]?.[day] || "";
                    return (
                      <td
                        key={day}
                        className={`px-0.5 py-0.5 text-center cursor-pointer select-none font-bold border-l border-cream-300 ${
                          val === "✓"
                            ? "bg-success-50 text-success-700"
                            : val === "✕"
                            ? "bg-danger-50 text-danger-600"
                            : ""
                        }`}
                        onClick={() => toggleCell(param, day)}
                      >
                        {val}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 sm:p-5 border-t border-cream-300">
          <div>
            <label className="label-base">Checked By</label>
            <input type="text" value={checkedBy} onChange={(e) => setCheckedBy(e.target.value)} className="input-base" placeholder="Name" />
          </div>
          <div>
            <label className="label-base">Verified By</label>
            <input type="text" value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} className="input-base" placeholder="Name" />
          </div>
        </div>
      </DocSection>

      <DocSection title="Notes & Corrective Action">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label-base">Observations</label>
            <textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={3} className="input-base" />
          </div>
          <div>
            <label className="label-base">Corrective Action</label>
            <textarea value={correctiveAction} onChange={(e) => setCorrectiveAction(e.target.value)} rows={3} className="input-base" />
          </div>
        </div>
      </DocSection>

      <div className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-ink-400">
          Prepared By: <span className="font-semibold text-ink-500">FST</span>
          <span className="mx-2 text-cream-300">|</span>
          Approved By: <span className="font-semibold text-ink-500">FSTL</span>
        </p>
        <button className="btn-primary">Submit Record</button>
      </div>
    </div>
  );
}

const TABS = [
  { key: "floor", label: "Floor" },
  { key: "toilet", label: "Toilet" },
  { key: "facility", label: "Facility Periphery" },
  { key: "changing", label: "Changing Room" },
  { key: "storage", label: "Storage" },
  { key: "service", label: "Service Floor" },
];

export default function DailyCleaningChecklist() {
  const [activeTab, setActiveTab] = useState("floor");

  return (
    <DocFormShell
      title="Daily Cleaning Checklist"
      docNo="CFPLA.C4.F.54"
      subtitle="Multi-tab daily housekeeping log"
      icon={Sparkles}
      width="full"
    >
      <div className="surface-card p-2 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-brand-500 text-white shadow-soft"
                  : "text-ink-500 hover:bg-cream-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

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
    </DocFormShell>
  );
}
