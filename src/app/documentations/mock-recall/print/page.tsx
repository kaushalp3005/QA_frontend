"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { docsApi } from "@/lib/api/documentations";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";

/**
 * Printed Mock Recall — CFPLA.C3.F.31 (Issue 03 · Rev 02 · 01/10/2025), laid out
 * page-for-page against the controlled paper format in
 * `public/31) CFPLA.C3.F.31 Mock Recall Format.pdf`:
 *
 *   Sheet 1 — recall header, severity classification with its three class
 *             definitions, cause, notified bodies, completion time, conclusion
 *             and the personnel table.
 *   Sheet 2 — mock traceability data, the A/B/C quantity reconciliation,
 *             effectiveness, customer feedback and material integration.
 *   Sheet 3 — the closing sample / efficiency summary and the format's notes.
 *
 * The Documents Review Checklist the form also captures is deliberately absent:
 * it is an addition of ours, not part of the controlled format, and this
 * printout is what gets filed against the format.
 */

const FORM_TYPE = "mock-recall";

/**
 * The controlled header is plant-specific: A185 files this format under its own
 * CFPLB series with its own revision history, W202 keeps CFPLA.C3.F.31. Only the
 * document number and revision date differ — the block is laid out the same way,
 * so the sheet takes whichever set belongs to the record's plant.
 */
const DOC_BY_WAREHOUSE = {
  W202: {
    no: "CFPLA.C3.F.31",
    format: "Mock Recall",
    issueDate: "01/11/2017",
    issueNo: "03",
    revisionDate: "01/10/2025",
    revisionNo: "02",
  },
  A185: {
    no: "CFPLB.C3.F.40",
    format: "Mock Recall",
    issueDate: "01/11/2017",
    issueNo: "03",
    revisionDate: "02/02/2026",
    revisionNo: "02",
  },
} as const;

type DocHeader = (typeof DOC_BY_WAREHOUSE)[keyof typeof DOC_BY_WAREHOUSE];

/** Blank lines the paper format prints, so a short record still fills the page. */
const MIN_MEMBER_ROWS = 6;
const MIN_MATERIAL_ROWS = 4;

/** The three class definitions are pre-printed on the format, not captured. */
const SEVERITY_CLASSES = [
  { value: "Class I", note: "A Class I recall involves a health hazard situation in which there is a reasonable probability that ingesting the food will cause health problems or death." },
  { value: "Class II", note: "A Class II recall involves a potential health hazard situation in which there is a remote probability of adverse health consequences from eating the food." },
  { value: "Class III", note: "A Class III recall involves a situation in which eating the food will not cause adverse health consequences." },
];

const DEFAULT_NOTIFICATIONS = [
  { body: "Certification Body: DNV", contact: "CertSupport.India@dnv.com" },
  { body: "FSSAI", contact: "helpdesk-foscos@fssai.gov.in" },
];

function fmtDate(d?: any) {
  if (!d) return "";
  const parts = String(d).slice(0, 10).split("-");
  if (parts.length !== 3) return String(d);
  const [y, m, day] = parts;
  return `${day}/${m}/${y}`;
}

const show = (v: any) => (v === null || v === undefined || v === "" ? "" : String(v));

/** "12.5 MT" — the quantity columns carry their unit on the paper format. */
const withUnit = (qty: any, unit: any) => {
  const q = show(qty);
  return q ? `${q}${show(unit) ? ` ${show(unit)}` : ""}` : "";
};

/** A label printed inside the cell, the way the paper format prints it. */
const Labelled = ({ label, value, bold }: { label: string; value?: any; bold?: boolean }) => (
  <>
    <span style={bold ? { fontWeight: "bold" } : undefined}>{label}</span>
    {show(value) && <span style={{ fontWeight: "bold" }}> {show(value)}</span>}
  </>
);

/** One printed A4 sheet: the controlled header, the body, then the sign-off. */
function Sheet({ doc, children, last }: { doc: DocHeader; children: React.ReactNode; last?: boolean }) {
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
        ...(last ? {} : { pageBreakAfter: "always" as const }),
      }}
    >
      {/* ── Controlled document header ── */}
      <table style={{ ...tbl, fontSize: "11px" }}>
        <colgroup>
          <col style={{ width: "18%" }} />
          <col style={{ width: "45%" }} />
          <col style={{ width: "19%" }} />
          <col style={{ width: "18%" }} />
        </colgroup>
        <tbody>
          <tr>
            <td rowSpan={4} style={{ ...cell, textAlign: "center" }}>
              <img src="/candor-logo.jpg" alt="Candor Foods" style={{ width: "85px", maxWidth: "100%" }} />
            </td>
            <td style={{ ...cell, textAlign: "center", fontWeight: "bold", fontSize: "13px" }}>
              CANDOR FOODS PRIVATE LIMITED
            </td>
            <td style={cell}>Issue Date:</td>
            <td style={cell}>{doc.issueDate}</td>
          </tr>
          <tr>
            <td rowSpan={2} style={{ ...cell, textAlign: "center", fontSize: "12px" }}>
              <b>Format:</b> {doc.format}
            </td>
            <td style={cell}>Issue No:</td>
            <td style={cell}>{doc.issueNo}</td>
          </tr>
          <tr>
            <td style={cell}>Revision Date:</td>
            <td style={cell}>{doc.revisionDate}</td>
          </tr>
          <tr>
            <td style={{ ...cell, textAlign: "center", fontWeight: "bold", fontSize: "12px" }}>
              Document No: {doc.no}
            </td>
            <td style={cell}>Revision No:</td>
            <td style={cell}>{doc.revisionNo}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ height: "14px" }} />

      {children}

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px", fontSize: "10px" }}>
        <span>Prepared by: FST</span>
        <span>Approved by: FSTL</span>
      </div>
    </div>
  );
}

export default function MockRecallPrintPage() {
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

  const members: any[] = Array.isArray(record?.team_members) ? record!.team_members : [];
  const materials: any[] = Array.isArray(record?.material_integration) ? record!.material_integration : [];
  const notifications: any[] =
    Array.isArray(record?.notifications) && record!.notifications.length
      ? record!.notifications
      : DEFAULT_NOTIFICATIONS;

  const blankMembers = Math.max(0, MIN_MEMBER_ROWS - members.length);
  const blankMaterials = Math.max(0, MIN_MATERIAL_ROWS - materials.length);

  // The record's own plant decides the header, not whichever one the selector
  // happens to show — printing a W202 record from A185 must not restamp it with
  // the CFPLB number. Rows saved before the warehouse column was filled have
  // nothing to go on, so those fall back to the selected plant.
  const warehouse = (record?.warehouse || getStoredWarehouse()) === "A185" ? "A185" : "W202";
  const doc = DOC_BY_WAREHOUSE[warehouse];

  const severity = show(record?.severity_class) || "Class III";
  const efficiency = show(record?.recall_efficiency_pct);

  return (
    <div className="min-h-screen bg-gray-300 print:bg-white">
      <div className="print:hidden sticky top-0 z-20 bg-white shadow-md px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/documentations/mock-recall")}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            <ArrowLeft size={15} /> Back
          </button>
          <span className="text-sm text-gray-500">
            {record
              ? `${fmtDate(record.recall_date) || "—"} · ${show(record.product_name) || "—"} · Batch ${show(record.batch_number) || "—"}`
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
        <>
          {/* ═══════════ Sheet 1 ═══════════ */}
          <Sheet doc={doc}>
            <table style={tbl}>
              <colgroup>
                <col style={{ width: "8%" }} />
                <col style={{ width: "40%" }} />
                <col style={{ width: "26%" }} />
                <col style={{ width: "26%" }} />
              </colgroup>
              <tbody>
                <tr>
                  <td colSpan={2} style={cell}><Labelled label="Date of recall:" value={fmtDate(record.recall_date)} /></td>
                  <td colSpan={2} style={cell}>
                    Reason for recall:
                    <br />
                    {show(record.reason_for_recall)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} style={{ ...cell, height: "34px" }}>
                    <Labelled label="Recall Coordinator:" value={record.recall_coordinator} />
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} style={{ ...cell, height: "34px" }}>
                    <Labelled label="Traceability/Mock Recall initiated by:" value={record.initiated_by} />
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} style={cell}><Labelled label="Product Name:" value={record.product_name} /></td>
                  <td colSpan={2} style={cell}><Labelled label="Product Brand:" value={record.product_brand} /></td>
                </tr>
                <tr>
                  <td colSpan={2} style={cell}><Labelled label="Production Date:" value={fmtDate(record.production_date)} /></td>
                  <td colSpan={2} style={cell}><Labelled label="Batch Number:" value={record.batch_number} /></td>
                </tr>
                <tr>
                  <td colSpan={4} style={cell}><Labelled label="Date of Shipment:" value={fmtDate(record.shipment_date)} /></td>
                </tr>
                <tr>
                  <td colSpan={4} style={cell}>
                    Recall Classification: Severity: <b>{severity}</b>
                  </td>
                </tr>
                {/* Pre-printed definitions — the one that was ticked is emphasised. */}
                {SEVERITY_CLASSES.map((c) => (
                  <tr key={c.value}>
                    <td
                      colSpan={4}
                      style={{
                        ...cell,
                        fontSize: "9px",
                        textAlign: "justify",
                        background: c.value === severity ? "#f0f0f0" : undefined,
                      }}
                    >
                      <b>{c.value}</b> - {c.note}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={4} style={{ ...cell, height: "40px", verticalAlign: "top" }}>
                    <b>Cause Identification:</b> {show(record.cause_identification)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} style={cell}>
                    Whether the product needs to be recalled or withdrawn- <b>{show(record.recall_or_withdraw) || "No"}</b>
                  </td>
                </tr>
                {notifications.map((n, i) => (
                  <tr key={i}>
                    <td style={{ ...cell, textAlign: "center" }}>{i + 1}</td>
                    <td style={{ ...cell, fontWeight: "bold" }}>{show(n.body)}</td>
                    <td colSpan={2} style={cell}>{show(n.contact)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3} style={cell}><b>Completion time:</b> Total Hours:</td>
                  <td style={{ ...cell, textAlign: "center" }}>{show(record.completion_hours)}</td>
                </tr>
                <tr>
                  <td colSpan={4} style={{ ...cell, height: "56px", verticalAlign: "top" }}>
                    <b>Conclusion:</b> {show(record.conclusion)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} style={cell}>Personnel involved in the mock recall:</td>
                </tr>
                <tr>
                  <td style={{ ...cell, fontWeight: "bold", textAlign: "center" }}>Sr.no</td>
                  <td colSpan={2} style={{ ...cell, fontWeight: "bold", textAlign: "center" }}>Name of the Team Members</td>
                  <td style={{ ...cell, fontWeight: "bold" }}>Sign</td>
                </tr>
                {members.map((m, i) => (
                  <tr key={i}>
                    <td style={{ ...cell, textAlign: "center", height: "24px" }}>{i + 1}</td>
                    <td colSpan={2} style={cell}>{show(m.name)}</td>
                    <td style={cell}>{show(m.sign)}</td>
                  </tr>
                ))}
                {Array.from({ length: blankMembers }).map((_, i) => (
                  <tr key={`blank-member-${i}`}>
                    <td style={{ ...cell, textAlign: "center", height: "24px" }}>{members.length + i + 1}</td>
                    <td colSpan={2} style={cell} />
                    <td style={cell} />
                  </tr>
                ))}
              </tbody>
            </table>
          </Sheet>

          {/* ═══════════ Sheet 2 ═══════════ */}
          <Sheet doc={doc}>
            <p style={sectionTitle}>Mock Traceability Data:</p>
            <table style={tbl}>
              <colgroup>
                <col style={{ width: "50%" }} />
                <col style={{ width: "50%" }} />
              </colgroup>
              <tbody>
                <tr>
                  <td style={cell}><Labelled label="Start time:" value={record.start_time} bold /></td>
                  <td style={cell}>Units (i.e. MT)</td>
                </tr>
                <tr>
                  <td style={cell}>Production Qty.</td>
                  <td style={cell}>{withUnit(record.production_qty, record.production_unit)}</td>
                </tr>
                <tr>
                  <td style={cell}>Remaining stock Qty.</td>
                  <td style={cell}>{withUnit(record.remaining_stock_qty, record.remaining_stock_unit)}</td>
                </tr>
                <tr>
                  <td style={cell}>Distributed Qty.</td>
                  <td style={cell}>{withUnit(record.distributed_qty, record.distributed_unit)}</td>
                </tr>
              </tbody>
            </table>

            <p style={sectionTitle}>Corrective Action</p>
            <table style={tbl}>
              <colgroup>
                <col style={{ width: "9%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "17%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "20%" }} />
              </colgroup>
              <tbody>
                <tr>
                  <td style={{ ...cell, fontWeight: "bold", textAlign: "center" }}>Sr.No</td>
                  <td colSpan={4} style={{ ...cell, fontWeight: "bold", textAlign: "center" }}>Stages</td>
                  <td style={{ ...cell, fontWeight: "bold" }}>Quantity</td>
                </tr>
                {/* Row A is the stage labels, row B the quantities against them —
                    the same split the paper format prints. */}
                <tr>
                  <td style={{ ...cell, fontWeight: "bold" }}>A</td>
                  <td style={cell}>QTY produced or supplied</td>
                  <td style={cell}>QTY in transit</td>
                  <td style={cell}>QTY held in Godown</td>
                  <td style={cell}>QTY held by distributors or customer</td>
                  <td style={cell} />
                </tr>
                <tr>
                  <td style={{ ...cell, fontWeight: "bold" }}>B</td>
                  <td style={{ ...cell, textAlign: "center", height: "28px" }}>{show(record.qty_produced_supplied)}</td>
                  <td style={{ ...cell, textAlign: "center" }}>{show(record.qty_in_transit)}</td>
                  <td style={{ ...cell, textAlign: "center" }}>{show(record.qty_held_godown)}</td>
                  <td style={{ ...cell, textAlign: "center" }}>{show(record.qty_held_distributors)}</td>
                  <td style={cell} />
                </tr>
                <tr>
                  <td style={{ ...cell, fontWeight: "bold" }}>C</td>
                  <td colSpan={4} style={cell}>Total unaccounted or consumed</td>
                  <td style={{ ...cell, textAlign: "center" }}>{show(record.total_unaccounted)}</td>
                </tr>
                <tr>
                  <td colSpan={5} style={cell}>Mock Recall Effectiveness:</td>
                  <td style={{ ...cell, textAlign: "center" }}>{efficiency && `${efficiency}%`}</td>
                </tr>
                <tr>
                  <td colSpan={6} style={{ ...cell, height: "34px", verticalAlign: "top" }}>
                    <b>Corrective Action:</b> {show(record.corrective_action)}
                  </td>
                </tr>
              </tbody>
            </table>

            <table style={{ ...tbl, marginTop: "-1px" }}>
              <colgroup>
                <col style={{ width: "33%" }} />
                <col style={{ width: "67%" }} />
              </colgroup>
              <tbody>
                <tr>
                  <td style={{ ...cell, height: "48px", verticalAlign: "top" }}>Customer feedback/Dated</td>
                  <td style={{ ...cell, verticalAlign: "top" }}>
                    {show(record.customer_feedback)}
                    {record.customer_feedback_date && (
                      <div style={{ marginTop: "4px" }}>Dated: {fmtDate(record.customer_feedback_date)}</div>
                    )}
                  </td>
                </tr>
                <tr>
                  <td style={{ ...cell, height: "40px", verticalAlign: "top", fontSize: "9px" }}>
                    Cause &amp; corrective action if the mock recall is less than 100%
                  </td>
                  <td style={{ ...cell, verticalAlign: "top" }}>{show(record.effectiveness_remarks)}</td>
                </tr>
              </tbody>
            </table>
            <p style={{ fontSize: "9.5px", margin: "3px 0 10px 0" }}>
              (If mock recall is less than 100%, outline the cause and indicate corrective action required)
            </p>

            {/* The form captures one production date per material line, so the
                paper format's "Production Details" column is that date and
                "Dispatch details" carries the consignee and quantity. */}
            <table style={tbl}>
              <colgroup>
                <col style={{ width: "22%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "17%" }} />
                <col style={{ width: "28%" }} />
                <col style={{ width: "15%" }} />
              </colgroup>
              <tbody>
                <tr>
                  <td colSpan={2} style={{ ...cell, fontWeight: "bold", textAlign: "center" }}>Raw/Packing material Integration</td>
                  <td style={{ ...cell, fontWeight: "bold", textAlign: "center" }}>Production Details</td>
                  <td colSpan={2} style={{ ...cell, fontWeight: "bold", textAlign: "center" }}>Dispatch details</td>
                </tr>
                <tr>
                  <td style={{ ...cell, textAlign: "center" }}>Raw Material &amp; Packing Material</td>
                  <td style={{ ...cell, textAlign: "center" }}>Lot/batch No.</td>
                  <td style={{ ...cell, textAlign: "center" }}>Date</td>
                  <td style={{ ...cell, textAlign: "center" }}>Name &amp; Place of Consignee</td>
                  <td style={{ ...cell, textAlign: "center" }}>Quantity</td>
                </tr>
                {materials.map((m, i) => (
                  <tr key={i}>
                    <td style={{ ...cell, height: "30px" }}>{show(m.raw_material)}</td>
                    <td style={cell}>{show(m.lot_no)}</td>
                    <td style={{ ...cell, textAlign: "center" }}>{fmtDate(m.production_date)}</td>
                    <td style={cell}>{show(m.consignee)}</td>
                    <td style={{ ...cell, textAlign: "center" }}>{show(m.quantity)}</td>
                  </tr>
                ))}
                {Array.from({ length: blankMaterials }).map((_, i) => (
                  <tr key={`blank-material-${i}`}>
                    <td style={{ ...cell, height: "30px" }} />
                    <td style={cell} />
                    <td style={cell} />
                    <td style={cell} />
                    <td style={cell} />
                  </tr>
                ))}
              </tbody>
            </table>
          </Sheet>

          {/* ═══════════ Sheet 3 ═══════════ */}
          <Sheet doc={doc} last>
            <table style={tbl}>
              <colgroup>
                <col style={{ width: "50%" }} />
                <col style={{ width: "50%" }} />
              </colgroup>
              <tbody>
                <tr>
                  <td style={{ ...cell, height: "34px" }}><Labelled label="Product kept for sample:  Qty :" value={record.sample_qty} /></td>
                  <td style={cell}><Labelled label="Total quantity recall :" value={record.total_quantity_recall} /></td>
                </tr>
                <tr>
                  <td style={{ ...cell, height: "34px" }}><Labelled label="Balance stock if any: Qty.:" value={record.balance_stock_qty} /></td>
                  <td style={cell}><Labelled label="% of recall efficiency:" value={efficiency && `${efficiency}%`} /></td>
                </tr>
                <tr>
                  <td style={{ ...cell, height: "34px" }}><Labelled label="End Time :" value={record.end_time} /></td>
                  <td style={cell} />
                </tr>
              </tbody>
            </table>
            <ul style={{ margin: "6px 0 0 18px", padding: 0, fontSize: "10px" }}>
              <li>Note: All respective evidence is attached.</li>
              <li>Details of the product kept as samples shall also be indicated.</li>
            </ul>
          </Sheet>
        </>
      )}

      <style>{`
        @media print {
          html, body { background: white !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          @page { size: A4 portrait; margin: 8mm; }
          .print\\:w-full { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
          table { page-break-inside: auto; }
          tr, td, th { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}

const tbl: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "fixed",
  fontSize: "10.5px",
};

const cell: React.CSSProperties = {
  border: "1px solid #000",
  padding: "4px 5px",
  verticalAlign: "middle",
  fontSize: "10.5px",
  // Batch numbers and consignee names run long as single tokens; without this
  // they print over the neighbouring column.
  overflowWrap: "break-word",
  wordBreak: "break-word",
};

const sectionTitle: React.CSSProperties = {
  fontWeight: "bold",
  fontSize: "11px",
  margin: "12px 0 4px 6px",
};
