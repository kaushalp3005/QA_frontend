"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface ChangeoverRow {
  id: number;
  date: string;
  productBeforeChangeover: string;
  batchNo: string;
  table: string;
  weighingUtensils: string;
  tools: string;
  weighingScale: string;
  sieves: string;
  changeOfGloves: string;
  noProductLeftOver: string;
  machineProperlyCleaned: string;
  checkedBy: string;
  verifiedBy: string;
}

const emptyRow = (): ChangeoverRow => ({
  id: Date.now() + Math.random(),
  date: "",
  productBeforeChangeover: "",
  batchNo: "",
  table: "",
  weighingUtensils: "",
  tools: "",
  weighingScale: "",
  sieves: "",
  changeOfGloves: "",
  noProductLeftOver: "",
  machineProperlyCleaned: "",
  checkedBy: "",
  verifiedBy: "",
});

export default function ProductChangeoverLineClearance() {
  const router = useRouter();
  const [area, setArea] = useState("");
  const [rows, setRows] = useState<ChangeoverRow[]>([emptyRow(), emptyRow(), emptyRow()]);

  const addRow = () => setRows((r) => [...r, emptyRow()]);
  const removeRow = (id: number) => setRows((r) => r.filter((row) => row.id !== id));

  const updateRow = (id: number, field: keyof ChangeoverRow, value: string) => {
    setRows((r) => r.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const TickCell = ({ id, field, value }: { id: number; field: keyof ChangeoverRow; value: string }) => {
    const ok = value === "\u2713";
    return (
      <label className={`flex items-center justify-center cursor-pointer py-0.5 rounded ${ok ? "bg-green-50" : value === "\u2715" ? "bg-red-50" : ""}`}>
        <input
          type="checkbox"
          checked={ok}
          onChange={(e) => updateRow(id, field, e.target.checked ? "\u2713" : "\u2715")}
          className="h-4 w-4 accent-red-600 cursor-pointer"
        />
      </label>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-mono">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        <span>Back</span>
      </button>
      <div className="max-w-[1400px] mx-auto bg-white shadow-lg rounded-sm border border-gray-200">
        {/* Header */}
        <div className="border-b border-gray-300">
          <div className="flex flex-col sm:grid sm:grid-cols-3 sm:divide-x divide-gray-300">
            <div className="flex items-center justify-center p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-red-700 rounded-sm flex items-center justify-center">
                  <span className="text-white text-xs font-bold">CF</span>
                </div>
                <span className="font-bold text-gray-800 text-sm">Candor Foods</span>
              </div>
            </div>
            <div className="p-3 text-center">
              <div className="font-bold text-gray-800 text-sm">CANDOR FOODS PRIVATE LIMITED</div>
              <div className="text-xs text-gray-600 mt-1">Format: Product Changeover Line Clearance Record</div>
              <div className="text-xs text-gray-600">Document No: CFPLA.C5.F.44</div>
            </div>
            <div className="p-3 text-xs text-gray-600 space-y-1">
              <div className="flex justify-between"><span>Issue Date:</span><span className="font-medium">01/11/2017</span></div>
              <div className="flex justify-between"><span>Issue No:</span><span className="font-medium">04</span></div>
              <div className="flex justify-between"><span>Revision Date:</span><span className="font-medium">01/10/2025</span></div>
              <div className="flex justify-between"><span>Revision No.:</span><span className="font-medium">03</span></div>
            </div>
          </div>
        </div>

        <div className="p-4">
          {/* Area + Frequency */}
          <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:items-center mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">Area:</span>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="border-b border-gray-400 focus:border-red-600 outline-none px-2 py-1 text-sm flex-1 sm:w-48"
                placeholder="Enter area"
              />
            </div>
            <div className="text-sm font-semibold text-gray-700">
              Frequency: <span className="font-normal">After every product change.</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-1 italic sm:hidden">{'\u2190'} Swipe to view all columns</p>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs border border-gray-400">
              <thead>
                <tr className="bg-gray-100">
                  <th rowSpan={2} className="border border-gray-400 p-1.5 text-center w-8">#</th>
                  <th rowSpan={2} className="border border-gray-400 p-1.5 text-center w-24">Date</th>
                  <th rowSpan={2} className="border border-gray-400 p-1.5 text-center w-32">Product Before Changeover</th>
                  <th rowSpan={2} className="border border-gray-400 p-1.5 text-center w-20">Batch No.</th>
                  <th colSpan={6} className="border border-gray-400 p-1.5 text-center bg-blue-50">Cleaning &amp; Sanitation</th>
                  <th colSpan={2} className="border border-gray-400 p-1.5 text-center bg-green-50">Hygiene Clearance Check</th>
                  <th rowSpan={2} className="border border-gray-400 p-1.5 text-center w-20">Checked By</th>
                  <th rowSpan={2} className="border border-gray-400 p-1.5 text-center w-20">Verified By</th>
                  <th rowSpan={2} className="border border-gray-400 p-1.5 text-center w-8 text-red-500">{'\u2715'}</th>
                </tr>
                <tr className="bg-gray-100">
                  {["Table", "Weighing Utensils", "Tools", "Weighing Scale", "Sieves", "Change of Gloves"].map((h) => (
                    <th key={h} className="border border-gray-400 p-1.5 text-center bg-blue-50 w-16">{h}</th>
                  ))}
                  <th className="border border-gray-400 p-1.5 text-center bg-green-50 w-20">No Product Left Over</th>
                  <th className="border border-gray-400 p-1.5 text-center bg-green-50 w-24">Machine Properly Cleaned</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-1 text-center text-gray-500">{idx + 1}</td>
                    <td className="border border-gray-300 p-1">
                      <input type="date" value={row.date} onChange={(e) => updateRow(row.id, "date", e.target.value)}
                        className="w-full text-xs border-0 focus:outline-none focus:ring-1 focus:ring-red-400 rounded px-1" />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input type="text" value={row.productBeforeChangeover} onChange={(e) => updateRow(row.id, "productBeforeChangeover", e.target.value)}
                        className="w-full text-xs border-0 focus:outline-none focus:ring-1 focus:ring-red-400 rounded px-1" placeholder="Product name" />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input type="text" value={row.batchNo} onChange={(e) => updateRow(row.id, "batchNo", e.target.value)}
                        className="w-full text-xs border-0 focus:outline-none focus:ring-1 focus:ring-red-400 rounded px-1" />
                    </td>
                    {(["table", "weighingUtensils", "tools", "weighingScale", "sieves", "changeOfGloves"] as (keyof ChangeoverRow)[]).map((field) => (
                      <td key={field} className="border border-gray-300 p-1 text-center bg-blue-50/30">
                        <TickCell id={row.id} field={field} value={row[field] as string} />
                      </td>
                    ))}
                    {(["noProductLeftOver", "machineProperlyCleaned"] as (keyof ChangeoverRow)[]).map((field) => (
                      <td key={field} className="border border-gray-300 p-1 text-center bg-green-50/30">
                        <TickCell id={row.id} field={field} value={row[field] as string} />
                      </td>
                    ))}
                    <td className="border border-gray-300 p-1">
                      <input type="text" value={row.checkedBy} onChange={(e) => updateRow(row.id, "checkedBy", e.target.value)}
                        className="w-full text-xs border-0 focus:outline-none focus:ring-1 focus:ring-red-400 rounded px-1" />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <input type="text" value={row.verifiedBy} onChange={(e) => updateRow(row.id, "verifiedBy", e.target.value)}
                        className="w-full text-xs border-0 focus:outline-none focus:ring-1 focus:ring-red-400 rounded px-1" />
                    </td>
                    <td className="border border-gray-300 p-1 text-center">
                      <button onClick={() => removeRow(row.id)} className="text-red-400 hover:text-red-600 text-xs font-bold">{'\u2715'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button onClick={addRow}
            className="mt-3 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-700 text-white text-sm rounded hover:bg-red-800 transition-colors w-full sm:w-auto">
            <span className="text-base leading-none">+</span> Add Row
          </button>

          {/* Footer */}
          <div className="flex justify-between mt-6 pt-4 border-t border-gray-200 text-xs text-gray-600">
            <span>Prepared By: <strong>Production Supervisor</strong></span>
            <span>Approved By: <strong>FSTL</strong></span>
          </div>

          <button className="mt-4 bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 w-full sm:w-auto text-base">Submit</button>
        </div>
      </div>
    </div>
  );
}
