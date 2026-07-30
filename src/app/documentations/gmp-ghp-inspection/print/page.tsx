"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { docsApi } from "@/lib/api/documentations";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";
import { gmpGhpFormatFor, GMP_RATING_CHART } from "@/config/gmpGhpInspection";

const FORM_TYPE = "gmp-ghp-inspection";
const BLANK_CAPA_ROWS = 5;

interface ChecklistRow {
  sr?: number | string;
  description?: string;
  max_score?: number | string;
  obtained_score?: number | string;
  remarks?: string;
}

interface CapaRow {
  non_conformity?: string;
  corrective_action?: string;
  preventive_action?: string;
  done_by?: string;
  verified_by?: string;
}

function fmtDateTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function num(v: unknown): number {
  const n = parseFloat(String(v ?? ""));
  return isNaN(n) ? 0 : n;
}

/** Sr. No. as a number when the record uses the standard 1..n numbering. */
function srNum(row: ChecklistRow): number | null {
  const n = parseFloat(String(row.sr ?? ""));
  return isNaN(n) ? null : n;
}

function RecordSheet({ record }: { record: Record<string, any> }) {
  // Print the record's own plant, not the one the viewer happens to have
  // selected, so a sheet always renders with the format it was audited against.
  const warehouse: string =
    record?.warehouse === "A185" || record?.warehouse === "W202"
      ? record.warehouse
      : getStoredWarehouse();
  const fmt = gmpGhpFormatFor(warehouse);

  // Rows come from the record itself (each carries its own description and
  // max_score), so the sheet prints exactly what was audited even if the
  // checklist wording changes later.
  const rows: ChecklistRow[] = Array.isArray(record?.checklist) ? record.checklist : [];
  const capa: CapaRow[] = Array.isArray(record?.capa) ? record.capa : [];
  const capaFilled = capa.filter(
    (r) => r.non_conformity || r.corrective_action || r.preventive_action || r.done_by || r.verified_by
  );
  const blankCapa = Math.max(0, BLANK_CAPA_ROWS - capaFilled.length);

  const totalObtained =
    record?.total_obtained != null ? num(record.total_obtained) : rows.reduce((s, r) => s + num(r.obtained_score), 0);
  const totalMaxRecorded =
    record?.total_max != null ? num(record.total_max) : rows.reduce((s, r) => s + num(r.max_score), 0);
  const percentage =
    record?.percentage != null
      ? num(record.percentage)
      : totalMaxRecorded > 0
      ? (totalObtained / totalMaxRecorded) * 100
      : 0;

  const sectionStart = new Map(fmt.sections.map((s) => [s.startSr, s.title]));

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
            <td style={tdHead}>{fmt.issueDate}</td>
          </tr>
          <tr>
            <td rowSpan={2} style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>
              FORMAT: Monthly Facility (GMP) &amp; GHP Inspection
            </td>
            <td style={tdHead}>Issue No:</td>
            <td style={tdHead}>{fmt.issueNo}</td>
          </tr>
          <tr>
            <td style={tdHead}>Revision Date:</td>
            <td style={tdHead}>{fmt.revDate}</td>
          </tr>
          <tr>
            <td style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>Document No: {fmt.documentNo}</td>
            <td style={tdHead}>Revision No.:</td>
            <td style={tdHead}>{fmt.revNo}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ height: "8px" }} />

      {/* Checklist */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...th, width: "34px" }} rowSpan={2}>Sr.No</th>
            <th style={th} rowSpan={2}>GMP and GHP CHECKLIST</th>
            <th style={{ ...th, width: "76px" }} colSpan={2}>SCORING</th>
            <th style={{ ...th, width: "150px" }} rowSpan={2}>REMARKS</th>
          </tr>
          <tr>
            <th style={{ ...th, width: "38px" }}>Max</th>
            <th style={{ ...th, width: "38px" }}>Obt.</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td style={{ ...td, textAlign: "center" }} colSpan={5}>No checklist data on this record.</td>
            </tr>
          ) : (
            rows.map((row, i) => {
              const sr = srNum(row);
              const heading = sr != null ? sectionStart.get(sr) : undefined;
              return (
                <Fragment key={i}>
                  {heading && (
                    <tr>
                      <td style={{ ...td, fontWeight: "bold", textAlign: "left", background: "#f0f0f0" }} colSpan={5}>
                        {heading}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ ...td, textAlign: "center" }}>{row.sr ?? ""}</td>
                    <td style={{ ...td, textAlign: "left" }}>{row.description || ""}</td>
                    <td style={{ ...td, textAlign: "center" }}>{row.max_score ?? ""}</td>
                    <td style={{ ...td, textAlign: "center" }}>{row.obtained_score ?? ""}</td>
                    <td style={{ ...td, textAlign: "left" }}>{row.remarks || ""}</td>
                  </tr>
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>

      <div style={{ height: "8px" }} />

      {/* Auditor / auditee block */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td style={{ ...tdInfo, width: "40%", fontWeight: "bold" }}>Name and sign of Auditors</td>
            <td style={tdInfo}>{record?.auditor_name || ""}</td>
          </tr>
          <tr>
            <td style={{ ...tdInfo, fontWeight: "bold" }}>Name and sign of Auditee</td>
            <td style={tdInfo}>{record?.auditee_name || ""}</td>
          </tr>
          <tr>
            <td style={{ ...tdInfo, fontWeight: "bold" }}>Date / Time of Audit</td>
            <td style={tdInfo}>{fmtDateTime(record?.audit_datetime)}</td>
          </tr>
          <tr>
            <td style={{ ...tdInfo, fontWeight: "bold" }}>Total Score and Overall Evaluation</td>
            <td style={tdInfo}>
              {totalObtained} / {totalMaxRecorded} ({percentage.toFixed(2)}%)
            </td>
          </tr>
          <tr>
            <td style={{ ...tdInfo, fontWeight: "bold" }}>Audit rating</td>
            <td style={tdInfo}>{record?.rating || ""}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ height: "10px" }} />

      {/* Scoring card */}
      <div style={{ fontWeight: "bold", fontSize: "11px", marginBottom: "3px" }}>Scoring card:</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...th, textAlign: "left" }}>Section Description</th>
            <th style={{ ...th, width: "110px" }}>Maximum Score</th>
            <th style={{ ...th, width: "110px" }}>Score Obtained</th>
            <th style={{ ...th, width: "90px" }}>Result ( In% )</th>
          </tr>
        </thead>
        <tbody>
          {fmt.scoringCard.map((g) => {
            const inGroup = rows.filter((r) => {
              const sr = srNum(r);
              return sr != null && sr >= g.fromSr && sr <= g.toSr;
            });
            // Sum the section's actual item maximums rather than trusting the
            // printed figure — the CFPLA.C3.F.15 scoring card has two offsetting
            // typos (see gmpGhpInspection.ts), which would make the per-section
            // percentage wrong. Falls back to the printed value if the record
            // has no rows in this range.
            const max = inGroup.length ? inGroup.reduce((s, r) => s + num(r.max_score), 0) : g.max;
            const obt = inGroup.reduce((s, r) => s + num(r.obtained_score), 0);
            const pct = max > 0 ? ((obt / max) * 100).toFixed(1) : "";
            return (
              <tr key={g.label}>
                <td style={{ ...td, textAlign: "left" }}>{g.label}</td>
                <td style={{ ...td, textAlign: "center" }}>{max}</td>
                <td style={{ ...td, textAlign: "center" }}>{inGroup.length ? obt : ""}</td>
                <td style={{ ...td, textAlign: "center" }}>{inGroup.length ? `${pct}%` : ""}</td>
              </tr>
            );
          })}
          <tr>
            <td style={{ ...td, textAlign: "left", fontWeight: "bold" }}>Total Score</td>
            <td style={{ ...td, textAlign: "center", fontWeight: "bold" }}>{fmt.totalMax}</td>
            <td style={{ ...td, textAlign: "center", fontWeight: "bold" }}>{totalObtained}</td>
            <td style={{ ...td, textAlign: "center", fontWeight: "bold" }}>{percentage.toFixed(1)}%</td>
          </tr>
        </tbody>
      </table>

      <div style={{ height: "10px" }} />

      {/* Audit rating chart */}
      <div style={{ fontWeight: "bold", fontSize: "11px", marginBottom: "3px" }}>Audit Rating Chart:</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...th, width: "110px" }}>% Score</th>
            <th style={th}>Status</th>
            <th style={{ ...th, width: "70px" }}>Rating</th>
            <th style={{ ...th, width: "120px" }}>Obtained Rating</th>
          </tr>
        </thead>
        <tbody>
          {GMP_RATING_CHART.map((r, i) => (
            <tr key={r.rating}>
              <td style={{ ...td, textAlign: "center" }}>{r.range}</td>
              <td style={{ ...td, textAlign: "left" }}>{r.status}</td>
              <td style={{ ...td, textAlign: "center" }}>{r.rating}</td>
              {i === 0 && (
                <td style={{ ...td, textAlign: "center", fontWeight: "bold" }} rowSpan={GMP_RATING_CHART.length}>
                  {record?.rating || ""}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ height: "10px" }} />

      {/* Corrective and preventive action */}
      <div style={{ fontWeight: "bold", fontSize: "11px", marginBottom: "3px" }}>Corrective and preventive Action:</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>NONCONFORMITIES</th>
            <th style={th}>CORRECTION/CORRECTIVE ACTION</th>
            <th style={th}>PREVENTIVE ACTION</th>
            <th style={{ ...th, width: "90px" }}>DONE BY</th>
            <th style={{ ...th, width: "90px" }}>VERIFIED BY</th>
          </tr>
        </thead>
        <tbody>
          {capaFilled.map((r, i) => (
            <tr key={i}>
              <td style={{ ...td, textAlign: "left" }}>{r.non_conformity || ""}</td>
              <td style={{ ...td, textAlign: "left" }}>{r.corrective_action || ""}</td>
              <td style={{ ...td, textAlign: "left" }}>{r.preventive_action || ""}</td>
              <td style={{ ...td, textAlign: "center" }}>{r.done_by || ""}</td>
              <td style={{ ...td, textAlign: "center" }}>{r.verified_by || ""}</td>
            </tr>
          ))}
          {Array.from({ length: blankCapa }).map((_, i) => (
            <tr key={`blank-${i}`}>
              <td style={{ ...td, height: "22px" }} />
              <td style={td} />
              <td style={td} />
              <td style={td} />
              <td style={td} />
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginTop: "10px" }}>
        <span>Prepared by: FST</span>
        <span>Approved By: FSTL</span>
      </div>
    </div>
  );
}

export default function GmpGhpInspectionPrintPage() {
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
        if (idsParam) {
          ids = idsParam.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n));
        } else if (idParam) {
          const n = parseInt(idParam);
          if (!isNaN(n)) ids = [n];
        }

        if (ids.length > 0) {
          const results = await Promise.all(ids.map((id) => docsApi.get(FORM_TYPE, id)));
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
          <p className="text-gray-600 text-sm">Loading record…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-300 print:bg-white">
      {/* Toolbar */}
      <div className="print:hidden sticky top-0 z-20 bg-white shadow-md px-5 py-3 flex items-center justify-between">
        <button
          onClick={() => router.push("/documentations/gmp-ghp-inspection")}
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
        <div className="print:hidden py-20 text-center text-sm text-gray-600">No record to print.</div>
      ) : (
        records.map((record, idx) => (
          <div
            key={record.id ?? idx}
            style={idx < records.length - 1 ? { pageBreakAfter: "always" } : undefined}
          >
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
          tr, td, th { page-break-inside: avoid; }
          thead { display: table-header-group; }
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
  verticalAlign: "top",
  fontSize: "10px",
};
