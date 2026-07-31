"use client";

// Printed sheet for CFPLB.C5.F.11 — In-Process Quality Check Record, After
// processing. Reproduces the controlled format: header block, "Date:" line, and
// the grid with Pre-heater / Puffer-Oven each split into Moisture (%) + Salt (%).

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { docsApi } from "@/lib/api/documentations";
import SignatureCell from "@/components/ui/SignatureCell";
import DocWarehouseGate from "@/components/documentations/DocWarehouseGate";
import { DOC_FORMS } from "@/config/doc-forms";

const config = DOC_FORMS["inprocess-qc-after-processing"];

// Header metadata as printed on the controlled copy of CFPLB.C5.F.11.
const HEADER = {
  documentNo: "CFPLB.C5.F.11",
  issueDate: "04/08/2021",
  issueNo: "03",
  revDate: "02/02/2026",
  revNo: "02",
};

// The blank format has six lines; short records are padded so the sheet keeps
// its shape on paper. Row height matches the hand-written format's line depth.
const MIN_PRINT_ROWS = 6;
const ROW_HEIGHT = "12mm";

// Column widths measured off the controlled format, as a share of the grid:
// Product, Batch, Customer, RM Moisture, Salinity, Pre-heater M / Salt,
// Puffer M / Salt, Checked By, Verified By.
const COL_WIDTHS = [
  "18%",
  "11.5%",
  "9.5%",
  "9%",
  "8%",
  "8%",
  "7.5%",
  "8%",
  "6.5%",
  "8%",
  "6%",
];

function fmt(date: string) {
  if (!date) return "";
  const parts = String(date).slice(0, 10).split("-");
  if (parts.length !== 3) return date;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

const val = (v: any) => (v == null || v === "" ? "" : String(v));

interface SheetRow {
  product_name?: string;
  batch_no?: string;
  customer?: string;
  rm_moisture?: string;
  salinity?: string;
  preheater_moisture?: string;
  preheater_salt?: string;
  puffer_moisture?: string;
  puffer_salt?: string;
  checked_by?: string;
  verified_by?: string;
}

function RecordSheet({ record }: { record: Record<string, any> }) {
  const rows: SheetRow[] = Array.isArray(record?.rows) ? record.rows : [];
  // Disambiguates a bare first name shared by two signatories.
  const wh = record?.warehouse as "A185" | "W202" | undefined;
  const padded: (SheetRow | null)[] = [
    ...rows,
    ...Array.from({ length: Math.max(0, MIN_PRINT_ROWS - rows.length) }, () => null),
  ];

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
      {/* Header block */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", tableLayout: "fixed" }}>
        <tbody>
          <tr>
            <td rowSpan={4} style={{ ...tdHead, width: "21%", textAlign: "center" }}>
              <img src="/candor-logo.jpg" alt="Candor" style={{ width: "32mm", maxWidth: "100%" }} />
            </td>
            <td style={{ ...tdHead, width: "42%", fontWeight: "bold", textAlign: "center", fontSize: "13px" }}>
              CANDOR FOODS PRIVATE LIMITED
            </td>
            <td style={{ ...tdHead, width: "18%" }}>Issue Date:</td>
            <td style={{ ...tdHead, width: "19%" }}>{HEADER.issueDate}</td>
          </tr>
          <tr>
            <td rowSpan={2} style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>
              Format: IN-PROCESS QUALITY CHECK RECORD-After processing
            </td>
            <td style={tdHead}>Issue No:</td>
            <td style={tdHead}>{HEADER.issueNo}</td>
          </tr>
          <tr>
            <td style={tdHead}>Revision Date:</td>
            <td style={tdHead}>{HEADER.revDate}</td>
          </tr>
          <tr>
            <td style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>
              Document No: {HEADER.documentNo}
            </td>
            <td style={tdHead}>Revision No:</td>
            <td style={tdHead}>{HEADER.revNo}</td>
          </tr>
        </tbody>
      </table>

      {/* Date line — indented to sit above the grid, as on the format */}
      <div style={{ marginTop: "6px", marginBottom: "10px", paddingLeft: "6mm", fontSize: "11px", fontWeight: "bold" }}>
        Date: <span style={{ fontWeight: "normal" }}>{fmt(record?.check_date)}</span>
      </div>

      {/* Readings grid */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px", tableLayout: "fixed" }}>
        {/* Widths live here, not on the <th>: with a fixed layout the browser
            reads column widths from the first row only, where the Pre-heater and
            Puffer/Oven headings are colspan cells. */}
        <colgroup>
          {COL_WIDTHS.map((w, i) => (
            <col key={i} style={{ width: w }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th rowSpan={2} style={{ ...th, textAlign: "left", paddingLeft: "6px" }}>Name of Product</th>
            <th rowSpan={2} style={th}>Batch No</th>
            <th rowSpan={2} style={th}>Customer</th>
            <th rowSpan={2} style={th}>RM Moisture (%)</th>
            <th rowSpan={2} style={th}>Salinity (%)</th>
            <th colSpan={2} style={th}>Pre-heater</th>
            <th colSpan={2} style={th}>Puffer/Oven</th>
            <th rowSpan={2} style={th}>Checked By</th>
            <th rowSpan={2} style={th}>Verified By</th>
          </tr>
          <tr>
            <th style={th}>Moisture (%)</th>
            <th style={th}>Salt (%)</th>
            <th style={th}>Moisture (%)</th>
            <th style={th}>Salt (%)</th>
          </tr>
        </thead>
        <tbody>
          {padded.map((r, i) => (
            <tr key={i} style={{ height: ROW_HEIGHT }}>
              <td style={{ ...td, textAlign: "left", paddingLeft: "6px" }}>{val(r?.product_name)}</td>
              <td style={td}>{val(r?.batch_no)}</td>
              <td style={{ ...td, textAlign: "left" }}>{val(r?.customer)}</td>
              <td style={td}>{val(r?.rm_moisture)}</td>
              <td style={td}>{val(r?.salinity)}</td>
              <td style={td}>{val(r?.preheater_moisture)}</td>
              <td style={td}>{val(r?.preheater_salt)}</td>
              <td style={td}>{val(r?.puffer_moisture)}</td>
              <td style={td}>{val(r?.puffer_salt)}</td>
              <td style={{ ...td, padding: "1px 2px" }}>
                <SignatureCell name={val(r?.checked_by)} warehouse={wh} maxHeight={22} maxWidth={62} showName={false} />
              </td>
              <td style={{ ...td, padding: "1px 2px" }}>
                <SignatureCell name={val(r?.verified_by)} warehouse={wh} maxHeight={22} maxWidth={62} showName={false} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PrintBody() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [records, setRecords] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const idsParam = searchParams.get("ids");
        const idParam = searchParams.get("id");
        let ids: number[] = [];
        if (idsParam) ids = idsParam.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n));
        else if (idParam) { const n = parseInt(idParam); if (!isNaN(n)) ids = [n]; }
        if (ids.length > 0) {
          const results = await Promise.all(ids.map((id) => docsApi.get(config.formType, id)));
          setRecords(results.map((r) => r.data).filter(Boolean));
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
          onClick={() => router.push(`/documentations/${config.routeSlug}`)}
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

      {records.length === 0 ? (
        <div className="text-center py-20 text-gray-500">Record not found.</div>
      ) : (
        records.map((record, idx) => (
          <div key={record.id ?? idx} style={idx < records.length - 1 ? { pageBreakAfter: "always" } : undefined}>
            <RecordSheet record={record} />
          </div>
        ))
      )}

      <style>{`
        @media print {
          html, body { background: white !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          @page { size: A4 portrait; margin: 6mm; }
          .print\\:w-full { width: 100% !important; max-width: 100% !important; margin: 0 !important; }
          tr { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}

export default function InprocessQCAfterProcessingPrintPage() {
  return (
    <DocWarehouseGate warehouses={config.warehouses} label={config.label} bare>
      <PrintBody />
    </DocWarehouseGate>
  );
}

const tdHead: React.CSSProperties = { border: "1px solid #000", padding: "4px 6px", verticalAlign: "middle", fontSize: "11px" };
// The controlled format leaves the heading cells unshaded — keep them white.
const th: React.CSSProperties = { border: "1px solid #000", padding: "4px 3px", textAlign: "center", fontWeight: "bold", fontSize: "10px", verticalAlign: "middle", background: "#fff" };
// overflowWrap: the fixed column widths would otherwise let a long product name
// spill out of its cell instead of wrapping inside it.
const td: React.CSSProperties = { border: "1px solid #000", padding: "3px 4px", textAlign: "center", verticalAlign: "middle", fontSize: "10px", overflowWrap: "break-word" };
