"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Scale, Plus, X } from "lucide-react";
import Time12Picker from "@/components/Time12Picker";
import DocFormShell from "@/components/documentations/DocFormShell";
import DocSection from "@/components/documentations/DocSection";

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

  const autofillColumn = (field: "packingMaterialWeight" | "netWeight" | "observedGrossWeight" | "checkedBy" | "verifiedBy") => {
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

  const fillAllBtn = (field: "packingMaterialWeight" | "netWeight" | "observedGrossWeight" | "checkedBy" | "verifiedBy") => (
    <button
      type="button"
      onClick={() => autofillColumn(field)}
      className="text-[10px] font-semibold bg-brand-50 hover:bg-brand-100 text-brand-600 px-2 py-0.5 rounded whitespace-nowrap"
    >
      Fill All ↓
    </button>
  );

  return (
    <DocFormShell
      title="Product Weight & Sealing Check"
      docNo="CFPLA.C6.F.16"
      subtitle="Issue 03 · Rev 02 · 01/10/2025"
      icon={Scale}
      note="Frequency: Every hour, 10 samples (Start–Mid–End)"
    >
      <DocSection title="Batch Information" description="Identify the run being verified.">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="label-base">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="label-base">Location</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="label-base">Frequency</label>
            <input type="text" value="Every hour, 10 samples (Start-Mid-End)" readOnly className="input-base bg-cream-200/60" />
          </div>
          <div>
            <label className="label-base">Name of Product</label>
            <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="label-base">Batch No.</label>
            <input type="text" value={batchNo} onChange={(e) => setBatchNo(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="label-base">Customer</label>
            <input type="text" value={customer} onChange={(e) => setCustomer(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="label-base">PKD</label>
            <input type="text" value={pkd} onChange={(e) => setPkd(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="label-base">Declared Net Weight (gms)</label>
            <input type="number" value={declaredNetWeight} onChange={(e) => setDeclaredNetWeight(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="label-base">Permissible Error (±gms)</label>
            <input type="number" value={permissibleError} onChange={(e) => setPermissibleError(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="label-base">Total Pkts Produced (Nos)</label>
            <input type="number" value={totalPktsProduced} onChange={(e) => setTotalPktsProduced(e.target.value)} className="input-base" />
          </div>
        </div>
      </DocSection>

      <DocSection
        title="Weight & Sealing Samples"
        description={`${rows.length} sample${rows.length !== 1 ? "s" : ""}`}
        bleed
        actions={
          <button onClick={addRow} className="btn-primary !py-1.5 !px-3 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
          </button>
        }
      >
        <p className="text-[11px] text-ink-400 italic px-4 pt-3 sm:hidden">← Swipe to view all columns</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-100/70 border-b border-cream-300">
              <tr>
                <th className="px-2 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-ink-400">#</th>
                <th className="px-2 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-ink-400">Time</th>
                <th className="px-2 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-ink-400">
                  <div className="flex flex-col items-center gap-1">
                    <span>Pkg Mat. (g)</span>
                    {fillAllBtn("packingMaterialWeight")}
                  </div>
                </th>
                <th className="px-2 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-ink-400">
                  <div className="flex flex-col items-center gap-1">
                    <span>Net Wt (g)</span>
                    {fillAllBtn("netWeight")}
                  </div>
                </th>
                <th className="px-2 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-ink-400">
                  <div className="flex flex-col items-center gap-1">
                    <span>Gross Wt (g)</span>
                    {fillAllBtn("observedGrossWeight")}
                  </div>
                </th>
                <th className="px-2 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-ink-400">Deviation</th>
                <th className="px-2 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-ink-400">Sealing</th>
                <th className="px-2 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-ink-400">N₂ %</th>
                <th className="px-2 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-ink-400">
                  <div className="flex flex-col items-center gap-1">
                    <span>Checked By</span>
                    {fillAllBtn("checkedBy")}
                  </div>
                </th>
                <th className="px-2 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-ink-400">
                  <div className="flex flex-col items-center gap-1">
                    <span>Verified By</span>
                    {fillAllBtn("verifiedBy")}
                  </div>
                </th>
                <th className="px-2 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-ink-400"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {rows.map((row, idx) => (
                <tr key={row.id} className="hover:bg-cream-100/60 transition-colors">
                  <td className="px-2 py-1.5 text-center text-xs font-semibold text-ink-400">{idx + 1}</td>
                  <td className="px-1 py-1.5">
                    <Time12Picker value={row.time} onChange={(v) => updateRow(row.id, "time", v)} />
                  </td>
                  <td className="px-1 py-1.5">
                    <input type="text" inputMode="decimal" value={row.packingMaterialWeight} onChange={(e) => updateRow(row.id, "packingMaterialWeight", e.target.value.replace(/[^0-9.]/g, ""))} className="input-base !py-1.5 !px-2 text-center" />
                  </td>
                  <td className="px-1 py-1.5">
                    <input type="text" inputMode="decimal" value={row.netWeight} onChange={(e) => updateRow(row.id, "netWeight", e.target.value.replace(/[^0-9.]/g, ""))} className="input-base !py-1.5 !px-2 text-center" />
                  </td>
                  <td className="px-1 py-1.5">
                    <input type="text" inputMode="decimal" value={row.observedGrossWeight} readOnly className="input-base !py-1.5 !px-2 text-center bg-cream-200/60" />
                  </td>
                  <td className="px-1 py-1.5">
                    <label className="flex items-center justify-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={row.deviationsNoted === "Ok"}
                        onChange={(e) => updateRow(row.id, "deviationsNoted", e.target.checked ? "Ok" : "Not Ok")}
                        className="h-4 w-4 accent-brand-500"
                      />
                      <span className={`text-[11px] font-semibold ${row.deviationsNoted === "Ok" ? "text-success-600" : "text-danger-600"}`}>{row.deviationsNoted}</span>
                    </label>
                  </td>
                  <td className="px-1 py-1.5">
                    <label className="flex items-center justify-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={row.sealingCheck === "Ok"}
                        onChange={(e) => updateRow(row.id, "sealingCheck", e.target.checked ? "Ok" : "Not Ok")}
                        className="h-4 w-4 accent-brand-500"
                      />
                      <span className={`text-[11px] font-semibold ${row.sealingCheck === "Ok" ? "text-success-600" : "text-danger-600"}`}>{row.sealingCheck}</span>
                    </label>
                  </td>
                  <td className="px-1 py-1.5">
                    <input type="text" value={row.n2Percent} onChange={(e) => updateRow(row.id, "n2Percent", e.target.value)} className="input-base !py-1.5 !px-2 text-center" />
                  </td>
                  <td className="px-1 py-1.5">
                    <input type="text" value={row.checkedBy} onChange={(e) => updateRow(row.id, "checkedBy", e.target.value)} className="input-base !py-1.5 !px-2" />
                  </td>
                  <td className="px-1 py-1.5">
                    <input type="text" value={row.verifiedBy} onChange={(e) => updateRow(row.id, "verifiedBy", e.target.value)} className="input-base !py-1.5 !px-2" />
                  </td>
                  <td className="px-1 py-1.5 text-center">
                    <button
                      onClick={() => removeRow(row.id)}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-md text-ink-400 hover:text-danger-600 hover:bg-danger-50"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DocSection>

      <DocSection title="Remarks">
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={3}
          className="input-base"
          placeholder="Optional remarks for this batch..."
        />
      </DocSection>

      <div className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-ink-400">
          Prepared By: <span className="font-semibold text-ink-500">Production</span>
          <span className="mx-2 text-cream-300">|</span>
          Approved By: <span className="font-semibold text-ink-500">FSTL</span>
        </p>
        <button
          onClick={() => { try { localStorage.removeItem(DRAFT_KEY); } catch {} }}
          className="btn-primary"
        >
          Submit Record
        </button>
      </div>
    </DocFormShell>
  );
}
