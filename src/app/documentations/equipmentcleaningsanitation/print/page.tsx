"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { docsApi } from "@/lib/api/documentations";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";
import SignatureCell from "@/components/ui/SignatureCell";
import {
  W202_FLOOR_EQUIPMENT, A185_FLOOR_EQUIPMENT, A185_OVERALL_EQUIPMENT, A185_OVERALL_KEY, MONTH_LABELS,
  migrateOverallNotesKey,
} from "@/config/equipmentCleaningFloors";

type BAStatus = "✓" | "✕" | "";

const FORM_TYPE = "equipmentcleaningsanitation";

// Floor display order — matches the create/edit FLOOR_EQUIPMENT ordering.
const W202_PRINT_FLOORS = Object.keys(W202_FLOOR_EQUIPMENT).filter((f) => f !== "Other / All");
const A185_PRINT_FLOORS = Object.keys(A185_FLOOR_EQUIPMENT);

// A record's month: explicit `month`, else derived from grid.record_date.
const monthOf = (r: any): string =>
  (r?.month || (r?.grid?.record_date ? String(r.grid.record_date).slice(0, 7) : "") || "").trim();

/** Plant-specific header table, shared by the daily floor sheets and the Overall sheet. */
function DocHeader({ isA185 }: { isA185: boolean }) {
  const formatLabel = isA185 ? "Equipment Cleaning Record" : "Equipment Cleaning & Sanitation Record";
  const docNo = isA185 ? "CFPLB.C4.F.68" : "CFPLA.C4.F.19";
  const issueDate = isA185 ? "04/08/2021" : "01/11/2017";
  const issueNo = isA185 ? "05" : "04";
  const revDate = isA185 ? "02/02/2026" : "01/10/2025";
  const revNo = isA185 ? "04" : "03";

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
      <tbody>
        <tr>
          <td rowSpan={4} style={{ ...tdHead, width: "120px", textAlign: "center" }}>
            <img src="/candor-logo.jpg" alt="Candor" style={{ width: "75px" }} />
          </td>
          <td style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>CANDOR FOODS PRIVATE LIMITED</td>
          <td style={tdHead}>Issue Date:</td>
          <td style={tdHead}>{issueDate}</td>
        </tr>
        <tr>
          <td rowSpan={2} style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>
            Format : {formatLabel}
          </td>
          <td style={tdHead}>Issue No:</td>
          <td style={tdHead}>{issueNo}</td>
        </tr>
        <tr>
          <td style={tdHead}>Revision Date:</td>
          <td style={tdHead}>{revDate}</td>
        </tr>
        <tr>
          <td style={{ ...tdHead, fontWeight: "bold", textAlign: "center" }}>Document No: {docNo}</td>
          <td style={tdHead}>Revision No.:</td>
          <td style={tdHead}>{revNo}</td>
        </tr>
      </tbody>
    </table>
  );
}

/** One printed page = one floor's record (header + grid + obs/corrective + footer). */
function FloorSheet({ record }: { record: Record<string, any> }) {
  // A185 prints its own plant-specific header + floor/equipment set; other
  // plants keep the existing generic set.
  const isA185 = (record?.warehouse || getStoredWarehouse()) === "A185";
  const FLOOR_EQUIPMENT = isA185 ? A185_FLOOR_EQUIPMENT : W202_FLOOR_EQUIPMENT;

  const gridObj = record?.grid || {};
  const cells: Record<string, Record<number | string, { B: BAStatus; A: BAStatus }>> = gridObj.cells || {};
  const daySigs: Record<string, { checkedBy?: string; verifiedBy?: string }> = gridObj.daySigs || {};
  // Floor-wise: show only this floor's equipment. Fall back to all cells if the
  // area isn't a known floor (keeps legacy single-record printing working).
  const floorEquipment = (FLOOR_EQUIPMENT as Record<string, string[]>)[(record?.area || "").trim()];
  const equipmentList = floorEquipment && floorEquipment.length ? floorEquipment : Object.keys(cells);
  const selectedDates: number[] = Array.isArray(gridObj.selectedDates)
    ? gridObj.selectedDates
    : Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div
      className="bg-white mx-auto my-6 print:my-0 print:shadow-none print:w-full ecs-sheet"
      style={{
        width: "297mm",
        maxWidth: "100%",
        fontFamily: "'Calibri', 'Arial', sans-serif",
        color: "#000",
        boxShadow: "0 2px 20px rgba(0,0,0,.15)",
        padding: "8mm",
      }}
    >
      {/* Header (repeats on every floor page) */}
      <DocHeader isA185={isA185} />

      <div style={{ marginTop: "8px", marginBottom: "4px", fontSize: "11px", fontWeight: "bold" }}>
        Month: <span style={{ fontWeight: "normal" }}>{record?.month || ""}</span>
        <span style={{ marginLeft: "30px" }}>Floor / Area: <span style={{ fontWeight: "normal" }}>{record?.area || ""}</span></span>
        <span style={{ marginLeft: "30px", fontStyle: "italic", fontWeight: "normal", fontSize: "10px" }}>
          Dry cleaning with: compressed air; cleaning with: water + liquid soap + sanitation with: 70% IPA
        </span>
      </div>

      {/* Grid */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9px" }}>
        <thead>
          <tr>
            <th style={{ ...th, width: "30px" }} rowSpan={2}>Sr. No</th>
            <th style={{ ...th, width: "140px", textAlign: "left", paddingLeft: "4px" }} rowSpan={2}>Date</th>
            {selectedDates.map((d) => (
              <th key={`day-${d}`} style={{ ...th }} colSpan={2}>{d}</th>
            ))}
          </tr>
          <tr>
            {selectedDates.map((d) => (
              <Fragment key={`ba-${d}`}>
                <th style={{ ...th, width: "16px" }}>B</th>
                <th style={{ ...th, width: "16px" }}>A</th>
              </Fragment>
            ))}
          </tr>
          <tr>
            <th style={{ ...th, textAlign: "left", paddingLeft: "4px" }} colSpan={2 + selectedDates.length * 2}>
              Frequency: Before &amp; After Production
            </th>
          </tr>
        </thead>
        <tbody>
          {equipmentList.map((eq, idx) => (
            <tr key={eq}>
              <td style={td}>{idx + 1}</td>
              <td style={{ ...td, textAlign: "left", paddingLeft: "4px", fontWeight: "bold" }}>{eq}</td>
              {selectedDates.map((d) => {
                const cell = cells[eq]?.[d] || cells[eq]?.[String(d)] || { B: "", A: "" };
                return (
                  <Fragment key={`${eq}-${d}`}>
                    <td style={td}>{cell.B || ""}</td>
                    <td style={td}>{cell.A || ""}</td>
                  </Fragment>
                );
              })}
            </tr>
          ))}
          {/* Per-day signatories */}
          <tr>
            <td colSpan={2} style={{ ...td, textAlign: "left", paddingLeft: "4px", fontWeight: "bold" }}>Checked By</td>
            {selectedDates.map((d) => (
              <td key={`chk-${d}`} colSpan={2} style={{ ...td, padding: "1px", fontSize: "7px" }}>
                <SignatureCell name={daySigs[d]?.checkedBy || daySigs[String(d)]?.checkedBy} maxHeight={18} maxWidth={34} showName={false} />
              </td>
            ))}
          </tr>
          <tr>
            <td colSpan={2} style={{ ...td, textAlign: "left", paddingLeft: "4px", fontWeight: "bold" }}>Verified By</td>
            {selectedDates.map((d) => (
              <td key={`ver-${d}`} colSpan={2} style={{ ...td, padding: "1px", fontSize: "7px" }}>
                <SignatureCell name={daySigs[d]?.verifiedBy || daySigs[String(d)]?.verifiedBy} maxHeight={18} maxWidth={34} showName={false} />
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* Observations & Corrective Actions — two separate stacked boxes */}
      <div style={{ marginTop: "12px" }}>
        <div style={box}>
          <div style={boxLabel}>Observations</div>
          <div style={boxBody}>{record?.observations || ""}</div>
        </div>
        <div style={{ ...box, marginTop: "8px" }}>
          <div style={boxLabel}>Corrective Actions</div>
          <div style={boxBody}>{record?.corrective_action || ""}</div>
        </div>
      </div>

      {/* Footer (repeats on every floor page) */}
      <div style={{ marginTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", fontWeight: "bold" }}>
        <span>Prepared By: FST</span>
        <div style={{ border: "2px solid #6b46c1", color: "#6b46c1", padding: "3px 12px", fontSize: "10px", textAlign: "center", lineHeight: 1.2 }}>
          CONTROLLED<br />COPY
        </div>
        <span>Approved By: FSTL</span>
      </div>
    </div>
  );
}

/** A185-only page: equipment NOT in daily use, checked monthly (Jan–Dec). */
function OverallSheet({ record }: { record: Record<string, any> }) {
  const overall = record?.grid?.overall || {};
  const cells: Record<string, Record<number | string, BAStatus>> = overall.cells || {};
  const sigs: Record<string | number, { checkedBy?: string; verifiedBy?: string }> = overall.sigs || {};

  return (
    <div
      className="bg-white mx-auto my-6 print:my-0 print:shadow-none print:w-full ecs-sheet"
      style={{
        width: "297mm",
        maxWidth: "100%",
        fontFamily: "'Calibri', 'Arial', sans-serif",
        color: "#000",
        boxShadow: "0 2px 20px rgba(0,0,0,.15)",
        padding: "8mm",
      }}
    >
      <DocHeader isA185 />

      <div style={{ marginTop: "8px", marginBottom: "4px", fontSize: "11px", fontWeight: "bold" }}>
        Year: <span style={{ fontWeight: "normal" }}>{overall.year || ""}</span>
        <span style={{ marginLeft: "30px", fontStyle: "italic", fontWeight: "normal", fontSize: "10px" }}>
          Wet cleaning method (dry cleaning with compressed air, rinsing with water, cleaning with water and liquid soap, Rinsing With: Water: Sanitation With: 70% IPA)
        </span>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9px" }}>
        <thead>
          <tr>
            <th style={{ ...th, width: "30px" }}>Sr. No</th>
            <th style={{ ...th, width: "200px", textAlign: "left", paddingLeft: "4px" }}>Equipment (Not In Use)</th>
            {MONTH_LABELS.map((m) => (
              <th key={m} style={th}>{m}</th>
            ))}
          </tr>
          <tr>
            <th style={{ ...th, textAlign: "left", paddingLeft: "4px" }} colSpan={2 + MONTH_LABELS.length}>
              Frequency: Monthly — shrink wrap after cleaning
            </th>
          </tr>
        </thead>
        <tbody>
          {A185_OVERALL_EQUIPMENT.map((eq, idx) => (
            <tr key={eq}>
              <td style={td}>{idx + 1}</td>
              <td style={{ ...td, textAlign: "left", paddingLeft: "4px", fontWeight: "bold" }}>{eq}</td>
              {MONTH_LABELS.map((_, mi) => {
                const month = mi + 1;
                const status = cells[eq]?.[month] ?? cells[eq]?.[String(month)] ?? "";
                return <td key={`${eq}-${month}`} style={td}>{status}</td>;
              })}
            </tr>
          ))}
          <tr>
            <td colSpan={2} style={{ ...td, textAlign: "left", paddingLeft: "4px", fontWeight: "bold" }}>Checked By</td>
            {MONTH_LABELS.map((_, mi) => (
              <td key={`chk-${mi}`} style={{ ...td, padding: "1px", fontSize: "7px" }}>
                <SignatureCell name={sigs[mi + 1]?.checkedBy || sigs[String(mi + 1)]?.checkedBy} maxHeight={18} maxWidth={34} showName={false} />
              </td>
            ))}
          </tr>
          <tr>
            <td colSpan={2} style={{ ...td, textAlign: "left", paddingLeft: "4px", fontWeight: "bold" }}>Verified By</td>
            {MONTH_LABELS.map((_, mi) => (
              <td key={`ver-${mi}`} style={{ ...td, padding: "1px", fontSize: "7px" }}>
                <SignatureCell name={sigs[mi + 1]?.verifiedBy || sigs[String(mi + 1)]?.verifiedBy} maxHeight={18} maxWidth={34} showName={false} />
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      <div style={{ marginTop: "12px" }}>
        <div style={box}>
          <div style={boxLabel}>Observations</div>
          <div style={boxBody}>{record?.observations || ""}</div>
        </div>
        <div style={{ ...box, marginTop: "8px" }}>
          <div style={boxLabel}>Corrective Actions</div>
          <div style={boxBody}>{record?.corrective_action || ""}</div>
        </div>
      </div>

      <div style={{ marginTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", fontWeight: "bold" }}>
        <span>Prepared By: FST</span>
        <div style={{ border: "2px solid #6b46c1", color: "#6b46c1", padding: "3px 12px", fontSize: "10px", textAlign: "center", lineHeight: 1.2 }}>
          CONTROLLED<br />COPY
        </div>
        <span>Approved By: FSTL</span>
      </div>
    </div>
  );
}

export default function EquipmentCleaningPrintPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recordId = searchParams.get("id");
  const [records, setRecords] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!recordId) { setLoading(false); return; }
      try {
        setLoading(true);
        // 1) The clicked record gives us the month + warehouse to gather by.
        const clicked = (await docsApi.get(FORM_TYPE, Number(recordId))).data;
        const month = monthOf(clicked);
        const warehouse = clicked?.warehouse || getStoredWarehouse();
        const isA185 = warehouse === "A185";
        const PRINT_FLOORS = isA185 ? A185_PRINT_FLOORS : W202_PRINT_FLOORS;
        const FLOOR_EQUIPMENT = isA185 ? A185_FLOOR_EQUIPMENT : W202_FLOOR_EQUIPMENT;

        // 2) All records for that warehouse, narrowed to the same month.
        const list = await docsApi.list(FORM_TYPE, { per_page: 500, ...(warehouse ? { warehouse } : {}) });
        const sameMonth = (list.records || []).filter(
          (r) => monthOf(r) === month && (warehouse ? (r.warehouse || "") === warehouse : true)
        );

        // 3) Always include the clicked record; fetch each record's full grid.
        const ids = Array.from(new Set<number>([Number(recordId), ...sameMonth.map((r) => Number(r.id))]));
        const full = (await Promise.all(
          ids.map((id) => docsApi.get(FORM_TYPE, id).then((r) => r.data).catch(() => null))
        )).filter(Boolean) as Record<string, any>[];

        // 4) Build a per-floor cell + signature map. Handles both the new
        //    per-floor shape (grid.cellsByFloor) and the legacy flat shape
        //    (grid.cells), where the one grid is split across floors by equipment.
        const cellsByFloor: Record<string, Record<string, any>> = {};
        const daySigsByFloor: Record<string, Record<string, any>> = {};
        let selectedDates: number[] = [];
        const observationsParts: string[] = [];
        const correctiveParts: string[] = [];
        // Per-floor notes aggregated across records. When present, each floor sheet
        // shows only its own notes instead of the combined (legacy) blob.
        const notesByFloorAgg: Record<string, { observations: string; correctiveAction: string }> = {};
        // A185's "Overall" (equipment not in use) section — annual, not monthly.
        let overallYear = "";
        const overallCells: Record<string, Record<string, any>> = {};
        const overallSigs: Record<string, any> = {};
        const ensureFloor = (f: string) => {
          if (!cellsByFloor[f]) cellsByFloor[f] = {};
          if (!daySigsByFloor[f]) daySigsByFloor[f] = {};
        };

        for (const rec of full) {
          const g = rec?.grid || {};
          if (Array.isArray(g.selectedDates) && g.selectedDates.length > selectedDates.length) selectedDates = g.selectedDates;
          if (rec?.observations) observationsParts.push(rec.observations);
          if (rec?.corrective_action) correctiveParts.push(rec.corrective_action);
          if (g.notesByFloor && typeof g.notesByFloor === "object") {
            for (const [f, n] of Object.entries(g.notesByFloor)) {
              const note = (n as { observations?: string; correctiveAction?: string }) || {};
              const existing = notesByFloorAgg[f] || { observations: "", correctiveAction: "" };
              notesByFloorAgg[f] = {
                observations: [existing.observations, note.observations].filter(Boolean).join(" | "),
                correctiveAction: [existing.correctiveAction, note.correctiveAction].filter(Boolean).join(" | "),
              };
            }
          }

          if (g.cellsByFloor && typeof g.cellsByFloor === "object") {
            for (const [f, eqMap] of Object.entries(g.cellsByFloor)) {
              ensureFloor(f);
              for (const [eq, days] of Object.entries((eqMap as Record<string, any>) || {})) {
                cellsByFloor[f][eq] = { ...(cellsByFloor[f][eq] || {}), ...(days as Record<string, any>) };
              }
            }
            for (const [f, dayMap] of Object.entries(g.daySigsByFloor || {})) {
              ensureFloor(f);
              for (const [day, sig] of Object.entries((dayMap as Record<string, any>) || {})) {
                daySigsByFloor[f][day] = { ...(daySigsByFloor[f][day] || {}), ...(sig as Record<string, any>) };
              }
            }
          } else {
            // Legacy flat grid → distribute across each physical floor by equipment.
            const flatCells = g.cells || {};
            const flatSigs = g.daySigs || {};
            for (const f of PRINT_FLOORS) {
              ensureFloor(f);
              for (const eq of FLOOR_EQUIPMENT[f]) {
                if (flatCells[eq]) cellsByFloor[f][eq] = { ...(cellsByFloor[f][eq] || {}), ...flatCells[eq] };
              }
              for (const [day, sig] of Object.entries(flatSigs)) {
                daySigsByFloor[f][day] = { ...(daySigsByFloor[f][day] || {}), ...(sig as Record<string, any>) };
              }
            }
          }

          if (g.overall && typeof g.overall === "object") {
            if (g.overall.year) overallYear = g.overall.year;
            for (const [eq, months] of Object.entries(g.overall.cells || {})) {
              overallCells[eq] = { ...(overallCells[eq] || {}), ...(months as Record<string, any>) };
            }
            for (const [month2, sig] of Object.entries(g.overall.sigs || {})) {
              overallSigs[month2] = { ...(overallSigs[month2] || {}), ...(sig as Record<string, any>) };
            }
          }
        }
        if (selectedDates.length === 0) selectedDates = Array.from({ length: 31 }, (_, i) => i + 1);

        // When any record carries per-floor notes, use them; otherwise fall back
        // to the combined blob (legacy records that only had one shared note).
        // Notes saved under the section's old name ("Overall") are re-keyed onto
        // the current one so they still print after the rename.
        const notesAgg = migrateOverallNotesKey(notesByFloorAgg);
        const hasPerFloorNotes = Object.keys(notesAgg).length > 0;
        const notesFor = (floorKey: string) => ({
          observations: hasPerFloorNotes ? (notesAgg[floorKey]?.observations || "") : observationsParts.join(" | "),
          corrective_action: hasPerFloorNotes ? (notesAgg[floorKey]?.correctiveAction || "") : correctiveParts.join(" | "),
        });

        // 5) One synthesized page per physical floor, each with its own data.
        const floorSheets: Record<string, any>[] = PRINT_FLOORS.map((floor) => ({
          id: `${recordId}-${floor}`,
          kind: "floor",
          month,
          area: floor,
          warehouse,
          ...notesFor(floor),
          grid: { cells: cellsByFloor[floor] || {}, daySigs: daySigsByFloor[floor] || {}, selectedDates },
        }));

        // 6) A185 also gets one "Overall" page for equipment not in daily use.
        if (isA185) {
          floorSheets.push({
            id: `${recordId}-${A185_OVERALL_KEY}`,
            kind: "overall",
            warehouse,
            ...notesFor(A185_OVERALL_KEY),
            grid: { overall: { year: overallYear, cells: overallCells, sigs: overallSigs } },
          });
        }

        setRecords(floorSheets);
      } catch (e) {
        console.error("Failed to load records:", e);
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
          <p className="text-gray-600 text-sm">Loading records…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-300 print:bg-white">
      <div className="print:hidden sticky top-0 z-20 bg-white shadow-md px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/documentations/equipmentcleaningsanitation")}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            <ArrowLeft size={15} /> Back
          </button>
          <span className="text-sm text-gray-500">
            {records.length > 0
              ? `${records[0]?.month || ""} · ${records.length} page${records.length !== 1 ? "s" : ""}`
              : "No records"}
          </span>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-md"
        >
          <Printer size={15} /> Print
        </button>
      </div>

      {records.length === 0 ? (
        <div className="text-center text-gray-500 py-20">No record found to print.</div>
      ) : (
        records.map((rec, idx) => (
          <div key={rec.id ?? idx} style={idx < records.length - 1 ? { pageBreakAfter: "always" } : undefined}>
            {rec.kind === "overall" ? <OverallSheet record={rec} /> : <FloorSheet record={rec} />}
          </div>
        ))
      )}

      <style>{`
        @media print {
          html, body { background: white !important; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          @page { size: A4 landscape; margin: 6mm; }
          .print\\:w-full { width: 100% !important; max-width: 100% !important; margin: 0 !important; }
          .ecs-sheet { break-inside: avoid; }
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
  padding: "2px 2px",
  textAlign: "center",
  fontWeight: "bold",
  fontSize: "9px",
  verticalAlign: "middle",
};

const td: React.CSSProperties = {
  border: "1px solid #000",
  padding: "3px 2px",
  textAlign: "center",
  verticalAlign: "middle",
  fontSize: "9px",
  height: "18px",
};

const box: React.CSSProperties = {
  border: "1px solid #000",
};

const boxLabel: React.CSSProperties = {
  borderBottom: "1px solid #000",
  background: "#f3f3f3",
  fontWeight: "bold",
  fontSize: "11px",
  padding: "4px 8px",
};

const boxBody: React.CSSProperties = {
  padding: "8px",
  fontSize: "10px",
  minHeight: "48px",
  textAlign: "left",
  verticalAlign: "top",
  whiteSpace: "pre-wrap",
};
