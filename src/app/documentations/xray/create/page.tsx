"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowLeft, AlertCircle } from "lucide-react";
import { cn, buttonStyles, layoutStyles } from "@/lib/styles";
import { createXRayRecord } from "@/lib/api/xray";

interface XRayFormData {
  date: string
  time: string
  product_name: string
  batch_no: string
  ss316: boolean
  ceramic: boolean
  soda_lime_glass: boolean
  action_on_xray: string
  action_on_product_passed: string
  calibrated_monitored_by: string
  verified_by: string
  remarks: string
}

const EMPTY = (): XRayFormData => ({
  date: new Date().toISOString().split("T")[0],
  time: new Date().toTimeString().slice(0, 5),
  product_name: "",
  batch_no: "",
  ss316: false,
  ceramic: false,
  soda_lime_glass: false,
  action_on_xray: "",
  action_on_product_passed: "",
  calibrated_monitored_by: "",
  verified_by: "",
  remarks: "",
});

export default function XRayFillForm() {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof typeof form, value: string | boolean) =>
    setForm((p) => ({ ...p, [field]: value }));

  const handleCheckboxKeyDown = (e: React.KeyboardEvent, field: keyof typeof form) => {
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
      // Save to backend API/PostgreSQL
      await createXRayRecord(form);
      router.push('/documentations/xray');
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save record';
      setError(message);
      console.error('Error saving X-Ray record:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className={layoutStyles.container}>
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className={cn(buttonStyles.base, buttonStyles.secondary, "gap-2")}
              >
                <ArrowLeft size={16} />
                Back
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">X-Ray Detection Check Record</h1>
                <p className="text-xs text-gray-500 mt-1">CCP-2 · Document: CFPLA.C2.F.20</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={cn(layoutStyles.container, "py-8")}>
        <div className="max-w-3xl mx-auto">
          {/* Form Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {/* Form Header */}
            <div className="px-6 py-6 border-b border-gray-200 bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Batch Information & Check Details</h2>
              <p className="text-sm text-gray-600">
                Second Floor FG Area · Machine ID: 61154479393
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="font-medium text-red-900">Error saving record</h4>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="px-6 py-6">
              {/* Batch Info Section */}
              <div className="mb-8">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 bg-primary-600 rounded"></span>
                  Batch Info
                </h3>
                <div className={layoutStyles.grid2}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      value={form.date}
                      onChange={(e) => set("date", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                    <input
                      type="time"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      value={form.time}
                      onChange={(e) => set("time", e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className={cn(layoutStyles.grid2, "mt-4")}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g. Frozen Peas 500g"
                      value={form.product_name}
                      onChange={(e) => set("product_name", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Batch No</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g. B240401"
                      value={form.batch_no}
                      onChange={(e) => set("batch_no", e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Sensitivity Checks */}
              <div className="mb-8">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 bg-primary-600 rounded"></span>
                  Sensitivity Checks
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* SS 316 */}
                  <div
                    className={cn(
                      "flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all",
                      form.ss316
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-300 bg-white hover:border-primary-300"
                    )}
                    onClick={() => set("ss316", !form.ss316)}
                    onKeyDown={(e) => handleCheckboxKeyDown(e, "ss316")}
                    role="checkbox"
                    aria-checked={form.ss316}
                    tabIndex={0}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center w-5 h-5 rounded border-2 transition-all flex-shrink-0",
                        form.ss316
                          ? "bg-primary-600 border-primary-600"
                          : "border-gray-300"
                      )}
                    >
                      {form.ss316 && <Check size={14} className="text-white" />}
                    </div>
                    <span className="text-sm font-medium text-gray-700">SS 316</span>
                  </div>

                  {/* Ceramic */}
                  <div
                    className={cn(
                      "flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all",
                      form.ceramic
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-300 bg-white hover:border-primary-300"
                    )}
                    onClick={() => set("ceramic", !form.ceramic)}
                    onKeyDown={(e) => handleCheckboxKeyDown(e, "ceramic")}
                    role="checkbox"
                    aria-checked={form.ceramic}
                    tabIndex={0}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center w-5 h-5 rounded border-2 transition-all flex-shrink-0",
                        form.ceramic
                          ? "bg-primary-600 border-primary-600"
                          : "border-gray-300"
                      )}
                    >
                      {form.ceramic && <Check size={14} className="text-white" />}
                    </div>
                    <span className="text-sm font-medium text-gray-700">Ceramic</span>
                  </div>

                  {/* Soda Lime Glass */}
                  <div
                    className={cn(
                      "flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all",
                      form.soda_lime_glass
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-300 bg-white hover:border-primary-300"
                    )}
                    onClick={() => set("soda_lime_glass", !form.soda_lime_glass)}
                    onKeyDown={(e) => handleCheckboxKeyDown(e, "soda_lime_glass")}
                    role="checkbox"
                    aria-checked={form.soda_lime_glass}
                    tabIndex={0}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center w-5 h-5 rounded border-2 transition-all flex-shrink-0",
                        form.soda_lime_glass
                          ? "bg-primary-600 border-primary-600"
                          : "border-gray-300"
                      )}
                    >
                      {form.soda_lime_glass && <Check size={14} className="text-white" />}
                    </div>
                    <span className="text-sm font-medium text-gray-700">Soda Lime Glass</span>
                  </div>
                </div>
              </div>

              {/* Corrective Action */}
              <div className="mb-8">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 bg-warning-600 rounded"></span>
                  Corrective Action (if X-Ray not working)
                </h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Fill these fields only if the X-Ray machine was not working during this check.
                  </p>
                </div>
                <div className={layoutStyles.grid2}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Action Taken on X-Ray</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g. Machine restarted"
                      value={form.action_on_xray}
                      onChange={(e) => set("action_on_xray", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Action on Product Passed</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g. Batch held for re-check"
                      value={form.action_on_product_passed}
                      onChange={(e) => set("action_on_product_passed", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Sign-offs */}
              <div className="mb-8">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 bg-primary-600 rounded"></span>
                  Sign-offs
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Calibrated / Monitored By (Name)
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Full name"
                      value={form.calibrated_monitored_by}
                      onChange={(e) => set("calibrated_monitored_by", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Verified By</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Verifier name"
                      value={form.verified_by}
                      onChange={(e) => set("verified_by", e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div className="mb-8">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 bg-primary-600 rounded"></span>
                  Remarks
                </h3>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-vertical"
                  placeholder="Any additional observations"
                  rows={3}
                  value={form.remarks}
                  onChange={(e) => set("remarks", e.target.value)}
                />
              </div>

              {/* Footer Actions */}
              <div className="border-t border-gray-200 pt-6 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className={cn(buttonStyles.base, buttonStyles.primary, "gap-2")}
                >
                    {saving ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        Saving…
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        Submit Entry
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
