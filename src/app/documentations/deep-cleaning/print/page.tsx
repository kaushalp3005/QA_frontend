"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, ArrowLeft, Loader2, FileX2 } from "lucide-react";
import { docsApi } from "@/lib/api/documentations";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";
import SignatureCell from "@/components/ui/SignatureCell";
import { A185_DEEP_CLEAN_ITEMS, DEEP_CLEAN_FREQ_LEGEND } from "@/config/deepCleaningAreas";

/**
 * Printed Housekeeping Deep Cleaning record.
 *
 * Only A185 (CFPLB.C4.F.57) has a controlled print format, reproduced here
 * row-for-row from the paper — including its Sr. numbering, which skips 9.
 * W202 (CFPLA.C4.F.55) has no approved print format yet, so the Print button
 * still reaches this page but it says so rather than inventing a layout.
 */

const FORM_TYPE = "deep-cleaning";
const WEEK_KEYS = ["w1", "w2", "w3", "w4"] as const;

const ISSUE_DATE = "02/01/2025";
const ISSUE_NO = "01";
const REVISION_DATE = "";
const REVISION_NO = "";

function fmtDate(d?: string) {
  if (!d) return "";
  const parts = String(d).split("-");
  if (parts.length !== 3) return String(d);
  const [y, m, day] = parts;
  return `${day}/${m}/${y}`;
}

/** "2026-04" -> "April 2026", for the month line above the table. */
function fmtMonth(m?: string) {
  if (!m) return "";
  const parts = String(m).split("-");
  if (parts.length < 2) return String(m);
  const idx = Number(parts[1]) - 1;
  const names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return names[idx] ? `${names[idx]} ${parts[0]}` : String(m);
}

const show = (v: any) => (v === null || v === undefined ? "" : String(v));

export default function DeepCleaningPrintPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recordId = searchParams.get("id");
  const [record, setRecord] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!recordId) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    docsApi.get(FORM_TYPE, Number(recordId))
      .then((res) => { if (!cancelled) setRecord(res.data); })
      .catch((e) => console.error("Failed to load record:", e))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
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

  // Prefer the record's own plant so a sheet prints the same whichever
  // warehouse is active in the selector.
  const warehouse = record?.warehouse || getStoredWarehouse();
  const isA185 = warehouse === "A185";

  // Saved grid is keyed by area name; the printed row order comes from the
  // controlled format, not from whatever order the record happens to hold.
  const savedByArea: Record<string, any> = {};
  if (Array.isArray(record?.rows)) {
    record!.rows.forEach((r: any) => {
      if (r?.area) savedByArea[String(r.area).trim().toLowerCase()] = r;
    });
  }
  const weekOf = (area: string, n: 1 | 2 | 3 | 4) => {
    const r = savedByArea[area.trim().toLowerCase()];
    return fmtDate(r?.[`week${n}`] ?? r?.[`w${n}`]);
  };

  const checkedWeeks = record?.checked_by_weeks || {};
  const verifiedWeeks = record?.verified_by_weeks || {};
  // Records filed before the per-week columns existed carry a single name.
  const checkedFor = (k: string) => checkedWeeks[k] || (k === "w1" ? show(record?.checked_by) : "");
  const verifiedFor = (k: string) => verifiedWeeks[k] || (k === "w1" ? show(record?.verified_by) : "");

  return (
    <div className="min-h-screen bg-gray-300 print:bg-white">
      {/* Toolbar — never printed */}
      <div className="print:hidden sticky top-0 z-20 bg-white shadow-md px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/documentations/deep-cleaning")}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            <ArrowLeft size={15} /> Back
          </button>
          <span className="text-sm text-gray-500">
            {record ? `${fmtMonth(record.month) || "—"} · ${warehouse}` : "No record"}
          </span>
        </div>
        {record && isA185 && (
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-md"
          >
            <Printer size={15} /> Print
          </button>
        )}
      </div>

      {!record ? (
        <div className="text-center text-gray-500 py-20">No record found to print.</div>
      ) : !isA185 ? (
        /* W202 — button exists, but there is no approved layout to render. */
        <div className="print:hidden max-w-lg mx-auto my-20 bg-white rounded-xl shadow-lg px-8 py-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-4">
            <FileX2 className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">No print format for {warehouse}</h2>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            A controlled print layout exists only for A185 (CFPLB.C4.F.57). This
            record belongs to {warehouse}, which has no approved format yet — so
            there is nothing to print.
          </p>
          <button
            onClick={() => router.push(`/documentations/deep-cleaning/${record.id}`)}
            className="mt-6 px-4 py-2.5 rounded-lg bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600"
          >
            Back to record
          </button>
        </div>
      ) : (
        <div
          className="bg-white mx-auto my-6 print:my-0 print:shadow-none print:w-full"
          style={{
            width: "297mm",
            maxWidth: "100%",
            fontFamily: "'Calibri', 'Arial', sans-serif",
            color: "#000",
            boxShadow: "0 2px 20px rgba(0,0,0,.15)",
            padding: "10mm",
          }}
        >
          {/* Controlled-document header */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <tbody>
              <tr>
                <td rowSpan={4} style={{ ...tdHead, width: "150px", textAlign: "center" }}>
                  <img src="/candor-logo.jpg" alt="Candor Foods" style={{ width: "105px" }} />
                </td>
                <td style={{ ...tdHead, fontWeight: "bold", textAlign: "center", fontSize: "14px" }}>
                  CANDOR FOODS PRIVATE LIMITED
                </td>
                <td style={{ ...tdHead, width: "110px" }}>Issue Date:</td>
                <td style={{ ...tdHead, width: "110px" }}>{ISSUE_DATE}</td>
              </tr>
              <tr>
                <td rowSpan={2} style={{ ...tdHead, textAlign: "center" }}>
                  <b>Format:</b> Housekeeping Deep cleaning record
                </td>
                <td style={tdHead}>Issue No:</td>
                <td style={tdHead}>{ISSUE_NO}</td>
              </tr>
              <tr>
                <td style={tdHead}>Revision Date:</td>
                <td style={tdHead}>{REVISION_DATE}</td>
              </tr>
              <tr>
                <td style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>
                  Document No: CFPLB.C4.F.57
                </td>
                <td style={tdHead}>Revision No.:</td>
                <td style={tdHead}>{REVISION_NO}</td>
              </tr>
            </tbody>
          </table>

          {/* Area line + frequency legend */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: "16px",
              margin: "14px 2px 6px",
              fontSize: "11px",
            }}
          >
            <div style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>
              Area:{" "}
              <span style={{ fontWeight: "normal", display: "inline-block", minWidth: "170px", borderBottom: "1px solid #000" }}>
                &nbsp;{show(record.area)}
              </span>
              <span style={{ marginLeft: "22px" }}>
                Month:{" "}
                <span style={{ fontWeight: "normal", display: "inline-block", minWidth: "130px", borderBottom: "1px solid #000" }}>
                  &nbsp;{fmtMonth(record.month)}
                </span>
              </span>
            </div>
            <div style={{ fontWeight: "bold" }}>{DEEP_CLEAN_FREQ_LEGEND}</div>
          </div>

          {/* Schedule */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <thead>
              <tr>
                <th style={{ ...th, width: "52px" }}>Sr.No.</th>
                <th style={{ ...th, width: "230px" }}>Area</th>
                <th style={{ ...th, width: "165px" }}>Method</th>
                <th style={{ ...th, width: "90px" }}>Frequency</th>
                <th style={th}>Week 1 (Date)</th>
                <th style={th}>Week 2 (Date)</th>
                <th style={th}>Week 3 (Date)</th>
                <th style={th}>Week 4 (Date)</th>
              </tr>
            </thead>
            <tbody>
              {A185_DEEP_CLEAN_ITEMS.map((item) => (
                <tr key={item.area}>
                  <td style={td}>{item.sr}</td>
                  <td style={{ ...td, textAlign: "left", paddingLeft: "6px", fontWeight: "bold" }}>{item.area}</td>
                  <td style={{ ...td, textAlign: "left", paddingLeft: "6px" }}>{item.method}</td>
                  <td style={td}>{item.freq}</td>
                  <td style={td}>{weekOf(item.area, 1)}</td>
                  <td style={td}>{weekOf(item.area, 2)}</td>
                  <td style={td}>{weekOf(item.area, 3)}</td>
                  <td style={td}>{weekOf(item.area, 4)}</td>
                </tr>
              ))}

              {/* Signed once per week column, as on the paper */}
              <tr>
                <td colSpan={4} style={{ ...td, textAlign: "left", paddingLeft: "6px", fontWeight: "bold" }}>Checked By:</td>
                {WEEK_KEYS.map((k) => (
                  <td key={k} style={{ ...td, padding: "2px", height: "38px" }}>
                    <SignatureCell name={checkedFor(k)} warehouse="A185" maxHeight={28} maxWidth={96} showName={false} />
                  </td>
                ))}
              </tr>
              <tr>
                <td colSpan={4} style={{ ...td, textAlign: "left", paddingLeft: "6px", fontWeight: "bold" }}>verified By:</td>
                {WEEK_KEYS.map((k) => (
                  <td key={k} style={{ ...td, padding: "2px", height: "38px" }}>
                    <SignatureCell name={verifiedFor(k)} warehouse="A185" maxHeight={28} maxWidth={96} showName={false} />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>

          {/* Observations / Corrective Actions */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", marginTop: "-1px" }}>
            <tbody>
              <tr>
                <td style={{ ...td, width: "285px", textAlign: "left", paddingLeft: "6px", fontWeight: "bold", height: "72px" }}>
                  Observations:
                </td>
                <td style={{ ...td, textAlign: "left", paddingLeft: "8px", verticalAlign: "top", whiteSpace: "pre-wrap" }}>
                  {show(record.observations)}
                </td>
              </tr>
              <tr>
                <td style={{ ...td, textAlign: "left", paddingLeft: "6px", fontWeight: "bold", height: "72px" }}>
                  Corrective Actions:
                </td>
                <td style={{ ...td, textAlign: "left", paddingLeft: "8px", verticalAlign: "top", whiteSpace: "pre-wrap" }}>
                  {show(record.corrective_actions)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Footer */}
          <div
            style={{
              marginTop: "26px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "11px",
              fontWeight: "bold",
            }}
          >
            <span>Prepared By: FST</span>
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
            <span>Approved By: FSTL</span>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          html, body { background: white !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          @page { size: A4 landscape; margin: 8mm; }
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
  padding: "5px 4px",
  textAlign: "center",
  verticalAlign: "middle",
  fontSize: "11px",
  height: "26px",
};
