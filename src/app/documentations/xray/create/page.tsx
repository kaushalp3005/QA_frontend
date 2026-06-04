"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowLeft, AlertCircle, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { cn, buttonStyles, layoutStyles } from "@/lib/styles";
import { createXRayRecord, deleteXRayRecord, type XRayRecord } from "@/lib/api/xray";
import Time12Picker from "@/components/Time12Picker";
import SignaturePicker from "@/components/ui/SignaturePicker";
import { CHECKED_BY_OPTIONS, QC_VERIFIED_BY_OPTIONS } from "@/lib/signatures";

interface XRayFormData {
  date: string;
  time: string;
  product_name: string;
  batch_no: string;
  ss316: boolean;
  ceramic: boolean;
  soda_lime_glass: boolean;
  action_on_xray: string;
  action_on_product_passed: string;
  calibrated_monitored_by: string;
  verified_by: string;
  remarks: string;
}

const EMPTY = (): XRayFormData => ({
  date: new Date().toISOString().split("T")[0],
  time: new Date().toTimeString().slice(0, 5),
  product_name: "",
  batch_no: "",
  ss316: true,
  ceramic: true,
  soda_lime_glass: true,
  action_on_xray: "NO",
  action_on_product_passed: "NO",
  calibrated_monitored_by: "",
  verified_by: "",
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
  const [form, setForm] = useState<XRayFormData>(EMPTY());
  const [saving, setSaving] = useState(false);
  const [flashOk, setFlashOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<XRayRecord[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const set = (field: keyof XRayFormData, value: string | boolean) =>
    setForm((p) => ({ ...p, [field]: value }));

  const handleCheckboxKeyDown = (e: React.KeyboardEvent, field: keyof XRayFormData) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      set(field, !form[field]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFlashOk(false);

    try {
      const saved = await createXRayRecord(form);
      setEntries((prev) => [...prev, saved]);
      setFlashOk(true);
      setForm(EMPTY());
      setTimeout(() => setFlashOk(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save record");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteXRayRecord(String(id));
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch {
      alert("Failed to delete entry. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className={layoutStyles.container}>
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className={cn(buttonStyles.base, buttonStyles.secondary, "gap-2")}
              >
                <ArrowLeft size={16} />
                Back
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">X-Ray Detection Check Record</h1>
                <p className="text-xs text-gray-500 mt-0.5">CCP-2 · Document: CFPLA.C2.F.20</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {entries.length > 0 && (
                <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  {entries.length} saved
                </span>
              )}
              <button
                type="button"
                onClick={() => router.push("/documentations/xray/print")}
                className={cn(buttonStyles.base, buttonStyles.secondary, "gap-2")}
              >
                View Print Sheet
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={cn(layoutStyles.container, "py-6 space-y-6")}>
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Entry Form */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">New Entry</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Second Floor FG Area · Machine ID: 61154479393
                  <span className="ml-2 inline-flex items-center gap-1 text-green-600 font-medium">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block animate-pulse" />
                    Each entry saves instantly
                  </span>
                </p>
              </div>
              {entries.length > 0 && (
                <span className="sm:hidden inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  {entries.length} saved
                </span>
              )}
            </div>

            {/* Error / Success banners */}
            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={16} />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            {flashOk && (
              <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex gap-3">
                <CheckCircle2 className="text-green-600 shrink-0 mt-0.5" size={16} />
                <p className="text-sm font-medium text-green-800">Entry saved! Form reset for next entry.</p>
              </div>
            )}

            <form id="xray-form" onSubmit={handleSubmit} className="px-6 py-6 space-y-7">

              {/* Batch Info */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-blue-600 rounded-full inline-block" />
                  Batch Info
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
                  <span className="w-1 h-4 bg-blue-600 rounded-full inline-block" />
                  Sensitivity Checks
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
                        onKeyDown={(e) => handleCheckboxKeyDown(e, field)}
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
                  <span className="w-1 h-4 bg-yellow-500 rounded-full inline-block" />
                  Corrective Action (if X-Ray not working)
                </h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                  <p className="text-sm text-yellow-800">⚠️ Fill these fields only if the X-Ray machine was not working during this check.</p>
                </div>
                <div className={layoutStyles.grid2}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Action Taken on X-Ray</label>
                    <input type="text" className={inputCls} placeholder="e.g. Machine restarted" value={form.action_on_xray} onChange={(e) => set("action_on_xray", e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Action on Product Passed</label>
                    <input type="text" className={inputCls} placeholder="e.g. Batch held for re-check" value={form.action_on_product_passed} onChange={(e) => set("action_on_product_passed", e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Sign-offs */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-blue-600 rounded-full inline-block" />
                  Sign-offs
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
                  <span className="w-1 h-4 bg-blue-600 rounded-full inline-block" />
                  Remarks
                </h3>
                <textarea className={inputCls} placeholder="Any additional observations" rows={3} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} style={{ resize: "vertical" }} />
              </div>

              {/* Add Entry Button */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className={cn(buttonStyles.base, "gap-2 bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500")}
                >
                  {saving ? (
                    <span>Saving…</span>
                  ) : (
                    <>
                      <Plus size={16} />
                      Add Entry
                    </>
                  )}
                </button>
                {entries.length > 0 && (
                  <span className="text-sm text-gray-500">{entries.length} entr{entries.length === 1 ? "y" : "ies"} saved so far</span>
                )}
              </div>

            </form>
          </div>

          {/* Saved Entries Table */}
          {entries.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Saved Entries ({entries.length})</h3>
                  <p className="text-xs text-gray-500 mt-0.5">All entries are stored in the database.</p>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                  Saved in DB
                </span>
              </div>

              {/* Mobile card view */}
              <div className="sm:hidden divide-y divide-gray-100">
                {entries.map((entry, idx) => (
                  <div key={entry.id} className="px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-400">#{idx + 1}</span>
                        <span className="text-sm font-semibold text-gray-900">{entry.product_name}</span>
                      </div>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={deletingId === entry.id}
                        className="text-xs text-red-500 active:text-red-700 px-2 py-1 disabled:opacity-50"
                      >
                        {deletingId === entry.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                    <div className="text-xs text-gray-500">
                      {entry.date} · {fmt12(entry.time)} · Batch: {entry.batch_no}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[["SS316", entry.ss316], ["Ceramic", entry.ceramic], ["Soda Lime", entry.soda_lime_glass]].map(([label, ok]) => (
                        <span key={String(label)} className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-medium ${ok ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500 line-through"}`}>
                          {String(label)} {ok && <Check className="w-3 h-3" />}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-gray-500">By: {entry.calibrated_monitored_by} · Verified: {entry.verified_by}</div>
                  </div>
                ))}
              </div>

              {/* Desktop table view */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date / Time</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sensitivity</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Checked By</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified By</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {entries.map((entry, idx) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-400 font-medium">{idx + 1}</td>
                        <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                          <div>{entry.date}</div>
                          <div className="text-xs text-gray-400">{fmt12(entry.time)}</div>
                        </td>
                        <td className="px-3 py-2 text-gray-900 font-medium">{entry.product_name}</td>
                        <td className="px-3 py-2 text-gray-700">{entry.batch_no}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {[["SS316", entry.ss316], ["Ceramic", entry.ceramic], ["Soda Lime", entry.soda_lime_glass]].map(([label, ok]) => (
                              <span key={String(label)} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium ${ok ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                                {ok && <Check className="w-2.5 h-2.5" />} {String(label)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-gray-700">{entry.calibrated_monitored_by}</td>
                        <td className="px-3 py-2 text-gray-700">{entry.verified_by}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => handleDelete(entry.id)}
                            disabled={deletingId === entry.id}
                            className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            <Trash2 size={13} />
                            {deletingId === entry.id ? "Deleting…" : "Delete"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Done / View All button */}
          {entries.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {entries.length} entr{entries.length === 1 ? "y" : "ies"} recorded
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  All saved to the database. Add more entries or go to the records list.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/documentations/xray")}
                className={cn(buttonStyles.base, "gap-2 bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500 w-full sm:w-auto justify-center")}
              >
                <CheckCircle2 size={16} />
                Done — View All Records
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
