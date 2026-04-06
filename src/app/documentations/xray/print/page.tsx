"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { getXRayRecords, getXRayRecord } from "@/lib/api/xray";
import type { XRayRecord } from "@/lib/api/xray";

function fmt(date: string) {
  if (!date) return "";
  const parts = date.split("-");
  if (parts.length !== 3) return date;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

const BLANK_ROW_COUNT = 12;

export default function XRayPrintPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recordId = searchParams.get("id");
  const [records, setRecords] = useState<XRayRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (recordId) {
          const single = await getXRayRecord(recordId);
          setRecords([single]);
        } else {
          const data = await getXRayRecords();
          setRecords(data);
        }
      } catch (error) {
        console.error("Error fetching X-Ray records:", error);
        alert("Failed to load records.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [recordId]);

  const blankRows = Math.max(0, BLANK_ROW_COUNT - records.length);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-gray-600" size={36} />
          <p className="text-gray-600 text-sm">Loading records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-300 print:bg-white">
      {/* ── SCREEN-ONLY TOOLBAR ── */}
      <div className="print:hidden sticky top-0 z-20 bg-white shadow-md px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/documentations/xray")}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            <ArrowLeft size={15} />
            Back
          </button>
          <span className="text-sm text-gray-500">
            {recordId ? "Single record" : `${records.length} record${records.length !== 1 ? "s" : ""}`}
          </span>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          <Printer size={15} />
          Print
        </button>
      </div>

      {/* ── PRINT SHEET ── */}
      <div
        className="bg-white mx-auto my-6 print:my-0 print:shadow-none print:w-full"
        style={{
          width: "297mm",
          maxWidth: "100%",
          fontFamily: "'Times New Roman', serif",
          color: "#000",
          boxShadow: "0 2px 20px rgba(0,0,0,.15)",
        }}
      >
        {/* Top frequency label */}
        <div style={{ padding: "10px 14px 2px", fontSize: "11px", fontWeight: "bold", fontStyle: "italic" }}>
          Frequency: Every hourly
        </div>

        {/* ════════ OUTER BORDER ════════ */}
        <div style={{ border: "2px solid #000", margin: "4px 10px 10px" }}>

          {/* ── HEADER ROW ── */}
          <div style={{ display: "flex", borderBottom: "2px solid #000" }}>
            {/* Logo cell */}
            <div style={{
              width: "120px",
              flexShrink: 0,
              borderRight: "2px solid #000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "6px",
            }}>
              <img
                src="/candor-logo.jpg"
                alt="Candor Foods"
                style={{ width: "75px", height: "60px", objectFit: "contain" }}
              />
            </div>

            {/* Title cell */}
            <div style={{
              flex: 1,
              borderRight: "2px solid #000",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              padding: "6px 10px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "16px", fontWeight: "bold", letterSpacing: "1px" }}>
                CANDOR FOODS PRIVATE LIMITED
              </div>
              <div style={{ fontSize: "12px", fontWeight: "bold", marginTop: "6px", lineHeight: 1.4 }}>
                Format: CCP Calibration, Monitoring and Verification Check Record<br />(X-Ray Detection)
              </div>
              <div style={{ fontSize: "12px", fontWeight: "bold", marginTop: "3px" }}>
                Document No: CFPLA.C2.F.20
              </div>
            </div>

            {/* Meta info cell */}
            <div style={{ width: "200px", flexShrink: 0 }}>
              <table style={{ width: "100%", height: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
                <tbody>
                  {[
                    ["Issue Date:", "03/10/2023"],
                    ["Issue No:", "02"],
                    ["Revision Date:", "01/11/2025"],
                    ["Revision No.:", "01"],
                  ].map(([label, val], i) => (
                    <tr key={i}>
                      <td style={metaTd}>{label}</td>
                      <td style={{ ...metaTd, fontWeight: "normal" }}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── FREQUENCY + MACHINE INFO ── */}
          <div style={{ display: "flex", borderBottom: "2px solid #000", fontSize: "11px" }}>
            <div style={{ ...infoCell, minWidth: "260px", fontStyle: "italic" }}>
              <span style={{ fontSize: "13px", marginRight: "4px" }}>&#x2713;</span>
              <b>Frequency: At the End Before Final Packing</b>
            </div>
            <div style={infoCell}>
              <b>MACHINE DETAILS&nbsp;</b> X-RAY
            </div>
            <div style={infoCell}>
              <b>ID:&nbsp;</b>61154479393
            </div>
            <div style={{ ...infoCell, flex: 1 }}>
              <b>LOCATION:&nbsp;</b>SECOND FLOOR FG AREA
            </div>
            <div style={{
              padding: "3px 10px",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderLeft: "1px solid #000",
              fontSize: "10px",
            }}>
              CCP:&nbsp;CCP-2
            </div>
          </div>

          {/* ── DATA TABLE ── */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <thead>
              {/* Main header row */}
              <tr>
                <th rowSpan={2} style={th}>DATE</th>
                <th rowSpan={2} style={th}>TIME</th>
                <th rowSpan={2} style={{ ...th, minWidth: "110px" }}>PRODUCT NAME</th>
                <th rowSpan={2} style={th}>BATCH<br />NO</th>
                <th colSpan={3} style={th}>SENSITIVITIES</th>
                <th colSpan={2} style={{ ...th, fontSize: "9px" }}>
                  IF X-RAY IS NOT WORKING,<br />CORRECTIVE ACTION TAKEN ON
                </th>
                <th rowSpan={2} style={{ ...th, fontSize: "9px" }}>CALIBRATED/<br />MONITORED<br />BY</th>
                <th rowSpan={2} style={th}>VERIFIED<br />BY</th>
                <th rowSpan={2} style={th}>REMARKS</th>
              </tr>
              {/* Sub-header row */}
              <tr>
                <th style={{ ...th, minWidth: "42px" }}>SS 316</th>
                <th style={{ ...th, minWidth: "48px" }}>Ceramic</th>
                <th style={{ ...th, minWidth: "55px" }}>Soda Lime<br />Glass</th>
                <th style={{ ...th, minWidth: "80px" }}>ON X-RAY</th>
                <th style={{ ...th, minWidth: "80px" }}>ON PRODUCT<br />PASSED</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td style={td}>{fmt(r.date)}</td>
                  <td style={td}>{r.time}</td>
                  <td style={{ ...td, textAlign: "left", paddingLeft: "6px" }}>{r.product_name}</td>
                  <td style={td}>{r.batch_no}</td>
                  <td style={td}>{r.ss316 ? "✓" : ""}</td>
                  <td style={td}>{r.ceramic ? "✓" : ""}</td>
                  <td style={td}>{r.soda_lime_glass ? "✓" : ""}</td>
                  <td style={{ ...td, textAlign: "left", paddingLeft: "6px" }}>{r.action_on_xray}</td>
                  <td style={{ ...td, textAlign: "left", paddingLeft: "6px" }}>{r.action_on_product_passed}</td>
                  <td style={{ ...td, textAlign: "left", paddingLeft: "6px" }}>{r.calibrated_monitored_by}</td>
                  <td style={{ ...td, textAlign: "left", paddingLeft: "6px" }}>{r.verified_by}</td>
                  <td style={{ ...td, textAlign: "left", paddingLeft: "6px" }}>{r.remarks}</td>
                </tr>
              ))}
              {/* Blank rows to fill the page */}
              {Array.from({ length: blankRows }).map((_, i) => (
                <tr key={`b-${i}`}>
                  {Array.from({ length: 12 }).map((__, j) => (
                    <td key={j} style={{ ...td, height: "30px" }}>&nbsp;</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Spacer */}
          <div style={{ height: "20px" }} />

          {/* ── FOOTER ── */}
          <div style={{
            borderTop: "2px solid #000",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 20px",
            fontSize: "11px",
            fontWeight: "bold",
          }}>
            <span>Prepared By: FST</span>
            <div style={{
              border: "2px solid #000",
              padding: "3px 14px",
              textAlign: "center",
              fontSize: "10px",
              lineHeight: 1.5,
              fontWeight: "bold",
            }}>
              CONTROLLED<br />COPY
            </div>
            <span>Approved By: FSTL</span>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          html, body { background: white !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          @page { size: A4 landscape; margin: 6mm; }
          .print\\:w-full { width: 100% !important; max-width: 100% !important; margin: 0 !important; }
        }
      `}</style>
    </div>
  );
}

/* ── Shared style objects ── */

const metaTd: React.CSSProperties = {
  border: "1px solid #000",
  padding: "3px 6px",
  fontWeight: "bold",
  width: "50%",
  verticalAlign: "middle",
};

const infoCell: React.CSSProperties = {
  borderRight: "1px solid #000",
  padding: "3px 8px",
  display: "flex",
  alignItems: "center",
  whiteSpace: "nowrap",
};

const th: React.CSSProperties = {
  border: "1px solid #000",
  padding: "5px 6px",
  textAlign: "center",
  fontWeight: "bold",
  verticalAlign: "middle",
  background: "#fff",
  color: "#000",
  fontSize: "10px",
};

const td: React.CSSProperties = {
  border: "1px solid #000",
  padding: "3px 4px",
  textAlign: "center",
  verticalAlign: "middle",
};
