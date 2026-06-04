"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { docsApi } from "@/lib/api/documentations";
import SignatureCell from "@/components/ui/SignatureCell";

function fmt(date: string) {
  if (!date) return "";
  const parts = date.split("-");
  if (parts.length !== 3) return date;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

const BLANK_ROW_COUNT = 30;

interface SampleRow {
  time?: string;
  packing_material_weight?: string;
  net_weight?: string;
  observed_gross_weight?: string;
  deviations_noted?: string;
  sealing_check?: string;
  n2_percent?: string;
  checked_by?: string;
  verified_by?: string;
}

function RecordSheet({ record, newLayout = false }: { record: Record<string, any>; newLayout?: boolean }) {
  const rows: SampleRow[] = Array.isArray(record?.rows) ? record.rows : [];
  const blankRows = Math.max(0, BLANK_ROW_COUNT - rows.length);

  const issueNo = newLayout ? "04" : "03";
  const revDate = newLayout ? "02/06/2026" : "01/10/2025";
  const revNo = newLayout ? "03" : "02";

  return (
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
      {/* Header table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
        <tbody>
          <tr>
            <td rowSpan={4} style={{ ...tdHead, width: "100px", textAlign: "center" }}>
              <img src="/candor-logo.jpg" alt="Candor" style={{ width: "75px" }} />
            </td>
            <td style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>CANDOR FOODS PRIVATE LIMITED</td>
            <td style={tdHead}>Issue Date:</td>
            <td style={tdHead}>01/11/2017</td>
          </tr>
          <tr>
            <td rowSpan={2} style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>
              Format: Product Weight and Sealing check record
            </td>
            <td style={tdHead}>Issue No:</td>
            <td style={tdHead}>{issueNo}</td>
          </tr>
          <tr>
            <td style={tdHead}>Revision Date:</td>
            <td style={tdHead}>{revDate}</td>
          </tr>
          <tr>
            <td style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>Document No: CFPLA.C6.F.16</td>
            <td style={tdHead}>Revision No.:</td>
            <td style={tdHead}>{revNo}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ height: "10px" }} />

      {/* Info table */}
      <div style={{ textAlign: "right", fontSize: "11px", marginBottom: "2px", paddingRight: "4px" }}>
        <b>Location:</b> {record?.location || ""}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
        <tbody>
          <tr>
            <td style={{ ...tdInfo, width: "16%", fontWeight: "bold" }}>Date</td>
            <td style={{ ...tdInfo, width: "34%" }}>{record?.check_date ? fmt(record.check_date) : ""}</td>
            <td style={{ ...tdInfo, width: "16%", fontWeight: "bold" }}>Frequency</td>
            <td style={{ ...tdInfo, width: "34%" }}>Every hour, 10 samples (Start-Mid-End)</td>
          </tr>
          <tr>
            <td style={{ ...tdInfo, fontWeight: "bold" }}>Name of Product</td>
            <td style={tdInfo}>{record?.product_name || ""}</td>
            <td style={{ ...tdInfo, fontWeight: "bold" }}>Batch No.</td>
            <td style={tdInfo}>{record?.batch_no || ""}</td>
          </tr>
          <tr>
            <td style={{ ...tdInfo, fontWeight: "bold" }}>Customer</td>
            <td style={tdInfo}>{record?.customer || ""}</td>
            <td style={{ ...tdInfo, fontWeight: "bold" }}>PKD</td>
            <td style={tdInfo}>{record?.pkd || ""}</td>
          </tr>
          <tr>
            <td style={{ ...tdInfo, fontWeight: "bold" }}>Declared Product Net Weight (gms)</td>
            <td style={tdInfo}>{record?.declared_net_weight_gms ?? ""}</td>
            <td style={{ ...tdInfo, fontWeight: "bold" }}>Permissible error (±gms)</td>
            <td style={tdInfo}>{record?.permissible_error_gms ?? ""}</td>
          </tr>
          <tr>
            <td style={{ ...tdInfo, fontWeight: "bold" }}>Total Pkts Produced (Nos)</td>
            <td style={tdInfo} colSpan={3}>{record?.total_pkts_produced ?? ""}</td>
          </tr>
        </tbody>
      </table>

      {/* Sample table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px", marginTop: "0" }}>
        <thead>
          <tr>
            <th style={th}>Sr. No</th>
            <th style={th}>Time</th>
            <th style={th}>Packing Material Weight (g)</th>
            <th style={th}>Net Weight (g)</th>
            <th style={th}>Observed Gross Weight (g)</th>
            <th style={th}>Deviations Noted (Yes/No)</th>
            <th style={th}>Sealing check (Ok/Not Ok)</th>
            <th style={th}>N2 %</th>
            <th style={th}>Checked By</th>
            <th style={th}>Verified By</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={td}>{i + 1}</td>
              <td style={td}>{r.time || ""}</td>
              <td style={td}>{r.packing_material_weight || ""}</td>
              <td style={td}>{r.net_weight || ""}</td>
              <td style={td}>{r.observed_gross_weight || ""}</td>
              <td style={td}>{r.deviations_noted || ""}</td>
              <td style={td}>{r.sealing_check || ""}</td>
              <td style={td}>{r.n2_percent || ""}</td>
              <td style={{ ...td, padding: "1px 2px" }}>
                <SignatureCell name={r.checked_by} maxHeight={22} maxWidth={70} showName={false} />
              </td>
              <td style={{ ...td, padding: "1px 2px" }}>
                <SignatureCell name={r.verified_by} maxHeight={22} maxWidth={70} showName={false} />
              </td>
            </tr>
          ))}
          {Array.from({ length: blankRows }).map((_, i) => (
            <tr key={`b-${i}`}>
              {Array.from({ length: 10 }).map((__, j) => (
                <td key={j} style={{ ...td, height: "20px" }}>&nbsp;</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Remarks */}
      <div style={{ marginTop: "6px", fontSize: "11px" }}>
        <b>Remarks:</b> {record?.remarks || ""}
      </div>

      {/* Footer */}
      <div style={{ marginTop: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", fontWeight: "bold" }}>
        <span>Prepared By: Production</span>
        <div style={{ border: "2px solid #6b46c1", color: "#6b46c1", padding: "3px 12px", fontSize: "10px", textAlign: "center", lineHeight: 1.2 }}>
          CONTROLLED<br />COPY
        </div>
        <span>Approved By: FSTL</span>
      </div>
    </div>
  );
}

export default function ProductWeightCheckPrintPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [records, setRecords] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const newLayout = searchParams.get("newLayout") === "1";

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const idsParam = searchParams.get("ids");
        const idParam = searchParams.get("id");

        let ids: number[] = [];
        if (idsParam) {
          ids = idsParam.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        } else if (idParam) {
          const n = parseInt(idParam);
          if (!isNaN(n)) ids = [n];
        }

        if (ids.length > 0) {
          const results = await Promise.all(ids.map(id => docsApi.get("productweightcheck", id)));
          setRecords(results.map(r => r.data).filter(Boolean));
        }
      } catch (e) {
        console.error("Failed to load record:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-gray-600" size={36} />
          <p className="text-gray-600 text-sm">Loading record{records.length !== 1 ? "s" : ""}…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-300 print:bg-white">
      {/* Toolbar */}
      <div className="print:hidden sticky top-0 z-20 bg-white shadow-md px-5 py-3 flex items-center justify-between">
        <button
          onClick={() => router.push("/documentations/productweightcheck")}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
        >
          <ArrowLeft size={15} /> Back
        </button>
        <div className="flex items-center gap-3">
          {records.length > 1 && (
            <span className="text-sm text-gray-500 font-medium">{records.length} records</span>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
          >
            <Printer size={15} /> Print
          </button>
        </div>
      </div>

      {/* One sheet per record, page break between them */}
      {records.map((record, idx) => (
        <div
          key={record.id ?? idx}
          style={idx < records.length - 1 ? { pageBreakAfter: "always" } : undefined}
        >
          <RecordSheet record={record} newLayout={newLayout} />
        </div>
      ))}

      <style>{`
        @media print {
          html, body { background: white !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          @page { size: A4 portrait; margin: 6mm; }
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

const tdInfo: React.CSSProperties = {
  border: "1px solid #000",
  padding: "5px 6px",
  verticalAlign: "middle",
  fontSize: "11px",
};

const th: React.CSSProperties = {
  border: "1px solid #000",
  padding: "4px 4px",
  textAlign: "center",
  fontWeight: "bold",
  fontSize: "10px",
  verticalAlign: "middle",
  background: "#fff",
};

const td: React.CSSProperties = {
  border: "1px solid #000",
  padding: "3px 4px",
  textAlign: "center",
  verticalAlign: "middle",
  fontSize: "10px",
};
