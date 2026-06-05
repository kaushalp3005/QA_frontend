"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Scale, Plus, X, Loader2, CheckCircle2 } from "lucide-react";
import Time12Picker from "@/components/Time12Picker";
import DocFormShell from "@/components/documentations/DocFormShell";
import DocSection from "@/components/documentations/DocSection";
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
  sealingCheck: "Ok" | "No";
  n2Percent: string;
  checkedBy: string;
  verifiedBy: string;
}

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

export default function ProductWeightSealCheckEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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
  const [recordCheckedBy, setRecordCheckedBy] = useState("");
  const [recordVerifiedBy, setRecordVerifiedBy] = useState("");
  const [rows, setRows] = useState<WeightRow[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState(false);
  const [prevId, setPrevId] = useState<number | null>(null);
  const [nextId, setNextId] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    docsApi.get("productweightcheck", id)
      .then((res) => {
        const d = res.data || {};
        setDate(d.check_date || "");
        setLocation(d.location || "");
        setProductName(d.product_name || "");
        setBatchNo(d.batch_no || "");
        setCustomer(d.customer || "");
        setPkd(d.pkd || "");
        setDeclaredNetWeight(d.declared_net_weight_gms != null ? String(d.declared_net_weight_gms) : "");
        setPermissibleError(d.permissible_error_gms != null ? String(d.permissible_error_gms) : "");
        setTotalPktsProduced(d.total_pkts_produced != null ? String(d.total_pkts_produced) : "");
        setRemarks(d.remarks || "");
        setRecordCheckedBy(d.checked_by || "");
        setRecordVerifiedBy(d.verified_by || "");
        setPrevId(d._prev_id ?? null);
        setNextId(d._next_id ?? null);
        const incoming: any[] = Array.isArray(d.rows) ? d.rows : [];
        const mapped: WeightRow[] = incoming.length > 0
          ? incoming.map((r, i) => ({
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
          : Array.from({ length: 10 }, (_, i) => emptyRow(i + 1));
        setRows(mapped);
      })
      .catch((e) => setLoadError(e?.message || "Failed to load record"))
      .finally(() => setLoading(false));
  }, [id]);

  const addRow = () => setRows((prev) => [...prev, emptyRow(prev.length + 1)]);

  const updateRow = (rowId: number, field: keyof WeightRow, value: string) => {
    setRows((prev) => prev.map((r) => {
      if (r.id !== rowId) return r;
      const next = { ...r, [field]: value } as WeightRow;
      if (field === "packingMaterialWeight" || field === "netWeight") {
        const p = parseFloat(next.packingMaterialWeight);
        const n = parseFloat(next.netWeight);
        next.observedGrossWeight = (!isNaN(p) && !isNaN(n)) ? String(+(p + n).toFixed(3)) : "";
      }
      return next;
    }));
  };

  const removeRow = (rowId: number) => {
    if (rows.length > 1) setRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const autofillColumn = (field: "packingMaterialWeight" | "netWeight" | "observedGrossWeight" | "checkedBy" | "verifiedBy") => {
    const firstFilled = rows.find((r) => r[field] !== "");
    if (!firstFilled) return;
    const val = firstFilled[field];
    setRows((prev) =>
      prev.map((r) => {
        const next = { ...r, [field]: val } as WeightRow;
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

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitError(null);
    setSubmitOk(false);
    if (!date || !productName || !batchNo) {
      setSubmitError("Date, Product Name and Batch No. are required.");
      return;
    }
    const payload = {
      check_date: date,
      location,
      product_name: productName,
      batch_no: batchNo,
      customer,
      pkd,
      declared_net_weight_gms: declaredNetWeight !== "" ? Number(declaredNetWeight) : null,
      permissible_error_gms: permissibleError !== "" ? Number(permissibleError) : null,
      total_pkts_produced: totalPktsProduced !== "" ? Number(totalPktsProduced) : null,
      remarks,
      checked_by: recordCheckedBy || undefined,
      verified_by: recordVerifiedBy || undefined,
      rows: rows.map((r) => ({
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
    setSubmitting(true);
    try {
      await docsApi.update("productweightcheck", id, payload);
      setSubmitOk(true);
      router.push(`/documentations/productweightcheck/${id}`);
    } catch (e: any) {
      setSubmitError(e?.message || "Failed to update record");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DocFormShell title="Edit — Product Weight & Sealing Check" docNo="CFPLA.C6.F.16" subtitle={`Record #${id}`} icon={Scale}>
        <div className="surface-card p-10 text-center text-ink-400 text-sm">Loading record…</div>
      </DocFormShell>
    );
  }

  if (loadError) {
    return (
      <DocFormShell title="Edit — Product Weight & Sealing Check" docNo="CFPLA.C6.F.16" subtitle={`Record #${id}`} icon={Scale}>
        <div className="surface-card p-10 text-center text-danger-600 text-sm">{loadError}</div>
      </DocFormShell>
    );
  }

  return (
    <DocFormShell
      title={`Edit — Product Weight & Sealing Check`}
      docNo="CFPLA.C6.F.16"
      subtitle={`Record #${id} · Issue 03 · Rev 02 · 01/10/2025`}
      icon={Scale}
      note="Frequency: Every hour, 10 samples (Start–Mid–End)"
    >
      {/* Navigation between records */}
      <div className="surface-card p-3 flex items-center justify-between gap-3">
        <button
          onClick={() => router.push(`/documentations/productweightcheck/${id}`)}
          className="text-xs font-semibold text-ink-500 hover:text-brand-500"
        >
          ← Back to record
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => prevId && router.push(`/documentations/productweightcheck/${prevId}/edit`)}
            disabled={!prevId}
            className="text-xs font-semibold px-2 py-1 rounded border border-cream-300 text-ink-500 disabled:opacity-30"
            title="Edit previous record"
          >
            ← Prev
          </button>
          <button
            onClick={() => nextId && router.push(`/documentations/productweightcheck/${nextId}/edit`)}
            disabled={!nextId}
            className="text-xs font-semibold px-2 py-1 rounded border border-cream-300 text-ink-500 disabled:opacity-30"
            title="Edit next record"
          >
            Next →
          </button>
        </div>
      </div>

      <DocSection title="Batch Information" description="Edit any field. All values are saved on submit.">
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
        description={`${rows.length} sample${rows.length !== 1 ? "s" : ""} · every cell is editable`}
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
                <th className="px-2 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-ink-400">Seal/Drop Test</th>
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
                    <input
                      type="text"
                      inputMode="decimal"
                      value={row.observedGrossWeight}
                      onChange={(e) => updateRow(row.id, "observedGrossWeight", e.target.value.replace(/[^0-9.]/g, ""))}
                      className="input-base !py-1.5 !px-2 text-center"
                      title="Auto-calculated from Pkg + Net; you may override."
                    />
                  </td>
                  <td className="px-1 py-1.5">
                    <select
                      value={row.deviationsNoted}
                      onChange={(e) => updateRow(row.id, "deviationsNoted", e.target.value)}
                      className={`input-base !py-1.5 !px-2 text-center text-[11px] font-semibold ${row.deviationsNoted === "Ok" ? "text-success-600" : "text-danger-600"}`}
                    >
                      <option value="Ok">Ok</option>
                      <option value="Not Ok">Not Ok</option>
                    </select>
                  </td>
                  <td className="px-1 py-1.5">
                    <select
                      value={row.sealingCheck}
                      onChange={(e) => updateRow(row.id, "sealingCheck", e.target.value)}
                      className={`input-base !py-1.5 !px-2 text-center text-[11px] font-semibold ${row.sealingCheck === "Ok" ? "text-success-600" : "text-danger-600"}`}
                    >
                      <option value="Ok">Ok</option>
                      <option value="No">No</option>
                    </select>
                  </td>
                  <td className="px-1 py-1.5">
                    <input type="text" value={row.n2Percent} onChange={(e) => updateRow(row.id, "n2Percent", e.target.value)} className="input-base !py-1.5 !px-2 text-center" />
                  </td>
                  <td className="px-1 py-1.5 min-w-[140px]">
                    <SignaturePicker
                      label=""
                      value={row.checkedBy}
                      onChange={(v) => updateRow(row.id, "checkedBy", v)}
                      options={CHECKED_BY_OPTIONS}
                      inputCls="input-base !py-1.5 !px-2"
                      labelCls="hidden"
                    />
                  </td>
                  <td className="px-1 py-1.5 min-w-[140px]">
                    <SignaturePicker
                      label=""
                      value={row.verifiedBy}
                      onChange={(v) => updateRow(row.id, "verifiedBy", v)}
                      options={QC_VERIFIED_BY_OPTIONS}
                      inputCls="input-base !py-1.5 !px-2"
                      labelCls="hidden"
                    />
                  </td>
                  <td className="px-1 py-1.5 text-center">
                    <button
                      onClick={() => removeRow(row.id)}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-md text-ink-400 hover:text-danger-600 hover:bg-danger-50"
                      title="Remove row"
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

      <DocSection title="Signatories" description="Final sign-off for this record">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SignaturePicker
            label="Checked By"
            value={recordCheckedBy}
            onChange={setRecordCheckedBy}
            options={CHECKED_BY_OPTIONS}
            roleHint="Quality Control Executive"
            inputCls="input-base"
            labelCls="label-base"
          />
          <SignaturePicker
            label="Verified By"
            value={recordVerifiedBy}
            onChange={setRecordVerifiedBy}
            options={QC_VERIFIED_BY_OPTIONS}
            roleHint="Quality Manager"
            inputCls="input-base"
            labelCls="label-base"
          />
        </div>
      </DocSection>

      <div className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-ink-400">
          Prepared By: <span className="font-semibold text-ink-500">Production</span>
          <span className="mx-2 text-cream-300">|</span>
          Approved By: <span className="font-semibold text-ink-500">FSTL</span>
        </p>
        <div className="flex items-center gap-3">
          {submitError && <span className="text-xs text-danger-600 font-semibold">{submitError}</span>}
          {submitOk && (
            <span className="text-xs text-success-600 font-semibold inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          <button
            type="button"
            onClick={() => router.push(`/documentations/productweightcheck/${id}`)}
            className="btn-outline"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary inline-flex items-center gap-2"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {submitting ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </DocFormShell>
  );
}
