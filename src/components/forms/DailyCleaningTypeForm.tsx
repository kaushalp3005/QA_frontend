"use client";
import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import DocSection from "@/components/documentations/DocSection";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";
import { CHECKED_BY_OPTIONS, QC_VERIFIED_BY_OPTIONS, filterSignaturesByWarehouse, type SignatureOption } from "@/lib/signatures";
import {
  AREA_OPTIONS,
  DCC_DAYS,
  buildDCCPayload,
  emptyFloor,
  type CellStatus,
  type DCCFloor,
  type DCCTabDef,
} from "@/lib/dailyCleaning";

/** Compact per-day signatory dropdown. Stores the picked name as a string. */
function CompactSignSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SignatureOption[];
}) {
  const visible = filterSignaturesByWarehouse(options, getStoredWarehouse());
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-[10px] px-1 py-0.5 border border-cream-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
      title={value || "Select"}
    >
      <option value="">—</option>
      {visible
        .filter((o) => o.name !== "Other")
        .map((o) => (
          <option key={o.name} value={o.name}>
            {o.name}
          </option>
        ))}
    </select>
  );
}

interface Props {
  meta: DCCTabDef;
  initialMonth?: string;
  initialFloors?: DCCFloor[];
  monthReadOnly?: boolean;
  isEdit?: boolean;
  /** Receives the built payload; performs create/update + navigation. */
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

const DAY_LIST = Array.from({ length: DCC_DAYS }, (_, i) => i + 1);

// Split the month into 3 stacked blocks so the wide grid stays readable and
// responsive instead of one 31-column table. Each block repeats the Checked By
// and Verified By rows, so the two signatory rows become six (2 × 3 blocks).
const DAY_CHUNK_SIZE = Math.ceil(DCC_DAYS / 3);
const DAY_CHUNKS: number[][] = Array.from(
  { length: Math.ceil(DCC_DAYS / DAY_CHUNK_SIZE) },
  (_, i) => DAY_LIST.slice(i * DAY_CHUNK_SIZE, i * DAY_CHUNK_SIZE + DAY_CHUNK_SIZE)
);

export default function DailyCleaningTypeForm({
  meta,
  initialMonth,
  initialFloors,
  monthReadOnly,
  isEdit,
  onSubmit,
}: Props) {
  const [month, setMonth] = useState(initialMonth || "");
  const [floors, setFloors] = useState<DCCFloor[]>(
    () => initialFloors && initialFloors.length > 0 ? initialFloors : [emptyFloor(meta.parameters, meta.defaultArea)]
  );
  const [activeFloor, setActiveFloor] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const updateFloor = (idx: number, updater: (f: DCCFloor) => DCCFloor) =>
    setFloors((prev) => prev.map((f, i) => (i === idx ? updater(f) : f)));

  // Individual cell control only — left-click toggles ✓, right-click toggles ✕.
  const toggleCell = (param: string, day: number) =>
    updateFloor(activeFloor, (f) => ({
      ...f,
      grid: { ...f.grid, [param]: { ...f.grid[param], [day]: f.grid[param]?.[day] === "✓" ? "" : "✓" } },
    }));

  const markCellFail = (param: string, day: number) =>
    updateFloor(activeFloor, (f) => ({
      ...f,
      grid: { ...f.grid, [param]: { ...f.grid[param], [day]: f.grid[param]?.[day] === "✕" ? "" : "✕" } },
    }));

  const setArea = (v: string) => updateFloor(activeFloor, (f) => ({ ...f, area: v }));
  const setCheckedBy = (day: number, v: string) =>
    updateFloor(activeFloor, (f) => ({ ...f, checkedByPerDay: { ...f.checkedByPerDay, [day]: v } }));
  const setVerifiedBy = (day: number, v: string) =>
    updateFloor(activeFloor, (f) => ({ ...f, verifiedByPerDay: { ...f.verifiedByPerDay, [day]: v } }));
  const setObservations = (v: string) => updateFloor(activeFloor, (f) => ({ ...f, observations: v }));
  const setCorrectiveAction = (v: string) => updateFloor(activeFloor, (f) => ({ ...f, correctiveAction: v }));

  const addFloor = () => {
    setFloors((prev) => [...prev, emptyFloor(meta.parameters, meta.defaultArea)]);
    setActiveFloor(floors.length);
  };

  const removeFloor = (idx: number) => {
    if (floors.length <= 1) return;
    setFloors((prev) => prev.filter((_, i) => i !== idx));
    setActiveFloor((a) => (a >= idx && a > 0 ? a - 1 : a));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitError(null);
    if (!month) {
      setSubmitError("Month is required.");
      return;
    }
    const missingArea = floors.findIndex((f) => !f.area.trim());
    if (missingArea >= 0) {
      setActiveFloor(missingArea);
      setSubmitError("Area (Floor Name) is required for every floor.");
      return;
    }
    const payload = buildDCCPayload({
      month,
      tabCode: meta.key,
      title: meta.title,
      documentNo: meta.documentNo,
      parameters: meta.parameters,
      floors,
      warehouse: getStoredWarehouse() || null,
    });
    setSubmitting(true);
    try {
      await onSubmit(payload);
    } catch (e: any) {
      setSubmitError(e?.message || "Failed to save record");
      setSubmitting(false);
    }
  };

  const floor = floors[activeFloor];

  return (
    <div className="space-y-5">
      <DocSection
        title={meta.title}
        description={`${meta.documentNo} · Issue ${meta.issueNo} · Rev ${meta.revNo} · ${meta.revDate}`}
      >
        <div>
          <label className="label-base">Month</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            readOnly={monthReadOnly}
            className={`input-base ${monthReadOnly ? "bg-cream-200/60 cursor-not-allowed" : ""}`}
          />
          {monthReadOnly && <p className="text-[11px] text-ink-400 italic mt-1">Month is fixed for an existing record.</p>}
        </div>
      </DocSection>

      {/* Floor sub-tabs */}
      <div className="surface-card p-2 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {floors.map((f, i) => (
            <button
              key={i}
              onClick={() => setActiveFloor(i)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap inline-flex items-center gap-1.5 ${
                activeFloor === i ? "bg-brand-500 text-white shadow-soft" : "text-ink-500 hover:bg-cream-200"
              }`}
            >
              <span>{f.area.trim() || `Floor ${i + 1}`}</span>
            </button>
          ))}
          <button
            onClick={addFloor}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg text-brand-600 border border-dashed border-brand-300 hover:bg-brand-50 inline-flex items-center gap-1 whitespace-nowrap"
            title="Add another floor / area"
          >
            <Plus className="w-3.5 h-3.5" /> Add Floor
          </button>
        </div>
      </div>

      <DocSection
        title={`Floor / Area ${activeFloor + 1} of ${floors.length}`}
        description={`${meta.parameters.length} parameters × ${DCC_DAYS} days`}
        bleed
        actions={
          floors.length > 1 ? (
            <button
              onClick={() => removeFloor(activeFloor)}
              className="text-[11px] font-semibold text-danger-600 hover:text-danger-700 inline-flex items-center gap-1"
              title="Remove this floor"
            >
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </button>
          ) : undefined
        }
      >
        <div className="px-4 pt-4 max-w-md">
          <label className="label-base">Area (Floor Name) <span className="text-danger-600">*</span></label>
          <select
            value={AREA_OPTIONS.includes(floor.area) ? floor.area : floor.area === "" ? "" : "__other__"}
            onChange={(e) => setArea(e.target.value === "__other__" ? " " : e.target.value)}
            className="input-base"
          >
            <option value="">Select area…</option>
            {AREA_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
            <option value="__other__">Other…</option>
          </select>
          {!AREA_OPTIONS.includes(floor.area) && floor.area !== "" && (
            <input
              type="text"
              value={floor.area}
              onChange={(e) => setArea(e.target.value)}
              className="input-base mt-1"
              placeholder="Type area name…"
              autoFocus
            />
          )}
        </div>

        <p className="text-[11px] text-ink-400 italic px-4 pt-3">
          <strong>Click</strong> a cell to toggle <span className="text-success-600 font-bold">✓</span> on/off.
          <strong> Right-click</strong> a cell to mark <span className="text-danger-600 font-bold">✕</span> (or clear it).
          Each cell is set individually.
        </p>
        <p className="text-[11px] text-ink-400 italic px-4 pt-1 sm:hidden">The month is split into blocks — swipe a block sideways if it doesn&apos;t fit.</p>

        <div className="space-y-4 mt-1 px-2 sm:px-4">
          {DAY_CHUNKS.map((days, ci) => (
            <div key={ci} className="overflow-x-auto rounded-lg border border-cream-300">
              <table className="text-[10px] w-full border-collapse">
                <thead className="bg-cream-100/70 border-b border-cream-300">
                  <tr>
                    <th className="px-2 py-2 sticky left-0 bg-cream-100 z-10 min-w-[110px] sm:min-w-[150px] text-left text-[11px] font-semibold tracking-wider uppercase text-ink-400">
                      Parameter
                      <span className="ml-1 normal-case font-normal text-ink-300">· days {days[0]}–{days[days.length - 1]}</span>
                    </th>
                    {days.map((d) => (
                      <th key={d} className="px-1 py-2 text-center text-[11px] font-semibold text-ink-400">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-300">
                  {meta.parameters.map((param) => (
                    <tr key={param} className="hover:bg-cream-100/60">
                      <td className="px-2 py-1 sticky left-0 bg-cream-50 z-10 font-semibold whitespace-nowrap text-xs text-ink-500">{param}</td>
                      {days.map((day) => {
                        const val: CellStatus = floor.grid[param]?.[day] || "";
                        return (
                          <td
                            key={day}
                            className={`px-0.5 py-1 text-center cursor-pointer select-none font-bold border-l border-cream-300 ${
                              val === "✓" ? "bg-success-50 text-success-700" : val === "✕" ? "bg-danger-50 text-danger-600" : ""
                            }`}
                            onClick={() => toggleCell(param, day)}
                            onContextMenu={(e) => { e.preventDefault(); markCellFail(param, day); }}
                            title="Click to toggle ✓ · Right-click for ✕"
                          >
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {/* Per-day Checked By */}
                  <tr className="bg-brand-50/30">
                    <td className="px-2 py-1 sticky left-0 bg-brand-50 z-10 font-bold whitespace-nowrap text-[11px] text-brand-700 uppercase tracking-wider">Checked By</td>
                    {days.map((day) => (
                      <td key={day} className="px-0.5 py-0.5 border-l border-cream-300 align-middle">
                        <CompactSignSelect value={floor.checkedByPerDay[day] || ""} onChange={(v) => setCheckedBy(day, v)} options={CHECKED_BY_OPTIONS} />
                      </td>
                    ))}
                  </tr>
                  {/* Per-day Verified By */}
                  <tr className="bg-brand-50/30">
                    <td className="px-2 py-1 sticky left-0 bg-brand-50 z-10 font-bold whitespace-nowrap text-[11px] text-brand-700 uppercase tracking-wider">Verified By</td>
                    {days.map((day) => (
                      <td key={day} className="px-0.5 py-0.5 border-l border-cream-300 align-middle">
                        <CompactSignSelect value={floor.verifiedByPerDay[day] || ""} onChange={(v) => setVerifiedBy(day, v)} options={QC_VERIFIED_BY_OPTIONS} />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-ink-400 italic px-4 pt-3 pb-2">
          Each day records its own <strong>Checked By</strong> and <strong>Verified By</strong> signatory (resolves to a signature image on print).
        </p>

        <div className="border-t border-cream-300 p-4 sm:p-5 bg-cream-100/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label-base">Observations</label>
              <textarea value={floor.observations} onChange={(e) => setObservations(e.target.value)} rows={3} className="input-base" />
            </div>
            <div>
              <label className="label-base">Corrective Action</label>
              <textarea value={floor.correctiveAction} onChange={(e) => setCorrectiveAction(e.target.value)} rows={3} className="input-base" />
            </div>
          </div>
        </div>
      </DocSection>

      <div className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-ink-400">
          Prepared By: <span className="font-semibold text-ink-500">FST</span>
          <span className="mx-2 text-cream-300">|</span>
          Approved By: <span className="font-semibold text-ink-500">FSTL</span>
        </p>
        <div className="flex items-center gap-3">
          {submitError && <span className="text-xs text-danger-600 font-semibold">{submitError}</span>}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {submitting ? "Saving…" : isEdit ? "Save Changes" : "Submit Record"}
          </button>
        </div>
      </div>
    </div>
  );
}
