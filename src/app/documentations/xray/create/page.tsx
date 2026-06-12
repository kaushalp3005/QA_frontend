"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowLeft, AlertCircle, Plus, Trash2, CheckCircle2, Loader2, Building2 } from "lucide-react";
import { cn, buttonStyles, layoutStyles } from "@/lib/styles";
import { createXRayBatch, XRAY_HEADER, type XRayEntryInput } from "@/lib/api/xray";
import Time12Picker from "@/components/Time12Picker";
import SignaturePicker from "@/components/ui/SignaturePicker";
import { CHECKED_BY_OPTIONS, QC_VERIFIED_BY_OPTIONS } from "@/lib/signatures";

const EMPTY = (carry?: Partial<XRayEntryInput>): XRayEntryInput => ({
  date: carry?.date ?? new Date().toISOString().split("T")[0],
  time: new Date().toTimeString().slice(0, 5),
  product_name: "",
  batch_no: "",
  ss316: true,
  ceramic: true,
  soda_lime_glass: true,
  action_on_xray: "NO",
  action_on_product_passed: "NO",
  calibrated_monitored_by: carry?.calibrated_monitored_by ?? "",
  verified_by: carry?.verified_by ?? "",
  remarks: "",
});

function fmt12(time24: string) {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const p = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${p}`;
}

export default function XRayFillForm() {
  const router = useRouter();
  const [form, setForm] = useState<XRayEntryInput>(EMPTY());
  const [rows, setRows] = useState<XRayEntryInput[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<number | null>(null);

  const set = (field: keyof XRayEntryInput, value: string | boolean) =>
    setForm((p) => ({ ...p, [field]: value }));

  const addRow = () => {
    setError(null);
    if (!form.product_name.trim() || !form.batch_no.trim()) {
      setError("Product Name and Batch No are required to add a row.");
      return;
    }
    if (!form.calibrated_monitored_by || !form.verified_by) {
      setError("Checked By and Verified By are required to add a row.");
      return;
    }
    setRows((prev) => [...prev, form]);
    // Carry the date + sign-offs to the next row (same sheet, usually same staff)
    setForm(EMPTY({
      date: form.date,
      calibrated_monitored_by: form.calibrated_monitored_by,
      verified_by: form.verified_by,
    }));
  };

  const removeRow = (idx: number) => setRows((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    setError(null);
    if (rows.length === 0) {
      setError("Add at least one row before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      const batch = await createXRayBatch({ entries: rows });
      setCreatedId(batch.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit record");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm";

  // ── Success screen ──────────────────────────────────────────────
  if (createdId) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900 mb-1">Record Submitted</p>
          <p className="text-sm text-gray-500">{rows.length} {rows.length === 1 ? "entry" : "entries"} saved as one X-Ray sheet.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md mt-2">
          <button
            onClick={() => router.push(`/documentations/xray/print?id=${createdId}`)}
            className={cn(buttonStyles.base, "flex-1 justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700")}
          >
            Print Sheet
          </button>
          <button
            onClick={() => router.push("/documentations/xray")}
            className={cn(buttonStyles.base, buttonStyles.secondary, "flex-1 justify-center gap-2")}
          >
            Back to Records
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className={layoutStyles.container}>
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => router.back()} className={cn(buttonStyles.base, buttonStyles.secondary, "gap-2")}>
                <ArrowLeft size={16} />
                Back
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">X-Ray Detection Check Record</h1>
                <p className="text-xs text-gray-500 mt-0.5">{XRAY_HEADER.ccp} · Document: {XRAY_HEADER.documentNo}</p>
              </div>
            </div>
            {rows.length > 0 && (
              <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                {rows.length} row{rows.length === 1 ? "" : "s"} ready
              </span>
            )}
          </div>
        </div>
      </div>

      <div className={cn(layoutStyles.container, "py-6 space-y-6")}>
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Fixed machine header (read-only, shared by all rows) */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-gray-400" />
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Machine (fixed for this sheet)</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              {[["Machine Details", XRAY_HEADER.machineDetails], ["Machine ID", XRAY_HEADER.machineId], ["Location", XRAY_HEADER.location]].map(([k, v]) => (
                <div key={k} className="bg-gray-50 rounded-md px-3 py-2">
                  <p className="text-[11px] text-gray-500">{k}</p>
                  <p className="font-semibold text-gray-900">{v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* New row form */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">New Row</h2>
              <p className="text-xs text-gray-500 mt-0.5">Fill the hourly check, tap <strong>Add Row</strong>, repeat — then <strong>Submit Record</strong> once.</p>
            </div>

            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={16} />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="px-6 py-6 space-y-7">
              {/* Batch Info */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-blue-600 rounded-full inline-block" /> Batch Info
                </h3>
                <div className={layoutStyles.grid2}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
                    <input type="date" className={inputCls} value={form.date} onChange={(e) => set("date", e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Time</label>
                    <Time12Picker value={form.time} onChange={(v) => set("time", v)} />
                  </div>
                </div>
                <div className={cn(layoutStyles.grid2, "mt-4")}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Product Name <span className="text-red-500">*</span></label>
                    <input type="text" className={inputCls} placeholder="e.g. Frozen Peas 500g" value={form.product_name} onChange={(e) => set("product_name", e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Batch No <span className="text-red-500">*</span></label>
                    <input type="text" className={inputCls} placeholder="e.g. B240401" value={form.batch_no} onChange={(e) => set("batch_no", e.target.value)} required />
                  </div>
                </div>
              </div>

              {/* Sensitivity Checks */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-blue-600 rounded-full inline-block" /> Sensitivity Checks
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(["ss316", "ceramic", "soda_lime_glass"] as const).map((field) => {
                    const labels = { ss316: "SS 316", ceramic: "Ceramic", soda_lime_glass: "Soda Lime Glass" };
                    return (
                      <div
                        key={field}
                        className={cn(
                          "flex items-center gap-3 p-3 border rounded-lg cursor-pointer select-none transition-all",
                          form[field] ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-blue-300"
                        )}
                        onClick={() => set(field, !form[field])}
                        role="checkbox"
                        aria-checked={form[field]}
                        tabIndex={0}
                      >
                        <div className={cn("flex items-center justify-center w-5 h-5 rounded border-2 shrink-0 transition-all", form[field] ? "bg-blue-600 border-blue-600" : "border-gray-300")}>
                          {form[field] && <Check size={12} className="text-white" strokeWidth={3} />}
                        </div>
                        <span className="text-sm font-medium text-gray-700">{labels[field]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Corrective Action */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-yellow-500 rounded-full inline-block" /> Corrective Action (if X-Ray not working)
                </h3>
                <div className={layoutStyles.grid2}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Action Taken on X-Ray</label>
                    <input type="text" className={inputCls} value={form.action_on_xray} onChange={(e) => set("action_on_xray", e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Action on Product Passed</label>
                    <input type="text" className={inputCls} value={form.action_on_product_passed} onChange={(e) => set("action_on_product_passed", e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Sign-offs */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-blue-600 rounded-full inline-block" /> Sign-offs
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SignaturePicker
                    label="Checked By (Calibrated / Monitored By)"
                    value={form.calibrated_monitored_by}
                    onChange={(v) => set("calibrated_monitored_by", v)}
                    options={CHECKED_BY_OPTIONS}
                    roleHint="Quality Control Executive"
                    required
                    inputCls={inputCls}
                    labelCls="block text-sm font-medium text-gray-700 mb-1.5"
                  />
                  <SignaturePicker
                    label="Verified By"
                    value={form.verified_by}
                    onChange={(v) => set("verified_by", v)}
                    options={QC_VERIFIED_BY_OPTIONS}
                    roleHint="Quality Manager"
                    required
                    inputCls={inputCls}
                    labelCls="block text-sm font-medium text-gray-700 mb-1.5"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-blue-600 rounded-full inline-block" /> Remarks
                </h3>
                <textarea className={inputCls} placeholder="Any additional observations" rows={2} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} style={{ resize: "vertical" }} />
              </div>

              {/* Add Row */}
              <div className="pt-2">
                <button type="button" onClick={addRow} className={cn(buttonStyles.base, "gap-2 bg-blue-600 text-white hover:bg-blue-700")}>
                  <Plus size={16} /> Add Row
                </button>
              </div>
            </div>
          </div>

          {/* Added rows (client-side, not yet saved) */}
          {rows.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900">Rows in this sheet ({rows.length})</h3>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
                  Not saved yet
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date / Time</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sensitivity</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Checked / Verified</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {rows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-400 font-medium">{idx + 1}</td>
                        <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                          <div>{r.date}</div>
                          <div className="text-xs text-gray-400">{fmt12(r.time)}</div>
                        </td>
                        <td className="px-3 py-2 text-gray-900 font-medium">{r.product_name}</td>
                        <td className="px-3 py-2 text-gray-700">{r.batch_no}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {[["SS316", r.ss316], ["Ceramic", r.ceramic], ["Soda Lime", r.soda_lime_glass]].map(([label, ok]) => (
                              <span key={String(label)} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium ${ok ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                                {ok && <Check className="w-2.5 h-2.5" />} {String(label)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-gray-700 text-xs">{r.calibrated_monitored_by} / {r.verified_by}</td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => removeRow(idx)} className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800">
                            <Trash2 size={13} /> Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-xs text-gray-500">All {rows.length} rows will be saved together as one X-Ray sheet.</p>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={cn(buttonStyles.base, "gap-2 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 w-full sm:w-auto justify-center")}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 size={16} />}
                  {submitting ? "Submitting…" : `Submit Record (${rows.length})`}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
