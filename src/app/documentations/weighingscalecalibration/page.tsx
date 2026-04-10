"use client";
import { useState } from "react";

interface CalibrationRow {
  id: number;
  srNo: string;
  identificationNo: string;
  capacityKg: string;
  location: string;
  standardWeightUsed: string;
  reading1: string;
  reading2: string;
  reading3: string;
  reading4: string;
  reading5: string;
  deviation: string;
  correctiveAction: string;
}

const emptyRow = (): CalibrationRow => ({
  id: Date.now() + Math.random(),
  srNo: "",
  identificationNo: "",
  capacityKg: "",
  location: "",
  standardWeightUsed: "",
  reading1: "",
  reading2: "",
  reading3: "",
  reading4: "",
  reading5: "",
  deviation: "",
  correctiveAction: "",
});

const READINGS: (keyof CalibrationRow)[] = ["reading1", "reading2", "reading3", "reading4", "reading5"];

function getDeviationStatus(row: CalibrationRow): "ok" | "deviation" | "empty" {
  const std = parseFloat(row.standardWeightUsed);
  const readings = READINGS.map((r) => parseFloat(row[r] as string)).filter((v) => !isNaN(v));
  if (isNaN(std) || readings.length === 0) return "empty";
  const maxDev = Math.max(...readings.map((v) => Math.abs(v - std)));
  return maxDev <= std * 0.001 ? "ok" : "deviation";
}

export default function WeighingScaleCalibration() {
  const [dateOfInspection, setDateOfInspection] = useState("");
  const [calibratedBy, setCalibratedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [rows, setRows] = useState<CalibrationRow[]>(Array.from({ length: 8 }, emptyRow));

  const addRow = () => setRows((r) => [...r, emptyRow()]);
  const removeRow = (id: number) => setRows((r) => r.filter((row) => row.id !== id));

  const updateRow = (id: number, field: keyof CalibrationRow, value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const inp = (align = "left") =>
    `w-full px-1 py-0.5 border-0 border-b border-transparent hover:border-gray-200 focus:border-red-400 outline-none text-xs bg-transparent text-${align}`;

  const deviations = rows.filter((r) => getDeviationStatus(r) === "deviation").length;

  return (
    <div className="min-h-screen bg-gray-50 font-mono p-4">
      <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-sm border border-gray-200">
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
              <div className="text-xs text-gray-600 mt-0.5">FORMAT: In-house Weighing Scale Calibration Record</div>
              <div className="text-xs text-gray-500">Document No: CFPLA.C6.F.41</div>
            </div>
            <div className="p-3 text-xs text-gray-600 space-y-0.5">
              <div className="flex justify-between"><span>Issue Date:</span><span className="font-medium">01/08/2020</span></div>
              <div className="flex justify-between"><span>Issue No:</span><span className="font-medium">04</span></div>
              <div className="flex justify-between"><span>Revision Date:</span><span className="font-medium">01/10/2025</span></div>
              <div className="flex justify-between"><span>Revision No.:</span><span className="font-medium">03</span></div>
            </div>
          </div>
        </div>

        <div className="p-4">
          {/* Date + Frequency */}
          <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:items-center mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-700">Date of Inspection:</span>
              <input type="date" value={dateOfInspection} onChange={(e) => setDateOfInspection(e.target.value)}
                className="border-b border-gray-400 focus:border-red-600 outline-none px-2 py-1 text-sm" />
            </div>
            <div className="text-xs text-gray-600">
              Frequency: <span className="font-semibold">Daily (Before starting the production)</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-1 italic sm:hidden">← Swipe to view all columns</p>

          {/* Status Banner */}
          {deviations > 0 && (
            <div className="mb-3 p-2 bg-red-50 border border-red-300 rounded text-xs text-red-700">
              ⚠️ <strong>{deviations} scale(s)</strong> showing deviation. Corrective action required before production start.
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs border border-gray-400">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 p-1.5 text-center w-8">Sr.</th>
                  <th className="border border-gray-400 p-1.5 text-center w-24">Identification No.</th>
                  <th className="border border-gray-400 p-1.5 text-center w-20">Capacity (Kg)</th>
                  <th className="border border-gray-400 p-1.5 text-center w-28">Location</th>
                  <th className="border border-gray-400 p-1.5 text-center w-24">Standard Weight Used</th>
                  {["1", "2", "3", "4", "5"].map((n) => (
                    <th key={n} className="border border-gray-400 p-1.5 text-center w-16 bg-blue-50">Reading {n}</th>
                  ))}
                  <th className="border border-gray-400 p-1.5 text-center w-28 bg-orange-50">Deviation / Remark</th>
                  <th className="border border-gray-400 p-1.5 text-center w-32 bg-red-50">Corrective Action</th>
                  <th className="border border-gray-400 p-1.5 text-center w-6 text-red-400">✕</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const status = getDeviationStatus(row);
                  return (
                    <tr key={row.id}
                      className={`${status === "deviation" ? "bg-red-50" : status === "ok" ? "bg-green-50/40" : "hover:bg-gray-50"}`}>
                      <td className="border border-gray-300 p-1 text-center text-gray-400">{idx + 1}</td>
                      <td className="border border-gray-300 p-1">
                        <input type="text" value={row.identificationNo} onChange={(e) => updateRow(row.id, "identificationNo", e.target.value)}
                          placeholder="Scale ID" className={inp()} />
                      </td>
                      <td className="border border-gray-300 p-1">
                        <input type="number" value={row.capacityKg} onChange={(e) => updateRow(row.id, "capacityKg", e.target.value)}
                          placeholder="kg" className={inp("center")} />
                      </td>
                      <td className="border border-gray-300 p-1">
                        <input type="text" value={row.location} onChange={(e) => updateRow(row.id, "location", e.target.value)}
                          placeholder="Floor/Area" className={inp()} />
                      </td>
                      <td className="border border-gray-300 p-1">
                        <input type="number" step="0.001" value={row.standardWeightUsed}
                          onChange={(e) => updateRow(row.id, "standardWeightUsed", e.target.value)}
                          placeholder="kg" className={inp("center")} />
                      </td>
                      {READINGS.map((field) => (
                        <td key={field} className="border border-gray-300 p-1 bg-blue-50/20">
                          <input type="number" step="0.001" value={row[field] as string}
                            onChange={(e) => updateRow(row.id, field, e.target.value)}
                            placeholder="—" className={inp("center")} />
                        </td>
                      ))}
                      <td className="border border-gray-300 p-1 bg-orange-50/20">
                        <input type="text" value={row.deviation} onChange={(e) => updateRow(row.id, "deviation", e.target.value)}
                          placeholder={status === "deviation" ? "Enter deviation" : status === "ok" ? "Within tolerance" : "—"}
                          className={inp()} />
                      </td>
                      <td className="border border-gray-300 p-1 bg-red-50/20">
                        <input type="text" value={row.correctiveAction} onChange={(e) => updateRow(row.id, "correctiveAction", e.target.value)}
                          disabled={status !== "deviation"}
                          placeholder={status === "deviation" ? "Action taken…" : "—"}
                          className={`${inp()} disabled:text-gray-300`} />
                      </td>
                      <td className="border border-gray-300 p-1 text-center">
                        <button onClick={() => removeRow(row.id)} className="text-red-400 hover:text-red-600 font-bold">✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="mt-3 flex gap-4 text-xs">
            <span className="text-green-600">✓ OK: {rows.filter((r) => getDeviationStatus(r) === "ok").length}</span>
            <span className="text-red-600">✕ Deviation: {rows.filter((r) => getDeviationStatus(r) === "deviation").length}</span>
            <span className="text-gray-500">Empty: {rows.filter((r) => getDeviationStatus(r) === "empty").length}</span>
          </div>

          <button onClick={addRow}
            className="mt-3 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-700 text-white text-sm rounded hover:bg-red-800 transition-colors w-full sm:w-auto">
            <span className="text-base leading-none">+</span> Add Row
          </button>

          {/* Footer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-600">Calibrated By:</span>
              <input type="text" value={calibratedBy} onChange={(e) => setCalibratedBy(e.target.value)}
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
