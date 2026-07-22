"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { docsApi } from "@/lib/api/documentations";
import SignatureCell from "@/components/ui/SignatureCell";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";

const FORM_TYPE = "roastingtemperature";
const MIN_ROWS = 15;

function fmtDate(d?: string) {
  if (!d) return "";
  const parts = String(d).split("-");
  if (parts.length !== 3) return d;
  const [y, m, day] = parts;
  return `${day}/${m}/${y}`;
}

// Convert 24hr "HH:MM" to 12hr "hh:mm AM/PM" for print readability.
function to12Hour(time24?: string) {
  if (!time24 || !time24.includes(":")) return "";
  const [h, m] = time24.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return "";
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

const show = (v: any) => (v === null || v === undefined || v === "" ? "" : String(v));

export default function RoastingTemperaturePrintPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recordId = searchParams.get("id");
  const [record, setRecord] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!recordId) { setLoading(false); return; }
      try {
        setLoading(true);
        const res = await docsApi.get(FORM_TYPE, Number(recordId));
        setRecord(res.data);
      } catch (e) {
        console.error("Failed to load record:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [recordId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-gray-600" size={36} />
          <p className="text-gray-600 text-sm">Loading record…</p>
        </div>
      </div>
    );
  }

  const rows: any[] = Array.isArray(record?.entries) ? record!.entries : [];
  const blankRows = Math.max(0, MIN_ROWS - rows.length);

  // A185 prints its own plant-specific header (CFPLB code); other plants keep
  // the existing hardcoded values.
  const isA185 = (record?.warehouse || getStoredWarehouse()) === "A185";
  const formatLabel = isA185
    ? "Monitoring and Verification of CCP - Roasting Temperature & Time"
    : "Monitoring & Verification of CCP — Roasting Time & Temperature";
  const docNo = isA185 ? "CFPLB.C5.F.13" : "CFPLA.C2.F.42";
  const issueDate = "01/11/2017";
  const issueNo = isA185 ? "05" : "04";
  const revDate = isA185 ? "02/02/2026" : "01/10/2025";
  const revNo = isA185 ? "04" : "03";

  return (
    <div className="min-h-screen bg-gray-300 print:bg-white">
      <div className="print:hidden sticky top-0 z-20 bg-white shadow-md px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/documentations/roastingtemperature")}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            <ArrowLeft size={15} /> Back
          </button>
          <span className="text-sm text-gray-500">
            {record ? `${rows.length} entr${rows.length !== 1 ? "ies" : "y"}` : "No record"}
          </span>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-md"
        >
          <Printer size={15} /> Print
        </button>
      </div>

      {!record ? (
        <div className="text-center text-gray-500 py-20">No record found to print.</div>
      ) : (
        <div
          className="bg-white mx-auto my-6 print:my-0 print:shadow-none print:w-full"
          style={{
            width: "297mm",
            maxWidth: "100%",
            fontFamily: "'Calibri', 'Arial', sans-serif",
            color: "#000",
            boxShadow: "0 2px 20px rgba(0,0,0,.15)",
            padding: "8mm",
          }}
        >
          {/* Header */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <tbody>
              <tr>
                <td rowSpan={4} style={{ ...tdHead, width: "120px", textAlign: "center" }}>
                  <img src="/candor-logo.jpg" alt="Candor" style={{ width: "75px" }} />
                </td>
                <td style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>CANDOR FOODS PRIVATE LIMITED</td>
                <td style={tdHead}>Issue Date:</td>
                <td style={tdHead}>{issueDate}</td>
              </tr>
              <tr>
                <td rowSpan={2} style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>
                  FORMAT: {formatLabel}
                </td>
                <td style={tdHead}>Issue No:</td>
                <td style={tdHead}>{issueNo}</td>
              </tr>
              <tr>
                <td style={tdHead}>Revision Date:</td>
                <td style={tdHead}>{revDate}</td>
              </tr>
              <tr>
                <td style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>Document No : {docNo}</td>
                <td style={tdHead}>Revision No.:</td>
                <td style={tdHead}>{revNo}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: "8px", marginBottom: "4px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", fontWeight: "bold" }}>
            <span>
              Warehouse: <span style={{ fontWeight: "normal" }}>{record?.warehouse || "—"}</span>
              <span style={{ marginLeft: "24px" }}>Created: <span style={{ fontWeight: "normal" }}>{fmtDate((record?.created_at || "").slice(0, 10))}</span></span>
            </span>
            <span>CCP: Roasting Time &amp; Temperature — recorded at Start / Middle / End of each stage</span>
          </div>

          {/* Roasting log grid */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8px" }}>
            <thead>
              <tr>
                <th style={{ ...th, width: "22px" }} rowSpan={2}>Sr No</th>
                <th style={{ ...th, width: "52px" }} rowSpan={2}>Date</th>
                <th style={{ ...th, width: "80px" }} rowSpan={2}>Product Name</th>
                <th style={{ ...th, width: "70px" }} rowSpan={2}>Customer</th>
                <th style={{ ...th, width: "40px" }} rowSpan={2}>Set Temp (°C)</th>
                <th style={{ ...th, width: "40px" }} rowSpan={2}>Qty</th>
                <th style={{ ...th, width: "40px" }} rowSpan={2}>Stage</th>
                <th style={{ ...th, width: "45px" }} rowSpan={2}>Duration (min)</th>
                <th style={{ ...th, width: "48px" }} rowSpan={2}>In Time</th>
                <th style={th} colSpan={6}>Time of Monitoring</th>
                <th style={{ ...th, width: "48px" }} rowSpan={2}>Out Time</th>
                <th style={{ ...th, width: "60px" }} rowSpan={2}>Operator Sign</th>
                <th style={{ ...th, width: "70px" }} rowSpan={2}>Corrective Action</th>
                <th style={{ ...th, width: "60px" }} rowSpan={2}>QC Verification</th>
              </tr>
              <tr>
                <th style={{ ...th, width: "48px" }}>Start Time</th>
                <th style={{ ...th, width: "40px" }}>Start Temp</th>
                <th style={{ ...th, width: "48px" }}>Mid Time</th>
                <th style={{ ...th, width: "40px" }}>Mid Temp</th>
                <th style={{ ...th, width: "48px" }}>End Time</th>
                <th style={{ ...th, width: "40px" }}>End Temp</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={td}>{i + 1}</td>
                  <td style={td}>{fmtDate(r.date)}</td>
                  <td style={{ ...td, textAlign: "left", paddingLeft: "4px", fontWeight: "bold" }}>{show(r.product_name)}</td>
                  <td style={{ ...td, textAlign: "left", paddingLeft: "4px" }}>{show(r.customer)}</td>
                  <td style={td}>{show(r.set_temperature)}</td>
                  <td style={td}>{show(r.quantity)}</td>
                  <td style={td}>{show(r.roasting_stage)}</td>
                  <td style={td}>{show(r.duration)}</td>
                  <td style={td}>{to12Hour(r.in_time)}</td>
                  <td style={td}>{to12Hour(r.monitoring_points?.start_obs_time)}</td>
                  <td style={td}>{show(r.monitoring_points?.start_obs_temp)}</td>
                  <td style={td}>{to12Hour(r.monitoring_points?.middle_obs_time)}</td>
                  <td style={td}>{show(r.monitoring_points?.middle_obs_temp)}</td>
                  <td style={td}>{to12Hour(r.monitoring_points?.end_obs_time)}</td>
                  <td style={td}>{show(r.monitoring_points?.end_obs_temp)}</td>
                  <td style={td}>{to12Hour(r.out_time)}</td>
                  <td style={{ ...td, padding: "1px" }}>
                    <SignatureCell name={r.operator_sign} maxHeight={18} maxWidth={54} showName={false} />
                  </td>
                  <td style={{ ...td, textAlign: "left", paddingLeft: "4px" }}>{show(r.corrective_action)}</td>
                  <td style={{ ...td, padding: "1px" }}>
                    <SignatureCell name={r.qc_verification} maxHeight={18} maxWidth={54} showName={false} />
                  </td>
                </tr>
              ))}
              {Array.from({ length: blankRows }).map((_, i) => (
                <tr key={`b-${i}`}>
                  {Array.from({ length: 19 }).map((__, j) => (
                    <td key={j} style={{ ...td, height: "18px" }}>&nbsp;</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div style={{ marginTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", fontWeight: "bold" }}>
            <span>Prepared By: FST</span>
            <div style={{ border: "2px solid #6b46c1", color: "#6b46c1", padding: "3px 12px", fontSize: "10px", textAlign: "center", lineHeight: 1.2 }}>
              CONTROLLED<br />COPY
            </div>
            <span>Approved By: FSTL</span>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          html, body { background: white !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          @page { size: A4 landscape; margin: 6mm; }
          .print\\:w-full { width: 100% !important; max-width: 100% !important; margin: 0 !important; }
        }
      `}</style>
    </div>
  );
}

const tdHead: React.CSSProperties = {
  border: "1px solid #000",
  padding: "4px 6px",
  verticalAlign: "middle",
  fontSize: "11px",
};

const th: React.CSSProperties = {
  border: "1px solid #000",
  padding: "3px 2px",
  textAlign: "center",
  fontWeight: "bold",
  fontSize: "8px",
  verticalAlign: "middle",
  background: "#fff",
};

const td: React.CSSProperties = {
  border: "1px solid #000",
  padding: "2px 2px",
  textAlign: "center",
  verticalAlign: "middle",
  fontSize: "8px",
  height: "16px",
};
