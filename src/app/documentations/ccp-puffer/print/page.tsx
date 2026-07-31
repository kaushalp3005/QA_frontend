"use client";

// Printed sheet for CFPLB.C2.F.62 — Monitoring and verification of CCP - Puffer.
// Reproduces the controlled format: header block, shift/frequency box, the batch
// detail table, the parameter grid (one column per hourly check), the
// Observation / Corrective Action blocks, and the Prepared/Approved footer.

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { docsApi } from "@/lib/api/documentations";
import SignatureCell from "@/components/ui/SignatureCell";
import DocWarehouseGate from "@/components/documentations/DocWarehouseGate";
import { DOC_FORMS } from "@/config/doc-forms";
import { FREQUENCY_FOOTNOTE, FREQUENCY_NOTE } from "@/lib/pufferProducts";

const config = DOC_FORMS["ccp-puffer"];

// Header metadata as printed on the controlled copy of CFPLB.C2.F.62.
const HEADER = {
  documentNo: "CFPLB.C2.F.62",
  issueDate: "02/01/2025",
  issueNo: "01",
  revDate: "-",
  revNo: "-",
};

// The blank format carries ten reading columns and three ruled lines under each
// of Observation and Corrective Action; short records pad out to keep the shape.
const MIN_COLUMNS = 10;
const NOTE_LINES = 3;

function fmt(date: string) {
  if (!date) return "";
  const parts = String(date).slice(0, 10).split("-");
  if (parts.length !== 3) return date;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

/** "14:30" → "2:30 PM". Anything else passes through unchanged. */
function fmtTime(time: string) {
  if (!time || !time.includes(":")) return time || "";
  const [h, m] = time.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return time;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

const val = (v: any) => (v == null || v === "" ? "" : String(v));

/** Split a note into the format's ruled lines, folding any overflow onto the last. */
function noteLines(text: string): string[] {
  const lines = val(text).split(/\r?\n/);
  const out = lines.slice(0, NOTE_LINES);
  if (lines.length > NOTE_LINES) {
    out[NOTE_LINES - 1] = [out[NOTE_LINES - 1], ...lines.slice(NOTE_LINES)].filter(Boolean).join(" ");
  }
  while (out.length < NOTE_LINES) out.push("");
  return out;
}

interface Reading {
  monitoring_time?: string;
  temperature?: string;
  product_contact_time?: string;
  drum_speed?: string;
  operator_sign?: string;
  checked_by?: string;
  verified_by?: string;
}

function RecordSheet({ record }: { record: Record<string, any> }) {
  const stored: Reading[] = Array.isArray(record?.readings) ? record.readings : [];
  // Never drop readings: a batch with more than ten checks widens the grid.
  const columns: (Reading | null)[] = [
    ...stored,
    ...Array.from({ length: Math.max(0, MIN_COLUMNS - stored.length) }, () => null),
  ];
  const wh = record?.warehouse as "A185" | "W202" | undefined;
  const colWidth = `${(76 / columns.length).toFixed(3)}%`;

  const detailRows: { left: string; leftVal: string; right: string; rightVal: string }[] = [
    { left: "Date:", leftVal: fmt(record?.check_date), right: "Start Time of Batch:", rightVal: fmtTime(val(record?.start_time_of_batch)) },
    { left: "Product Name:", leftVal: val(record?.product_name), right: "Set Temperature for Product:", rightVal: val(record?.set_temperature) },
    { left: "Customer Name:", leftVal: val(record?.customer_name), right: "Set Product Contact Time:", rightVal: val(record?.set_product_contact_time) },
    { left: "WIP lot No.:", leftVal: val(record?.wip_lot_no), right: "Set Drum Speed:", rightVal: val(record?.set_drum_speed) },
    { left: "Batch No.", leftVal: val(record?.batch_no), right: "End Time of Batch:", rightVal: fmtTime(val(record?.end_time_of_batch)) },
  ];

  const paramRows: { label: string; key: keyof Reading }[] = [
    { label: "Monitoring Time (In min)", key: "monitoring_time" },
    { label: "Temperature in Puffer (In °C)", key: "temperature" },
    { label: "Product Contact time", key: "product_contact_time" },
    { label: "Drum Speed", key: "drum_speed" },
  ];

  const signRows: { label: string; key: keyof Reading }[] = [
    { label: "Operator sign", key: "operator_sign" },
    { label: "Checked By (QC Executive)", key: "checked_by" },
    { label: "Verified By", key: "verified_by" },
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
            <td rowSpan={2} style={{ ...tdHead, textAlign: "center" }}>
              <span style={{ fontWeight: "bold" }}>Format:</span> Monitoring and verification of CCP- Puffer
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
            <td style={tdHead}>Revision No.:</td>
            <td style={tdHead}>{HEADER.revNo}</td>
          </tr>
        </tbody>
      </table>

      {/* Shift + frequency box */}
      <div style={{ border: "1.5px solid #000", padding: "4px 6px", marginTop: "14mm", fontSize: "10px", lineHeight: 1.35 }}>
        <div style={{ fontWeight: "bold" }}>Shift: {val(record?.shift)}</div>
        <div style={{ fontWeight: "bold" }}>Frequency: {FREQUENCY_NOTE}</div>
        <div style={{ fontWeight: "bold", fontSize: "8.5px" }}>{FREQUENCY_FOOTNOTE}</div>
      </div>

      {/* Batch details */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", tableLayout: "fixed", marginTop: "-1px" }}>
        <colgroup>
          <col style={{ width: "26%" }} />
          <col style={{ width: "25%" }} />
          <col style={{ width: "26%" }} />
          <col style={{ width: "23%" }} />
        </colgroup>
        <tbody>
          {detailRows.map((r) => (
            <tr key={r.left}>
              <td style={{ ...tdInfo, fontWeight: "bold", textAlign: "center" }}>{r.left}</td>
              <td style={tdInfo}>{r.leftVal}</td>
              <td style={{ ...tdInfo, fontWeight: "bold" }}>{r.right}</td>
              <td style={tdInfo}>{r.rightVal}</td>
            </tr>
          ))}
          <tr>
            <td style={{ ...tdInfo, fontWeight: "bold" }}>Production Quantity:</td>
            <td colSpan={3} style={tdInfo}>{val(record?.production_quantity)}</td>
          </tr>
        </tbody>
      </table>

      {/* Parameter grid */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px", tableLayout: "fixed", marginTop: "8mm" }}>
        <colgroup>
          <col style={{ width: "24%" }} />
          {columns.map((_, i) => (
            <col key={i} style={{ width: colWidth }} />
          ))}
        </colgroup>
        <tbody>
          {paramRows.map((row) => (
            <tr key={row.key}>
              <td style={{ ...tdParamLabel }}>{row.label}</td>
              {columns.map((c, i) => (
                <td key={i} style={td}>{val(c?.[row.key])}</td>
              ))}
            </tr>
          ))}
          {signRows.map((row) => (
            <tr key={row.key}>
              <td style={{ ...tdParamLabel }}>{row.label}</td>
              {columns.map((c, i) => (
                <td key={i} style={{ ...td, padding: "1px 2px" }}>
                  <SignatureCell name={val(c?.[row.key])} warehouse={wh} maxHeight={20} maxWidth={48} showName={false} />
                </td>
              ))}
            </tr>
          ))}

          {/* Observation / Corrective Action — label on the first ruled line,
              then two more lines, exactly as on the format. */}
          {noteLines(record?.observation).map((line, i) => (
            <tr key={`obs-${i}`}>
              <td style={{ ...tdParamLabel, height: "6mm" }}>{i === 0 ? "Observation:" : ""}</td>
              <td colSpan={columns.length} style={{ ...td, textAlign: "left", paddingLeft: "6px" }}>{line}</td>
            </tr>
          ))}
          {noteLines(record?.corrective_action).map((line, i) => (
            <tr key={`ca-${i}`}>
              <td style={{ ...tdParamLabel, height: "6mm" }}>{i === 0 ? "Corrective Action:" : ""}</td>
              <td colSpan={columns.length} style={{ ...td, textAlign: "left", paddingLeft: "6px" }}>{line}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div style={{ marginTop: "12mm", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px" }}>
        <span>Prepared By: FST</span>
        <div style={{ border: "2px solid #6b46c1", color: "#6b46c1", padding: "3px 12px", fontSize: "10px", textAlign: "center", lineHeight: 1.2, fontWeight: "bold" }}>
          CONTROLLED<br />COPY
        </div>
        <span>Approved By: FSTL</span>
      </div>
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

export default function CCPPufferPrintPage() {
  return (
    <DocWarehouseGate warehouses={config.warehouses} label={config.label} bare>
      <PrintBody />
    </DocWarehouseGate>
  );
}

const tdHead: React.CSSProperties = { border: "1px solid #000", padding: "4px 6px", verticalAlign: "middle", fontSize: "11px" };
const tdInfo: React.CSSProperties = { border: "1px solid #000", padding: "3px 6px", verticalAlign: "middle", fontSize: "11px", overflowWrap: "break-word" };
// overflowWrap: the fixed column widths would otherwise let long text spill out
// of its cell instead of wrapping inside it.
const td: React.CSSProperties = { border: "1px solid #000", padding: "3px 3px", textAlign: "center", verticalAlign: "middle", fontSize: "10px", overflowWrap: "break-word" };
const tdParamLabel: React.CSSProperties = { ...td, fontWeight: "bold", textAlign: "center", padding: "3px 4px" };
