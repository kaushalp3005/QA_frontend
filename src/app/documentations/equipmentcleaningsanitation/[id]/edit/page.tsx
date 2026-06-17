"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Brush, Undo2, Loader2 } from "lucide-react";
import { docsApi } from "@/lib/api/documentations";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";
import { CHECKED_BY_OPTIONS, QC_VERIFIED_BY_OPTIONS, filterSignaturesByWarehouse, type SignatureOption } from "@/lib/signatures";
import DocFormShell from "@/components/documentations/DocFormShell";
import DocSection from "@/components/documentations/DocSection";

const FORM_TYPE = "equipmentcleaningsanitation";

const EQUIPMENT_LIST = [
  "Weight Machine", "Sealing Machine", "Foot Sealer", "Strapping Machine", "Shrink Wrap Machine",
  "Web Sealer", "Pet Sealer", "Metal Detector", "Vacuum Machine", "FSS Machine", "Tray Roaster",
  "Flow Wrap Machines", "Oven-Roasting", "Mixers", "Cutter", "Slicer", "X-Ray Machine", "Cup Sealer",
  "Chocolate Enrober", "Dicer", "Blast Freezer", "Deep Freezer", "Sorting Tables", "Roasting Tray",
  "Coating Pan", "Salinity Tank", "Blancher", "Sheet & Cut Machine", "Paddle Mixer", "Pulveriser",
  "Tempering Machine", "Kruger Machine", "Manual Cutter", "Vibro Shifter", "Destoner",
  "Hand Magnet", "Vacuum Packing Machine",
];

const FLOOR_EQUIPMENT: Record<string, string[]> = {
  "Lower Basement": ["Shrink Wrap Machine", "Pet Sealer", "Vacuum Machine", "Strapping Machine", "L-sealer", "Web Sealer", "Foot Sealer", "Hand Sealer", "Weight Machine", "Sealing Machine", "Sorting Tables", "Hand Magnet"],
  "Upper Basement": ["Metal Detector", "Magnet", "Weight Machine", "Sealing Machine", "Sorting Tables", "Strapping Machine"],
  "First Floor": ["Metal Detector", "FFS Machine", "Destoner", "Vibro Shifter", "Strapping Machine", "Magnet", "Weight Machine", "Sealing Machine", "Sorting Tables"],
  "First Floor Mezz": ["Metal Detector", "FFS Machine", "Magnet", "Weight Machine", "Sealing Machine", "Foot Sealer", "Sorting Tables", "Vacuum Packing Machine"],
  "Second Floor": ["Kruger Machine", "Sheet & Cut Machine", "Manual Cutter", "Oven-Roasting", "Tray Roaster", "Roasting Tray", "Tempering Machine", "Chocolate Enrober", "Flow Wrap Machines", "X-Ray Machine", "Coating Pan", "Paddle Mixer", "Slicer", "Mixers", "Pulveriser", "Magnet", "Deep Freezer", "Weight Machine", "Sealing Machine", "Shrink Wrap Machine", "Foot Sealer"],
  "Terrace Floor": ["Coating Pan", "Slicer", "Dicer", "Blancher", "Magnet", "Salinity Tank", "Sorting Tables", "Weight Machine", "Sealing Machine", "Foot Sealer", "Vacuum Machine", "Tray Roaster", "Roasting Tray"],
  "Other / All": EQUIPMENT_LIST,
};

type BAStatus = "✓" | "✕" | "";
type Grid = Record<string, Record<number, { B: BAStatus; A: BAStatus }>>;
type RowSig = { checkedBy: string; verifiedBy: string };

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

function emptyGrid(): Grid {
  const init: Grid = {};
  EQUIPMENT_LIST.forEach((eq) => {
    init[eq] = {};
    for (let d = 1; d <= 31; d++) init[eq][d] = { B: "", A: "" };
  });
  return init;
}

function normalizeGrid(raw: any): Grid {
  const base = emptyGrid();
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

  const [recordDate, setRecordDate] = useState("");
  const [observations, setObservations] = useState("");
  const [correctiveActions, setCorrectiveActions] = useState("");
  const [floor, setFloor] = useState("");
  const [selectedDates, setSelectedDates] = useState<number[]>(Array.from({ length: 31 }, (_, i) => i + 1));
  const [daySigs, setDaySigs] = useState<Record<number, RowSig>>({});
  const [grid, setGrid] = useState<Grid>(emptyGrid);
  const [saving, setSaving] = useState<false | "draft" | "final">(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const historyRef = useRef<Grid[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  useEffect(() => {
    docsApi.get(FORM_TYPE, recordId)
      .then((res) => {
        const d = res.data;
        // month field: prefer d.month, fall back to slicing record_date
        const month = d.month || (d.grid?.record_date ? String(d.grid.record_date).slice(0, 7) : "");
        setRecordDate(month);
        setObservations(d.observations || "");
        setCorrectiveActions(d.corrective_action || "");
        setFloor(d.grid?.floor || "");
        if (Array.isArray(d.grid?.selectedDates)) setSelectedDates(d.grid.selectedDates);
        if (d.grid?.daySigs) setDaySigs(d.grid.daySigs);
        if (d.grid?.cells) setGrid(normalizeGrid(d.grid.cells));
      })
      .catch(() => setLoadError("Failed to load record."))
      .finally(() => setLoadingData(false));
  }, [recordId]);

  const visibleEquipment: string[] = !floor
    ? EQUIPMENT_LIST
    : (FLOOR_EQUIPMENT[floor] || EQUIPMENT_LIST);

  const ensureGridFor = (eq: string) => {
    if (!grid[eq]) {
      setGrid((prev) => {
        if (prev[eq]) return prev;
        const row: Record<number, { B: BAStatus; A: BAStatus }> = {};
        for (let d = 1; d <= 31; d++) row[d] = { B: "", A: "" };
        return { ...prev, [eq]: row };
      });
    }
  };

  const pushHistory = (snapshot: Grid) => {
    historyRef.current = [...historyRef.current.slice(-49), JSON.parse(JSON.stringify(snapshot))];
    setCanUndo(true);
  };

  const handleUndo = () => {
    if (historyRef.current.length === 0) return;
    const prev = historyRef.current.pop()!;
    setGrid(prev);
    setCanUndo(historyRef.current.length > 0);
  };

  const toggleStatus = (eq: string, day: number, phase: "B" | "A") => {
    ensureGridFor(eq);
    pushHistory(grid);
    setGrid((prev) => {
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
    pushHistory(grid);
    setGrid((prev) => {
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
    setDaySigs((prev) => {
      const existing: RowSig = prev[day] || { checkedBy: "", verifiedBy: "" };
      return { ...prev, [day]: { ...existing, [field]: value } };
    });
  };

  const handleSave = async (status: "draft" | "submitted") => {
    setSaving(status === "draft" ? "draft" : "final");
    setMessage(null);
    try {
      await docsApi.update(FORM_TYPE, recordId, {
        warehouse: getStoredWarehouse() || null,
        month: recordDate,
        area: floor,
        observations,
        corrective_action: correctiveActions,
        grid: { selectedDates, cells: grid, record_date: recordDate, floor, daySigs },
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
      docNo="CFPLA.C4.F.19"
      subtitle="Issue 05 · Rev 04 · 01/12/2025"
      icon={Brush}
      width="full"
      note="Frequency: Before & After Production · Dry: compressed air · Wet: lint-free wipe · Sanitization: 70% IPA"
    >
      <DocSection title="Period & Area">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label-base">Month</label>
            <input type="month" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="label-base">Floor</label>
            <select value={floor} onChange={(e) => setFloor(e.target.value)} className="input-base">
              <option value="">All Equipment</option>
              {Object.keys(FLOOR_EQUIPMENT).map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-[11px] text-ink-400 italic mt-3">
          Cell legend — <strong>B</strong> = Before production (top), <strong>A</strong> = After (bottom). Click any cell to cycle:{" "}
          <span className="text-success-600 font-bold">✓</span> → <span className="text-danger-600 font-bold">✕</span> → empty.
        </p>
      </DocSection>

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
