"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Scale, Plus, X, ChevronDown, ChevronUp, Trash2, Package, Loader2, CheckCircle2, Save, Check } from "lucide-react";
import Time12Picker from "@/components/Time12Picker";
import DocFormShell from "@/components/documentations/DocFormShell";
import { docsApi } from "@/lib/api/documentations";
import { dropdown as dropdownApi } from "@/lib/api";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";
import type { DropdownData } from "@/types";

interface WeightRow {
  id: number;
  time: string;
  packingMaterialWeight: string;
  netWeight: string;
  observedGrossWeight: string;
  deviationsNoted: "Ok" | "Not Ok";
  sealingCheck: "Ok" | "No";
  n2Percent: string;
  checkedBy: string;
  verifiedBy: string;
}

interface ProductEntry {
  entryId: string;
  savedId: number | null;   // DB record id once this product has been saved
  saving: boolean;          // save request in flight
  dirty: boolean;           // edited since the last successful save
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
  rows: WeightRow[];
}

const currentDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const emptyRow = (id: number): WeightRow => ({
  id, time: "", packingMaterialWeight: "", netWeight: "", observedGrossWeight: "",
  deviationsNoted: "Ok", sealingCheck: "Ok" as "Ok" | "No", n2Percent: "-", checkedBy: "", verifiedBy: "",
});

const normalizeStatus = (v: any, fallback: "Ok" | "Not Ok" = "Ok"): "Ok" | "Not Ok" => {
  if (!v) return fallback;
  const s = String(v).trim().toLowerCase();
  if (s === "ok" || s === "yes" || s === "✓") return "Ok";
  if (s === "not ok" || s === "notok" || s === "no" || s === "✕") return "Not Ok";
  return fallback;
};
const normalizeSealStatus = (v: any): "Ok" | "No" => {
  if (!v) return "Ok";
  const s = String(v).trim().toLowerCase();
  if (s === "ok" || s === "yes" || s === "✓") return "Ok";
  return "No";
};

let _entryCounter = 0;
const newEntry = (): ProductEntry => ({
  entryId: String(++_entryCounter),
  savedId: null,
  saving: false,
  dirty: false,
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
  rows: Array.from({ length: 35 }, (_, i) => emptyRow(i + 1)),
});

/** Map a saved DB record into a form ProductEntry (for the Continue flow). */
const recordToEntry = (d: any): ProductEntry => ({
  entryId: String(++_entryCounter),
  savedId: d.id ?? null,
  saving: false,
  dirty: false,
  collapsed: false,
  date: d.check_date || currentDate(),
  location: d.location || "",
  productName: d.product_name || "",
  batchNo: d.batch_no || "",
  customer: d.customer || "",
  pkd: d.pkd || "",
  declaredNetWeight: d.declared_net_weight_gms != null ? String(d.declared_net_weight_gms) : "",
  permissibleError: d.permissible_error_gms != null ? String(d.permissible_error_gms) : "",
  totalPktsProduced: d.total_pkts_produced != null ? String(d.total_pkts_produced) : "",
  remarks: d.remarks || "",
  rows: Array.isArray(d.rows) && d.rows.length > 0
    ? d.rows.map((r: any, i: number) => ({
        id: i + 1,
        time: r.time || "",
        packingMaterialWeight: r.packing_material_weight != null ? String(r.packing_material_weight) : "",
        netWeight: r.net_weight != null ? String(r.net_weight) : "",
        observedGrossWeight: r.observed_gross_weight != null ? String(r.observed_gross_weight) : "",
        deviationsNoted: normalizeStatus(r.deviations_noted, "Ok"),
        sealingCheck: normalizeSealStatus(r.sealing_check),
        n2Percent: r.n2_percent != null ? String(r.n2_percent) : "-",
        checkedBy: r.checked_by || "",
        verifiedBy: r.verified_by || "",
      }))
    : Array.from({ length: 35 }, (_, i) => emptyRow(i + 1)),
});

const DRAFT_KEY = "pwc-draft";
const DRAFT_TTL_MS = 5 * 60 * 1000;

export default function ProductWeightSealCheckRecord() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const continueId = searchParams.get("id"); // resume a saved product (Continue)
  const [products, setProducts] = useState<ProductEntry[]>(() => [newEntry()]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const hydrated = useRef(false);

  // Floor options for the Location dropdown — same source as the IPQC floor field.
  const [dropdowns, setDropdowns] = useState<DropdownData>({ factories: [] });
  useEffect(() => { dropdownApi.getFactoriesFloors().then(setDropdowns).catch(() => {}); }, []);
  const warehouse = getStoredWarehouse();
  const availableFloors = dropdowns.factories?.find((f) => f.factory_code === warehouse)?.floors || [];

  useEffect(() => {
    // Continue mode: load the saved product from the DB, ignore the local draft.
    if (continueId) {
      setLoadingRecord(true);
      docsApi.get("productweightcheck", Number(continueId))
        .then((res) => { if (res?.data) setProducts([recordToEntry(res.data)]); })
        .catch((e) => setSubmitError(e?.message || "Failed to load record"))
        .finally(() => { hydrated.current = true; setLoadingRecord(false); });
      return;
    }
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { savedAt: number; data: { products?: ProductEntry[] } };
        if (parsed.savedAt && Date.now() - parsed.savedAt < DRAFT_TTL_MS) {
          if (Array.isArray(parsed.data.products) && parsed.data.products.length > 0) {
            // never restore a stale "saving" flag
            setProducts(parsed.data.products.map((p) => ({ ...p, saving: false })));
          }
        } else {
          localStorage.removeItem(DRAFT_KEY);
        }
      }
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
    hydrated.current = true;
  }, [continueId]);

  useEffect(() => {
    if (!hydrated.current || continueId) return; // don't draft-cache the Continue session
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), data: { products } }));
    } catch {}
  }, [products, continueId]);

  const addProduct = () => setProducts(prev => [...prev, newEntry()]);

  const removeProduct = async (entryId: string) => {
    const p = products.find(x => x.entryId === entryId);
    if (!p) return;
    if (p.savedId) {
      if (!confirm("Delete this saved product from the database?")) return;
      try {
        await docsApi.delete("productweightcheck", p.savedId);
      } catch (e: any) {
        setSubmitError(e?.message || "Failed to delete product");
        return;
      }
    }
    setProducts(prev => {
      const remaining = prev.filter(x => x.entryId !== entryId);
      return remaining.length > 0 ? remaining : [newEntry()];
    });
  };

  const toggleCollapse = (entryId: string) => {
    setProducts(prev => prev.map(p => p.entryId === entryId ? { ...p, collapsed: !p.collapsed } : p));
  };

  const updateEntry = (entryId: string, updates: Partial<ProductEntry>) => {
    setProducts(prev => prev.map(p => p.entryId === entryId ? { ...p, ...updates, dirty: true } : p));
  };

  const addRow = (entryId: string) => {
    setProducts(prev => prev.map(p => {
      if (p.entryId !== entryId) return p;
      return { ...p, dirty: true, rows: [...p.rows, emptyRow(p.rows.length + 1)] };
    }));
  };

  const removeRow = (entryId: string, rowId: number) => {
    setProducts(prev => prev.map(p => {
      if (p.entryId !== entryId || p.rows.length <= 1) return p;
      return { ...p, dirty: true, rows: p.rows.filter(r => r.id !== rowId) };
    }));
  };

  const updateRow = (entryId: string, rowId: number, field: keyof WeightRow, value: string) => {
    setProducts(prev => prev.map(p => {
      if (p.entryId !== entryId) return p;
      return {
        ...p,
        dirty: true,
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
        dirty: true,
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

  // Build the API payload for one product entry.
  const buildPayload = (p: ProductEntry) => ({
    check_date: p.date,
    location: p.location,
    product_name: p.productName,
    batch_no: p.batchNo,
    customer: p.customer,
    pkd: p.pkd,
    declared_net_weight_gms: p.declaredNetWeight !== "" ? Number(p.declaredNetWeight) : null,
    permissible_error_gms: p.permissibleError !== "" ? Number(p.permissibleError) : null,
    total_pkts_produced: p.totalPktsProduced !== "" ? Number(p.totalPktsProduced) : null,
    remarks: p.remarks,
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
  });

  // Save a single product to the DB now: create on first save, update afterwards.
  const saveProduct = async (entryId: string) => {
    const p = products.find(x => x.entryId === entryId);
    if (!p || p.saving) return;
    if (!p.date || !p.productName || !p.batchNo) {
      setSubmitError(`Date, Product Name and Batch No. are required to save this product.`);
      setProducts(prev => prev.map(x => x.entryId === entryId ? { ...x, collapsed: false } : x));
      return;
    }
    setSubmitError(null);
    setProducts(prev => prev.map(x => x.entryId === entryId ? { ...x, saving: true } : x));
    try {
      let id = p.savedId;
      if (id) {
        await docsApi.update("productweightcheck", id, buildPayload(p));
      } else {
        const res = await docsApi.create("productweightcheck", buildPayload(p));
        id = res?.data?.id ?? null;
      }
      setProducts(prev => prev.map(x => x.entryId === entryId ? { ...x, savedId: id, saving: false, dirty: false } : x));
    } catch (e: any) {
      setSubmitError(e?.message || "Failed to save product");
      setProducts(prev => prev.map(x => x.entryId === entryId ? { ...x, saving: false } : x));
    }
  };

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
      const next = [...products];
      for (let i = 0; i < next.length; i++) {
        const p = next[i];
        let id = p.savedId;
        if (id) {
          await docsApi.update("productweightcheck", id, buildPayload(p));
        } else {
          const res = await docsApi.create("productweightcheck", buildPayload(p));
          id = res?.data?.id ?? null;
        }
        if (id) {
          savedIds.push(id);
          next[i] = { ...p, savedId: id, dirty: false };
        }
      }
      setProducts(next);
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
      {loadingRecord ? (
        <div className="surface-card p-8 flex items-center justify-center gap-2 text-sm text-ink-500">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading saved record…
        </div>
      ) : (
      <>
      <div className="mb-1 px-4 py-2.5 bg-brand-50 border border-brand-200 rounded-xl text-xs text-brand-700 font-medium flex items-center gap-2">
        <Save className="w-3.5 h-3.5 shrink-0" />
        {continueId
          ? "Continuing a saved product — edit any field and tap Update to store the change."
          : "Each product saves on its own. Tap Save on a product, then leave anytime and resume later via Continue on the records list."}
      </div>
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
              {/* Saved / unsaved badge */}
              {product.savedId && !product.dirty ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                  <Check className="w-3 h-3" /> Saved
                </span>
              ) : product.savedId && product.dirty ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                  Unsaved changes
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-400 bg-cream-100 border border-cream-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                  Not saved
                </span>
              )}
              <button
                type="button"
                onClick={() => saveProduct(product.entryId)}
                disabled={product.saving || (!!product.savedId && !product.dirty)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 px-2.5 py-1 rounded"
                title="Save this product to the database"
              >
                {product.saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {product.saving ? "Saving…" : product.savedId ? "Update" : "Save"}
              </button>
              {(products.length > 1 || product.savedId) && (
                <button
                  type="button"
                  onClick={() => removeProduct(product.entryId)}
                  className="inline-flex items-center gap-1 text-xs text-danger-600 hover:bg-danger-50 px-2 py-1 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" /> {product.savedId ? "Delete" : "Remove"}
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
                    <select value={product.location} onChange={(e) => updateEntry(product.entryId, { location: e.target.value })} className="input-base">
                      <option value="">Select location…</option>
                      {availableFloors.map((fl) => (
                        <option key={fl.id} value={fl.floor_name}>{fl.floor_name}</option>
                      ))}
                      {product.location && !availableFloors.some((fl) => fl.floor_name === product.location) && (
                        <option value={product.location}>{product.location}</option>
                      )}
                    </select>
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
                        <th className="px-2 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-ink-400">Seal/Drop Test</th>
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
                              <input type="checkbox" checked={row.sealingCheck === "Ok"} onChange={(e) => updateRow(product.entryId, row.id, "sealingCheck", e.target.checked ? "Ok" : "No")} className="h-4 w-4 accent-brand-500" />
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
      <div className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
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
            type="button"
            onClick={() => router.push("/documentations/productweightcheck")}
            className="btn-outline inline-flex items-center gap-2"
          >
            Back to list
          </button>
          <button
            onClick={handleSubmitAll}
            disabled={submitting}
            className="btn-primary inline-flex items-center gap-2"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {submitting
              ? "Saving…"
              : products.length > 1
              ? `Save All ${products.length} & Finish`
              : "Save & Finish"}
          </button>
        </div>
      </div>
      </>
      )}
    </DocFormShell>
  );
}
