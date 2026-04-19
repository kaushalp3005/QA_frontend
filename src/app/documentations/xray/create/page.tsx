"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowLeft, AlertCircle } from "lucide-react";
import { cn, buttonStyles, layoutStyles } from "@/lib/styles";
import { createXRayRecord } from "@/lib/api/xray";

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
  action_on_xray: "",
  action_on_product_passed: "",
  calibrated_monitored_by: "",
  verified_by: "",
  remarks: "",
});

export default function XRayFillForm() {
  const router = useRouter();
  const [form, setForm] = useState<XRayFormData>(EMPTY());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    try {
      await createXRayRecord(form);
      router.push("/documentations/xray");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save record";
      setError(message);
      console.error("Error saving X-Ray record:", err);
    } finally {
      setSaving(false);
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

      {/* Main Content */}
      <div className={cn(layoutStyles.container, "py-8")}>
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {/* Card Header */}
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">Batch Information & Check Details</h2>
              <p className="text-sm text-gray-500 mt-1">
                Second Floor FG Area · Machine ID: 61154479393
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="font-medium text-red-900 text-sm">Error saving record</p>
                  <p className="text-sm text-red-700 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Success Banner */}
            {saved && (
              <div className="mx-6 mt-6 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
                <Check className="text-green-600 flex-shrink-0 mt-0.5" size={18} />
                <p className="font-medium text-green-900 text-sm">Entry saved successfully!</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-8">

              {/* Batch Info */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 bg-blue-600 rounded-full inline-block" />
                  Batch Info
                </h3>
                <div className={layoutStyles.grid2}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
                    <input
                      type="date"
                      className={inputCls}
                      value={form.date}
                      onChange={(e) => set("date", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Time</label>
                    <input
                      type="time"
                      className={inputCls}
                      value={form.time}
                      onChange={(e) => set("time", e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className={cn(layoutStyles.grid2, "mt-4")}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Product Name</label>
                    <input
                      type="text"
                      className={inputCls}
                      placeholder="e.g. Frozen Peas 500g"
                      value={form.product_name}
                      onChange={(e) => set("product_name", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Batch No</label>
                    <input
                      type="text"
                      className={inputCls}
                      placeholder="e.g. B240401"
                      value={form.batch_no}
                      onChange={(e) => set("batch_no", e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Sensitivity Checks */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 bg-blue-600 rounded-full inline-block" />
                  Sensitivity Checks
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* SS 316 */}
                  <div
                    className={cn(
                      "flex items-center gap-3 p-3 border rounded-lg cursor-pointer select-none transition-all",
                      form.ss316
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-blue-300"
                    )}
                    onClick={() => set("ss316", !form.ss316)}
                    onKeyDown={(e) => handleCheckboxKeyDown(e, "ss316")}
                    role="checkbox"
                    aria-checked={form.ss316}
                    tabIndex={0}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center w-5 h-5 rounded border-2 flex-shrink-0 transition-all",
                        form.ss316 ? "bg-blue-600 border-blue-600" : "border-gray-300"
                      )}
                    >
                      {form.ss316 && <Check size={12} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-sm font-medium text-gray-700">SS 316</span>
                  </div>

                  {/* Ceramic */}
                  <div
                    className={cn(
                      "flex items-center gap-3 p-3 border rounded-lg cursor-pointer select-none transition-all",
                      form.ceramic
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-blue-300"
                    )}
                    onClick={() => set("ceramic", !form.ceramic)}
                    onKeyDown={(e) => handleCheckboxKeyDown(e, "ceramic")}
                    role="checkbox"
                    aria-checked={form.ceramic}
                    tabIndex={0}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center w-5 h-5 rounded border-2 flex-shrink-0 transition-all",
                        form.ceramic ? "bg-blue-600 border-blue-600" : "border-gray-300"
                      )}
                    >
                      {form.ceramic && <Check size={12} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-sm font-medium text-gray-700">Ceramic</span>
                  </div>

                  {/* Soda Lime Glass */}
                  <div
                    className={cn(
                      "flex items-center gap-3 p-3 border rounded-lg cursor-pointer select-none transition-all",
                      form.soda_lime_glass
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-blue-300"
                    )}
                    onClick={() => set("soda_lime_glass", !form.soda_lime_glass)}
                    onKeyDown={(e) => handleCheckboxKeyDown(e, "soda_lime_glass")}
                    role="checkbox"
                    aria-checked={form.soda_lime_glass}
                    tabIndex={0}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center w-5 h-5 rounded border-2 flex-shrink-0 transition-all",
                        form.soda_lime_glass ? "bg-blue-600 border-blue-600" : "border-gray-300"
                      )}
                    >
                      {form.soda_lime_glass && <Check size={12} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-sm font-medium text-gray-700">Soda Lime Glass</span>
                  </div>
                </div>
              </div>

              {/* Corrective Action */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 bg-yellow-500 rounded-full inline-block" />
                  Corrective Action (if X-Ray not working)
                </h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Fill these fields only if the X-Ray machine was not working during this check.
                  </p>
                </div>
                <div className={layoutStyles.grid2}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Action Taken on X-Ray</label>
                    <input
                      type="text"
                      className={inputCls}
                      placeholder="e.g. Machine restarted"
                      value={form.action_on_xray}
                      onChange={(e) => set("action_on_xray", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Action on Product Passed</label>
                    <input
                      type="text"
                      className={inputCls}
                      placeholder="e.g. Batch held for re-check"
                      value={form.action_on_product_passed}
                      onChange={(e) => set("action_on_product_passed", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Sign-offs */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 bg-blue-600 rounded-full inline-block" />
                  Sign-offs
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Calibrated / Monitored By (Name)
                    </label>
                    <input
                      type="text"
                      className={inputCls}
                      placeholder="Full name"
                      value={form.calibrated_monitored_by}
                      onChange={(e) => set("calibrated_monitored_by", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Verified By</label>
                    <input
                      type="text"
                      className={inputCls}
                      placeholder="Verifier name"
                      value={form.verified_by}
                      onChange={(e) => set("verified_by", e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 bg-blue-600 rounded-full inline-block" />
                  Remarks
                </h3>
                <textarea
                  className={inputCls}
                  placeholder="Any additional observations"
                  rows={3}
                  value={form.remarks}
                  onChange={(e) => set("remarks", e.target.value)}
                  style={{ resize: "vertical" }}
                />
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 pt-6 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className={cn(buttonStyles.base, buttonStyles.primary, "gap-2")}
                >
                  {saving ? (
                    <span>Saving…</span>
                  ) : (
                    <>
                      <Check size={16} />
                      Submit Entry
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
