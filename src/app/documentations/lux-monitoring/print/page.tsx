"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { docsApi } from "@/lib/api/documentations";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";
import SignatureCell from "@/components/ui/SignatureCell";

const FORM_TYPE = "lux-monitoring";
const MIN_ROWS = 12;

const READINGS = ["r1", "r2", "r3", "r4", "r5"] as const;

const LUX_REQUIREMENTS =
  "Lux Requirements: Sorting Tables-750 lux min/Factory Production-Printing Areas-500 Lux /RM-FG Storage-300 Lux/Loading-Unloading Bay-150 Lux";

function fmtDate(d?: string) {
  if (!d) return "";
  const parts = String(d).split("-");
  if (parts.length !== 3) return d;
  const [y, m, day] = parts;
  return `${day}/${m}/${y}`;
}

const show = (v: any) => (v === null || v === undefined || v === "" ? "" : String(v));

export default function LuxMonitoringPrintPage() {
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

  const rows: any[] = Array.isArray(record?.rows) ? record!.rows : [];
  const blankRows = Math.max(0, MIN_ROWS - rows.length);

  // A185 prints its own plant-specific header (CFPLB code); other plants keep
  // the existing hardcoded values.
  const isA185 = (record?.warehouse || getStoredWarehouse()) === "A185";
  const docNo = isA185 ? "CFPLB.C4.F.32" : "CFPLA.C4.F.32";
  const issueDate = "01/11/2017";
  const issueNo = isA185 ? "02" : "04";
  const revDate = isA185 ? "02/01/2024" : "01/10/2025";
  const revNo = isA185 ? "01" : "03";

  return (
    <div className="min-h-screen bg-gray-300 print:bg-white">
      <div className="print:hidden sticky top-0 z-20 bg-white shadow-md px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/documentations/lux-monitoring")}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            <ArrowLeft size={15} /> Back
          </button>
          <span className="text-sm text-gray-500">
            {record ? `${fmtDate(record.check_date) || "—"} · ${rows.length} location${rows.length !== 1 ? "s" : ""}` : "No record"}
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
            width: "210mm",
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
                  Format: Lux Monitoring Record
                </td>
                <td style={tdHead}>Issue No:</td>
                <td style={tdHead}>{issueNo}</td>
              </tr>
              <tr>
                <td style={tdHead}>Revision Date:</td>
                <td style={tdHead}>{revDate}</td>
              </tr>
              <tr>
                <td style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>Document No: {docNo}</td>
                <td style={tdHead}>Revision No.:</td>
                <td style={tdHead}>{revNo}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: "8px", marginBottom: "4px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", fontWeight: "bold" }}>
            <span>Date: <span style={{ fontWeight: "normal" }}>{fmtDate(record?.check_date)}</span></span>
            <span>Frequency: Monthly</span>
          </div>
          <div style={{ marginBottom: "6px", fontSize: "10px", fontWeight: "bold" }}>
            {LUX_REQUIREMENTS}
          </div>

          {/* Lux readings grid */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9px" }}>
            <thead>
              <tr>
                <th style={{ ...th, width: "26px" }}>Sr No</th>
                <th style={{ ...th, width: "130px" }}>Location</th>
                <th style={{ ...th, width: "60px" }}>Table No.</th>
                <th style={th}>R1</th>
                <th style={th}>R2</th>
                <th style={th}>R3</th>
                <th style={th}>R4</th>
                <th style={th}>R5</th>
                <th style={{ ...th, width: "120px" }}>Corrective Action Taken, if Any</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={td}>{i + 1}</td>
                  <td style={{ ...td, textAlign: "left", paddingLeft: "4px", fontWeight: "bold" }}>{show(r.location)}</td>
                  <td style={td}>{show(r.table_no)}</td>
                  {READINGS.map((rf) => (
                    <td key={rf} style={td}>{show(r[rf])}</td>
                  ))}
                  <td style={{ ...td, textAlign: "left", paddingLeft: "4px" }}>{show(r.corrective_action)}</td>
                </tr>
              ))}
              {Array.from({ length: blankRows }).map((_, i) => (
                <tr key={`b-${i}`}>
                  {Array.from({ length: 9 }).map((__, j) => (
                    <td key={j} style={{ ...td, height: "22px" }}>&nbsp;</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: "10px", fontSize: "10px", fontWeight: "bold" }}>
            Remarks: <span style={{ fontWeight: "normal" }}>{record?.remarks || ""}</span>
          </div>

          {/* Sign-offs */}
          <div style={{ marginTop: "18px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: "11px", fontWeight: "bold" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "6px" }}>
              <span>Checked By:</span>
              <SignatureCell name={record?.checked_by} maxHeight={32} maxWidth={120} />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "6px" }}>
              <span>Verified By Manager:</span>
              <SignatureCell name={record?.verified_by} maxHeight={32} maxWidth={120} />
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", fontWeight: "bold" }}>
            <span>Prepared By: FST</span>
            <div style={{ border: "2px solid #6b46c1", color: "#6b46c1", padding: "3px 12px", fontSize: "10px", textAlign: "center", lineHeight: 1.2 }}>
              CONTROLLED<br />COPY
            </div>
            <span>Verified By: FSTL</span>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          html, body { background: white !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          @page { size: A4 portrait; margin: 8mm; }
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
  padding: "4px 3px",
  textAlign: "center",
  fontWeight: "bold",
  fontSize: "9px",
  verticalAlign: "middle",
  background: "#fff",
};

const td: React.CSSProperties = {
  border: "1px solid #000",
  padding: "3px 3px",
  textAlign: "center",
  verticalAlign: "middle",
  fontSize: "9px",
  height: "20px",
};
