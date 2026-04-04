"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Printer, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import type { XRayRecord } from "@/lib/api/xray";
import { getXRayRecords } from "@/lib/api/xray";

function fmt(date: string) {
  if (!date) return "";
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

const BLANK_ROW_COUNT = 8;

export default function XRayPrintPage() {
  const router = useRouter();
  const [records, setRecords] = useState<XRayRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setLoading(true);
        const data = await getXRayRecords();
        setRecords(data);
      } catch (error) {
        console.error('Error fetching X-Ray records:', error);
        alert('Failed to load records. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, []);

  const clearAll = () => {
    if (confirm("Clear all saved records? This cannot be undone.")) {
      alert('Please contact your administrator to clear records from the database.');
    }
  };

  const blankRows = Math.max(0, BLANK_ROW_COUNT - records.length);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-primary-600" size={40} />
          <p className="text-gray-700 font-medium">Loading X-Ray records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Screen-only toolbar */}
      <div className="sticky top-0 z-20 bg-white rounded-lg shadow-md p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/documentations/xray/create")}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Form
          </button>
          <span className="text-sm text-gray-600">
            <span className="font-bold text-gray-900">{records.length}</span> record{records.length !== 1 ? "s" : ""} saved
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={clearAll}
            className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            <Trash2 size={18} />
            Clear All
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Printer size={18} />
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Print Sheet */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ width: "100%", maxWidth: "1200px", margin: "0 auto" }}>
        {/* Document Header */}
        <div className="border-b-2 border-gray-800">
          <div className="grid grid-cols-12 gap-0">
            {/* Logo and Company Name */}
            <div className="col-span-3 border-r-2 border-gray-800 p-4 flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 bg-gray-800 rounded text-white flex items-center justify-center font-bold text-xl">C</div>
              <div className="text-center text-xs font-bold text-gray-900 leading-tight">
                <div>Candor</div>
                <div>Foods</div>
              </div>
            </div>

            {/* Title and Document Info */}
            <div className="col-span-6 border-r-2 border-gray-800 p-4 flex flex-col justify-center">
              <h1 className="text-sm font-bold text-gray-900 text-center">CANDOR FOODS PRIVATE LIMITED</h1>
              <p className="text-xs font-semibold text-gray-700 text-center mt-2">
                Format: CCP Calibration, Monitoring and Verification Check Record (X-Ray Detection)
              </p>
              <p className="text-xs text-gray-600 text-center mt-1">Document No: CFPLA.C2.F.20</p>
            </div>

            {/* Meta Info */}
            <div className="col-span-3 p-0">
              <div className="grid grid-cols-2 divide-x divide-y divide-gray-400 h-full">
                <div className="p-2 flex flex-col justify-center">
                  <span className="text-xs font-bold text-gray-700">Issue Date</span>
                  <span className="text-xs text-gray-900">03/10/2023</span>
                </div>
                <div className="p-2 flex flex-col justify-center">
                  <span className="text-xs font-bold text-gray-700">Issue No</span>
                  <span className="text-xs text-gray-900">02</span>
                </div>
                <div className="p-2 flex flex-col justify-center border-t border-gray-400">
                  <span className="text-xs font-bold text-gray-700">Revision Date</span>
                  <span className="text-xs text-gray-900">01/11/2025</span>
                </div>
                <div className="p-2 flex flex-col justify-center border-t border-gray-400">
                  <span className="text-xs font-bold text-gray-700">Revision No.</span>
                  <span className="text-xs text-gray-900">01</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Frequency Bar */}
        <div className="border-b border-gray-600 px-4 py-2 bg-gray-100">
          <p className="text-xs font-semibold text-gray-800">
            Frequency: Every hourly &nbsp;|&nbsp; Frequency: At the End Before Final Packing
          </p>
        </div>

        {/* Machine Info Row */}
        <div className="border-b-2 border-gray-800 flex divide-x divide-gray-600">
          <div className="flex-1 px-4 py-2 flex items-center gap-2 border-r border-gray-600">
            <span className="font-bold text-xs text-gray-700">MACHINE DETAILS:</span>
            <span className="text-xs text-gray-900">X-RAY</span>
          </div>
          <div className="flex-1 px-4 py-2 flex items-center gap-2 border-r border-gray-600">
            <span className="font-bold text-xs text-gray-700">ID:</span>
            <span className="text-xs text-gray-900">61154479393</span>
          </div>
          <div className="flex-1 px-4 py-2 flex items-center gap-2 border-r border-gray-600">
            <span className="font-bold text-xs text-gray-700">LOCATION:</span>
            <span className="text-xs text-gray-900">SECOND FLOOR FG AREA</span>
          </div>
          <div className="px-4 py-2 flex items-center justify-center">
            <div className="bg-gray-800 text-white px-2 py-1 rounded text-xs font-bold text-center">
              CCP: CCP-2
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ fontSize: "9px" }}>
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="border border-gray-400 px-2 py-1.5 font-bold text-center" style={{ width: "72px" }}>DATE</th>
                <th className="border border-gray-400 px-2 py-1.5 font-bold text-center" style={{ width: "56px" }}>TIME</th>
                <th className="border border-gray-400 px-2 py-1.5 font-bold text-center" style={{ width: "140px" }}>PRODUCT NAME</th>
                <th className="border border-gray-400 px-2 py-1.5 font-bold text-center" style={{ width: "80px" }}>BATCH NO</th>
                <th className="border border-gray-400 px-2 py-1.5 font-bold text-center" colSpan={3}>SENSITIVITIES</th>
                <th className="border border-gray-400 px-2 py-1.5 font-bold text-center" colSpan={2}>IF X-RAY IS NOT WORKING,<br />CORRECTIVE ACTION TAKEN ON</th>
                <th className="border border-gray-400 px-2 py-1.5 font-bold text-center" style={{ width: "100px" }}>CALIBRATED /<br />MONITORED BY</th>
                <th className="border border-gray-400 px-2 py-1.5 font-bold text-center" style={{ width: "85px" }}>VERIFIED BY</th>
                <th className="border border-gray-400 px-2 py-1.5 font-bold text-center" style={{ width: "90px" }}>REMARKS</th>
              </tr>
              <tr className="bg-gray-700 text-white text-xs">
                <th colSpan={4}></th>
                <th className="border border-gray-400 px-2 py-1 font-semibold text-center" style={{ width: "48px" }}>SS 316</th>
                <th className="border border-gray-400 px-2 py-1 font-semibold text-center" style={{ width: "55px" }}>Ceramic</th>
                <th className="border border-gray-400 px-2 py-1 font-semibold text-center" style={{ width: "68px" }}>Soda Lime<br />Glass</th>
                <th className="border border-gray-400 px-2 py-1 font-semibold text-center" style={{ width: "100px" }}>ON X-RAY</th>
                <th className="border border-gray-400 px-2 py-1 font-semibold text-center" style={{ width: "100px" }}>ON PRODUCT<br />PASSED</th>
                <th colSpan={3}></th>
              </tr>
              <tr className="bg-gray-600 text-white text-xs">
                <th colSpan={4}></th>
                <th className="border border-gray-400 px-2 py-1 font-normal text-center">✓</th>
                <th className="border border-gray-400 px-2 py-1 font-normal text-center">✓</th>
                <th className="border border-gray-400 px-2 py-1 font-normal text-center">✓</th>
                <th className="border border-gray-400 px-2 py-1 font-normal text-center">Action</th>
                <th className="border border-gray-400 px-2 py-1 font-normal text-center">Action</th>
                <th colSpan={3}></th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, idx) => (
                <tr key={r.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="border border-gray-400 px-2 py-1 text-center whitespace-nowrap">{fmt(r.date)}</td>
                  <td className="border border-gray-400 px-2 py-1 text-center whitespace-nowrap">{r.time}</td>
                  <td className="border border-gray-400 px-2 py-1 text-left">{r.productName}</td>
                  <td className="border border-gray-400 px-2 py-1 text-center">{r.batchNo}</td>
                  <td className="border border-gray-400 px-2 py-1 text-center">{r.ss316 ? "✓" : ""}</td>
                  <td className="border border-gray-400 px-2 py-1 text-center">{r.ceramic ? "✓" : ""}</td>
                  <td className="border border-gray-400 px-2 py-1 text-center">{r.sodaLimeGlass ? "✓" : ""}</td>
                  <td className="border border-gray-400 px-2 py-1 text-left text-xs">{r.onXRay}</td>
                  <td className="border border-gray-400 px-2 py-1 text-left text-xs">{r.onProductPassed}</td>
                  <td className="border border-gray-400 px-2 py-1 text-left text-xs">{r.calibratedMonitoredBy}</td>
                  <td className="border border-gray-400 px-2 py-1 text-left text-xs">{r.verifiedBy}</td>
                  <td className="border border-gray-400 px-2 py-1 text-left text-xs">{r.remarks}</td>
                </tr>
              ))}

              {/* Blank padding rows */}
              {Array.from({ length: blankRows }).map((_, i) => (
                <tr key={`blank-${i}`} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="border border-gray-400 px-2 py-1">&nbsp;</td>
                  <td className="border border-gray-400 px-2 py-1">&nbsp;</td>
                  <td className="border border-gray-400 px-2 py-1">&nbsp;</td>
                  <td className="border border-gray-400 px-2 py-1">&nbsp;</td>
                  <td className="border border-gray-400 px-2 py-1">&nbsp;</td>
                  <td className="border border-gray-400 px-2 py-1">&nbsp;</td>
                  <td className="border border-gray-400 px-2 py-1">&nbsp;</td>
                  <td className="border border-gray-400 px-2 py-1">&nbsp;</td>
                  <td className="border border-gray-400 px-2 py-1">&nbsp;</td>
                  <td className="border border-gray-400 px-2 py-1">&nbsp;</td>
                  <td className="border border-gray-400 px-2 py-1">&nbsp;</td>
                  <td className="border border-gray-400 px-2 py-1">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-800 p-4 flex items-center justify-between text-xs font-semibold text-gray-900">
          <span>Prepared By: FST</span>
          <div className="border-2 border-gray-800 px-3 py-1.5 text-center">
            <div>CONTROLLED</div>
            <div>COPY</div>
          </div>
          <span>Approved By: FSTL</span>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white;
            padding: 0;
            margin: 0;
          }
          div.sticky {
            display: none !important;
          }
          div.bg-gray-100 {
            background: white !important;
          }
          div.rounded-lg {
            border-radius: 0 !important;
          }
          @page {
            size: A3 landscape;
            margin: 12mm;
          }
        }
      `}</style>
    </div>
  );
}
