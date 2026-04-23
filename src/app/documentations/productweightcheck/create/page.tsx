"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface WeightRow {
  id: number;
  time: string;
  packingMaterialWeight: string;
  netWeight: string;
  observedGrossWeight: string;
  deviationsNoted: "Ok" | "Not Ok";
  sealingCheck: "Ok" | "Not Ok";
  n2Percent: string;
  checkedBy: string;
  verifiedBy: string;
}

const currentTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const currentDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const emptyRow = (id: number): WeightRow => ({
  id, time: currentTime(), packingMaterialWeight: "", netWeight: "", observedGrossWeight: "",
  deviationsNoted: "Ok", sealingCheck: "Ok", n2Percent: "-", checkedBy: "", verifiedBy: "",
});

const DRAFT_KEY = "pwc-draft";
const DRAFT_TTL_MS = 5 * 60 * 1000;

export default function ProductWeightSealCheckRecord() {
  const router = useRouter();
  const [date, setDate] = useState(currentDate());
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
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { savedAt: number; data: Record<string, unknown> };
        if (parsed.savedAt && Date.now() - parsed.savedAt < DRAFT_TTL_MS) {
          const d = parsed.data;
          if (typeof d.date === "string") setDate(d.date);
          if (typeof d.location === "string") setLocation(d.location);
          if (typeof d.productName === "string") setProductName(d.productName);
          if (typeof d.batchNo === "string") setBatchNo(d.batchNo);
          if (typeof d.customer === "string") setCustomer(d.customer);
          if (typeof d.pkd === "string") setPkd(d.pkd);
          if (typeof d.declaredNetWeight === "string") setDeclaredNetWeight(d.declaredNetWeight);
          if (typeof d.permissibleError === "string") setPermissibleError(d.permissibleError);
          if (typeof d.totalPktsProduced === "string") setTotalPktsProduced(d.totalPktsProduced);
          if (typeof d.remarks === "string") setRemarks(d.remarks);
          if (Array.isArray(d.rows)) setRows(d.rows as WeightRow[]);
        } else {
          localStorage.removeItem(DRAFT_KEY);
        }
      }
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    const payload = {
      savedAt: Date.now(),
      data: { date, location, productName, batchNo, customer, pkd, declaredNetWeight, permissibleError, totalPktsProduced, remarks, rows },
    };
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(payload)); } catch {}
  }, [date, location, productName, batchNo, customer, pkd, declaredNetWeight, permissibleError, totalPktsProduced, remarks, rows]);

  const addRow = () => setRows((prev) => [...prev, emptyRow(prev.length + 1)]);

  const updateRow = (id: number, field: keyof WeightRow, value: string) => {
    setRows((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const next = { ...r, [field]: value };
      if (field === "packingMaterialWeight" || field === "netWeight") {
        const p = parseFloat(next.packingMaterialWeight);
        const n = parseFloat(next.netWeight);
        next.observedGrossWeight = (!isNaN(p) && !isNaN(n)) ? String(+(p + n).toFixed(3)) : "";
      }
      return next;
    }));
  };

  const removeRow = (id: number) => {
    if (rows.length > 1) setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const autofillColumn = (field: "packingMaterialWeight" | "netWeight" | "observedGrossWeight") => {
    const firstFilled = rows.find((r) => r[field] !== "");
    if (!firstFilled) return;
    const val = firstFilled[field];
    setRows((prev) =>
      prev.map((r) => {
        const next = { ...r, [field]: val };
        if (field === "packingMaterialWeight" || field === "netWeight") {
          const p = parseFloat(next.packingMaterialWeight);
          const n = parseFloat(next.netWeight);
          next.observedGrossWeight = !isNaN(p) && !isNaN(n) ? String(+(p + n).toFixed(3)) : "";
        }
        return next;
      })
    );
  };

  return (
    <div className="p-3 sm:p-4 max-w-7xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        <span>Back</span>
      </button>
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
          <label className="block text-sm font-medium mb-1">Permissible Error ({'\u00B1'}gms)</label>
          <input type="number" value={permissibleError} onChange={(e) => setPermissibleError(e.target.value)} className="border rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Total Pkts Produced (Nos)</label>
          <input type="number" value={totalPktsProduced} onChange={(e) => setTotalPktsProduced(e.target.value)} className="border rounded px-3 py-2 w-full" />
        </div>
      </div>

      {/* Table */}
      <p className="text-xs text-gray-400 mb-1 italic sm:hidden">{'\u2190'} Swipe left/right to view all columns</p>
      <div className="overflow-x-auto border border-gray-300 rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-2 py-2">Sr. No</th>
              <th className="border border-gray-300 px-2 py-2">Time</th>
              <th className="border border-gray-300 px-2 py-2">
                <div className="flex flex-col items-center gap-1">
                  <span>Packing Material Weight (g)</span>
                  <button type="button" onClick={() => autofillColumn("packingMaterialWeight")} className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-0.5 rounded whitespace-nowrap">Fill All ↓</button>
                </div>
              </th>
              <th className="border border-gray-300 px-2 py-2">
                <div className="flex flex-col items-center gap-1">
                  <span>Net Weight (g)</span>
                  <button type="button" onClick={() => autofillColumn("netWeight")} className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-0.5 rounded whitespace-nowrap">Fill All ↓</button>
                </div>
              </th>
              <th className="border border-gray-300 px-2 py-2">
                <div className="flex flex-col items-center gap-1">
                  <span>Observed Gross Weight (g)</span>
                  <button type="button" onClick={() => autofillColumn("observedGrossWeight")} className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-0.5 rounded whitespace-nowrap">Fill All ↓</button>
                </div>
              </th>
              <th className="border border-gray-300 px-2 py-2">Deviations Noted (Ok/Not Ok)</th>
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
                  <input type="text" inputMode="decimal" value={row.packingMaterialWeight} onChange={(e) => updateRow(row.id, "packingMaterialWeight", e.target.value.replace(/[^0-9.]/g, ""))} className="w-full border rounded px-1 py-1 text-sm" />
                </td>
                <td className="border border-gray-300 px-1 py-1">
                  <input type="text" inputMode="decimal" value={row.netWeight} onChange={(e) => updateRow(row.id, "netWeight", e.target.value.replace(/[^0-9.]/g, ""))} className="w-full border rounded px-1 py-1 text-sm" />
                </td>
                <td className="border border-gray-300 px-1 py-1">
                  <input type="text" inputMode="decimal" value={row.observedGrossWeight} readOnly className="w-full border rounded px-1 py-1 text-sm bg-gray-50" />
                </td>
                <td className="border border-gray-300 px-1 py-1">
                  <label className="flex items-center justify-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={row.deviationsNoted === "Ok"}
                      onChange={(e) => updateRow(row.id, "deviationsNoted", e.target.checked ? "Ok" : "Not Ok")}
                      className="h-4 w-4"
                    />
                    <span className="text-xs">{row.deviationsNoted}</span>
                  </label>
                </td>
                <td className="border border-gray-300 px-1 py-1">
                  <label className="flex items-center justify-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={row.sealingCheck === "Ok"}
                      onChange={(e) => updateRow(row.id, "sealingCheck", e.target.checked ? "Ok" : "Not Ok")}
                      className="h-4 w-4"
                    />
                    <span className="text-xs">{row.sealingCheck}</span>
                  </label>
                </td>
                <td className="border border-gray-300 px-1 py-1">
                  <input type="text" value={row.n2Percent} onChange={(e) => updateRow(row.id, "n2Percent", e.target.value)} className="w-full border rounded px-1 py-1 text-sm" />
                </td>
                <td className="border border-gray-300 px-1 py-1">
                  <input type="text" value={row.checkedBy} onChange={(e) => updateRow(row.id, "checkedBy", e.target.value)} className="w-full border rounded px-1 py-1 text-sm" />
                </td>
                <td className="border border-gray-300 px-1 py-1">
                  <input type="text" value={row.verifiedBy} onChange={(e) => updateRow(row.id, "verifiedBy", e.target.value)} className="w-full border rounded px-1 py-1 text-sm" />
                </td>
                <td className="border border-gray-300 px-1 py-1 text-center">
                  <button onClick={() => removeRow(row.id)} className="text-red-500 hover:text-red-700 text-xs">{'\u2715'}</button>
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
      <button onClick={() => { try { localStorage.removeItem(DRAFT_KEY); } catch {} }} className="mt-4 bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 w-full sm:w-auto text-base">Submit</button>
    </div>
  );
}
