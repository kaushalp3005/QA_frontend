"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type CheckValue = "\u2713" | "\u2715" | "";

interface HygieneRow {
  id: number;
  srNo: string;
  name: string;
  respiratory: CheckValue;
  skinDisease: CheckValue;
  wounds: CheckValue;
  earNoseThroat: CheckValue;
  gowning: CheckValue;
  handHygiene: CheckValue;
  nails: CheckValue;
  cleanShaven: CheckValue;
  hairPins: CheckValue;
  tobacco: CheckValue;
  employeeSign: string;
  correctiveAction: string;
}

const emptyRow = (): HygieneRow => ({
  id: Date.now() + Math.random(),
  srNo: "",
  name: "",
  respiratory: "",
  skinDisease: "",
  wounds: "",
  earNoseThroat: "",
  gowning: "",
  handHygiene: "",
  nails: "",
  cleanShaven: "",
  hairPins: "",
  tobacco: "",
  employeeSign: "",
  correctiveAction: "",
});

const CHECK_FIELDS: { field: keyof HygieneRow; label: string; group: string; color: string }[] = [
  { field: "respiratory", label: "Respiratory/Fever/GI", group: "Injury/Infectious Diseases", color: "bg-red-50" },
  { field: "skinDisease", label: "Skin Disease/Burned Skin", group: "Injury/Infectious Diseases", color: "bg-red-50" },
  { field: "wounds", label: "Wounds/Cuts (No Bandage)", group: "Injury/Infectious Diseases", color: "bg-red-50" },
  { field: "earNoseThroat", label: "Ear, Nose & Throat Infection", group: "Injury/Infectious Diseases", color: "bg-red-50" },
  { field: "gowning", label: "Gowning: Apron, Gloves, Footwear, Mask", group: "Personal Cleanliness", color: "bg-blue-50" },
  { field: "handHygiene", label: "Hand Hygiene", group: "Personal Cleanliness", color: "bg-blue-50" },
  { field: "nails", label: "Nails Trimmed / No Nail Paint", group: "Personal Cleanliness", color: "bg-blue-50" },
  { field: "cleanShaven", label: "Clean Shaven / Trim Hairs (Male)", group: "Personal Cleanliness", color: "bg-blue-50" },
  { field: "hairPins", label: "Hair/Nose/Ear Pins, Rings, Bangles, Mehandi", group: "Personal Belongings", color: "bg-green-50" },
  { field: "tobacco", label: "Cigarettes, Tobacco, Pan Masala, Chewing Gums", group: "Personal Belongings", color: "bg-green-50" },
];

const GROUPS = [
  { name: "Injury/Infectious Diseases", color: "bg-red-100", span: 4 },
  { name: "Personal Cleanliness", color: "bg-blue-100", span: 4 },
  { name: "Personal Belongings", color: "bg-green-100", span: 2 },
];

export default function PersonalHygieneHealthCheckup() {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [area, setArea] = useState("");
  const [checkedBy, setCheckedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [observation, setObservation] = useState("");
  const [rows, setRows] = useState<HygieneRow[]>(Array.from({ length: 10 }, emptyRow));

  const addRow = () => setRows((r) => [...r, emptyRow()]);
  const removeRow = (id: number) => setRows((r) => r.filter((row) => row.id !== id));

  const updateRow = (id: number, field: keyof HygieneRow, value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const CheckSelect = ({ id, field, value, bgClass }: { id: number; field: keyof HygieneRow; value: string; bgClass: string }) => (
    <select value={value}
      onChange={(e) => updateRow(id, field, e.target.value)}
      className={`w-full text-center border-0 focus:outline-none focus:ring-1 focus:ring-red-300 rounded text-sm py-0.5 ${bgClass} ${value === "\u2713" ? "text-green-700 font-bold" : value === "\u2715" ? "text-red-700 font-bold" : "text-gray-400"}`}>
      <option value="">{'\u2014'}</option>
      <option value={'\u2713'}>{'\u2713'}</option>
      <option value={'\u2715'}>{'\u2715'}</option>
    </select>
  );

  const failCount = (field: keyof HygieneRow) =>
    rows.filter((r) => r[field] === "\u2715").length;

  return (
    <div className="min-h-screen bg-gray-50 font-mono p-3">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        <span>Back</span>
      </button>
      <div className="max-w-[1600px] mx-auto bg-white shadow-lg rounded-sm border border-gray-200">
        {/* Header */}
        <div className="border-b border-gray-300">
          <div className="flex flex-col sm:grid sm:grid-cols-3 sm:divide-x divide-gray-300">
            <div className="flex items-center gap-2 p-3">
              <div className="w-9 h-9 bg-red-700 rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">CF</span>
              </div>
              <div>
                <div className="font-bold text-gray-800 text-xs">Candor Foods</div>
                <div className="text-xs text-gray-400">Private Limited</div>
              </div>
            </div>
            <div className="p-3 text-center">
              <div className="font-bold text-gray-800 text-xs">CANDOR FOODS PRIVATE LIMITED</div>
              <div className="text-xs text-gray-600 mt-0.5">Personal Hygiene &amp; Health Checkup Record</div>
              <div className="text-xs text-gray-500">Document No: CFPLA.C7.F.39</div>
            </div>
            <div className="p-3 text-xs text-gray-600 space-y-0.5">
              <div className="flex justify-between"><span>Frequency:</span><span className="font-medium">Daily</span></div>
            </div>
          </div>
        </div>

        <div className="p-3">
          {/* Date/Area Row */}
          <p className="text-xs text-gray-400 mb-1 italic sm:hidden">{'\u2190'} Swipe to view all columns</p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-8 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-700">DATE:</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="border-b border-gray-400 focus:border-red-600 outline-none px-2 py-0.5 text-xs" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-700">Area:</span>
              <input type="text" value={area} onChange={(e) => setArea(e.target.value)}
                className="border-b border-gray-400 focus:border-red-600 outline-none px-2 py-0.5 text-xs w-40"
                placeholder="Enter area" />
            </div>
          </div>

          {/* Column Stats */}
          <div className="flex flex-wrap gap-2 mb-3">
            {CHECK_FIELDS.map(({ field, label }) => {
              const fails = failCount(field);
              return fails > 0 ? (
                <span key={field} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  {'\u2715'} {label}: {fails}
                </span>
              ) : null;
            })}
          </div>

          {/* Main Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs border border-gray-400">
              <thead>
                <tr>
                  <th rowSpan={2} className="border border-gray-400 p-1.5 text-center w-8 bg-gray-100">Sr.</th>
                  <th rowSpan={2} className="border border-gray-400 p-1.5 text-center w-32 bg-gray-100">Name</th>
                  {GROUPS.map((g) => (
                    <th key={g.name} colSpan={g.span} className={`border border-gray-400 p-1.5 text-center ${g.color}`}>
                      {g.name} ({'\u2713'}/{'\u2715'})
                    </th>
                  ))}
                  <th rowSpan={2} className="border border-gray-400 p-1.5 text-center w-20 bg-gray-100">Employee Sign</th>
                  <th rowSpan={2} className="border border-gray-400 p-1.5 text-center w-36 bg-gray-100">Corrective Action (If any)</th>
                  <th rowSpan={2} className="border border-gray-400 p-1.5 text-center w-6 bg-gray-100 text-red-400">{'\u2715'}</th>
                </tr>
                <tr>
                  {CHECK_FIELDS.map(({ field, label, color }) => (
                    <th key={field} className={`border border-gray-400 p-1 text-center w-20 ${color} leading-tight`}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const hasIssue = CHECK_FIELDS.some(({ field }) => row[field] === "\u2715");
                  return (
                    <tr key={row.id} className={hasIssue ? "bg-red-50" : "hover:bg-gray-50"}>
                      <td className="border border-gray-300 p-1 text-center text-gray-400">{idx + 1}</td>
                      <td className="border border-gray-300 p-1">
                        <input type="text" value={row.name} onChange={(e) => updateRow(row.id, "name", e.target.value)}
                          placeholder="Employee name"
                          className="w-full border-0 focus:outline-none focus:ring-1 focus:ring-red-300 rounded px-1 text-xs bg-transparent" />
                      </td>
                      {CHECK_FIELDS.map(({ field, color }) => (
                        <td key={field} className={`border border-gray-300 p-0.5 ${color}/30`}>
                          <CheckSelect id={row.id} field={field} value={row[field] as string} bgClass={color + "/30"} />
                        </td>
                      ))}
                      <td className="border border-gray-300 p-1">
                        <input type="text" value={row.employeeSign} onChange={(e) => updateRow(row.id, "employeeSign", e.target.value)}
                          className="w-full border-0 focus:outline-none focus:ring-1 focus:ring-red-300 rounded px-1 text-xs bg-transparent" />
                      </td>
                      <td className="border border-gray-300 p-1">
                        <input type="text" value={row.correctiveAction} onChange={(e) => updateRow(row.id, "correctiveAction", e.target.value)}
                          disabled={!hasIssue}
                          placeholder={hasIssue ? "Describe action\u2026" : "\u2014"}
                          className="w-full border-0 focus:outline-none focus:ring-1 focus:ring-red-300 rounded px-1 text-xs bg-transparent disabled:text-gray-300" />
                      </td>
                      <td className="border border-gray-300 p-1 text-center">
                        <button onClick={() => removeRow(row.id)} className="text-red-400 hover:text-red-600 font-bold">{'\u2715'}</button>
                      </td>
                    </tr>
                  );
                })}
                {/* Observation row */}
                <tr className="bg-gray-100">
                  <td colSpan={2} className="border border-gray-400 p-2 font-semibold text-xs text-gray-700">Observation:</td>
                  <td colSpan={10} className="border border-gray-400 p-1">
                    <input type="text" value={observation} onChange={(e) => setObservation(e.target.value)}
                      className="w-full border-0 focus:outline-none text-xs bg-transparent px-1"
                      placeholder="Overall observation notes\u2026" />
                  </td>
                  <td colSpan={3} className="border border-gray-400 p-1"></td>
                </tr>
              </tbody>
            </table>
          </div>

          <button onClick={addRow}
            className="mt-3 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-700 text-white text-sm rounded hover:bg-red-800 transition-colors w-full sm:w-auto">
            <span className="text-base leading-none">+</span> Add Row
          </button>

          {/* Footer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-600">Checked By:</span>
              <input type="text" value={checkedBy} onChange={(e) => setCheckedBy(e.target.value)}
                className="border-b border-gray-400 focus:border-red-600 outline-none px-2 py-0.5 text-xs flex-1" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-600">Verified By:</span>
              <input type="text" value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)}
                className="border-b border-gray-400 focus:border-red-600 outline-none px-2 py-0.5 text-xs flex-1" />
            </div>
          </div>

          <div className="flex justify-between mt-4 text-xs text-gray-500">
            <span>Prepared By: <strong>FST</strong></span>
            <span>Approved By: <strong>FSTL</strong></span>
          </div>

          <button className="mt-4 bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 w-full sm:w-auto text-base">Submit</button>
        </div>
      </div>
    </div>
  );
}
