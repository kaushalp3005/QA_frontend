"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

type BAStatus = "✓" | "✕" | "";
type Grid = Record<string, Record<number, { B: BAStatus; A: BAStatus }>>;
type RowSig = { checkedBy: string; verifiedBy: string };
type OverallGrid = Record<string, Record<number, BAStatus>>;

export default function EquipmentCleaningSanitationRecord() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateFrom = searchParams.get("duplicateFrom");
  // A185 uses its own floor set (Production / Packing / Mezzanine + Overall)
  // from CFPLB.C4.F.68; every other plant keeps the generic CFPLA.C4.F.19 set.
  const isA185 = getStoredWarehouse() === "A185";
  const FLOOR_EQUIPMENT = isA185 ? A185_FLOOR_EQUIPMENT : W202_FLOOR_EQUIPMENT;
  const EQUIPMENT_LIST = isA185 ? Object.values(A185_FLOOR_EQUIPMENT).flat() : W202_EQUIPMENT_LIST;
  const FLOOR_OPTIONS = isA185 ? [...Object.keys(A185_FLOOR_EQUIPMENT), A185_OVERALL_KEY] : Object.keys(W202_FLOOR_EQUIPMENT);

  const [recordDate, setRecordDate] = useState("");
  const [observations, setObservations] = useState("");
  const [correctiveActions, setCorrectiveActions] = useState("");
  const [floor, setFloor] = useState<string>("");
  const [selectedDates, setSelectedDates] = useState<number[]>(Array.from({ length: 31 }, (_, i) => i + 1));
  const [recordId, setRecordId] = useState<number | null>(null);
  const [saving, setSaving] = useState<false | "draft" | "final">(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  // Per-floor data — each floor keeps its own grid + signatures so same-named
  // equipment (Weight Machine, Sorting Tables, …) never bleeds across floors.
  const [gridByFloor, setGridByFloor] = useState<Record<string, Grid>>({});
  const [daySigsByFloor, setDaySigsByFloor] = useState<Record<string, Record<number, RowSig>>>({});
  const historyRef = useRef<{ floor: string; grid: Grid }[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  // A185's "Overall" section — equipment NOT in daily use, checked monthly
  // (Jan–Dec) instead of the daily Before/After grid the floors above use.
  const [overallYear, setOverallYear] = useState<string>(String(new Date().getFullYear()));
  const [overallGrid, setOverallGrid] = useState<OverallGrid>({});
  const [overallSigs, setOverallSigs] = useState<Record<number, RowSig>>({});
  const isOverall = floor === A185_OVERALL_KEY;
  const [loadingRecord, setLoadingRecord] = useState(!!duplicateFrom);

  // Duplicate mode: load a saved record's grid data as a fresh, unsaved entry.
  // recordId is deliberately left null so Save creates a new record.
  useEffect(() => {
    if (!duplicateFrom) return;
    setLoadingRecord(true);
    docsApi.get(FORM_TYPE, Number(duplicateFrom))
      .then((res) => {
        const d = res.data;
        const g = d?.grid || {};
        setRecordDate(g.record_date || "");
        setObservations(d?.observations || "");
        setCorrectiveActions(d?.corrective_action || "");
        if (Array.isArray(g.selectedDates) && g.selectedDates.length > 0) setSelectedDates(g.selectedDates);
        setGridByFloor(g.cellsByFloor || {});
        setDaySigsByFloor(g.daySigsByFloor || {});
        const floorKeys = Object.keys(g.cellsByFloor || {});
        if (floorKeys.length > 0) setFloor(floorKeys[0]);
        if (isA185 && g.overall) {
          setOverallYear(g.overall.year || String(new Date().getFullYear()));
          setOverallGrid(g.overall.cells || {});
          setOverallSigs(g.overall.sigs || {});
        }
      })
      .catch((e) => console.error("Failed to load record to duplicate:", e))
      .finally(() => setLoadingRecord(false));
  }, [duplicateFrom, isA185]);

  // The active floor's grid + signatures (empty until the floor is first touched).
  const grid: Grid = gridByFloor[floor] || {};
  const daySigs: Record<number, RowSig> = daySigsByFloor[floor] || {};

  const setCurrentGrid = (updater: (prev: Grid) => Grid) =>
    setGridByFloor((all) => ({ ...all, [floor]: updater(all[floor] || {}) }));

  // Equipment rows for current floor filter. We union the floor's list with
  // EQUIPMENT_LIST so floor-specific items (e.g. "Magnet", "L-sealer") still
  // show up even though they're not in the master EQUIPMENT_LIST, while
  // preserving original ordering when "All Equipment" is selected.
  const visibleEquipment: string[] = !floor
    ? EQUIPMENT_LIST
    : (FLOOR_EQUIPMENT[floor] || EQUIPMENT_LIST);

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

  const buildPayload = (status: "draft" | "submitted") => {
    const hasData = (g: Grid) =>
      Object.values(g || {}).some((row) => Object.values(row).some((c) => c.B || c.A));
    const floorsWithData = Object.keys(gridByFloor).filter((f) => f && hasData(gridByFloor[f]));
    const overallHasData = Object.values(overallGrid).some((row) => Object.values(row).some((v) => v));
    if (overallHasData) floorsWithData.push(A185_OVERALL_KEY);
    return {
      warehouse: getStoredWarehouse() || null,
      month: recordDate ? recordDate.slice(0, 7) : "",
      area: floorsWithData.join(", ") || floor,
      observations,
      corrective_action: correctiveActions,
      grid: {
        selectedDates, cellsByFloor: gridByFloor, record_date: recordDate, daySigsByFloor,
        ...(isA185 ? { overall: { year: overallYear, cells: overallGrid, sigs: overallSigs } } : {}),
      },
      status,
    };
  };

  const handleSave = async (status: "draft" | "submitted") => {
    setSaving(status === "draft" ? "draft" : "final");
    setMessage(null);
    try {
      const payload = buildPayload(status);
      if (recordId == null) {
        const res = await docsApi.create(FORM_TYPE, payload);
        const newId = res.data?.id as number | undefined;
        if (typeof newId === "number") setRecordId(newId);
      } else {
        await docsApi.update(FORM_TYPE, recordId, payload);
      }
      if (status === "submitted") {
        setMessage({ kind: "ok", text: "Record submitted." });
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

  if (loadingRecord) {
    return (
      <DocFormShell title="Equipment Cleaning & Sanitation" docNo={isA185 ? "CFPLB.C4.F.68" : "CFPLA.C4.F.19"} icon={Brush} width="full">
        <div className="surface-card p-8 flex items-center justify-center gap-2 text-sm text-ink-500">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading record to duplicate…
        </div>
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
      note={duplicateFrom ? `Duplicating record #${duplicateFrom} — adjust as needed, then Submit to save as a new record.` : "Frequency: Before & After Production · Dry: compressed air · Wet: lint-free wipe · Sanitization: 70% IPA"}
    >
      {recordId != null && (
        <div className="surface-card p-3 border-l-4 border-warning-500 bg-warning-50 text-xs text-warning-800 font-medium">
          Draft <span className="font-bold">#{recordId}</span> in progress. Use <strong>Submit Partially</strong> to save progress, or <strong>Submit</strong> to finalize.
        </div>
      )}

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

      <DocSection title="Approvals & Notes">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label-base">Observations</label>
            <textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={3} className="input-base" />
          </div>
          <div>
            <label className="label-base">Corrective Actions</label>
            <textarea value={correctiveActions} onChange={(e) => setCorrectiveActions(e.target.value)} rows={3} className="input-base" />
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
          <button
            onClick={() => handleSave("draft")}
            disabled={saving !== false}
            className="btn-outline"
          >
            {saving === "draft" ? "Saving draft..." : "Submit Partially"}
          </button>
          <button
            onClick={() => handleSave("submitted")}
            disabled={saving !== false}
            className="btn-primary"
          >
            {saving === "final" ? "Submitting..." : "Submit Record"}
          </button>
        </div>
      </div>
    </DocFormShell>
  );
}
