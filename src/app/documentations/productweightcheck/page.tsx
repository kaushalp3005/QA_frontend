"use client";
import { useState } from "react";

interface WeightRow {
  id: number;
  time: string;
  packingMaterialWeight: string;
  netWeight: string;
  observedGrossWeight: string;
  deviationsNoted: "Yes" | "No" | "";
  sealingCheck: "Ok" | "Not Ok" | "";
  n2Percent: string;
  checkedBy: string;
  verifiedBy: string;
}

const emptyRow = (id: number): WeightRow => ({
  id, time: "", packingMaterialWeight: "", netWeight: "", observedGrossWeight: "",
  deviationsNoted: "", sealingCheck: "", n2Percent: "", checkedBy: "", verifiedBy: "",
});

export default function ProductWeightSealCheckRecord() {
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [productName, setProductName] = useState("");
  const [batchNo, setBatchNo] = useState("");
  const [customer, setCustomer] = useState("");
  const [pkd, setPkd] = useState("");
  const [declaredNetWeight, setDeclaredNetWeight] = useState("");
  const [permissibleError, setPermissibleError] = useState("");
  const [totalPktsProduced, setTotalPktsProduced] = useState("");
  const [remarks, setRemarks] = useState("");
  const [rows, setRows] = useState<WeightRow[]>(Array.from({ length: 10 }, (_, i) => emptyRow(i + 1)));

  const addRow = () => setRows((prev) => [...prev, emptyRow(prev.length + 1)]);

  const updateRow = (id: number, field: keyof WeightRow, value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const removeRow = (id: number) => {
    if (rows.length > 1) setRows((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="p-3 sm:p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="border border-gray-300 mb-4">
        <div className="flex flex-col sm:grid sm:grid-cols-3 border-b border-gray-300">
          <div className="p-2 font-bold text-center sm:border-r border-gray-300 border-b sm:border-b-0">CANDOR FOODS PRIVATE LIMITED</div>
          <div className="p-2 text-sm sm:border-r border-gray-300 border-b sm:border-b-0">Issue Date: 01/11/2017</div>
          <div className="p-2 text-sm">Issue No: 03</div>
        </div>
        <div className="flex flex-col sm:grid sm:grid-cols-3 border-b border-gray-300">
          <div className="p-2 text-sm font-semibold sm:border-r border-gray-300 border-b sm:border-b-0">Format: Product Weight and Sealing Check Record</div>
          <div className="p-2 text-sm sm:border-r border-gray-300 border-b sm:border-b-0">Revision Date: 01/10/2025</div>
          <div className="p-2 text-sm">Revision No.: 02</div>
        </div>
        <div className="p-2 text-sm font-semibold text-center">Document No: CFPLA.C6.F.16</div>
      </div>

      {/* Meta fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="border rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Frequency</label>
          <input type="text" value="Every hour, 10 samples (Start-Mid-End)" readOnly className="border rounded px-3 py-2 w-full bg-gray-50" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Name of Product</label>
          <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} className="border rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Batch No.</label>
          <input type="text" value={batchNo} onChange={(e) => setBatchNo(e.target.value)} className="border rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Customer</label>
          <input type="text" value={customer} onChange={(e) => setCustomer(e.target.value)} className="border rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">PKD</label>
          <input type="text" value={pkd} onChange={(e) => setPkd(e.target.value)} className="border rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Declared Product Net Weight (gms)</label>
          <input type="number" value={declaredNetWeight} onChange={(e) => setDeclaredNetWeight(e.target.value)} className="border rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Permissible Error (±gms)</label>
          <input type="number" value={permissibleError} onChange={(e) => setPermissibleError(e.target.value)} className="border rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Total Pkts Produced (Nos)</label>
          <input type="number" value={totalPktsProduced} onChange={(e) => setTotalPktsProduced(e.target.value)} className="border rounded px-3 py-2 w-full" />
        </div>
      </div>

      {/* Table */}
      <p className="text-xs text-gray-400 mb-1 italic sm:hidden">← Swipe left/right to view all columns</p>
      <div className="overflow-x-auto border border-gray-300 rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-2 py-2">Sr. No</th>
              <th className="border border-gray-300 px-2 py-2">Time</th>
              <th className="border border-gray-300 px-2 py-2">Packing Material Weight (g)</th>
              <th className="border border-gray-300 px-2 py-2">Net Weight (g)</th>
              <th className="border border-gray-300 px-2 py-2">Observed Gross Weight (g)</th>
              <th className="border border-gray-300 px-2 py-2">Deviations Noted (Yes/No)</th>
              <th className="border border-gray-300 px-2 py-2">Sealing Check (Ok/Not Ok)</th>
              <th className="border border-gray-300 px-2 py-2">N2 %</th>
              <th className="border border-gray-300 px-2 py-2">Checked By</th>
              <th className="border border-gray-300 px-2 py-2">Verified By</th>
              <th className="border border-gray-300 px-2 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id} className="hover:bg-blue-50">
                <td className="border border-gray-300 px-2 py-1 text-center">{idx + 1}</td>
                <td className="border border-gray-300 px-1 py-1">
                  <input type="time" value={row.time} onChange={(e) => updateRow(row.id, "time", e.target.value)} className="w-full border rounded px-1 py-1 text-sm" />
                </td>
                <td className="border border-gray-300 px-1 py-1">
                  <input type="number" value={row.packingMaterialWeight} onChange={(e) => updateRow(row.id, "packingMaterialWeight", e.target.value)} className="w-full border rounded px-1 py-1 text-sm" />
                </td>
                <td className="border border-gray-300 px-1 py-1">
                  <input type="number" value={row.netWeight} onChange={(e) => updateRow(row.id, "netWeight", e.target.value)} className="w-full border rounded px-1 py-1 text-sm" />
                </td>
                <td className="border border-gray-300 px-1 py-1">
                  <input type="number" value={row.observedGrossWeight} onChange={(e) => updateRow(row.id, "observedGrossWeight", e.target.value)} className="w-full border rounded px-1 py-1 text-sm" />
                </td>
                <td className="border border-gray-300 px-1 py-1">
                  <select value={row.deviationsNoted} onChange={(e) => updateRow(row.id, "deviationsNoted", e.target.value)} className="w-full border rounded px-1 py-1 text-sm">
                    <option value="">-</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </td>
                <td className="border border-gray-300 px-1 py-1">
                  <select value={row.sealingCheck} onChange={(e) => updateRow(row.id, "sealingCheck", e.target.value)} className="w-full border rounded px-1 py-1 text-sm">
                    <option value="">-</option>
                    <option value="Ok">Ok</option>
                    <option value="Not Ok">Not Ok</option>
                  </select>
                </td>
                <td className="border border-gray-300 px-1 py-1">
                  <input type="number" value={row.n2Percent} onChange={(e) => updateRow(row.id, "n2Percent", e.target.value)} className="w-full border rounded px-1 py-1 text-sm" />
                </td>
                <td className="border border-gray-300 px-1 py-1">
                  <input type="text" value={row.checkedBy} onChange={(e) => updateRow(row.id, "checkedBy", e.target.value)} className="w-full border rounded px-1 py-1 text-sm" />
                </td>
                <td className="border border-gray-300 px-1 py-1">
                  <input type="text" value={row.verifiedBy} onChange={(e) => updateRow(row.id, "verifiedBy", e.target.value)} className="w-full border rounded px-1 py-1 text-sm" />
                </td>
                <td className="border border-gray-300 px-1 py-1 text-center">
                  <button onClick={() => removeRow(row.id)} className="text-red-500 hover:text-red-700 text-xs">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={addRow} className="mt-2 bg-green-600 text-white px-4 py-2.5 rounded text-sm hover:bg-green-700 w-full sm:w-auto">+ Add Row</button>

      <div className="mt-4">
        <label className="block text-sm font-medium mb-1">Remarks</label>
        <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} className="border rounded px-3 py-2 w-full" />
      </div>

      <div className="mt-2 text-xs text-gray-500">Prepared By: Production | Approved By: FSTL</div>
      <button className="mt-4 bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 w-full sm:w-auto text-base">Submit</button>
    </div>
  );
}
