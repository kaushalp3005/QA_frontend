"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { docsApi } from "@/lib/api/documentations";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";
import SignatureCell from "@/components/ui/SignatureCell";

const FORM_TYPE = "personalhygienecheckup";
/** Blank rows padded to this count, so a part-filled sheet still fills the page
 *  the way the printed format does. */
const MIN_ROWS = 12;

/**
 * The controlled header, per plant — taken from each plant's own paper format.
 *
 * More than the number differs: the two plants title the format differently
 * ("Personal Hygiene Record" at A185, "Personal Hygiene & Health Checkup
 * Record" at W202) and even punctuate the Revision No. label differently, so
 * both are carried here rather than assumed common.
 */
const DOC_BY_WAREHOUSE = {
  A185: {
    no: "CFPLB.C7.F.17",
    formatTitle: "Format:Personal Hygiene Record",
    revisionNoLabel: "Revision No:",
    issueDate: "04/08/2021",
    issueNo: "02",
    revisionDate: "02/01/2025",
    revisionNo: "01",
  },
  W202: {
    no: "CFPLA.C7.F.39",
    formatTitle: "FORMAT: Personal Hygiene & Health Checkup Record",
    revisionNoLabel: "Revision No.:",
    issueDate: "01/11/2017",
    issueNo: "03",
    revisionDate: "01/10/2025",
    revisionNo: "02",
  },
} as const;

/**
 * The ten checks, in the order and grouping the paper prints them. `key` is the
 * snake_case field the record stores; `label` is the column heading verbatim
 * from the format, line breaks and all.
 */
const GROUPS: { title: string; cols: { key: string; label: string }[] }[] = [
  {
    title: "Injury/Infectious diseases (✓/✗)",
    cols: [
      { key: "respiratory", label: "Respiratory, Fever/Gastrointestinal" },
      { key: "skin_disease", label: "Skin Disease /Burned Skin" },
      { key: "wounds", label: "Wounds /cuts" },
      { key: "ear_nose_throat", label: "Ear, nose, and throat infection" },
    ],
  },
  {
    title: "Personal cleanliness (✓/✗)",
    cols: [
      { key: "gowning", label: "Gowning: Apron, Gloves, Footwear, Mask" },
      { key: "hand_hygiene", label: "Hand Hygiene" },
      { key: "nails", label: "Nails Trimmed/No Nail paint" },
      { key: "clean_shaven", label: "Clean Shaven/ Trim hairs (Male)" },
    ],
  },
  {
    title: "Personal belongings (✓/✗)",
    cols: [
      { key: "hair_pins", label: "Hair/Nose & Ear Pins, Rings, Bangles, Anklets, bindi, accessories, and Mehandi" },
      { key: "tobacco", label: "Cigarettes, Tobacco, Pan Masala & Chewing Gums." },
    ],
  },
];

const CHECK_COLS = GROUPS.flatMap((g) => g.cols);
/** Sr no + Name + the ten checks + Employee Sign + Corrective Action. */
const TOTAL_COLS = 2 + CHECK_COLS.length + 2;

function fmtDate(d?: string) {
  if (!d) return "";
  const parts = String(d).split("-");
  if (parts.length !== 3) return String(d);
  const [y, m, day] = parts;
  return `${day}/${m}/${y}`;
}

const show = (v: any) => (v === null || v === undefined ? "" : String(v));

/**
 * A roster check column that carries no value prints as a cross.
 *
 * The form's check cells are plain checkboxes: one that was ticked and then
 * cleared stores "✕", but one that was never touched at all stores "" — and on
 * screen the two are the same empty box. Printing the blank as a cross makes the
 * filed sheet say what the person filling it in saw, instead of leaving a column
 * that reads as "nothing to report". Same mark as a recorded fail, so the two
 * are indistinguishable in the printed column.
 *
 * Only real entries go through this — the blank filler rows padded on below have
 * no employee against them and stay empty.
 */
const FAIL_MARK = "✕";
const checkMark = (v: any) => show(v) || FAIL_MARK;

export default function PersonalHygienePrintPage() {
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

  // The record's own plant decides the header, not whichever plant the viewer
  // happens to be switched to — reprinting an A185 sheet from a W202 session
  // must still come out as A185's document.
  const warehouse = (record?.warehouse || getStoredWarehouse()) === "A185" ? "A185" : "W202";
  const DOC = DOC_BY_WAREHOUSE[warehouse];

  return (
    <div className="min-h-screen bg-gray-300 print:bg-white">
      <div className="print:hidden sticky top-0 z-20 bg-white shadow-md px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/documentations/personalhygienecheckup")}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            <ArrowLeft size={15} /> Back
          </button>
          <span className="text-sm text-gray-500">
            {record
              ? [fmtDate(record.check_date) || "—", ...(warehouse === "A185" ? [] : [record.area || "—"]), `${rows.length} employee${rows.length !== 1 ? "s" : ""}`].join(" · ")
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
          className="ph-sheet bg-white mx-auto my-6 print:my-0 print:shadow-none"
          style={{
            // Landscape: fourteen columns will not fit portrait.
            width: "297mm",
            maxWidth: "100%",
            fontFamily: "'Times New Roman', 'Calibri', serif",
            color: "#000",
            boxShadow: "0 2px 20px rgba(0,0,0,.15)",
            padding: "8mm",
          }}
        >
          {/* ── Controlled-format header ── */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <tbody>
              <tr>
                <td rowSpan={4} style={{ ...tdHead, width: "210px", textAlign: "center" }}>
                  <img src="/candor-logo.jpg" alt="Candor" style={{ width: "130px" }} />
                </td>
                <td style={{ ...tdHead, fontWeight: "bold", textAlign: "center", fontSize: "15px" }}>
                  CANDOR FOODS PRIVATE LIMITED
                </td>
                <td style={{ ...tdHead, width: "120px" }}>Issue Date:</td>
                <td style={{ ...tdHead, width: "120px", textAlign: "center" }}>{DOC.issueDate}</td>
              </tr>
              <tr>
                <td rowSpan={2} style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>
                  {DOC.formatTitle}
                </td>
                <td style={tdHead}>Issue No:</td>
                <td style={{ ...tdHead, textAlign: "center" }}>{DOC.issueNo}</td>
              </tr>
              <tr>
                <td style={tdHead}>Revision Date:</td>
                <td style={{ ...tdHead, textAlign: "center" }}>{DOC.revisionDate}</td>
              </tr>
              <tr>
                <td style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>
                  Document No: {DOC.no}
                </td>
                <td style={tdHead}>{DOC.revisionNoLabel}</td>
                <td style={{ ...tdHead, textAlign: "center" }}>{DOC.revisionNo}</td>
              </tr>
            </tbody>
          </table>

          {/* ── DATE / Area strip. A185's format has no Area — see the create page. ── */}
          <div
            style={{
              margin: "10px 0 8px",
              display: "flex",
              justifyContent: "space-between",
              fontSize: "12px",
              fontWeight: "bold",
              padding: "0 18px",
            }}
          >
            <span>DATE:&nbsp;<span style={{ fontWeight: "normal" }}>{fmtDate(record.check_date)}</span></span>
            {warehouse !== "A185" && (
              <span>Area:&nbsp;<span style={{ fontWeight: "normal" }}>{show(record.area)}</span></span>
            )}
          </div>

          {/* ── Roster grid ── */}
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "42px" }} />
              <col style={{ width: "92px" }} />
              {CHECK_COLS.map((c) => (
                <col key={c.key} />
              ))}
              <col style={{ width: "78px" }} />
              <col style={{ width: "88px" }} />
            </colgroup>
            <thead>
              <tr>
                {/* Sr no / Name sit bottom-aligned across both header rows, as printed. */}
                <th rowSpan={2} style={{ ...th, verticalAlign: "bottom" }}>Sr no</th>
                <th rowSpan={2} style={{ ...th, verticalAlign: "bottom" }}>Name</th>
                {GROUPS.map((g) => (
                  <th key={g.title} colSpan={g.cols.length} style={th}>{g.title}</th>
                ))}
                <th rowSpan={2} style={th}>Employee Sign.</th>
                <th rowSpan={2} style={th}>Corrective Action taken (If any)</th>
              </tr>
              <tr>
                {CHECK_COLS.map((c) => (
                  <th key={c.key} style={{ ...th, fontSize: "7.5px", padding: "2px 1px" }}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={td}>{i + 1}</td>
                  <td style={{ ...td, textAlign: "left", paddingLeft: "4px" }}>{show(r.name)}</td>
                  {CHECK_COLS.map((c) => (
                    <td key={c.key} style={td}>{checkMark(r[c.key])}</td>
                  ))}
                  <td style={td}>
                    <SignatureCell name={r.employee_sign} warehouse={warehouse} maxHeight={18} maxWidth={70} showName={false} />
                  </td>
                  <td style={{ ...td, textAlign: "left", paddingLeft: "4px", fontSize: "8px" }}>
                    {show(r.corrective_action)}
                  </td>
                </tr>
              ))}
              {Array.from({ length: blankRows }).map((_, i) => (
                <tr key={`b-${i}`}>
                  {Array.from({ length: TOTAL_COLS }).map((__, j) => (
                    <td key={j} style={td}>&nbsp;</td>
                  ))}
                </tr>
              ))}
              {/* Observation runs the full width of the grid, as on the format. */}
              <tr>
                <td
                  colSpan={TOTAL_COLS}
                  style={{ ...td, textAlign: "left", padding: "4px 6px", height: "30px", verticalAlign: "top", fontSize: "10px" }}
                >
                  <span style={{ fontWeight: "bold" }}>Observation:</span>&nbsp;{show(record.observation)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── Sign-offs ── */}
          <div
            style={{
              marginTop: "22px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              fontSize: "12px",
              fontWeight: "bold",
              padding: "0 18px",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-end", gap: "6px" }}>
              <span>Checked By :</span>
              <SignatureCell name={record.checked_by} warehouse={warehouse} maxHeight={30} maxWidth={110} />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "6px" }}>
              <span>Verified By :</span>
              <SignatureCell name={record.verified_by} warehouse={warehouse} maxHeight={30} maxWidth={110} />
            </div>
          </div>

          {/* ── Footer ── */}
          <div
            style={{
              marginTop: "26px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "12px",
              padding: "0 18px",
            }}
          >
            <span>Prepared By:<span style={{ fontWeight: "bold" }}>FST</span></span>
            <div
              style={{
                border: "2px solid #6b46c1",
                color: "#6b46c1",
                padding: "3px 12px",
                fontSize: "10px",
                textAlign: "center",
                lineHeight: 1.2,
              }}
            >
              CONTROLLED<br />COPY
            </div>
            <span>Approved By:<span style={{ fontWeight: "bold" }}>FSTL</span></span>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          html, body { background: white !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          @page { size: A4 landscape; margin: 8mm; }
          .ph-sheet { width: 100% !important; max-width: 100% !important; margin: 0 !important; box-shadow: none !important; padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}

const tdHead: React.CSSProperties = {
  border: "1px solid #000",
  padding: "5px 8px",
  verticalAlign: "middle",
  fontSize: "12px",
};

const th: React.CSSProperties = {
  border: "1px solid #000",
  padding: "3px 2px",
  textAlign: "center",
  fontWeight: "bold",
  fontSize: "9px",
  verticalAlign: "middle",
  lineHeight: 1.15,
  background: "#fff",
};

const td: React.CSSProperties = {
  border: "1px solid #000",
  padding: "2px",
  textAlign: "center",
  verticalAlign: "middle",
  fontSize: "10px",
  height: "22px",
};
