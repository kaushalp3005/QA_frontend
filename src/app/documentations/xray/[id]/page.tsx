"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ArrowLeft, Loader2, Printer, Building2 } from "lucide-react";
import { getXRayRecord, type XRayBatch } from "@/lib/api/xray";
import SignatureCell from "@/components/ui/SignatureCell";

export default function XRayViewPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [record, setRecord] = useState<XRayBatch | null>(null);
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

  const fmtDate = (d: string) => {
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    return day ? `${day}/${m}/${y}` : d;
  };

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
          <button onClick={() => router.back()} className="flex items-center text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-5 w-5 mr-2" /> Back
          </button>
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">{error || "Record not found"}</div>
        </div>
      </DashboardLayout>
    );
  }

  const th = "px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider border border-gray-200";
  const td = "px-3 py-2 text-sm text-gray-800 text-center border border-gray-200";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-5 w-5 mr-2" /> Back to Records
          </button>
          <button
            onClick={() => router.push(`/documentations/xray/print?id=${record.id}`)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
          >
            <Printer className="h-4 w-4" /> Print
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-green-800 px-6 py-4">
            <h2 className="text-xl font-bold text-white">X-Ray Detection Sheet</h2>
            <p className="text-green-100 text-sm mt-1">
              CCP-2 · Document: CFPLA.C2.F.20 · {record.batch_id} · {fmtDate(record.check_date)} ·{" "}
              <span className="capitalize">{record.status || "—"}</span>
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Fixed machine header */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm bg-gray-50 rounded-lg p-4">
              <span className="inline-flex items-center gap-1.5 text-gray-500"><Building2 className="w-4 h-4" /> Machine</span>
              <span><span className="text-gray-500">Details:</span> <strong>{record.machine_details || "X-RAY"}</strong></span>
              <span><span className="text-gray-500">ID:</span> <strong>{record.machine_id || "61154479393"}</strong></span>
              <span><span className="text-gray-500">Location:</span> <strong>{record.location || "SECOND FLOOR FG AREA"}</strong></span>
            </div>

            {/* Entries */}
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th className={th}>#</th>
                    <th className={th}>Date</th>
                    <th className={th}>Time</th>
                    <th className={th}>Product</th>
                    <th className={th}>Batch No</th>
                    <th className={th}>SS 316</th>
                    <th className={th}>Ceramic</th>
                    <th className={th}>Soda Lime</th>
                    <th className={th}>On X-Ray</th>
                    <th className={th}>On Product</th>
                    <th className={th}>Calibrated By</th>
                    <th className={th}>Verified By</th>
                    <th className={th}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {record.entries.map((e, i) => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className={td}>{i + 1}</td>
                      <td className={`${td} whitespace-nowrap`}>{fmtDate(e.date)}</td>
                      <td className={td}>{e.time}</td>
                      <td className={`${td} text-left`}>{e.product_name}</td>
                      <td className={td}>{e.batch_no}</td>
                      <td className={td}>{e.ss316 ? "✓" : ""}</td>
                      <td className={td}>{e.ceramic ? "✓" : ""}</td>
                      <td className={td}>{e.soda_lime_glass ? "✓" : ""}</td>
                      <td className={td}>{e.action_on_xray || "—"}</td>
                      <td className={td}>{e.action_on_product_passed || "—"}</td>
                      <td className={td}><SignatureCell name={e.calibrated_monitored_by} empty="—" maxHeight={32} maxWidth={90} /></td>
                      <td className={td}><SignatureCell name={e.verified_by} empty="—" maxHeight={32} maxWidth={90} /></td>
                      <td className={`${td} text-left`}>{e.remarks || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
