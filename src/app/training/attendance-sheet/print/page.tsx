"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { docsApi } from "@/lib/api/documentations";

/**
 * Printed CFPLA.C7.F.03 — "Training Attendence Sheet & Record for Evaluation /
 * Effectiveness of Training". Laid out to match the controlled paper format:
 * header block, training-details grid, the 12-column attendee table (padded to
 * 10 printed lines), then the acknowledgement / criteria footer.
 */

const FORM_TYPE = "training-attendance";
const MIN_ROWS = 10; // the paper format prints ten attendee lines

const TRAINING_TYPES = ["Induction", "Refresher", "Food Safety", "Job Specific", "Retraining", "GMP", "GHP", "Other"];
const LANGUAGES = ["English", "Hindi", "Marathi"];
const CORRECTIVE_ACTIONS = ["Refresher", "Re-training", "Closer Supervision"];

const DOC = {
  no: "CFPLA.C7.F.03",
  issueDate: "01/11/2017",
  issueNo: "03",
  revisionDate: "27/09/2025",
  revisionNo: "02",
};

function fmtDate(d?: any) {
  if (!d) return "";
  const parts = String(d).split("-");
  if (parts.length !== 3) return String(d);
  const [y, m, day] = parts;
  return `${day}/${m}/${y}`;
}

const show = (v: any) => (v === null || v === undefined || v === "" ? "" : String(v));

const list = (v: any): string[] => (Array.isArray(v) ? v.filter(Boolean).map(String) : v ? [String(v)] : []);

/** "( )" / "(✓)" — the paper format's tick boxes. */
const Box = ({ on, label }: { on: boolean; label: string }) => (
  <span style={{ whiteSpace: "nowrap", marginRight: "8px" }}>
    <b>{on ? "(✓)" : "( )"}</b> {label}
  </span>
);

export default function TrainingAttendanceSheetPrintPage() {
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

  const attendees: any[] = Array.isArray(record?.attendees) ? record!.attendees : [];
  const blankRows = Math.max(0, MIN_ROWS - attendees.length);

  // "Other" is stored as "Other: <detail>" so the specifics survive without a
  // dedicated column — tick the box on the prefix, print the detail beside it.
  const types = list(record?.training_type);
  const hasType = (t: string) => types.some((v) => (t === "Other" ? v.startsWith("Other") : v === t));
  const otherDetail = (types.find((v) => v.startsWith("Other:")) || "").slice("Other:".length).trim();

  const languages = list(record?.training_language);
  const actions = list(record?.corrective_actions);
  const effDays = show(record?.effectiveness_after_days);

  return (
    <div className="min-h-screen bg-gray-300 print:bg-white">
      <div className="print:hidden sticky top-0 z-20 bg-white shadow-md px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/training/attendance-sheet")}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            <ArrowLeft size={15} /> Back
          </button>
          <span className="text-sm text-gray-500">
            {record
              ? `${fmtDate(record.training_date) || "—"} · ${attendees.length} attendee${attendees.length !== 1 ? "s" : ""}`
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
            padding: "8mm",
          }}
        >
          {/* ── Document header ── */}
          <table style={tbl}>
            <tbody>
              <tr>
                <td rowSpan={4} style={{ ...cell, width: "130px", textAlign: "center" }}>
                  <img src="/candor-logo.jpg" alt="Candor Foods" style={{ width: "95px" }} />
                </td>
                <td colSpan={2} rowSpan={2} style={{ ...cell, textAlign: "center", fontWeight: "bold", fontSize: "14px" }}>
                  CANDOR FOODS PRIVATE LIMITED
                </td>
                <td style={{ ...cell, width: "110px" }}>Issue Date:</td>
                <td style={{ ...cell, width: "110px" }}>{DOC.issueDate}</td>
              </tr>
              <tr>
                <td style={cell}>Issue No:</td>
                <td style={cell}>{DOC.issueNo}</td>
              </tr>
              <tr>
                <td colSpan={2} style={{ ...cell, textAlign: "center", fontWeight: "bold" }}>
                  TRAINING ATTENDENCE SHEET &amp; RECORD FOR EVALUATION /EFFECTIVENESS OF TRAINING
                </td>
                <td style={cell}>Revision Date:</td>
                <td style={cell}>{DOC.revisionDate}</td>
              </tr>
              <tr>
                <td colSpan={2} style={{ ...cell, textAlign: "center", fontWeight: "bold" }}>
                  Document No: {DOC.no}
                </td>
                <td style={cell}>Revision No.:</td>
                <td style={cell}>{DOC.revisionNo}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ height: "10px" }} />

          {/* ── Training details ── */}
          <table style={tbl}>
            <tbody>
              <tr>
                <td style={{ ...cell, width: "130px" }}>Training Date</td>
                <td style={{ ...cell, width: "150px" }}>{fmtDate(record.training_date)}</td>
                <td style={{ ...cell, width: "105px" }}>Training Type</td>
                <td style={cell}>
                  {TRAINING_TYPES.map((t) => (
                    <Box key={t} on={hasType(t)} label={t} />
                  ))}
                  {otherDetail && <span style={{ fontWeight: "bold" }}>— {otherDetail}</span>}
                </td>
                <td style={{ ...cell, width: "50px" }}>Time:</td>
                <td style={{ ...cell, width: "110px" }}>Start {show(record.time_start)}</td>
                <td style={{ ...cell, width: "110px" }}>End {show(record.time_end)}</td>
              </tr>
              <tr>
                <td style={cell}>Training Conducted by:</td>
                <td style={cell}>{show(record.conducted_by)}</td>
                <td style={cell}>Trainer Qualification/Competencies</td>
                <td style={cell}>{show(record.trainer_qualification)}</td>
                <td style={cell}>Venue:</td>
                <td colSpan={2} style={cell}>{show(record.venue)}</td>
              </tr>
              <tr>
                <td style={cell}>Key Points/Topic Covered:</td>
                <td colSpan={6} style={{ ...cell, minWidth: "0", whiteSpace: "pre-wrap", height: "46px", verticalAlign: "top" }}>
                  {show(record.key_points_covered)}
                </td>
              </tr>
              <tr>
                <td style={cell}>Department</td>
                <td style={cell}>{show(record.department)}</td>
                <td style={cell}>Training Language</td>
                <td style={cell}>
                  {LANGUAGES.map((l) => (
                    <Box key={l} on={languages.includes(l)} label={l} />
                  ))}
                </td>
                <td colSpan={2} style={cell}>Effectiveness will be conducted after</td>
                <td style={cell}>
                  <Box on={effDays === "15"} label="15 days" />
                  <Box on={effDays === "30"} label="30 days" />
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ height: "10px" }} />

          {/* ── Attendees, evaluation & effectiveness ── */}
          <table style={tbl}>
            <thead>
              <tr>
                <th style={{ ...th, width: "34px" }}>Sr. No.</th>
                <th style={{ ...th, width: "160px" }}>Name</th>
                <th style={{ ...th, width: "105px" }}>Designation</th>
                <th style={{ ...th, width: "95px" }}>Signature</th>
                <th style={{ ...th, width: "80px" }}>Evaluation Method</th>
                <th style={{ ...th, width: "82px" }}>Evaluation Scoring Dated:</th>
                <th style={{ ...th, width: "66px" }}>Results Pass/Fail</th>
                <th style={{ ...th, width: "80px" }}>Effectiveness method</th>
                <th style={{ ...th, width: "82px" }}>Effectiveness Scoring Dated:</th>
                <th style={{ ...th, width: "78px" }}>Results Effective/Non-Effective</th>
                <th style={{ ...th, width: "84px" }}>Average Scoring (%) (Evaluation &amp; Effectiveness)</th>
                <th style={{ ...th, width: "84px" }}>Training Status Effective/Refresher/Retraining</th>
              </tr>
            </thead>
            <tbody>
              {attendees.map((a, i) => (
                <tr key={i}>
                  <td style={td}>{i + 1}.</td>
                  <td style={tdLeft}>{show(a.name)}</td>
                  <td style={tdLeft}>{show(a.designation)}</td>
                  <td style={tdLeft}>{show(a.signature)}</td>
                  <td style={td}>{list(a.evaluation_method).join(", ")}</td>
                  <td style={td}>
                    {show(a.evaluation_scoring) && <div>{show(a.evaluation_scoring)}%</div>}
                    {a.evaluation_date && <div style={dateNote}>{fmtDate(a.evaluation_date)}</div>}
                  </td>
                  <td style={td}>{show(a.evaluation_result)}</td>
                  <td style={td}>{list(a.effectiveness_method).join(", ")}</td>
                  <td style={td}>
                    {show(a.effectiveness_scoring) && <div>{show(a.effectiveness_scoring)}%</div>}
                    {a.effectiveness_date && <div style={dateNote}>{fmtDate(a.effectiveness_date)}</div>}
                  </td>
                  <td style={td}>{show(a.effectiveness_result)}</td>
                  <td style={td}>{show(a.average_scoring) && `${show(a.average_scoring)}%`}</td>
                  <td style={td}>{show(a.training_status)}</td>
                </tr>
              ))}
              {Array.from({ length: blankRows }).map((_, i) => (
                <tr key={`b-${i}`}>
                  <td style={td}>{attendees.length + i + 1}.</td>
                  {Array.from({ length: 11 }).map((__, j) => (
                    <td key={j} style={td}>&nbsp;</td>
                  ))}
                </tr>
              ))}

              {/* Acknowledgement + criteria footer, part of the same ruled block */}
              <tr>
                <td colSpan={12} style={{ ...td, fontWeight: "bold", fontSize: "10px" }}>
                  Acknowledgement by TRAINEE that he/she has received understood and will comply the instructions given in training
                </td>
              </tr>
              <tr>
                <td colSpan={2} style={{ ...tdLeft, fontWeight: "bold" }}>Evaluation &amp; Effectiveness Criteria</td>
                <td colSpan={5} style={{ ...tdLeft, fontSize: "9px" }}>
                  ≥80% : Effective, 60–79% : Partially Effective (Refresher required), &lt;60% : Not Effective (Retraining mandatory)
                </td>
                <td colSpan={2} style={{ ...tdLeft, fontWeight: "bold" }}>Corrective Actions Taken</td>
                <td colSpan={3} style={tdLeft}>
                  {CORRECTIVE_ACTIONS.map((c) => (
                    <Box key={c} on={actions.includes(c)} label={c} />
                  ))}
                </td>
              </tr>
              <tr>
                <td colSpan={2} style={{ ...tdLeft, fontWeight: "bold" }}>Trainer</td>
                <td colSpan={2} style={tdLeft}>{show(record.trainer_signature)}</td>
                <td colSpan={2} style={{ ...tdLeft, fontWeight: "bold" }}>FSTL</td>
                <td colSpan={2} style={tdLeft}>{show(record.fstl_signature)}</td>
                <td colSpan={2} style={{ ...tdLeft, fontWeight: "bold" }}>Effectiveness Evaluated by</td>
                <td style={tdLeft}>{show(record.effectiveness_evaluated_by)}</td>
                <td style={tdLeft}>Dated: {fmtDate(record.dated)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        @media print {
          html, body { background: white !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          @page { size: A4 landscape; margin: 6mm; }
          .print\\:w-full { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
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
  fontSize: "10px",
};

const cell: React.CSSProperties = {
  border: "1px solid #000",
  padding: "4px 5px",
  verticalAlign: "middle",
  fontSize: "10px",
};

const th: React.CSSProperties = {
  border: "1px solid #000",
  padding: "4px 3px",
  textAlign: "center",
  fontWeight: "bold",
  fontSize: "9px",
  verticalAlign: "middle",
  background: "#d9d9d9",
  lineHeight: 1.15,
};

const td: React.CSSProperties = {
  border: "1px solid #000",
  padding: "4px 3px",
  textAlign: "center",
  verticalAlign: "middle",
  fontSize: "9.5px",
  height: "26px",
  wordBreak: "break-word",
};

const tdLeft: React.CSSProperties = { ...td, textAlign: "left", paddingLeft: "5px" };

const dateNote: React.CSSProperties = { fontSize: "8px", color: "#333" };
