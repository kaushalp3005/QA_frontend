"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { docsApi } from "@/lib/api/documentations";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";

const FORM_TYPE = "gmp-schedule";
const MIN_ROWS = 12; // one row per month

function fmtDate(d?: string) {
  if (!d) return "";
  const parts = String(d).split("-");
  if (parts.length !== 3) return String(d);
  const [y, m, day] = parts;
  return `${day}/${m}/${y}`;
}

const show = (v: any) => (v === null || v === undefined || v === "" ? "" : String(v));

export default function GmpSchedulePrintPage() {
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

  // Same layout for both plants; only the document number differs. Prefer the
  // record's own plant so a sheet prints the same whichever warehouse is active.
  const isA185 = (record?.warehouse || getStoredWarehouse()) === "A185";
  const docNo = isA185 ? "CFPLB.C3.F.03" : "CFPLA.C3.F.23";
  const issueDate = "09/09/2025";
  const issueNo = "01";
  const revDate = "";
  const revNo = "";

  return (
    <div className="min-h-screen bg-gray-300 print:bg-white">
      <div className="print:hidden sticky top-0 z-20 bg-white shadow-md px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/documentations/gmp-schedule")}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            <ArrowLeft size={15} /> Back
          </button>
          <span className="text-sm text-gray-500">
            {record ? `${show(record.year) || "—"} · ${rows.length} month${rows.length !== 1 ? "s" : ""}` : "No record"}
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
            padding: "10mm",
          }}
        >
          {/* Header */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <tbody>
              <tr>
                <td rowSpan={4} style={{ ...tdHead, width: "120px", textAlign: "center" }}>
                  <img src="/candor-logo.jpg" alt="Candor" style={{ width: "85px" }} />
                </td>
                <td style={{ ...tdHead, fontWeight: "bold", textAlign: "center", fontSize: "13px" }}>
                  CANDOR FOODS PRIVATE LIMITED
                </td>
                <td style={{ ...tdHead, width: "90px" }}>Issue Date:</td>
                <td style={{ ...tdHead, width: "90px" }}>{issueDate}</td>
              </tr>
              <tr>
                <td rowSpan={2} style={{ ...tdHead, textAlign: "center" }}>
                  <b>Format:</b> Monthly Facility GMP and GHP inspection shcedule
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

          <div style={{ height: "18px" }} />

          {/* Schedule */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <thead>
              <tr>
                <th style={{ ...th, width: "48px" }}>Sr.No</th>
                <th style={{ ...th, width: "130px" }}>Month</th>
                <th style={{ ...th, width: "110px" }}>Year</th>
                <th style={{ ...th, width: "130px" }}>Planned Date</th>
                <th style={{ ...th, width: "120px" }}>Actual Date</th>
                <th style={th}>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={td}>{show(r.sr) || i + 1}</td>
                  <td style={td}>{show(r.month)}</td>
                  <td style={td}>{show(r.year) || show(record.year)}</td>
                  <td style={td}>{fmtDate(r.planned_date)}</td>
                  <td style={td}>{fmtDate(r.actual_date)}</td>
                  <td style={{ ...td, textAlign: "left", paddingLeft: "6px" }}>{show(r.remarks)}</td>
                </tr>
              ))}
              {Array.from({ length: blankRows }).map((_, i) => (
                <tr key={`b-${i}`}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} style={td}>&nbsp;</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
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
  padding: "5px 6px",
  verticalAlign: "middle",
  fontSize: "11px",
};

const th: React.CSSProperties = {
  border: "1px solid #000",
  padding: "6px 4px",
  textAlign: "center",
  fontWeight: "bold",
  fontSize: "11px",
  verticalAlign: "middle",
  background: "#fff",
};

const td: React.CSSProperties = {
  border: "1px solid #000",
  padding: "6px 4px",
  textAlign: "center",
  verticalAlign: "middle",
  fontSize: "11px",
  height: "30px",
};
