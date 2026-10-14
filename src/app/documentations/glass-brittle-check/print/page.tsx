"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { docsApi } from "@/lib/api/documentations";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";
import SignatureCell from "@/components/ui/SignatureCell";
import { glassBrittleDocMeta, type GlassBrittleDocMeta } from "@/config/glassBrittleAreas";
import {
  GB_MONTHS,
  GB_MONTH_PRINT_LABELS,
  gbFmtDate,
  gbFmtMonth,
  gbFormatOf,
  gbGroup,
  gbMonthlyRows,
  gbSignoffs,
  gbYearlyRows,
  type GbYearlyRow,
} from "@/lib/glass-brittle";
import type { WarehouseScope } from "@/lib/signatures";

const FORM_TYPE = "glass-brittle-check";
const LIST_PATH = "/documentations/glass-brittle-check";

/**
 * "Cupboard/Equipment/Entrance/Lift/Exit" has no spaces, so a narrow column can
 * only break it mid-word. A zero-width space after each slash lets it wrap there.
 */
const wrappable = (text: string) => text.replace(/\//g, "/\u200b");

/** Fixed columns ahead of the twelve months on the F.48 sheet. */
const YEARLY_FIXED_COLS = 5;
const YEARLY_COLS = YEARLY_FIXED_COLS + GB_MONTHS.length;

/**
 * Print layouts for the Glass and Brittle Check Record.
 *
 *   W202  CFPLA.C4.F.48  one continuous yearly grid (runs to several pages)
 *   A185  CFPLB.C4.F.59  one block per area for the month
 *
 * In Word the controlled header and the Prepared / Approved line are the page
 * header and footer, so they repeat on every sheet. Here they sit in the
 * <thead> / <tfoot> of one outer table, which browsers repeat on each printed
 * page the same way.
 */
export default function GlassBrittlePrintPage() {
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

  // The record's own plant decides the layout and header — reprinting an A-185
  // sheet from a W-202 session must still come out as A-185's document.
  const warehouse = (record?.warehouse || getStoredWarehouse()) as WarehouseScope;
  const doc = glassBrittleDocMeta(warehouse);
  const monthly = gbFormatOf(record, warehouse) === "monthly";
  const period = !record ? "No record" : monthly ? gbFmtMonth(record.month) || "—" : `Year ${record.year ?? "—"}`;

  return (
    <div className="min-h-screen bg-gray-300 print:bg-white">
      <div className="print:hidden sticky top-0 z-20 bg-white shadow-md px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(LIST_PATH)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            <ArrowLeft size={15} /> Back
          </button>
          <span className="text-sm text-gray-500">
            {doc.docNo} · {period}
          </span>
          {record?.status === "draft" && (
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
              Draft — not yet submitted
            </span>
          )}
        </div>
        <button
          onClick={() => window.print()}
          disabled={!record}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-md disabled:opacity-40"
        >
          <Printer size={15} /> Print
        </button>
      </div>

      {!record ? (
        <div className="text-center text-gray-500 py-20">No record found to print.</div>
      ) : (
        <div
          className="gb-sheet bg-white mx-auto my-6 print:my-0"
          style={{
            // A4 landscape, as both source formats are laid out.
            width: "297mm",
            maxWidth: "100%",
            fontFamily: "'Calibri', 'Arial', sans-serif",
            color: "#000",
            boxShadow: "0 2px 20px rgba(0,0,0,.15)",
            padding: "8mm",
          }}
        >
          {monthly ? (
            <MonthlySheet record={record} doc={doc} warehouse={warehouse} />
          ) : (
            <YearlySheet record={record} doc={doc} warehouse={warehouse} />
          )}
        </div>
      )}

      <style>{`
        .gb-sheet thead { display: table-header-group; }
        .gb-sheet tfoot { display: table-footer-group; }
        .gb-sheet tr { break-inside: avoid; page-break-inside: avoid; }
        .gb-area, .gb-tail { break-inside: avoid; page-break-inside: avoid; }
        @media print {
          html, body { background: white !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          @page { size: A4 landscape; margin: 8mm; }
          .gb-sheet { width: 100% !important; max-width: 100% !important; margin: 0 !important; box-shadow: none !important; padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}

interface SheetProps {
  record: Record<string, any>;
  doc: GlassBrittleDocMeta;
  warehouse: WarehouseScope;
}

/* ───────────────────────── controlled header / footer ───────────────────────── */

function DocHeader({ doc }: { doc: GlassBrittleDocMeta }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
      <tbody>
        <tr>
          <td rowSpan={4} style={{ ...tdHead, width: "150px", textAlign: "center" }}>
            <img src="/candor-logo.jpg" alt="Candor" style={{ width: "95px" }} />
          </td>
          <td rowSpan={2} style={{ ...tdHead, fontWeight: "bold", textAlign: "center", fontSize: "15px" }}>
            CANDOR FOODS PRIVATE LIMITED
          </td>
          <td style={{ ...tdHead, width: "130px" }}>Issue Date:</td>
          <td style={{ ...tdHead, width: "130px" }}>{doc.issueDate}</td>
        </tr>
        <tr>
          <td style={tdHead}>Issue No:</td>
          <td style={tdHead}>{doc.issueNo}</td>
        </tr>
        <tr>
          <td style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>Format: {doc.title}</td>
          <td style={tdHead}>Revision Date:</td>
          <td style={tdHead}>{doc.revDate}</td>
        </tr>
        <tr>
          <td style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>Document No: {doc.docNo}</td>
          <td style={tdHead}>Revision No.:</td>
          <td style={tdHead}>{doc.revNo}</td>
        </tr>
      </tbody>
    </table>
  );
}

function DocFooter({ doc }: { doc: GlassBrittleDocMeta }) {
  return (
    <div
      style={{
        paddingTop: "10px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "11px",
        fontWeight: "bold",
      }}
    >
      <span>{doc.footerLeft}</span>
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
      <span>{doc.footerRight}</span>
    </div>
  );
}

/* ─────────────────────── W202 · CFPLA.C4.F.48 · yearly grid ─────────────────────── */

/**
 * How many rows each Location cell spans: the format merges a location shared
 * by consecutive items on a floor (the staircase passages) into one tall cell.
 * 0 means "covered by the cell above".
 */
function locationSpans(rows: GbYearlyRow[]): number[] {
  const spans = rows.map(() => 1);
  let start = 0;
  for (let i = 1; i < rows.length; i++) {
    const same = rows[i].location.trim() !== "" && rows[i].location.trim() === rows[start].location.trim();
    if (same) { spans[start] += 1; spans[i] = 0; }
    else start = i;
  }
  return spans;
}

function YearlySheet({ record, doc, warehouse }: SheetProps) {
  const floors = gbGroup(gbYearlyRows(record), (r) => r.floor);
  const signoffs = gbSignoffs(record);

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
      {/* Widths follow the source's column grid; the twelve months share the rest. */}
      <colgroup>
        <col style={{ width: "8%" }} />
        <col style={{ width: "9%" }} />
        <col style={{ width: "12%" }} />
        <col style={{ width: "14%" }} />
        <col style={{ width: "8%" }} />
        {GB_MONTHS.map((m) => (
          <col key={m} style={{ width: `${49 / GB_MONTHS.length}%` }} />
        ))}
      </colgroup>
      <thead>
        <tr>
          <td colSpan={YEARLY_COLS} style={{ padding: "0 0 8px", border: "none" }}>
            <DocHeader doc={doc} />
          </td>
        </tr>
        <tr>
          <th rowSpan={2} style={th}>FLOOR</th>
          <th rowSpan={2} style={th}>ITEM</th>
          <th rowSpan={2} style={th}>LOCATION</th>
          <th rowSpan={2} style={th}>GLASS NO.</th>
          <th rowSpan={2} style={th}>GLASS DETAILS</th>
          <th colSpan={GB_MONTHS.length} style={{ ...th, textAlign: "left", paddingLeft: "8px" }}>
            YEAR: {record.year ?? ""}
          </th>
        </tr>
        <tr>
          {GB_MONTHS.map((m) => (
            <th key={m} style={th}>{GB_MONTH_PRINT_LABELS[m]}</th>
          ))}
        </tr>
      </thead>
      <tfoot>
        <tr>
          <td colSpan={YEARLY_COLS} style={{ border: "none", padding: 0 }}>
            <DocFooter doc={doc} />
          </td>
        </tr>
      </tfoot>
      <tbody>
        {floors.map((f) => {
          const spans = locationSpans(f.rows);
          return (
            <Fragment key={f.key}>
              {f.rows.map((r, i) => (
                <tr key={r.id}>
                  {i === 0 && (
                    <td rowSpan={f.rows.length} style={{ ...td, fontWeight: "bold" }}>{f.key}</td>
                  )}
                  <td style={td}>{wrappable(r.item)}</td>
                  {spans[i] > 0 && (
                    <td rowSpan={spans[i]} style={td}>{wrappable(r.location)}</td>
                  )}
                  <td style={td}>{r.glassNo}</td>
                  <td style={td}>{r.details}</td>
                  {GB_MONTHS.map((m) => (
                    <td key={m} style={{ ...td, fontSize: "11px", fontWeight: "bold" }}>{r.months[m]}</td>
                  ))}
                </tr>
              ))}
            </Fragment>
          );
        })}
      </tbody>

      {/* Sign-off and remarks stay together rather than splitting across sheets. */}
      <tbody className="gb-tail">
        {(["checkedBy", "verifiedBy"] as const).map((which) => (
          <tr key={which}>
            <td colSpan={YEARLY_FIXED_COLS} style={{ ...td, textAlign: "left", fontWeight: "bold", paddingLeft: "6px" }}>
              {which === "checkedBy" ? "Checked By" : "Verified By"}
            </td>
            {GB_MONTHS.map((m) => (
              <td key={m} style={{ ...td, height: "26px", fontSize: "7px", padding: "1px" }}>
                <SignatureCell name={signoffs[m][which]} warehouse={warehouse} maxHeight={22} maxWidth={40} showName={false} />
              </td>
            ))}
          </tr>
        ))}

        <tr>
          <td colSpan={2} style={{ ...td, textAlign: "left", fontWeight: "bold", paddingLeft: "6px" }}>
            Observations/Remarks
          </td>
          <td colSpan={YEARLY_COLS - 2} style={noteCell}>{record.observations}</td>
        </tr>
        <tr>
          <td colSpan={2} style={{ ...td, textAlign: "left", fontWeight: "bold", paddingLeft: "6px" }}>
            Corrective/Preventive actions
          </td>
          <td colSpan={YEARLY_COLS - 2} style={noteCell}>{record.corrective_action}</td>
        </tr>
      </tbody>
    </table>
  );
}

/* ─────────────────────── A185 · CFPLB.C4.F.59 · monthly sheet ─────────────────────── */

function MonthlySheet({ record, doc, warehouse }: SheetProps) {
  const areas = gbGroup(gbMonthlyRows(record), (r) => r.area);
  const month = gbFmtMonth(record.month);

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <td style={{ padding: "0 0 4px", border: "none" }}>
            <DocHeader doc={doc} />
          </td>
        </tr>
      </thead>
      <tfoot>
        <tr>
          <td style={{ border: "none", padding: 0 }}>
            <DocFooter doc={doc} />
          </td>
        </tr>
      </tfoot>
      <tbody>
        {areas.map((a, ai) => (
          <tr key={a.key || ai}>
            <td style={{ border: "none", padding: "6px 0 8px" }}>
              <div className="gb-area">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12px",
                    fontWeight: "bold",
                    padding: "0 2px 4px",
                  }}
                >
                  <span>Month- <span style={{ fontWeight: "normal" }}>{month}</span></span>
                  <span>Frequency: Monthly</span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: "11%" }} />
                    <col style={{ width: "41%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "9%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      {/* The format heads its first sheet "Area" and the rest "Floor". */}
                      <th style={{ ...th, textAlign: "left", paddingLeft: "6px" }}>{ai === 0 ? "Area" : "Floor"}</th>
                      <th style={{ ...th, textAlign: "left", paddingLeft: "6px" }}>{a.key}</th>
                      <th style={th}>Date</th>
                      <th style={th}>Condition at the Time of Check</th>
                      <th style={th}>Remark</th>
                      <th style={th}>Action Taken</th>
                      <th style={th}>QC Verification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.rows.map((r) => (
                      <tr key={r.id}>
                        <td style={{ ...td, textAlign: "left", fontWeight: "bold", paddingLeft: "6px" }}>{r.item}</td>
                        <td style={{ ...td, textAlign: "left", paddingLeft: "6px", wordBreak: "break-word" }}>{r.glassNo}</td>
                        <td style={td}>{gbFmtDate(r.date)}</td>
                        <td style={td}>{r.condition}</td>
                        <td style={{ ...td, whiteSpace: "pre-wrap" }}>{r.remark}</td>
                        <td style={{ ...td, whiteSpace: "pre-wrap" }}>{r.actionTaken}</td>
                        <td style={{ ...td, padding: "1px" }}>
                          <SignatureCell name={r.qcVerification} warehouse={warehouse} maxHeight={22} maxWidth={70} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ─────────────────────────────────── styles ─────────────────────────────────── */

const tdHead: React.CSSProperties = {
  border: "1px solid #000",
  padding: "4px 6px",
  verticalAlign: "middle",
  fontSize: "11px",
};

const th: React.CSSProperties = {
  border: "1px solid #000",
  padding: "4px 2px",
  textAlign: "center",
  fontWeight: "bold",
  fontSize: "10px",
  verticalAlign: "middle",
  background: "#fff",
};

const td: React.CSSProperties = {
  border: "1px solid #000",
  padding: "2px 3px",
  textAlign: "center",
  verticalAlign: "middle",
  fontSize: "9px",
  lineHeight: 1.2,
  height: "19px",
  overflowWrap: "anywhere",
};

const noteCell: React.CSSProperties = {
  ...td,
  textAlign: "left",
  verticalAlign: "top",
  padding: "4px 6px",
  height: "36px",
  whiteSpace: "pre-wrap",
};
