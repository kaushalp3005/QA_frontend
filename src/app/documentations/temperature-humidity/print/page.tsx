"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { docsApi } from "@/lib/api/documentations";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";

const FORM_TYPE = "temperature-humidity";
const DAYS = 31;
/** Start, Mid and End of the shift — three readings a day, per the format's own
 *  Frequency note. Matches the three rows under Temperature and under Humidity. */
const READINGS = 3;

/**
 * The controlled-format header block, per plant.
 *
 * A-185 files this record under its own document number and revision date —
 * same format, separately controlled — so the sheet must carry the plant's own
 * codes or it is the wrong document to an auditor. Everything else (issue date,
 * issue no, revision no) is common to both.
 */
const DOC_BY_PLANT = {
  A185:    { no: "CFPLB.C6.F.21", revDate: "02/02/2026" },
  default: { no: "CFPLA.C6.F.17", revDate: "10/01/2026" },
} as const;

const DOC_COMMON = { issueDate: "04/08/2021", issueNo: "04", revNo: "03" };

const docFor = (warehouse?: string) =>
  ({ ...DOC_COMMON, ...(warehouse === "A185" ? DOC_BY_PLANT.A185 : DOC_BY_PLANT.default) });

type Reading = { temp: string; humidity: string };

interface Section {
  area: string;
  /** day (1-31) → [Start, Mid, End] */
  grid: Record<number, Reading[]>;
  checkedBy: Record<number, string>;
  verifiedBy: Record<number, string>;
  observations: string;
  correctiveAction: string;
}

const emptySection = (area: string): Section => {
  const grid: Record<number, Reading[]> = {};
  for (let d = 1; d <= DAYS; d++) {
    grid[d] = Array.from({ length: READINGS }, () => ({ temp: "", humidity: "" }));
  }
  return { area, grid, checkedBy: {}, verifiedBy: {}, observations: "", correctiveAction: "" };
};

/** One saved area's day-rows → a printable section. Mirrors the shape the form
 *  writes, so anything the form can save the print page can render. */
function sectionFromRows(area: string, rows: any[], observations?: string, correctiveAction?: string): Section {
  const s = emptySection(area);
  for (const r of Array.isArray(rows) ? rows : []) {
    const d = Number(r?.day);
    if (!d || d < 1 || d > DAYS) continue;
    s.grid[d] = [
      { temp: r.start_temp ?? "", humidity: r.start_humidity ?? "" },
      { temp: r.mid_temp ?? "", humidity: r.mid_humidity ?? "" },
      { temp: r.end_temp ?? "", humidity: r.end_humidity ?? "" },
    ];
    if (r.checked_by) s.checkedBy[d] = r.checked_by;
    if (r.verified_by) s.verifiedBy[d] = r.verified_by;
  }
  s.observations = observations || "";
  s.correctiveAction = correctiveAction || "";
  return s;
}

const hasData = (s: Section) =>
  s.observations.trim() !== "" ||
  s.correctiveAction.trim() !== "" ||
  Object.values(s.checkedBy).some(Boolean) ||
  Object.values(s.verifiedBy).some(Boolean) ||
  Object.values(s.grid).some((day) => day.some((r) => r.temp !== "" || r.humidity !== ""));

/**
 * Sections to print, newest storage shape first.
 *
 * v2 records keep `readings.sections` — one entry per monitored area. Older
 * records kept a single flat day-rows array under `readings` with the area on
 * the record itself; those still print, as one section.
 */
function parseSections(record: Record<string, any> | null): Section[] {
  const raw = record?.readings;
  let parsed: Section[] = [];
  if (raw && !Array.isArray(raw) && typeof raw === "object" && Array.isArray(raw.sections)) {
    parsed = raw.sections.map((s: any) =>
      sectionFromRows(s?.area || "", s?.rows, s?.observations, s?.corrective_action),
    );
  } else if (Array.isArray(raw) && raw.length > 0) {
    parsed = [sectionFromRows(record?.area || "", raw, record?.observations, record?.corrective_action)];
  }
  // Only areas that were actually filled in get a sheet — printing three blank
  // pages because the form offers three tabs wastes paper and confuses the file.
  const filled = parsed.filter(hasData);
  return filled.length ? filled : [emptySection(record?.area || "")];
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-09" (what <input type="month"> stores) → "September 2026". */
function fmtMonth(m?: string): string {
  if (!m) return "";
  const parts = String(m).split("-");
  if (parts.length < 2) return String(m);
  const idx = Number(parts[1]) - 1;
  return MONTHS[idx] ? `${MONTHS[idx]} ${parts[0]}` : String(m);
}

const show = (v: any) => (v === null || v === undefined ? "" : String(v));

const DAY_NUMBERS = Array.from({ length: DAYS }, (_, i) => i + 1);

export default function TemperatureHumidityPrintPage() {
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

  const sections = parseSections(record);
  // The record's own warehouse decides the header, not whatever plant the
  // viewer happens to be switched to — reprinting an A-185 sheet from a W-202
  // session must still come out as A-185's document. The selector is only a
  // fallback for records saved before the column was populated.
  const DOC = docFor(record?.warehouse || getStoredWarehouse());

  return (
    <div className="min-h-screen bg-gray-300 print:bg-white">
      <div className="print:hidden sticky top-0 z-20 bg-white shadow-md px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/documentations/temperature-humidity")}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            <ArrowLeft size={15} /> Back
          </button>
          <span className="text-sm text-gray-500">
            {record
              ? `${fmtMonth(record.month) || "—"} · ${sections.length} area${sections.length !== 1 ? "s" : ""}`
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
        sections.map((section, si) => (
          <div
            key={si}
            className="th-sheet bg-white mx-auto my-6 print:my-0 print:shadow-none print:w-full"
            style={{
              // A4 landscape: 31 day columns will not fit portrait.
              width: "297mm",
              maxWidth: "100%",
              fontFamily: "'Calibri', 'Arial', sans-serif",
              color: "#000",
              boxShadow: "0 2px 20px rgba(0,0,0,.15)",
              padding: "8mm",
              // Each monitored area is its own sheet, as on paper.
              pageBreakAfter: si === sections.length - 1 ? "auto" : "always",
              breakAfter: si === sections.length - 1 ? "auto" : "page",
            }}
          >
            {/* ── Controlled-format header ── */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <tbody>
                <tr>
                  <td rowSpan={4} style={{ ...tdHead, width: "150px", textAlign: "center" }}>
                    <img src="/candor-logo.jpg" alt="Candor" style={{ width: "95px" }} />
                  </td>
                  <td style={{ ...tdHead, fontWeight: "bold", textAlign: "center", fontSize: "15px" }}>
                    CANDOR FOODS PRIVATE LIMITED
                  </td>
                  <td style={{ ...tdHead, width: "130px" }}>Issue Date:</td>
                  <td style={{ ...tdHead, width: "130px" }}>{DOC.issueDate}</td>
                </tr>
                <tr>
                  <td rowSpan={2} style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>
                    Format: Temperature &amp; Humidity Check Record
                  </td>
                  <td style={tdHead}>Issue No:</td>
                  <td style={tdHead}>{DOC.issueNo}</td>
                </tr>
                <tr>
                  <td style={tdHead}>Revision Date:</td>
                  <td style={tdHead}>{DOC.revDate}</td>
                </tr>
                <tr>
                  <td style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>
                    Document No : {DOC.no}
                  </td>
                  <td style={tdHead}>Revision No.:</td>
                  <td style={tdHead}>{DOC.revNo}</td>
                </tr>
              </tbody>
            </table>

            {/* ── Month / Area / Frequency strip ── */}
            <div
              style={{
                marginTop: "10px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "12px",
                fontWeight: "bold",
                padding: "0 2px 6px",
              }}
            >
              <span>Month:&nbsp;<span style={{ fontWeight: "normal" }}>{fmtMonth(record.month)}</span></span>
              <span>Area:&nbsp;<span style={{ fontWeight: "normal" }}>{section.area}</span></span>
              <span>Frequency: Start, Mid and End of the shift</span>
            </div>

            {/* ── Readings grid ── */}
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              {/* Widths live here, not on the cells: under table-layout:fixed only
                  the first row sizes the columns, and its first cell spans two of
                  them, so per-cell widths further down would be ignored. The 31
                  day columns share whatever is left, equally. */}
              <colgroup>
                <col style={{ width: "62px" }} />
                <col style={{ width: "46px" }} />
                {DAY_NUMBERS.map((d) => (
                  <col key={d} style={{ width: `calc((100% - 108px) / ${DAYS})` }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {/* The label block is two columns wide; "Date" spans both, and
                      the narrow second column carries "Time" on the row below. */}
                  <th colSpan={2} style={{ ...th, textAlign: "left", paddingLeft: "6px" }}>Date</th>
                  {DAY_NUMBERS.map((d) => (
                    <th key={d} style={th}>{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Time — the format leaves this row to be written by hand; the
                    form captures no per-reading clock time, so it prints blank
                    rather than inventing one. */}
                <tr>
                  <td style={tdLabel} />
                  <td style={tdLabel}>Time</td>
                  {DAY_NUMBERS.map((d) => (
                    <td key={d} style={td}>&nbsp;</td>
                  ))}
                </tr>

                {/* Temperature — one row per reading */}
                {Array.from({ length: READINGS }).map((_, r) => (
                  <tr key={`t-${r}`}>
                    {r === 0 && <td rowSpan={READINGS} style={tdLabel}>Temperature</td>}
                    <td style={tdLabel} />
                    {DAY_NUMBERS.map((d) => (
                      <td key={d} style={td}>{show(section.grid[d]?.[r]?.temp)}</td>
                    ))}
                  </tr>
                ))}

                {/* Humidity — the 50-70 % band is part of the printed label */}
                {Array.from({ length: READINGS }).map((_, r) => (
                  <tr key={`h-${r}`}>
                    {r === 0 && <td rowSpan={READINGS} style={tdLabel}>Humidity<br />(50 - 70 %)</td>}
                    <td style={tdLabel} />
                    {DAY_NUMBERS.map((d) => (
                      <td key={d} style={td}>{show(section.grid[d]?.[r]?.humidity)}</td>
                    ))}
                  </tr>
                ))}

                {/* Corrective action is one piece of prose for the month, not a
                    value per day, so the day cells merge into a single box.
                    Observations ride along here rather than being dropped —
                    the format has no separate row for them. */}
                <tr>
                  <td style={tdLabel}>Corrective Action</td>
                  <td style={tdLabel} />
                  <td colSpan={DAYS} style={{ ...td, textAlign: "left", padding: "4px 6px", height: "46px", verticalAlign: "top" }}>
                    {section.correctiveAction}
                    {section.observations && (
                      <>
                        {section.correctiveAction ? <br /> : null}
                        <span style={{ fontStyle: "italic" }}>Observations: {section.observations}</span>
                      </>
                    )}
                  </td>
                </tr>

                <tr>
                  <td style={tdLabel}>Checked By</td>
                  <td style={tdLabel} />
                  {DAY_NUMBERS.map((d) => (
                    <td key={d} style={{ ...td, height: "30px" }}>{show(section.checkedBy[d])}</td>
                  ))}
                </tr>
                <tr>
                  <td style={tdLabel}>Verified By</td>
                  <td style={tdLabel} />
                  {DAY_NUMBERS.map((d) => (
                    <td key={d} style={{ ...td, height: "30px" }}>{show(section.verifiedBy[d])}</td>
                  ))}
                </tr>
              </tbody>
            </table>

            {/* ── Footer ── */}
            <div
              style={{
                marginTop: "16px",
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
        ))
      )}

      <style>{`
        @media print {
          html, body { background: white !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          @page { size: A4 landscape; margin: 8mm; }
          .th-sheet { width: 100% !important; max-width: 100% !important; margin: 0 !important; box-shadow: none !important; padding: 0 !important; }
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

const th: React.CSSProperties = {
  border: "1px solid #000",
  padding: "3px 1px",
  textAlign: "center",
  fontWeight: "bold",
  fontSize: "9px",
  verticalAlign: "middle",
  background: "#fff",
};

/** Row labels down the left — bold, and allowed to wrap the way the paper does
 *  ("Humidity / (50 - 70 %)", "Corrective / Action"). */
const tdLabel: React.CSSProperties = {
  border: "1px solid #000",
  padding: "3px 4px",
  textAlign: "left",
  fontWeight: "bold",
  fontSize: "10px",
  verticalAlign: "middle",
};

const td: React.CSSProperties = {
  border: "1px solid #000",
  padding: "2px 1px",
  textAlign: "center",
  verticalAlign: "middle",
  fontSize: "9px",
  height: "26px",
};
