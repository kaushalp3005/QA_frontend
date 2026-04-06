"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ArrowLeft, Loader2, Calendar, Clock, Package, User, FileText, Printer } from "lucide-react";
import { getXRayRecord } from "@/lib/api/xray";
import type { XRayRecord } from "@/lib/api/xray";

export default function XRayViewPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [record, setRecord] = useState<XRayRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getXRayRecord(id)
      .then(setRecord)
      .catch((err) => setError(err.message || "Failed to load record"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
          <span className="ml-2 text-gray-500">Loading record...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !record) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </button>
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
            {error || "Record not found"}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const fmtDate = (d: string) => {
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Records
          </button>
          <button
            onClick={() => router.push(`/documentations/xray/print?id=${record.id}`)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
        </div>

        {/* Card */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-800 px-6 py-4">
            <h2 className="text-xl font-bold text-white">X-Ray Detection Record</h2>
            <p className="text-green-100 text-sm mt-1">
              CCP-2 &middot; Document: CFPLA.C2.F.20 &middot; Record #{record.id}
            </p>
          </div>

          <div className="p-6 space-y-8">
            {/* Batch Info */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-green-600 rounded-full inline-block" />
                Batch Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                    <Calendar className="h-3.5 w-3.5" /> Date
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{fmtDate(record.date)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                    <Clock className="h-3.5 w-3.5" /> Time
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{record.time || "—"}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                    <Package className="h-3.5 w-3.5" /> Product Name
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{record.product_name || "—"}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                    <FileText className="h-3.5 w-3.5" /> Batch No
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{record.batch_no || "—"}</p>
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
                {([
                  ["SS 316", record.ss316],
                  ["Ceramic", record.ceramic],
                  ["Soda Lime Glass", record.soda_lime_glass],
                ] as const).map(([label, checked]) => (
                  <div
                    key={label}
                    className={`flex items-center gap-3 p-3 border rounded-lg ${
                      checked ? "border-green-500 bg-green-50" : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div
                      className={`flex items-center justify-center w-5 h-5 rounded border-2 flex-shrink-0 ${
                        checked ? "bg-green-600 border-green-600" : "border-gray-300"
                      }`}
                    >
                      {checked && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Corrective Actions */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-yellow-500 rounded-full inline-block" />
                Corrective Actions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Action on X-Ray</p>
                  <p className="text-sm text-gray-900">{record.action_on_xray || "—"}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Action on Product Passed</p>
                  <p className="text-sm text-gray-900">{record.action_on_product_passed || "—"}</p>
                </div>
              </div>
            </div>

            {/* Sign-offs */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-green-600 rounded-full inline-block" />
                Sign-offs
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                    <User className="h-3.5 w-3.5" /> Calibrated / Monitored By
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{record.calibrated_monitored_by || "—"}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                    <User className="h-3.5 w-3.5" /> Verified By
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{record.verified_by || "—"}</p>
                </div>
              </div>
            </div>

            {/* Remarks */}
            {record.remarks && (
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 bg-green-600 rounded-full inline-block" />
                  Remarks
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-900">{record.remarks}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
