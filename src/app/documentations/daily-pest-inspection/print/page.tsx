"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { docsApi } from "@/lib/api/documentations";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";
import {
  A185_PEST_TYPES,
  PEST_NOTE_ROWS,
  PEST_SECTION_TITLE,
  PEST_TYPE_SECTION_PRINT_TITLE,
  hasPestTypeGrid,
  pestAreasFor,
  pestDaysInMonth,
  pestDocMetaFor,
  type PestDocMeta,
} from "@/config/dailyPestAreas";

/*
 * Printed Daily Pest Inspection Report — the controlled sheet, reproduced.
 *
 * Same layout at both plants; only the header block and the area list differ,
 * and both come from config/dailyPestAreas.ts so the printed rows are the rows
 * the form offered. The footer is the format's own "Prepared by: FST /
 * Approved By: FSTL" — the record's Checked By / Verified By are bookkeeping
 * this app adds and are deliberately not printed onto the area sheet.
 *
 * A185 prints a second landscape page, Section 2 PEST INSPECTION RECORD: the
 * pest types of CFPLB.C4.RA.04 × every day, in the same grid format as the
 * area sheet, ending with that format's "Checked By - QA / Name" line.
 */

const FORM_TYPE = "daily-pest-inspection";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-07" → "July 2026", matching how the month is written on the paper sheet. */
function monthLabel(month: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec((month || "").trim());
  if (!match) return "";
  const idx = Number(match[2]) - 1;
  return idx >= 0 && idx < 12 ? `${MONTH_LABELS[idx]} ${match[1]}` : month;
}

function DocHeader({ meta }: { meta: PestDocMeta }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
      <tbody>
        <tr>
          <td rowSpan={4} style={{ ...tdHead, width: "110px", textAlign: "center" }}>
            <img src="/candor-logo.jpg" alt="Candor" style={{ width: "70px" }} />
          </td>
          <td style={{ ...tdHead, fontWeight: "bold" }}>CANDOR FOODS PVT LTD.</td>
          <td style={tdHead}>Issue Date</td>
          <td style={{ ...tdHead, width: "80px" }}>{meta.issueDate}</td>
        </tr>
        <tr>
          <td style={tdHead}>Document Name: DAILY PEST INSPECTION REPORT</td>
          <td style={tdHead}>Issue No</td>
          <td style={tdHead}>{meta.issueNo}</td>
        </tr>
        <tr>
          <td style={tdHead}>Document Number: {meta.docNo}</td>
          <td style={tdHead}>Revision Date</td>
          <td style={tdHead}>{meta.revisionDate}</td>
        </tr>
        <tr>
          <td style={tdHead} />
          <td style={tdHead}>Revision No</td>
          <td style={tdHead}>{meta.revisionNo}</td>
        </tr>
      </tbody>
    </table>
  );
}

/** One daily code grid as printed: rows × days, then Correction / Remark. */
function DayGridTable({
  rowHeader,
  rows,
  grid,
  days,
  rowHeaderWidth = 108,
}: {
  rowHeaderWidth?: number;
  rowHeader: string;
  rows: string[];
  grid: Record<string, any>;
  days: number[];
}) {
  const cells: Record<string, Record<string, string>> = grid.cells || {};
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
      <thead>
        <tr>
          <th style={{ ...th, width: `${rowHeaderWidth}px`, textAlign: "left" }}>{rowHeader}</th>
          {days.map((day) => (
            <th key={day} style={th}>
              {day}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row}>
            <td style={{ ...td, textAlign: "left", fontWeight: 600 }}>{row}</td>
            {days.map((day) => (
              <td key={day} style={td}>
                {cells[row]?.[String(day)] || ""}
              </td>
            ))}
          </tr>
        ))}
        {PEST_NOTE_ROWS.map(({ key, label }) => {
          const notes: Record<string, string> = grid[key] || {};
          return (
            <tr key={key}>
              <td style={{ ...td, textAlign: "left", fontWeight: 600 }}>{label}</td>
              {days.map((day) => (
                <td key={day} style={{ ...td, fontSize: "7px" }}>
                  {notes[String(day)] || ""}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** One landscape page: header, section title + month, grid, footer. */
function SheetPage({
  meta,
  title,
  month,
  children,
  footerExtra,
  className = "",
}: {
  meta: PestDocMeta;
  title: string;
  month: string;
  children: React.ReactNode;
  footerExtra?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`dpi-sheet mx-auto my-6 bg-white print:my-0 print:w-full print:shadow-none ${className}`}
      style={{
        width: "297mm",
        maxWidth: "100%",
        fontFamily: "'Calibri', 'Arial', sans-serif",
        color: "#000",
        boxShadow: "0 2px 20px rgba(0,0,0,.15)",
        padding: "8mm",
      }}
    >
      <DocHeader meta={meta} />

      <div style={{ marginTop: "8px", marginBottom: "4px", fontSize: "11px", fontWeight: "bold" }}>
        {title}
        {month && <span style={{ marginLeft: "24px" }}>Month: {monthLabel(month)}</span>}
      </div>

      {children}

      {footerExtra}

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "14px", fontSize: "10px" }}>
        <span>Prepared by: FST</span>
        <span>Approved By: FSTL</span>
      </div>
    </div>
  );
}

function PestSheets({ record }: { record: Record<string, any> }) {
  // The record's own plant decides the sheet, not whichever one the selector is
  // showing — printing a W202 record from A185 must not relabel its rows.
  const warehouse = record?.warehouse || getStoredWarehouse();
  const meta = pestDocMetaFor(warehouse);
  const areas = pestAreasFor(warehouse);

  const grid = record?.grid && typeof record.grid === "object" ? record.grid : {};
  const pestGrid = grid.pest_types && typeof grid.pest_types === "object" ? grid.pest_types : {};
  const month: string = record?.month || "";
  const days = Array.from({ length: pestDaysInMonth(month) }, (_, i) => i + 1);

  return (
    <>
      <SheetPage meta={meta} title={PEST_SECTION_TITLE} month={month}>
        <DayGridTable rowHeader="Area //Date" rows={areas} grid={grid} days={days} />
      </SheetPage>

      {hasPestTypeGrid(warehouse) && (
        <SheetPage
          meta={meta}
          title={PEST_TYPE_SECTION_PRINT_TITLE}
          month={month}
          className="dpi-page-break"
          footerExtra={
            <div style={{ marginTop: "14px", fontSize: "11px", fontWeight: "bold" }}>
              Checked By - QA / Name:{" "}
              <span style={{ fontWeight: "normal", borderBottom: "1px solid #000", padding: "0 18px" }}>
                {record?.checked_by || " ".repeat(10)}
              </span>
            </div>
          }
        >
          <DayGridTable
            rowHeader="Type Of Pest //Date"
            rows={A185_PEST_TYPES}
            grid={pestGrid}
            days={days}
            rowHeaderWidth={150}
          />
        </SheetPage>
      )}
    </>
  );
}

export default function DailyPestInspectionPrintPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recordId = searchParams.get("id");
  const [record, setRecord] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!recordId) {
        setLoading(false);
        return;
      }
      try {
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
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-gray-600" size={36} />
          <p className="text-sm text-gray-600">Loading record…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-300 print:bg-white">
      <div className="sticky top-0 z-20 flex items-center justify-between bg-white px-5 py-3 shadow-md print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/documentations/daily-pest-inspection")}
            className="flex items-center gap-2 rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200"
          >
            <ArrowLeft size={15} /> Back
          </button>
          <span className="text-sm text-gray-500">
            {record ? `${monthLabel(record.month) || "—"} · ${record.warehouse || ""}` : "No record"}
          </span>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          <Printer size={15} /> Print
        </button>
      </div>

      {record ? (
        <PestSheets record={record} />
      ) : (
        <div className="py-20 text-center text-gray-500">No record found to print.</div>
      )}

      <style>{`
        @media print {
          html, body { background: white !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          @page { size: A4 landscape; margin: 6mm; }
          .print\\:w-full { width: 100% !important; max-width: 100% !important; margin: 0 !important; }
          .dpi-sheet { break-inside: avoid; }
          .dpi-page-break { break-before: page; }
        }
      `}</style>
    </div>
  );
}

const tdHead: React.CSSProperties = {
  border: "1px solid #000",
  padding: "3px 6px",
  verticalAlign: "middle",
  fontSize: "10px",
};

const th: React.CSSProperties = {
  border: "1px solid #000",
  padding: "2px 1px",
  textAlign: "center",
  fontWeight: "bold",
  fontSize: "8px",
  verticalAlign: "middle",
};

const td: React.CSSProperties = {
  border: "1px solid #000",
  padding: "3px 1px",
  textAlign: "center",
  verticalAlign: "middle",
  fontSize: "9px",
  height: "17px",
  overflow: "hidden",
};
