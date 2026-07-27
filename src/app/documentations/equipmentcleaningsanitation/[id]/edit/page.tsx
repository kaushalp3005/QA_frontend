"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Brush, Undo2, Loader2 } from "lucide-react";
import { docsApi } from "@/lib/api/documentations";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";
import { CHECKED_BY_OPTIONS, QC_VERIFIED_BY_OPTIONS, filterSignaturesByWarehouse, type SignatureOption } from "@/lib/signatures";
import DocFormShell from "@/components/documentations/DocFormShell";
import DocSection from "@/components/documentations/DocSection";
import {
  W202_EQUIPMENT_LIST, W202_FLOOR_EQUIPMENT,
  A185_FLOOR_EQUIPMENT, A185_OVERALL_EQUIPMENT, A185_OVERALL_KEY, MONTH_LABELS,
} from "@/config/equipmentCleaningFloors";

const FORM_TYPE = "equipmentcleaningsanitation";

type BAStatus = "✓" | "✕" | "";
type Grid = Record<string, Record<number, { B: BAStatus; A: BAStatus }>>;
type RowSig = { checkedBy: string; verifiedBy: string };
type OverallGrid = Record<string, Record<number, BAStatus>>;

/** Compact per-day signatory dropdown, scoped to the active plant (A185 / W202). */
function CompactSignSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: SignatureOption[] }) {
  const visible = filterSignaturesByWarehouse(options, getStoredWarehouse());
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full min-w-[60px] text-[10px] px-1 py-0.5 border border-cream-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
      title={value || "Select"}
    >
      <option value="">—</option>
      {visible.filter((o) => o.name !== "Other").map((o) => (
        <option key={o.name} value={o.name}>{o.name}</option>
      ))}
    </select>
  );
}

function normalizeGrid(raw: any): Grid {
  // Rows not present in `raw` are simply absent — every render site falls
  // back to an empty {B:"",A:""} cell, so no pre-seeding is needed here.
  const base: Grid = {};
  if (!raw || typeof raw !== "object") return base;
  for (const eq of Object.keys(raw)) {
    const days = raw[eq];
    if (!days || typeof days !== "object") continue;
    if (!base[eq]) {
      base[eq] = {};
      for (let d = 1; d <= 31; d++) base[eq][d] = { B: "", A: "" };
    }
    for (const dayKey of Object.keys(days)) {
      const d = Number(dayKey);
      if (isNaN(d)) continue;
      const cell = days[dayKey] || {};
      base[eq][d] = {
        B: (cell.B === "✓" || cell.B === "✕" ? cell.B : "") as BAStatus,
        A: (cell.A === "✓" || cell.A === "✕" ? cell.A : "") as BAStatus,
      };
    }
  }
  return base;
}

export default function EquipmentCleaningSanitationEditPage() {
  const router = useRouter();
  const params = useParams();
  const recordId = Number(params.id);

  const [loadError, setLoadError] = useState("");
  const [loadingData, setLoadingData] = useState(true);

  // The record's own stored warehouse (once loaded) decides the floor set —
  // not the live selector, which may have moved on to a different plant.
  const [recordWarehouse, setRecordWarehouse] = useState<string>(getStoredWarehouse());
  const isA185 = recordWarehouse === "A185";
  const FLOOR_EQUIPMENT = isA185 ? A185_FLOOR_EQUIPMENT : W202_FLOOR_EQUIPMENT;
  const EQUIPMENT_LIST = isA185 ? Object.values(A185_FLOOR_EQUIPMENT).flat() : W202_EQUIPMENT_LIST;
  const FLOOR_OPTIONS = isA185 ? [...Object.keys(A185_FLOOR_EQUIPMENT), A185_OVERALL_KEY] : Object.keys(W202_FLOOR_EQUIPMENT);

  const [recordDate, setRecordDate] = useState("");
  // Notes are per-floor — each floor keeps its own Observations / Corrective Actions.
  const [notesByFloor, setNotesByFloor] = useState<Record<string, { observations: string; correctiveAction: string }>>({});
  const [floor, setFloor] = useState("");
  const [selectedDates, setSelectedDates] = useState<number[]>(Array.from({ length: 31 }, (_, i) => i + 1));
  // Per-floor data — each floor keeps its own grid + signatures.
  const [gridByFloor, setGridByFloor] = useState<Record<string, Grid>>({});
  const [daySigsByFloor, setDaySigsByFloor] = useState<Record<string, Record<number, RowSig>>>({});
  const [saving, setSaving] = useState<false | "draft" | "final">(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const historyRef = useRef<{ floor: string; grid: Grid }[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  // A185's "Overall" section — equipment NOT in daily use, checked monthly.
  const [overallYear, setOverallYear] = useState<string>(String(new Date().getFullYear()));
  const [overallGrid, setOverallGrid] = useState<OverallGrid>({});
  const [overallSigs, setOverallSigs] = useState<Record<number, RowSig>>({});
  const isOverall = floor === A185_OVERALL_KEY;

  const grid: Grid = gridByFloor[floor] || {};
  const daySigs: Record<number, RowSig> = daySigsByFloor[floor] || {};
  // The active floor's notes.
  const activeNotes = notesByFloor[floor] || { observations: "", correctiveAction: "" };
  const setActiveNote = (field: "observations" | "correctiveAction", value: string) =>
    setNotesByFloor((all) => ({
      ...all,
      [floor]: { observations: all[floor]?.observations || "", correctiveAction: all[floor]?.correctiveAction || "", [field]: value },
    }));

  const setCurrentGrid = (updater: (prev: Grid) => Grid) =>
    setGridByFloor((all) => ({ ...all, [floor]: updater(all[floor] || {}) }));

  const toggleOverallStatus = (eq: string, month: number) => {
    setOverallGrid((prev) => {
      const row = prev[eq] || {};
      const current = row[month] || "";
      const next: BAStatus = current === "" ? "✓" : current === "✓" ? "✕" : "";
      return { ...prev, [eq]: { ...row, [month]: next } };
    });
  };

  const updateOverallSig = (month: number, field: keyof RowSig, value: string) => {
    setOverallSigs((prev) => {
      const existing: RowSig = prev[month] || { checkedBy: "", verifiedBy: "" };
      return { ...prev, [month]: { ...existing, [field]: value } };
    });
  };

  useEffect(() => {
    docsApi.get(FORM_TYPE, recordId)
      .then((res) => {
        const d = res.data;
        // Resolve the record's own warehouse here (not the closed-over
        // component state, which is still the pre-fetch default).
        const wh = d.warehouse || getStoredWarehouse();
        setRecordWarehouse(wh);
        const a185 = wh === "A185";
        const floorEquipment = a185 ? A185_FLOOR_EQUIPMENT : W202_FLOOR_EQUIPMENT;
        const printFloors = a185 ? Object.keys(A185_FLOOR_EQUIPMENT) : Object.keys(W202_FLOOR_EQUIPMENT).filter((f) => f !== "Other / All");

        // month field: prefer d.month, fall back to slicing record_date
        const month = d.month || (d.grid?.record_date ? String(d.grid.record_date).slice(0, 7) : "");
        setRecordDate(month);
        if (Array.isArray(d.grid?.selectedDates)) setSelectedDates(d.grid.selectedDates);

        const g = d.grid || {};
        if (g.cellsByFloor && typeof g.cellsByFloor === "object") {
          // New per-floor shape.
          const byFloor: Record<string, Grid> = {};
          for (const [f, eqMap] of Object.entries(g.cellsByFloor)) byFloor[f] = normalizeGrid(eqMap);
          setGridByFloor(byFloor);
          setDaySigsByFloor(g.daySigsByFloor || {});
          setFloor(Object.keys(byFloor)[0] || d.grid?.floor || "");
        } else {
          // Legacy flat shape: distribute the one grid across every physical floor
          // (filtered to each floor's equipment), and copy day-signatures to each.
          const flat = normalizeGrid(g.cells || {});
          const flatSigs: Record<number, RowSig> = g.daySigs || {};
          const byFloor: Record<string, Grid> = {};
          const sigsByFloor: Record<string, Record<number, RowSig>> = {};
          for (const f of printFloors) {
            const fg: Grid = {};
            for (const eq of floorEquipment[f]) {
              fg[eq] = flat[eq] || Object.fromEntries(Array.from({ length: 31 }, (_, i) => [i + 1, { B: "", A: "" }])) as Grid[string];
            }
            byFloor[f] = fg;
            sigsByFloor[f] = { ...flatSigs };
          }
          setGridByFloor(byFloor);
          setDaySigsByFloor(sigsByFloor);
          setFloor(printFloors[0]);
        }

        // Per-floor notes; legacy records only carry a single shared note, so
        // seed it under the first floor rather than losing it.
        const firstFloor = (g.cellsByFloor && typeof g.cellsByFloor === "object")
          ? (Object.keys(g.cellsByFloor)[0] || "")
          : printFloors[0];
        const loadedNotes: Record<string, { observations: string; correctiveAction: string }> =
          g.notesByFloor && typeof g.notesByFloor === "object" ? { ...g.notesByFloor } : {};
        if (Object.keys(loadedNotes).length === 0 && (d.observations || d.corrective_action)) {
          loadedNotes[firstFloor] = { observations: d.observations || "", correctiveAction: d.corrective_action || "" };
        }
        setNotesByFloor(loadedNotes);

        if (g.overall && typeof g.overall === "object") {
          setOverallYear(String(g.overall.year || new Date().getFullYear()));
          const rawCells = g.overall.cells || {};
          const cells: OverallGrid = {};
          for (const eq of Object.keys(rawCells)) {
            cells[eq] = {};
            for (const [mk, v] of Object.entries(rawCells[eq] || {})) {
              const m = Number(mk);
              if (!isNaN(m)) cells[eq][m] = (v === "✓" || v === "✕" ? v : "") as BAStatus;
            }
          }
          setOverallGrid(cells);
          const rawSigs = g.overall.sigs || {};
          const sigs: Record<number, RowSig> = {};
          for (const [mk, s] of Object.entries(rawSigs)) {
            const m = Number(mk);
            if (!isNaN(m)) sigs[m] = s as RowSig;
          }
          setOverallSigs(sigs);
        }
      })
      .catch(() => setLoadError("Failed to load record."))
      .finally(() => setLoadingData(false));
  }, [recordId]);

  const visibleEquipment: string[] = !floor
    ? EQUIPMENT_LIST
    : (FLOOR_EQUIPMENT[floor] || EQUIPMENT_LIST);

  const pushHistory = () => {
    const cur = gridByFloor[floor] || {};
    historyRef.current = [...historyRef.current.slice(-49), { floor, grid: JSON.parse(JSON.stringify(cur)) }];
    setCanUndo(true);
  };

  const handleUndo = () => {
    const last = historyRef.current.pop();
    if (!last) return;
    setFloor(last.floor);
    setGridByFloor((all) => ({ ...all, [last.floor]: last.grid }));
    setCanUndo(historyRef.current.length > 0);
  };

  const toggleStatus = (eq: string, day: number, phase: "B" | "A") => {
    pushHistory();
    setCurrentGrid((prev) => {
      const row = prev[eq] || {};
      const cell = row[day] || { B: "" as BAStatus, A: "" as BAStatus };
      const current = cell[phase];
      const next: BAStatus = current === "" ? "✓" : current === "✓" ? "✕" : "";
      return { ...prev, [eq]: { ...row, [day]: { ...cell, [phase]: next } } };
    });
  };

  // Vertical "tick all" — mark every equipment (B & A) for a single day/column.
  const markColumnAllOK = (day: number) => {
    const allTicked = visibleEquipment.every((eq) => {
      const cell = grid[eq]?.[day];
      return cell?.B === "✓" && cell?.A === "✓";
    });
    pushHistory();
    setCurrentGrid((prev) => {
      const next: Grid = { ...prev };
      visibleEquipment.forEach((eq) => {
        const row = { ...(next[eq] || {}) };
        row[day] = allTicked ? { B: "", A: "" } : { B: "✓", A: "✓" };
        next[eq] = row;
      });
      return next;
    });
  };

  const updateDaySig = (day: number, field: keyof RowSig, value: string) => {
    setDaySigsByFloor((all) => {
      const cur = all[floor] || {};
      const existing: RowSig = cur[day] || { checkedBy: "", verifiedBy: "" };
      return { ...all, [floor]: { ...cur, [day]: { ...existing, [field]: value } } };
    });
  };

  const handleSave = async (status: "draft" | "submitted") => {
    setSaving(status === "draft" ? "draft" : "final");
    setMessage(null);
    try {
      const hasData = (g: Grid) =>
        Object.values(g || {}).some((row) => Object.values(row).some((c) => c.B || c.A));
      const floorsWithData = Object.keys(gridByFloor).filter((f) => f && hasData(gridByFloor[f]));
      const overallHasData = Object.values(overallGrid).some((row) => Object.values(row).some((v) => v));
      if (overallHasData) floorsWithData.push(A185_OVERALL_KEY);
      // Top-level observations/corrective_action = combined, floor-labelled summary
      // of the per-floor notes (kept for the DB columns and legacy consumers).
      const noteEntries = Object.entries(notesByFloor).filter(([, n]) => n && (n.observations?.trim() || n.correctiveAction?.trim()));
      const combinedObservations = noteEntries
        .filter(([, n]) => n.observations?.trim())
        .map(([f, n]) => `${f || "All Equipment"}: ${n.observations.trim()}`)
        .join("\n");
      const combinedCorrective = noteEntries
        .filter(([, n]) => n.correctiveAction?.trim())
        .map(([f, n]) => `${f || "All Equipment"}: ${n.correctiveAction.trim()}`)
        .join("\n");
      await docsApi.update(FORM_TYPE, recordId, {
        // Keep the record's own warehouse — not the live selector, which may
        // have moved on to a different plant while this record was open.
        warehouse: recordWarehouse || null,
        month: recordDate,
        area: floorsWithData.join(", ") || floor,
        observations: combinedObservations,
        corrective_action: combinedCorrective,
        grid: {
          selectedDates, cellsByFloor: gridByFloor, record_date: recordDate, daySigsByFloor, notesByFloor,
          ...(isA185 ? { overall: { year: overallYear, cells: overallGrid, sigs: overallSigs } } : {}),
        },
        status,
      });
      if (status === "submitted") {
        setMessage({ kind: "ok", text: "Record updated." });
        setTimeout(() => router.push(`/documentations/${FORM_TYPE}`), 800);
      } else {
        setMessage({ kind: "ok", text: "Draft saved." });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed.";
      setMessage({ kind: "err", text: msg });
    } finally {
      setSaving(false);
    }
  };

  if (loadingData) {
    return (
      <DocFormShell title="Equipment Cleaning & Sanitation" docNo="CFPLA.C4.F.19" subtitle="Issue 05 · Rev 04 · 01/12/2025" icon={Brush} width="full">
        <div className="flex items-center justify-center py-20 gap-3 text-ink-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading record…</span>
        </div>
      </DocFormShell>
    );
  }

  if (loadError) {
    return (
      <DocFormShell title="Equipment Cleaning & Sanitation" docNo="CFPLA.C4.F.19" subtitle="Issue 05 · Rev 04 · 01/12/2025" icon={Brush} width="full">
        <div className="surface-card p-4 border-l-4 border-danger-500 text-danger-700 text-sm">{loadError}</div>
      </DocFormShell>
    );
  }

  return (
    <DocFormShell
      title="Equipment Cleaning & Sanitation"
      docNo={isA185 ? "CFPLB.C4.F.68" : "CFPLA.C4.F.19"}
      subtitle={isA185 ? "Issue 05 · Rev 04 · 02/02/2026" : "Issue 05 · Rev 04 · 01/12/2025"}
      icon={Brush}
      width="full"
      note="Frequency: Before & After Production · Dry: compressed air · Wet: lint-free wipe · Sanitization: 70% IPA"
    >
      <DocSection title="Period & Area">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {isOverall ? (
            <div>
              <label className="label-base">Year</label>
              <input type="number" value={overallYear} onChange={(e) => setOverallYear(e.target.value)} className="input-base" placeholder="e.g. 2026" />
            </div>
          ) : (
            <div>
              <label className="label-base">Month</label>
              <input type="month" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} className="input-base" />
            </div>
          )}
          <div>
            <label className="label-base">Floor</label>
            <select value={floor} onChange={(e) => setFloor(e.target.value)} className="input-base">
              <option value="">All Equipment</option>
              {FLOOR_OPTIONS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>
        {isOverall ? (
          <p className="text-[11px] text-ink-400 italic mt-3">
            Equipment not in daily use — checked <strong>monthly</strong> and shrink-wrapped after cleaning. Click any cell to cycle:{" "}
            <span className="text-success-600 font-bold">✓</span> → <span className="text-danger-600 font-bold">✕</span> → empty.
          </p>
        ) : (
          <p className="text-[11px] text-ink-400 italic mt-3">
            Cell legend — <strong>B</strong> = Before production (top), <strong>A</strong> = After (bottom). Click any cell to cycle:{" "}
            <span className="text-success-600 font-bold">✓</span> → <span className="text-danger-600 font-bold">✕</span> → empty.
          </p>
        )}
      </DocSection>

      {isOverall ? (
      <DocSection
        title="Overall — Equipment Not In Use"
        description={`${A185_OVERALL_EQUIPMENT.length} equipment × 12 months`}
        bleed
      >
        <div className="overflow-x-auto">
          <table className="text-xs">
            <thead className="bg-cream-100/70 border-b border-cream-300">
              <tr>
                <th className="px-2 py-2 sticky left-0 bg-cream-100 z-10 text-[11px] font-semibold uppercase text-ink-400">Sr</th>
                <th className="px-2 py-2 sticky left-8 bg-cream-100 z-10 min-w-[180px] text-left text-[11px] font-semibold uppercase text-ink-400">Equipment</th>
                {MONTH_LABELS.map((m) => (
                  <th key={m} className="px-2 py-2 text-center text-[11px] font-semibold text-ink-400 border-l border-cream-300">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {A185_OVERALL_EQUIPMENT.map((eq, idx) => (
                <tr key={eq} className="hover:bg-cream-100/60">
                  <td className="px-1 py-1 text-center sticky left-0 bg-cream-50 text-ink-400 font-medium">{idx + 1}</td>
                  <td className="px-2 py-1 sticky left-8 bg-cream-50 font-semibold whitespace-nowrap text-ink-500">{eq}</td>
                  {MONTH_LABELS.map((_, mi) => {
                    const month = mi + 1;
                    const status = overallGrid[eq]?.[month] || "";
                    return (
                      <td key={`${eq}-${month}`} className="p-0 border-l border-cream-300 align-middle">
                        <div
                          className={`px-2 py-2 text-center cursor-pointer select-none font-bold ${
                            status === "✓" ? "bg-success-50 text-success-700" : status === "✕" ? "bg-danger-50 text-danger-600" : ""
                          }`}
                          onClick={() => toggleOverallStatus(eq, month)}
                        >
                          {status || <span className="text-ink-300 text-[9px]">—</span>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-t-2 border-cream-300">
                <td className="px-1 py-1 sticky left-0 bg-cream-100 z-10"></td>
                <td className="px-2 py-1 sticky left-8 bg-cream-100 z-10 text-right text-[10px] font-semibold uppercase text-ink-500 whitespace-nowrap">Checked By</td>
                {MONTH_LABELS.map((_, mi) => (
                  <td key={`chk-${mi}`} className="p-0.5 border-l border-cream-300 align-middle bg-cream-100/50">
                    <CompactSignSelect value={overallSigs[mi + 1]?.checkedBy || ""} onChange={(v) => updateOverallSig(mi + 1, "checkedBy", v)} options={CHECKED_BY_OPTIONS} />
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-1 py-1 sticky left-0 bg-cream-100 z-10"></td>
                <td className="px-2 py-1 sticky left-8 bg-cream-100 z-10 text-right text-[10px] font-semibold uppercase text-ink-500 whitespace-nowrap">Verified By</td>
                {MONTH_LABELS.map((_, mi) => (
                  <td key={`ver-${mi}`} className="p-0.5 border-l border-cream-300 align-middle bg-cream-100/50">
                    <CompactSignSelect value={overallSigs[mi + 1]?.verifiedBy || ""} onChange={(v) => updateOverallSig(mi + 1, "verifiedBy", v)} options={QC_VERIFIED_BY_OPTIONS} />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </DocSection>
      ) : (
      <DocSection
        title="Equipment × Date Grid"
        description={`${visibleEquipment.length} equipment × ${selectedDates.length} day${selectedDates.length !== 1 ? "s" : ""}`}
        bleed
        actions={
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md border border-cream-300 text-ink-500 hover:text-brand-500 hover:border-brand-500 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Undo last cell change"
          >
            <Undo2 className="w-3.5 h-3.5" /> Undo
          </button>
        }
      >
        <p className="text-[11px] text-ink-400 italic px-4 pt-3 sm:hidden">← Swipe to view all columns</p>
        <div className="overflow-x-auto">
          <table className="text-xs">
            <thead className="bg-cream-100/70 border-b border-cream-300">
              <tr>
                <th className="px-2 py-2 sticky left-0 bg-cream-100 z-10 text-[11px] font-semibold uppercase text-ink-400">Sr</th>
                <th className="px-2 py-2 sticky left-8 bg-cream-100 z-10 min-w-[140px] text-left text-[11px] font-semibold uppercase text-ink-400">Equipment</th>
                {selectedDates.map((d) => (
                  <th key={d} className="px-1 py-2 text-center text-[11px] font-semibold text-ink-400 border-l border-cream-300">
                    <div className="flex flex-col items-center gap-1">
                      <span>{d}</span>
                      <button
                        onClick={() => markColumnAllOK(d)}
                        className="text-[9px] font-bold leading-none bg-success-50 text-success-700 px-1.5 py-0.5 rounded hover:bg-success-100"
                        title={`Mark all equipment (B & A) as ✓ for day ${d}`}
                      >
                        ✓
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {visibleEquipment.map((eq, idx) => (
                <tr key={eq} className="hover:bg-cream-100/60">
                  <td className="px-1 py-1 text-center sticky left-0 bg-cream-50 text-ink-400 font-medium">{idx + 1}</td>
                  <td className="px-2 py-1 sticky left-8 bg-cream-50 font-semibold whitespace-nowrap text-ink-500">{eq}</td>
                  {selectedDates.map((d) => {
                    const cell = grid[eq]?.[d] || { B: "" as BAStatus, A: "" as BAStatus };
                    return (
                      <td key={`${eq}-${d}`} className="p-0 border-l border-cream-300 align-middle">
                        <div className="flex flex-col">
                          <div
                            className={`px-1 py-1 text-center cursor-pointer select-none font-bold border-b border-cream-200 ${
                              cell.B === "✓" ? "bg-success-50 text-success-700" : cell.B === "✕" ? "bg-danger-50 text-danger-600" : ""
                            }`}
                            onClick={() => toggleStatus(eq, d, "B")}
                            title={`Before · day ${d}`}
                          >
                            {cell.B || <span className="text-ink-300 text-[9px]">B</span>}
                          </div>
                          <div
                            className={`px-1 py-1 text-center cursor-pointer select-none font-bold ${
                              cell.A === "✓" ? "bg-success-50 text-success-700" : cell.A === "✕" ? "bg-danger-50 text-danger-600" : ""
                            }`}
                            onClick={() => toggleStatus(eq, d, "A")}
                            title={`After · day ${d}`}
                          >
                            {cell.A || <span className="text-ink-300 text-[9px]">A</span>}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Per-day signatories — one dropdown per date column */}
              <tr className="border-t-2 border-cream-300">
                <td className="px-1 py-1 sticky left-0 bg-cream-100 z-10"></td>
                <td className="px-2 py-1 sticky left-8 bg-cream-100 z-10 text-right text-[10px] font-semibold uppercase text-ink-500 whitespace-nowrap">Checked By</td>
                {selectedDates.map((d) => (
                  <td key={`chk-${d}`} className="p-0.5 border-l border-cream-300 align-middle bg-cream-100/50">
                    <CompactSignSelect value={daySigs[d]?.checkedBy || ""} onChange={(v) => updateDaySig(d, "checkedBy", v)} options={CHECKED_BY_OPTIONS} />
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-1 py-1 sticky left-0 bg-cream-100 z-10"></td>
                <td className="px-2 py-1 sticky left-8 bg-cream-100 z-10 text-right text-[10px] font-semibold uppercase text-ink-500 whitespace-nowrap">Verified By</td>
                {selectedDates.map((d) => (
                  <td key={`ver-${d}`} className="p-0.5 border-l border-cream-300 align-middle bg-cream-100/50">
                    <CompactSignSelect value={daySigs[d]?.verifiedBy || ""} onChange={(v) => updateDaySig(d, "verifiedBy", v)} options={QC_VERIFIED_BY_OPTIONS} />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </DocSection>
      )}

      <DocSection title="Approvals & Notes" description={`Notes for: ${floor || "All Equipment"} — each floor keeps its own`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label-base">Observations</label>
            <textarea value={activeNotes.observations} onChange={(e) => setActiveNote("observations", e.target.value)} rows={3} className="input-base" />
          </div>
          <div>
            <label className="label-base">Corrective Actions</label>
            <textarea value={activeNotes.correctiveAction} onChange={(e) => setActiveNote("correctiveAction", e.target.value)} rows={3} className="input-base" />
          </div>
        </div>
      </DocSection>

      {message && (
        <div className={`surface-card p-3 text-sm font-medium ${message.kind === "ok" ? "border-l-4 border-success-500 text-success-800 bg-success-50" : "border-l-4 border-danger-500 text-danger-700 bg-danger-50"}`}>
          {message.text}
        </div>
      )}

      <div className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-ink-400">
          Prepared By: <span className="font-semibold text-ink-500">FST</span>
          <span className="mx-2 text-cream-300">|</span>
          Approved By: <span className="font-semibold text-ink-500">FSTL</span>
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <button onClick={() => handleSave("draft")} disabled={saving !== false} className="btn-outline">
            {saving === "draft" ? "Saving…" : "Save Draft"}
          </button>
          <button onClick={() => handleSave("submitted")} disabled={saving !== false} className="btn-primary">
            {saving === "final" ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </DocFormShell>
  );
}
