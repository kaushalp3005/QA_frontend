"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Scale, Plus, X, ChevronDown, ChevronUp, Trash2, Package, Loader2, CheckCircle2 } from "lucide-react";
import Time12Picker from "@/components/Time12Picker";
import DocFormShell from "@/components/documentations/DocFormShell";
import SignaturePicker from "@/components/ui/SignaturePicker";
import { CHECKED_BY_OPTIONS, QC_VERIFIED_BY_OPTIONS } from "@/lib/signatures";
import { docsApi } from "@/lib/api/documentations";

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

interface ProductEntry {
  entryId: string;
  collapsed: boolean;
  date: string;
  location: string;
  productName: string;
  batchNo: string;
  customer: string;
  pkd: string;
  declaredNetWeight: string;
  permissibleError: string;
  totalPktsProduced: string;
  remarks: string;
  recordCheckedBy: string;
  recordVerifiedBy: string;
  rows: WeightRow[];
}

const currentDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const emptyRow = (id: number): WeightRow => ({
  id, time: "", packingMaterialWeight: "", netWeight: "", observedGrossWeight: "",
  deviationsNoted: "Ok", sealingCheck: "Ok", n2Percent: "-", checkedBy: "", verifiedBy: "",
});

let _entryCounter = 0;
const newEntry = (): ProductEntry => ({
  entryId: String(++_entryCounter),
  collapsed: false,
  date: currentDate(),
  location: "",
  productName: "",
  batchNo: "",
  customer: "",
  pkd: "",
  declaredNetWeight: "",
  permissibleError: "",
  totalPktsProduced: "",
  remarks: "",
  recordCheckedBy: "",
  recordVerifiedBy: "",
  rows: Array.from({ length: 35 }, (_, i) => emptyRow(i + 1)),
});

const DRAFT_KEY = "pwc-draft";
const DRAFT_TTL_MS = 5 * 60 * 1000;

export default function ProductWeightSealCheckRecord() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductEntry[]>(() => [newEntry()]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { savedAt: number; data: { products?: ProductEntry[] } };
        if (parsed.savedAt && Date.now() - parsed.savedAt < DRAFT_TTL_MS) {
          if (Array.isArray(parsed.data.products) && parsed.data.products.length > 0) {
            setProducts(parsed.data.products);
          }
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
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), data: { products } }));
    } catch {}
  }, [products]);

  const addProduct = () => setProducts(prev => [...prev, newEntry()]);

  const removeProduct = (entryId: string) => {
    setProducts(prev => prev.length > 1 ? prev.filter(p => p.entryId !== entryId) : prev);
  };

  const toggleCollapse = (entryId: string) => {
    setProducts(prev => prev.map(p => p.entryId === entryId ? { ...p, collapsed: !p.collapsed } : p));
  };

  const updateEntry = (entryId: string, updates: Partial<ProductEntry>) => {
    setProducts(prev => prev.map(p => p.entryId === entryId ? { ...p, ...updates } : p));
  };

  const addRow = (entryId: string) => {
    setProducts(prev => prev.map(p => {
      if (p.entryId !== entryId) return p;
      return { ...p, rows: [...p.rows, emptyRow(p.rows.length + 1)] };
    }));
  };

  const removeRow = (entryId: string, rowId: number) => {
    setProducts(prev => prev.map(p => {
      if (p.entryId !== entryId || p.rows.length <= 1) return p;
      return { ...p, rows: p.rows.filter(r => r.id !== rowId) };
    }));
  };

  const updateRow = (entryId: string, rowId: number, field: keyof WeightRow, value: string) => {
    setProducts(prev => prev.map(p => {
      if (p.entryId !== entryId) return p;
      return {
        ...p,
        rows: p.rows.map(r => {
          if (r.id !== rowId) return r;
          const next = { ...r, [field]: value };
          if (field === "packingMaterialWeight" || field === "netWeight") {
            const pm = parseFloat(next.packingMaterialWeight);
            const nw = parseFloat(next.netWeight);
            next.observedGrossWeight = (!isNaN(pm) && !isNaN(nw)) ? String(+(pm + nw).toFixed(3)) : "";
          }
          return next;
        }),
      };
    }));
  };

  const autofillColumn = (entryId: string, field: "packingMaterialWeight" | "netWeight" | "observedGrossWeight" | "checkedBy" | "verifiedBy") => {
    setProducts(prev => prev.map(p => {
      if (p.entryId !== entryId) return p;
      const firstFilled = p.rows.find(r => r[field] !== "");
      if (!firstFilled) return p;
      const val = firstFilled[field];
      return {
        ...p,
        rows: p.rows.map(r => {
          const next = { ...r, [field]: val };
          if (field === "packingMaterialWeight" || field === "netWeight") {
            const pm = parseFloat(next.packingMaterialWeight);
            const nw = parseFloat(next.netWeight);
            next.observedGrossWeight = !isNaN(pm) && !isNaN(nw) ? String(+(pm + nw).toFixed(3)) : "";
          }
          return next;
        }),
      };
    }));
  };

  const fillAllBtn = (entryId: string, field: "packingMaterialWeight" | "netWeight" | "observedGrossWeight" | "checkedBy" | "verifiedBy") => (
    <button
      type="button"
      onClick={() => autofillColumn(entryId, field)}
      className="text-[10px] font-semibold bg-brand-50 hover:bg-brand-100 text-brand-600 px-2 py-0.5 rounded whitespace-nowrap"
    >
      Fill All ↓
    </button>
  );

  const handleSubmitAll = async () => {
    if (submitting) return;
    setSubmitError(null);
    setSubmitOk(false);

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (!p.date || !p.productName || !p.batchNo) {
        setSubmitError(`Product ${i + 1}: Date, Product Name and Batch No. are required.`);
        setProducts(prev => prev.map(prod => prod.entryId === p.entryId ? { ...prod, collapsed: false } : prod));
        return;
      }
    }

    setSubmitting(true);
    try {
      const savedIds: number[] = [];
      for (const p of products) {
        const payload = {
          check_date: p.date,
          location: p.location,
          product_name: p.productName,
          batch_no: p.batchNo,
          customer: p.customer,
          pkd: p.pkd,
          declared_net_weight: p.declaredNetWeight !== "" ? Number(p.declaredNetWeight) : null,
          permissible_error: p.permissibleError !== "" ? Number(p.permissibleError) : null,
          total_pkts_produced: p.totalPktsProduced !== "" ? Number(p.totalPktsProduced) : null,
          remarks: p.remarks,
          checked_by: p.recordCheckedBy || undefined,
          verified_by: p.recordVerifiedBy || undefined,
          rows: p.rows.map(r => ({
            time: r.time,
            packing_material_weight: r.packingMaterialWeight,
            net_weight: r.netWeight,
            observed_gross_weight: r.observedGrossWeight,
            deviations_noted: r.deviationsNoted,
            sealing_check: r.sealingCheck,
            n2_percent: r.n2Percent,
            checked_by: r.checkedBy,
            verified_by: r.verifiedBy,
          })),
        };
        const res = await docsApi.create("productweightcheck", payload);
        if (res?.data?.id) savedIds.push(res.data.id);
      }
      setSubmitOk(true);
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      if (savedIds.length > 1) {
        router.push(`/documentations/productweightcheck/print?ids=${savedIds.join(",")}`);
      } else {
        router.push("/documentations/productweightcheck");
      }
    } catch (e: any) {
      setSubmitError(e?.message || "Failed to save record");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DocFormShell
      title="Product Weight & Sealing Check"
      docNo="CFPLA.C6.F.16"
      subtitle="Issue 03 · Rev 02 · 01/10/2025"
      icon={Scale}
      note="Frequency: Every hour, 10 samples (Start–Mid–End)"
    >
      {products.map((product, productIdx) => (
        <div key={product.entryId} className="border border-cream-300 rounded-xl overflow-hidden">
          {/* Product block header */}
          <div className="flex items-center justify-between px-4 py-3 bg-cream-50 border-b border-cream-300">
            <div className="flex items-center gap-2 min-w-0">
              <Package className="w-4 h-4 text-brand-500 shrink-0" />
              <span className="font-semibold text-sm text-ink-700 truncate">
                Product {productIdx + 1}
                {product.productName && <span className="text-ink-500"> — {product.productName}</span>}
                {product.batchNo && <span className="text-ink-400 font-normal text-xs ml-1">(Batch: {product.batchNo})</span>}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              {products.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeProduct(product.entryId)}
                  className="inline-flex items-center gap-1 text-xs text-danger-600 hover:bg-danger-50 px-2 py-1 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              )}
              <button
                type="button"
                onClick={() => toggleCollapse(product.entryId)}
                className="inline-flex items-center gap-1 text-xs text-ink-500 hover:bg-cream-200 px-2 py-1 rounded"
              >
                {product.collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                {product.collapsed ? "Expand" : "Collapse"}
              </button>
            </div>
          </div>

          {!product.collapsed && (
            <div className="p-4 space-y-5">
              {/* Batch Information */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400 mb-2">Batch Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="label-base">Date</label>
                    <input type="date" value={product.date} onChange={(e) => updateEntry(product.entryId, { date: e.target.value })} className="input-base" />
                  </div>
                  <div>
                    <label className="label-base">Location</label>
                    <input type="text" value={product.location} onChange={(e) => updateEntry(product.entryId, { location: e.target.value })} className="input-base" />
                  </div>
                  <div>
                    <label className="label-base">Frequency</label>
                    <input type="text" value="Every hour, 10 samples (Start-Mid-End)" readOnly className="input-base bg-cream-200/60" />
                  </div>
                  <div>
                    <label className="label-base">Name of Product</label>
                    <input type="text" value={product.productName} onChange={(e) => updateEntry(product.entryId, { productName: e.target.value })} className="input-base" />
                  </div>
                  <div>
                    <label className="label-base">Batch No.</label>
                    <input type="text" value={product.batchNo} onChange={(e) => updateEntry(product.entryId, { batchNo: e.target.value })} className="input-base" />
                  </div>
                  <div>
                    <label className="label-base">Customer</label>
                    <input type="text" value={product.customer} onChange={(e) => updateEntry(product.entryId, { customer: e.target.value })} className="input-base" />
                  </div>
                  <div>
                    <label className="label-base">PKD</label>
                    <input type="text" value={product.pkd} onChange={(e) => updateEntry(product.entryId, { pkd: e.target.value })} className="input-base" />
                  </div>
                  <div>
                    <label className="label-base">Declared Net Weight (gms)</label>
                    <input type="number" value={product.declaredNetWeight} onChange={(e) => updateEntry(product.entryId, { declaredNetWeight: e.target.value })} className="input-base" />
                  </div>
                  <div>
                    <label className="label-base">Permissible Error (±gms)</label>
                    <input type="number" value={product.permissibleError} onChange={(e) => updateEntry(product.entryId, { permissibleError: e.target.value })} className="input-base" />
                  </div>
                  <div>
                    <label className="label-base">Total Pkts Produced (Nos)</label>
                    <input type="number" value={product.totalPktsProduced} onChange={(e) => updateEntry(product.entryId, { totalPktsProduced: e.target.value })} className="input-base" />
                  </div>
                </div>
              </div>

              {/* Weight & Sealing Samples */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                    Weight & Sealing Samples{" "}
                    <span className="text-ink-300 normal-case font-normal">({product.rows.length})</span>
                  </p>
                  <button type="button" onClick={() => addRow(product.entryId)} className="btn-primary !py-1.5 !px-3 text-xs inline-flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Add Row
                  </button>
                </div>
                <p className="text-[11px] text-ink-400 italic sm:hidden mb-1">← Swipe to view all columns</p>
                <div className="overflow-x-auto rounded border border-cream-300">
                  <table className="w-full text-sm">
                    <thead className="bg-cream-100/70 border-b border-cream-300">
                      <tr>
                        <th className="px-2 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-ink-400">#</th>
                        <th className="px-2 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-ink-400">Time</th>
                        <th className="px-2 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-ink-400">
                          <div className="flex flex-col items-center gap-1"><span>Pkg Mat. (g)</span>{fillAllBtn(product.entryId, "packingMaterialWeight")}</div>
                        </th>
                        <th className="px-2 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-ink-400">
                          <div className="flex flex-col items-center gap-1"><span>Net Wt (g)</span>{fillAllBtn(product.entryId, "netWeight")}</div>
                        </th>
                        <th className="px-2 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-ink-400">
                          <div className="flex flex-col items-center gap-1"><span>Gross Wt (g)</span>{fillAllBtn(product.entryId, "observedGrossWeight")}</div>
                        </th>
                        <th className="px-2 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-ink-400">Deviation</th>
                        <th className="px-2 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-ink-400">Sealing</th>
                        <th className="px-2 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-ink-400">N₂ %</th>
                        <th className="px-2 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-ink-400">
                          <div className="flex flex-col items-center gap-1"><span>Checked By</span>{fillAllBtn(product.entryId, "checkedBy")}</div>
                        </th>
                        <th className="px-2 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-ink-400">
                          <div className="flex flex-col items-center gap-1"><span>Verified By</span>{fillAllBtn(product.entryId, "verifiedBy")}</div>
                        </th>
                        <th className="px-2 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-ink-400"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cream-300">
                      {product.rows.map((row, idx) => (
                        <tr key={row.id} className="hover:bg-cream-100/60 transition-colors">
                          <td className="px-2 py-1.5 text-center text-xs font-semibold text-ink-400">{idx + 1}</td>
                          <td className="px-1 py-1.5">
                            <Time12Picker value={row.time} onChange={(v) => updateRow(product.entryId, row.id, "time", v)} />
                          </td>
                          <td className="px-1 py-1.5">
                            <input type="text" inputMode="decimal" value={row.packingMaterialWeight} onChange={(e) => updateRow(product.entryId, row.id, "packingMaterialWeight", e.target.value.replace(/[^0-9.]/g, ""))} className="input-base !py-1.5 !px-2 text-center" />
                          </td>
                          <td className="px-1 py-1.5">
                            <input type="text" inputMode="decimal" value={row.netWeight} onChange={(e) => updateRow(product.entryId, row.id, "netWeight", e.target.value.replace(/[^0-9.]/g, ""))} className="input-base !py-1.5 !px-2 text-center" />
                          </td>
                          <td className="px-1 py-1.5">
                            <input type="text" inputMode="decimal" value={row.observedGrossWeight} readOnly className="input-base !py-1.5 !px-2 text-center bg-cream-200/60" />
                          </td>
                          <td className="px-1 py-1.5">
                            <label className="flex items-center justify-center gap-1.5 cursor-pointer">
                              <input type="checkbox" checked={row.deviationsNoted === "Ok"} onChange={(e) => updateRow(product.entryId, row.id, "deviationsNoted", e.target.checked ? "Ok" : "Not Ok")} className="h-4 w-4 accent-brand-500" />
                              <span className={`text-[11px] font-semibold ${row.deviationsNoted === "Ok" ? "text-success-600" : "text-danger-600"}`}>{row.deviationsNoted}</span>
                            </label>
                          </td>
                          <td className="px-1 py-1.5">
                            <label className="flex items-center justify-center gap-1.5 cursor-pointer">
                              <input type="checkbox" checked={row.sealingCheck === "Ok"} onChange={(e) => updateRow(product.entryId, row.id, "sealingCheck", e.target.checked ? "Ok" : "Not Ok")} className="h-4 w-4 accent-brand-500" />
                              <span className={`text-[11px] font-semibold ${row.sealingCheck === "Ok" ? "text-success-600" : "text-danger-600"}`}>{row.sealingCheck}</span>
                            </label>
                          </td>
                          <td className="px-1 py-1.5">
                            <input type="text" value={row.n2Percent} onChange={(e) => updateRow(product.entryId, row.id, "n2Percent", e.target.value)} className="input-base !py-1.5 !px-2 text-center" />
                          </td>
                          <td className="px-1 py-1.5">
                            <input type="text" value={row.checkedBy} onChange={(e) => updateRow(product.entryId, row.id, "checkedBy", e.target.value)} className="input-base !py-1.5 !px-2" />
                          </td>
                          <td className="px-1 py-1.5">
                            <input type="text" value={row.verifiedBy} onChange={(e) => updateRow(product.entryId, row.id, "verifiedBy", e.target.value)} className="input-base !py-1.5 !px-2" />
                          </td>
                          <td className="px-1 py-1.5 text-center">
                            <button onClick={() => removeRow(product.entryId, row.id)} className="inline-flex items-center justify-center w-7 h-7 rounded-md text-ink-400 hover:text-danger-600 hover:bg-danger-50" title="Remove">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="label-base">Remarks</label>
                <textarea value={product.remarks} onChange={(e) => updateEntry(product.entryId, { remarks: e.target.value })} rows={2} className="input-base" placeholder="Optional remarks for this product..." />
              </div>

              {/* Signatories */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SignaturePicker
                  label="Checked By"
                  value={product.recordCheckedBy}
                  onChange={(v) => updateEntry(product.entryId, { recordCheckedBy: v })}
                  options={CHECKED_BY_OPTIONS}
                  roleHint="Quality Control Executive"
                  inputCls="input-base"
                  labelCls="label-base"
                />
                <SignaturePicker
                  label="Verified By"
                  value={product.recordVerifiedBy}
                  onChange={(v) => updateEntry(product.entryId, { recordVerifiedBy: v })}
                  options={QC_VERIFIED_BY_OPTIONS}
                  roleHint="Quality Manager"
                  inputCls="input-base"
                  labelCls="label-base"
                />
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add Another Product */}
      <div className="flex justify-center py-2">
        <button
          type="button"
          onClick={addProduct}
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-5 py-2.5 rounded-xl border border-brand-200 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Another Product
        </button>
      </div>

      {/* Submit Footer */}
      <div className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-ink-400">
          Prepared By: <span className="font-semibold text-ink-500">Production</span>
          <span className="mx-2 text-cream-300">|</span>
          Approved By: <span className="font-semibold text-ink-500">FSTL</span>
        </p>
        <div className="flex items-center gap-3">
          {submitError && (
            <span className="text-xs text-danger-600 font-semibold">{submitError}</span>
          )}
          {submitOk && (
            <span className="text-xs text-success-600 font-semibold inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          <button
            onClick={handleSubmitAll}
            disabled={submitting}
            className="btn-primary inline-flex items-center gap-2"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {submitting
              ? "Saving…"
              : products.length > 1
              ? `Submit All ${products.length} Products`
              : "Submit Record"}
          </button>
        </div>
      </div>
    </DocFormShell>
  );
}
