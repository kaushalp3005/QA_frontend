"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, ArrowLeft, Loader2, FileX2 } from "lucide-react";
import { docsApi } from "@/lib/api/documentations";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";
import SignatureCell from "@/components/ui/SignatureCell";
import {
  WASTE_TYPES,
  WASTE_DAYS,
  readWasteRow,
  wasteDisposalDocMeta,
  hasWastePrintFormat,
} from "@/config/wasteDisposalTypes";

/**
 * Printed Waste Disposal record.
 *
 * Only A185 (CFPLB.C4..F.58) has a controlled print format, reproduced here
 * from the paper: month line, the 31-day grid under a shaded "location:" band,
 * per-day Checked By / Verified By rows, and three blank remarks lines.
 * W202 (CFPLA.C4.F.52) has no approved format, so the Print button still
 * reaches this page but it says so rather than inventing a layout.
 */

const FORM_TYPE = "waste-disposal";
/** The paper leaves three ruled lines under Remarks whether or not they're used. */
const REMARK_LINES = 3;

function fmtMonth(m?: string) {
  if (!m) return "";
  const parts = String(m).split("-");
  if (parts.length < 2) return String(m);
  const idx = Number(parts[1]) - 1;
  const names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return names[idx] ? `${names[idx]} ${parts[0]}` : String(m);
}

const show = (v: any) => (v === null || v === undefined ? "" : String(v));

export default function WasteDisposalPrintPage() {
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
  const printable = hasWastePrintFormat(warehouse);
  const meta = wasteDisposalDocMeta(warehouse);

  // Row order comes from the controlled format, not from whatever order the
  // saved grid happens to hold.
  const rowFor = (typeIndex: number) => readWasteRow(record?.grid, WASTE_TYPES[typeIndex]);

  const checkedDays = record?.checked_by_days || {};
  const verifiedDays = record?.verified_by_days || {};
  const signOf = (bag: any, day: number, fallback?: string) =>
    bag?.[day] ?? bag?.[String(day)] ?? (day === 1 ? show(fallback) : "");

  return (
    <div className="min-h-screen bg-gray-300 print:bg-white">
      {/* Toolbar — never printed */}
      <div className="print:hidden sticky top-0 z-20 bg-white shadow-md px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/documentations/waste-disposal")}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            <ArrowLeft size={15} /> Back
          </button>
          <span className="text-sm text-gray-500">
            {record ? `${fmtMonth(record.month) || "—"} · ${warehouse}` : "No record"}
          </span>
        </div>
        {record && printable && (
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
      ) : !printable ? (
        /* W202 — button exists, but there is no approved layout to render. */
        <div className="print:hidden max-w-lg mx-auto my-20 bg-white rounded-xl shadow-lg px-8 py-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-4">
            <FileX2 className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">No print format for {warehouse}</h2>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            A controlled print layout exists only for A185 (CFPLB.C4..F.58). This
            record belongs to {warehouse}, which has no approved format yet — so
            there is nothing to print.
          </p>
          <button
            onClick={() => router.push(`/documentations/waste-disposal/${record.id}`)}
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
                <td rowSpan={4} style={{ ...tdHead, width: "160px", textAlign: "center" }}>
                  <img src="/candor-logo.jpg" alt="Candor Foods" style={{ width: "110px" }} />
                </td>
                <td style={{ ...tdHead, fontWeight: "bold", textAlign: "center", fontSize: "14px" }}>
                  CANDOR FOODS PRIVATE LIMITED
                </td>
                <td style={{ ...tdHead, width: "115px" }}>Issue Date:</td>
                <td style={{ ...tdHead, width: "115px" }}>{meta.issueDate}</td>
              </tr>
              <tr>
                <td rowSpan={2} style={{ ...tdHead, textAlign: "center" }}>
                  <b>Format:</b> &nbsp;Waste Disposal record
                </td>
                <td style={tdHead}>Issue No:</td>
                <td style={tdHead}>{meta.issueNo}</td>
              </tr>
              <tr>
                <td style={tdHead}>Revision Date:</td>
                <td style={tdHead}>{meta.revisionDate}</td>
              </tr>
              <tr>
                <td style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>
                  Document No: {meta.docNo}
                </td>
                <td style={tdHead}>Revision No.:</td>
                <td style={tdHead}>{meta.revisionNo}</td>
              </tr>
            </tbody>
          </table>

          {/* Month line */}
          <div style={{ margin: "14px 2px 6px", fontSize: "12px", fontWeight: "bold" }}>
            Month:{" "}
            <span style={{ fontWeight: "normal", display: "inline-block", minWidth: "170px", borderBottom: "1px solid #000" }}>
              &nbsp;{fmtMonth(record.month)}
            </span>
          </div>

          {/* Day grid */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "128px" }} />
              {WASTE_DAYS.map((d) => <col key={d} />)}
            </colgroup>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: "left", paddingLeft: "6px", height: "54px", verticalAlign: "top" }}>
                  TYPE OF WASTE
                </th>
                {WASTE_DAYS.map((d) => (
                  <th key={d} style={{ ...th, padding: "4px 1px", verticalAlign: "top" }}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Shaded location band, as printed */}
              <tr>
                <td
                  colSpan={WASTE_DAYS.length + 1}
                  style={{ ...td, textAlign: "left", paddingLeft: "6px", fontWeight: "bold", background: "#d9d9d9", height: "18px" }}
                >
                  location: <span style={{ fontWeight: "normal" }}>{show(record.area)}</span>
                </td>
              </tr>

              {WASTE_TYPES.map((t, i) => {
                const row = rowFor(i);
                return (
                  <tr key={t.key}>
                    <td style={{ ...td, textAlign: "left", paddingLeft: "6px", height: "56px", verticalAlign: "top", paddingTop: "4px" }}>
                      {t.label}
                    </td>
                    {WASTE_DAYS.map((d) => (
                      <td key={d} style={{ ...td, padding: "1px", fontWeight: "bold" }}>{row[d] || ""}</td>
                    ))}
                  </tr>
                );
              })}

              {/* Per-day sign-off */}
              <tr>
                <td style={{ ...td, textAlign: "left", paddingLeft: "6px", height: "34px" }}>Checked By</td>
                {WASTE_DAYS.map((d) => (
                  <td key={d} style={{ ...td, padding: "1px" }}>
                    <SignatureCell
                      name={signOf(checkedDays, d, record.checked_by)}
                      warehouse="A185"
                      maxHeight={22}
                      maxWidth={24}
                      showName={false}
                    />
                  </td>
                ))}
              </tr>
              <tr>
                <td style={{ ...td, textAlign: "left", paddingLeft: "6px", height: "34px" }}>Verified By</td>
                {WASTE_DAYS.map((d) => (
                  <td key={d} style={{ ...td, padding: "1px" }}>
                    <SignatureCell
                      name={signOf(verifiedDays, d, record.verified_by)}
                      warehouse="A185"
                      maxHeight={22}
                      maxWidth={24}
                      showName={false}
                    />
                  </td>
                ))}
              </tr>

              {/* Remarks — label spans the ruled lines on its right */}
              {Array.from({ length: REMARK_LINES }).map((_, i) => (
                <tr key={`rm-${i}`}>
                  {i === 0 && (
                    <td
                      rowSpan={REMARK_LINES}
                      style={{ ...td, textAlign: "left", paddingLeft: "6px", verticalAlign: "top", paddingTop: "4px" }}
                    >
                      Remarks ( If any)
                    </td>
                  )}
                  <td
                    colSpan={WASTE_DAYS.length}
                    style={{ ...td, textAlign: "left", paddingLeft: "8px", height: "26px", whiteSpace: "pre-wrap" }}
                  >
                    {i === 0 ? show(record.remarks) : ""}
                  </td>
                </tr>
              ))}
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
            <span>Prepared BY: FST</span>
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
            <span>Approved By:FSTL</span>
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
  padding: "6px 2px",
  textAlign: "center",
  fontWeight: "bold",
  fontSize: "10px",
  verticalAlign: "middle",
  background: "#fff",
};

const td: React.CSSProperties = {
  border: "1px solid #000",
  padding: "4px 2px",
  textAlign: "center",
  verticalAlign: "middle",
  fontSize: "10px",
  height: "24px",
};
