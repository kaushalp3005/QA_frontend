"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { docsApi } from "@/lib/api/documentations";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";

/**
 * Printed "Training Card" — CFPLA.C7.F.03k at W202, CFPLB.C7.F.07 c at A185.
 * Matches the controlled paper format: header block, three ruled identity
 * lines, the six-column training log padded to 12 printed rows, then the
 * HR / controlled-copy / FSTL footer.
 */

const FORM_TYPE = "training-card";
const MIN_ROWS = 12; // the paper format prints twelve training lines

/**
 * The controlled header is plant-specific: A185 files the card under its own
 * CFPLB series, W202 keeps CFPLA.C7.F.03k. A185's sheet is still on its first
 * issue, so it carries no revision date or number yet — those cells print blank
 * exactly as on the paper format.
 */
const DOC_BY_WAREHOUSE = {
  W202: {
    no: "CFPLA.C7.F.03k",
    title: "Training Card",
    issueDate: "01/11/2017",
    issueNo: "03",
    revisionDate: "01/11/2025",
    revisionNo: "02",
  },
  A185: {
    no: "CFPLB.C7.F.07 c",
    title: "Training Card",
    issueDate: "02/02/2026",
    issueNo: "01",
    revisionDate: "",
    revisionNo: "",
  },
} as const;

function fmtDate(d?: any) {
  if (!d) return "";
  const parts = String(d).split("-");
  if (parts.length !== 3) return String(d);
  const [y, m, day] = parts;
  return `${day}/${m}/${y}`;
}

const show = (v: any) => (v === null || v === undefined || v === "" ? "" : String(v));

/** A labelled rule — the paper format writes these on a line, not in a box. */
const RuledField = ({ label, value, labelWidth = "125px" }: { label: string; value: string; labelWidth?: string }) => (
  <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", marginBottom: "10px" }}>
    <span style={{ width: labelWidth, flexShrink: 0, fontSize: "11px" }}>{label}</span>
    <span
      style={{
        flex: 1,
        borderBottom: "1px solid #000",
        minHeight: "17px",
        fontSize: "11px",
        fontWeight: "bold",
        paddingLeft: "4px",
        whiteSpace: "pre-wrap",
      }}
    >
      {value}
    </span>
  </div>
);

export default function TrainingCardPrintPage() {
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

  // The record's own plant decides the header, not whichever one the selector
  // happens to show — printing a W202 card from A185 must not restamp it with
  // the CFPLB number. Cards saved before the warehouse column was filled have
  // nothing to go on, so those fall back to the selected plant.
  const warehouse = (record?.warehouse || getStoredWarehouse()) === "A185" ? "A185" : "W202";
  const DOC = DOC_BY_WAREHOUSE[warehouse];

  // Rows seeded before the current form existed use different key names for
  // three fields — read both spellings so an old card doesn't print blank.
  const rows: any[] = Array.isArray(record?.rows) ? record!.rows : [];
  const blankRows = Math.max(0, MIN_ROWS - rows.length);

  return (
    <div className="min-h-screen bg-gray-300 print:bg-white">
      <div className="print:hidden sticky top-0 z-20 bg-white shadow-md px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/training/training-card")}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            <ArrowLeft size={15} /> Back
          </button>
          <span className="text-sm text-gray-500">
            {record
              ? `${show(record.employee_name) || "—"} · ${rows.length} session${rows.length !== 1 ? "s" : ""}`
              : "No record"}
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
            padding: "10mm 14mm",
          }}
        >
          {/* ── Document header ── */}
          <table style={tbl}>
            {/* Percentages, not pixels: a fixed layout whose columns add up to
                more than the sheet pushes the last ones past the border. */}
            <colgroup>
              <col style={{ width: "13%" }} />
              <col style={{ width: "25.5%" }} />
              <col style={{ width: "25.5%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "18%" }} />
            </colgroup>
            <tbody>
              <tr>
                <td rowSpan={4} style={{ ...cell, textAlign: "center" }}>
                  <img src="/candor-logo.jpg" alt="Candor Foods" style={{ width: "100px", maxWidth: "100%" }} />
                </td>
                <td colSpan={2} rowSpan={2} style={{ ...cell, textAlign: "center", fontWeight: "bold", fontSize: "17px" }}>
                  CANDOR FOODS PRIVATE LIMITED
                </td>
                <td style={cell}>Issue Date:</td>
                <td style={{ ...cell, textAlign: "center" }}>{DOC.issueDate}</td>
              </tr>
              <tr>
                <td style={cell}>Issue No:</td>
                <td style={{ ...cell, textAlign: "center" }}>{DOC.issueNo}</td>
              </tr>
              <tr>
                <td colSpan={2} style={{ ...cell, textAlign: "center", fontWeight: "bold" }}>{DOC.title}</td>
                <td style={cell}>Revision Date:</td>
                <td style={{ ...cell, textAlign: "center" }}>{DOC.revisionDate}</td>
              </tr>
              <tr>
                <td colSpan={2} style={{ ...cell, textAlign: "center", fontWeight: "bold" }}>
                  Document No: {DOC.no}
                </td>
                <td style={cell}>Revision No.:</td>
                <td style={{ ...cell, textAlign: "center" }}>{DOC.revisionNo}</td>
              </tr>
            </tbody>
          </table>

          {/* ── Employee identity ── */}
          <div style={{ padding: "18px 14px 6px" }}>
            <RuledField label="Employee Name:" value={show(record.employee_name)} />
            <RuledField label="Designation:" value={show(record.designation)} />
            <div style={{ height: "10px" }} />
            <RuledField
              label="Training Needs : Identified"
              value={show(record.training_needs_identified)}
            />
          </div>

          {/* ── Training log ── */}
          <table style={{ ...tbl, marginTop: "8px" }}>
            <colgroup>
              <col style={{ width: "6%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "32%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "21%" }} />
            </colgroup>
            <thead>
              <tr>
                <th style={th}>Sr.no</th>
                <th style={th}>DATE</th>
                <th style={th}>Total Training Hours</th>
                <th style={th}>
                  Brief of Training topics covered with references of the applicable GMP, SOP, SSOP, etc.
                </th>
                <th style={th}>Trainer</th>
                <th style={th}>
                  Acknowledgment by TRAINEE that he/she has received understood &amp; will comply the instructions given in training.
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={td}>{i + 1}.</td>
                  <td style={td}>{fmtDate(r.date)}</td>
                  <td style={td}>{show(r.total_hours ?? r.total_training_hours)}</td>
                  <td style={tdLeft}>{show(r.topics_covered || r.topics)}</td>
                  <td style={tdLeft}>{show(r.trainer)}</td>
                  <td style={tdLeft}>{show(r.acknowledgement || r.acknowledgment)}</td>
                </tr>
              ))}
              {Array.from({ length: blankRows }).map((_, i) => (
                <tr key={`b-${i}`}>
                  <td style={td}>{rows.length + i + 1}.</td>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} style={td}>&nbsp;</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Footer ── */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              marginTop: "26px",
              padding: "0 14px",
              fontSize: "11px",
            }}
          >
            <span>Prepared by: HR</span>
            {/* Drawn in CSS — there is no stamp asset in /public to point at. */}
            <span
              style={{
                border: "1.5px solid #7b3fa0",
                color: "#7b3fa0",
                fontSize: "8px",
                fontWeight: "bold",
                lineHeight: 1.15,
                letterSpacing: ".3px",
                padding: "5px 7px",
                textAlign: "center",
                width: "62px",
              }}
            >
              CONTROLLED<br />COPY
            </span>
            <span>Approved by: FSTL</span>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          html, body { background: white !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          @page { size: A4 landscape; margin: 6mm; }
          .print\\:w-full { width: 100% !important; max-width: 100% !important; margin: 0 !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
        }
      `}</style>
    </div>
  );
}

const tbl: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "fixed",
  fontSize: "11px",
};

const cell: React.CSSProperties = {
  border: "1px solid #000",
  padding: "5px 7px",
  verticalAlign: "middle",
  fontSize: "11px",
  // Long single tokens would otherwise run out of the cell and print over the
  // neighbouring column.
  overflowWrap: "break-word",
  wordBreak: "break-word",
};

const th: React.CSSProperties = {
  border: "1px solid #000",
  padding: "6px 4px",
  textAlign: "center",
  fontWeight: "bold",
  fontSize: "10px",
  verticalAlign: "middle",
  background: "#d9d9d9",
  lineHeight: 1.2,
  overflowWrap: "break-word",
  wordBreak: "break-word",
};

const td: React.CSSProperties = {
  border: "1px solid #000",
  padding: "4px 4px",
  textAlign: "center",
  verticalAlign: "middle",
  fontSize: "10px",
  height: "26px",
  wordBreak: "break-word",
};

const tdLeft: React.CSSProperties = { ...td, textAlign: "left", paddingLeft: "6px" };
