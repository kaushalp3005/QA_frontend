"use client";
import { Fragment, useMemo, useState } from "react";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";
import { A185_GLASS_AREAS, GLASS_ITEM_TYPES } from "@/config/glassBrittleAreas";
import { useRouter } from "next/navigation";
import SignaturePicker from "@/components/ui/SignaturePicker";
import { HYGIENE_CHECKED_BY_OPTIONS, QC_VERIFIED_BY_OPTIONS } from "@/lib/signatures";
import {
  deepCleanItemsFor,
  deepCleanDocNo,
  hasAreaField,
  DEEP_CLEAN_FREQ_LEGEND,
  DEEP_CLEAN_FREQ_LABELS,
} from "@/config/deepCleaningAreas";
import {
  WASTE_TYPES,
  WASTE_DAYS,
  daysInMonth,
  readWasteRow,
  wasteDisposalDocMeta,
} from "@/config/wasteDisposalTypes";

// ===================== Shared Props Interface =====================
interface DocFormProps {
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  isEdit?: boolean;
}

// ===================== SHARED: Vehicle Inspection (F.45 Incoming + F.46 Outgoing) =====================
const VEHICLE_EVAL_PARAMS = ["Security Lock", "Type of carrier (Full covered / Open roof)", "Mode of covering products (in case of open roof)", "Integrity of cover/container", "Overall hygiene in the interior & exterior", "Any sharp edges/points in the interior", "Any pest detected", "Any Grease/Oil Detected", "Any other material than food", "Any off odor (Yes/No)", "Vehicle Temperature (Cold/Ambient)"];

// Helper: convert label to snake_case key
const labelToKey = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

function VehicleInspectionForm({ type, docNo, infoFields, initialData, onSubmit, isEdit, formType }: { type: "Incoming" | "Outgoing"; docNo: string; infoFields: { label: string; type?: string }[]; initialData?: Record<string, any>; onSubmit?: (data: Record<string, any>) => Promise<void>; isEdit?: boolean; formType: string }) {
  const [info, setInfo] = useState<Record<string, string>>(() => {
    if (initialData?.info && typeof initialData.info === "object") {
      const init: Record<string, string> = {};
      infoFields.forEach((f) => { const key = labelToKey(f.label); init[f.label] = initialData.info[key] || ""; });
      return init;
    }
    return {};
  });
  const [params, setParams] = useState<Record<string, string>>(() => {
    if (initialData?.params && typeof initialData.params === "object") {
      const init: Record<string, string> = {};
      VEHICLE_EVAL_PARAMS.forEach((p) => { const key = labelToKey(p); init[p] = initialData.params[key] || ""; });
      return init;
    }
    return {};
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: getStoredWarehouse() || null,
      info: Object.fromEntries(infoFields.map((f) => [labelToKey(f.label), info[f.label] || ""])),
      params: Object.fromEntries(VEHICLE_EVAL_PARAMS.map((p) => [labelToKey(p), params[p] || ""])),
    };
    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const { docsApi } = await import("@/lib/api/documentations");
        await docsApi.create(formType, payload);
        setSuccess(true);
      }
    } catch (e: any) {
      alert(e.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="surface-card overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60">
          <h2 className="text-sm font-bold text-ink-600">Vehicle Information</h2>
          <span className="text-[11px] font-semibold text-ink-400">{infoFields.length} fields</span>
        </header>
        <div className="divide-y divide-cream-300">
          {infoFields.map((f) => (
            <div key={f.label} className="grid grid-cols-1 sm:grid-cols-[40%_60%] gap-1 sm:gap-0">
              <label className="px-4 sm:px-5 pt-3 sm:py-3 text-xs sm:text-sm font-semibold text-ink-500 bg-cream-100/40 sm:border-r border-cream-300 flex items-center">
                {f.label}
              </label>
              <div className="px-3 sm:px-4 pb-3 sm:py-2.5">
                <input
                  type={f.type || "text"}
                  value={info[f.label] || ""}
                  onChange={(e) => setInfo((p) => ({ ...p, [f.label]: e.target.value }))}
                  className="input-base !py-2 !px-3"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-card overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60">
          <h2 className="text-sm font-bold text-ink-600">Parameters Evaluated</h2>
          <span className="text-[11px] font-semibold text-ink-400">{VEHICLE_EVAL_PARAMS.length} checks</span>
        </header>
        <div className="divide-y divide-cream-300">
          {VEHICLE_EVAL_PARAMS.map((p) => (
            <div key={p} className="grid grid-cols-1 sm:grid-cols-[55%_45%] gap-1 sm:gap-0">
              <label className="px-4 sm:px-5 pt-3 sm:py-3 text-xs sm:text-sm font-semibold text-ink-500 bg-cream-100/40 sm:border-r border-cream-300 flex items-center">
                {p}
              </label>
              <div className="px-3 sm:px-4 pb-3 sm:py-2.5">
                <input
                  type="text"
                  value={params[p] || ""}
                  onChange={(e) => setParams((pr) => ({ ...pr, [p]: e.target.value }))}
                  className="input-base !py-2 !px-3"
                  placeholder="Observation"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-ink-400">
          Prepared by: <span className="font-semibold text-ink-500">FST</span>
          <span className="mx-2 text-cream-300">|</span>
          Approved by: <span className="font-semibold text-ink-500">FSTL</span>
        </p>
        <div className="flex items-center gap-3">
          {success && <span className="text-xs font-semibold text-success-600">Saved successfully</span>}
          <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
            {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function OutgoingVehicleInspection({ initialData, onSubmit, isEdit }: DocFormProps = {}) {
  return <VehicleInspectionForm type="Outgoing" docNo="CFPLA.C5.F.46" formType="outgoing-vehicle-inspection" initialData={initialData} onSubmit={onSubmit} isEdit={isEdit} infoFields={[{ label: "Dispatch Date", type: "date" }, { label: "Customer Name" }, { label: "SKU/Product Name" }, { label: "Material (Kgs/Units) to Dispatch", type: "number" }, { label: "Time of Vehicle Outgoing", type: "time" }, { label: "Transporter's Name" }, { label: "Transporter FSSAI License Number" }, { label: "Vehicle Number" }, { label: "Driver's Name and Number" }, { label: "Driver's License (Yes/No)" }, { label: "Location (Dispatch to)" }]} />;
}

export function IncomingVehicleInspectionV2({ initialData, onSubmit, isEdit }: DocFormProps = {}) {
  return <VehicleInspectionForm type="Incoming" docNo="CFPLA.C3.F.45" formType="vehicle-inspection" initialData={initialData} onSubmit={onSubmit} isEdit={isEdit} infoFields={[{ label: "Date of Vehicle Inward", type: "date" }, { label: "Vendor Name" }, { label: "Commodity Name" }, { label: "Transporter's Name" }, { label: "Transporter FSSAI License Number" }, { label: "Vehicle Number" }, { label: "Location (Received from)" }, { label: "Driver's Name and Number" }, { label: "Unloading Time", type: "time" }]} />;
}

// ===================== F.48 — Glass and Brittle Check Record =====================
/** `legacyDetails` is not editable — the Details column was removed, so any value
 *  a saved record already carries is written straight back rather than dropped. */
interface GlassRow { id: number; item: string; location: string; glassNo: string; legacyDetails: string; months: Record<string, string>; }
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const eGR = (id: number, seed: Partial<GlassRow> = {}): GlassRow => ({
  id, item: "", location: "", glassNo: "", legacyDetails: "",
  months: Object.fromEntries(MONTHS_SHORT.map((m) => [m, ""])),
  ...seed,
});

/** Month ticks are stored flat on the row (jan/feb/…) by some records and nested
 *  under `months` by others — read both so no saved record loses its ticks. */
const monthsFromSaved = (r: any): Record<string, string> =>
  Object.fromEntries(MONTHS_SHORT.map((m) => [m, r?.months?.[m.toLowerCase()] ?? r?.months?.[m] ?? r?.[m.toLowerCase()] ?? r?.[m] ?? ""]));

/** A185 seeds the full CFPLB.C4.F.59 register — 8 area sheets × 4 item types. */
function seedGlassRows(warehouse: string | null | undefined): GlassRow[] {
  if (warehouse === "A185") {
    const out: GlassRow[] = [];
    A185_GLASS_AREAS.forEach((a) =>
      a.rows.forEach((r) => out.push(eGR(out.length + 1, { item: r.item, location: a.area, glassNo: r.glassNo }))),
    );
    return out;
  }
  return Array.from({ length: 10 }, (_, i) => eGR(i + 1));
}

/** Distinct areas in row order — drives the area tabs. */
function areasOf(rows: GlassRow[]): string[] {
  const seen: string[] = [];
  rows.forEach((r) => {
    const a = r.location.trim();
    if (!seen.includes(a)) seen.push(a);
  });
  return seen.length ? seen : [""];
}

const GLASS_TICK_NEXT: Record<string, string> = { "": "✓", "✓": "✕", "✕": "" };

export function GlassBrittleCheckRecord({ initialData, onSubmit, isEdit }: DocFormProps = {}) {
  const warehouse = getStoredWarehouse();
  const [year, setYear] = useState(() => initialData?.year || "2026");
  const [rows, setRows] = useState<GlassRow[]>(() => {
    if (initialData?.rows && Array.isArray(initialData.rows) && initialData.rows.length > 0) {
      return initialData.rows.map((r: any, i: number) => ({
        id: i + 1,
        // The Floor column is gone — fold any saved floor into Item so it survives.
        item: [r.floor, r.item].map((v: any) => (v || "").trim()).filter(Boolean).join(" — "),
        location: r.location || "",
        glassNo: r.glass_no || "",
        legacyDetails: r.glass_details || r.details || "",
        months: monthsFromSaved(r),
      }));
    }
    return seedGlassRows(warehouse);
  });
  // One date per month column, filled in the row under the month headers.
  const [monthDates, setMonthDates] = useState<Record<string, string>>(() =>
    Object.fromEntries(MONTHS_SHORT.map((m) => [m, initialData?.month_dates?.[m.toLowerCase()] || initialData?.month_dates?.[m] || ""])),
  );
  const [observations, setObservations] = useState(() => initialData?.observations || "");
  const [correctiveActions, setCorrectiveActions] = useState(() => initialData?.corrective_action || initialData?.corrective_actions || "");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const areas = useMemo(() => areasOf(rows), [rows]);
  const [activeArea, setActiveArea] = useState<string>(() => areasOf(rows)[0]);
  // A row's area can be renamed or removed out from under the active tab.
  const currentArea = areas.includes(activeArea) ? activeArea : areas[0];
  const areaRows = rows.filter((r) => r.location.trim() === currentArea);

  const nextId = (p: GlassRow[]) => Math.max(0, ...p.map((r) => r.id)) + 1;
  /** Add an item row to the area on screen. */
  const add = () => setRows((p) => [...p, eGR(nextId(p), { location: currentArea })]);
  /** Add a new area, pre-filled with the four standard item rows. */
  const addArea = () => {
    const name = window.prompt("New area / floor name")?.trim();
    if (!name) return;
    setRows((p) => {
      let id = nextId(p);
      return [...p, ...GLASS_ITEM_TYPES.map((item) => eGR(id++, { item, location: name }))];
    });
    setActiveArea(name);
  };
  const rm = (id: number) => { if (rows.length > 1) setRows((p) => p.filter((r) => r.id !== id)); };
  const up = (id: number, f: keyof GlassRow, v: string) => setRows((p) => p.map((r) => (r.id === id ? { ...r, [f]: v } : r)));
  const upM = (id: number, m: string, v: string) => setRows((p) => p.map((r) => (r.id === id ? { ...r, months: { ...r.months, [m]: v } } : r)));
  /** Rename the area on every row that belongs to it. */
  const renameArea = (from: string, to: string) => {
    setRows((p) => p.map((r) => (r.location.trim() === from ? { ...r, location: to } : r)));
    setActiveArea(to);
  };
  /** Tick or clear a whole month column for the visible area. */
  const tickMonthForArea = (m: string) => {
    const allTicked = areaRows.length > 0 && areaRows.every((r) => r.months[m] === "✓");
    setRows((p) => p.map((r) => (r.location.trim() === currentArea ? { ...r, months: { ...r.months, [m]: allTicked ? "" : "✓" } } : r)));
  };
  const areaFilled = (a: string) =>
    rows.some((r) => r.location.trim() === a && MONTHS_SHORT.some((m) => r.months[m]));

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse,
      year,
      rows: rows
        .filter((r) => r.item || r.location || r.glassNo || MONTHS_SHORT.some((m) => r.months[m]))
        .map((r) => ({
          item: r.item, location: r.location, glass_no: r.glassNo,
          // Written back untouched — no longer editable, but not thrown away.
          ...(r.legacyDetails ? { glass_details: r.legacyDetails } : {}),
          months: Object.fromEntries(MONTHS_SHORT.map((m) => [m.toLowerCase(), r.months[m]])),
        })),
      month_dates: Object.fromEntries(MONTHS_SHORT.map((m) => [m.toLowerCase(), monthDates[m] || ""])),
      // Column is `corrective_action` (singular) — the old plural key was dropped
      // by the backend's column filter, so these never persisted.
      observations, corrective_action: correctiveActions,
    };
    try {
      if (onSubmit) { await onSubmit(payload); }
      else { const { docsApi } = await import("@/lib/api/documentations"); await docsApi.create("glass-brittle-check", payload); setSuccess(true); }
    } catch (e: any) { alert(e.message || "Submit failed"); }
    finally { setSubmitting(false); }
  };

  const isA185 = warehouse === "A185";
  const docNo = isA185 ? "CFPLB.C4.F.59" : "CFPLA.C4.F.48";
  const issueMeta = isA185
    ? "Issue 02 · 04/08/2021 · Rev 01 · 02/09/2024"
    : "Frequency: Monthly";

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <section className="surface-card p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-ink-600 leading-tight">Glass and Brittle Check Record</h1>
            <p className="text-xs text-ink-400 mt-0.5">
              <span className="font-semibold">{docNo}</span>
              <span className="mx-2 text-cream-300">|</span>
              {issueMeta}
              <span className="mx-2 text-cream-300">|</span>
              Frequency: Monthly
            </p>
          </div>
          <div className="shrink-0">
            <label className="label-base">Year</label>
            <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="input-base sm:w-28" />
          </div>
        </div>
      </section>

      {/* Area tabs — the source format is one sheet per area / floor. */}
      <div className="surface-card p-2 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {areas.map((a) => (
            <button
              key={a || "unnamed"}
              type="button"
              onClick={() => setActiveArea(a)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap inline-flex items-center gap-1.5 ${
                currentArea === a ? "bg-brand-500 text-white shadow-soft" : "text-ink-500 hover:bg-cream-200"
              }`}
            >
              <span>{a || "Unnamed area"}</span>
              {areaFilled(a) && (
                <span className={`w-1.5 h-1.5 rounded-full ${currentArea === a ? "bg-white" : "bg-success-500"}`} />
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={addArea}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg text-brand-600 border border-dashed border-brand-300 hover:bg-brand-50 whitespace-nowrap"
            title="Add another area / floor with the four standard item rows"
          >
            + Add Area
          </button>
        </div>
      </div>

      <section className="surface-card overflow-hidden">
        <header className="px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0 sm:flex-1">
            <label className="label-base">Area / Floor</label>
            <input
              type="text"
              value={currentArea}
              onChange={(e) => renameArea(currentArea, e.target.value)}
              className="input-base sm:max-w-sm"
              placeholder="Area or floor name"
            />
          </div>
          <button onClick={add} className="btn-secondary !py-1.5 !px-3 text-xs whitespace-nowrap shrink-0">+ Add Item Row</button>
        </header>

        <p className="text-[11px] text-ink-400 italic px-4 sm:px-5 pt-3">
          Click a month cell to cycle <span className="text-success-600 font-bold">✓</span> (OK) →{" "}
          <span className="text-danger-600 font-bold">✕</span> (Damaged) → empty. The <span className="font-semibold">✓</span> under
          a month marks every item in this area at once.
        </p>
        <p className="text-[11px] text-ink-400 italic px-4 sm:px-5 pt-1 lg:hidden">← Swipe the table sideways to reach later months.</p>

        <div className="overflow-x-auto mt-2">
          <table className="text-xs border-collapse">
            <thead>
              <tr className="bg-cream-100/70 border-y border-cream-300">
                <th className="sticky left-0 z-10 bg-cream-100 px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400 min-w-[130px]">Item</th>
                <th className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400 min-w-[240px]">Glass No.</th>
                {MONTHS_SHORT.map((m) => (
                  <th key={m} className="px-1 py-2 text-center text-[11px] font-semibold text-ink-400 border-l border-cream-300 min-w-[40px]">
                    <div className="flex flex-col items-center gap-1">
                      <span>{m}</span>
                      <button
                        type="button"
                        onClick={() => tickMonthForArea(m)}
                        className="text-[9px] font-bold leading-none bg-success-50 text-success-700 px-1.5 py-0.5 rounded hover:bg-success-100"
                        title={`Mark every item in ${currentArea || "this area"} as ✓ for ${m}`}
                      >
                        ✓
                      </button>
                    </div>
                  </th>
                ))}
                <th className="px-1 py-2 border-l border-cream-300" />
              </tr>
              {/* Date the check was carried out, one per month column. */}
              <tr className="bg-cream-50 border-b border-cream-300">
                <th className="sticky left-0 z-10 bg-cream-50 px-2 py-1 text-right text-[10px] font-semibold text-ink-400">Date of check →</th>
                <th className="px-2 py-1" />
                {MONTHS_SHORT.map((m) => (
                  <th key={m} className="px-0.5 py-1 border-l border-cream-300">
                    <input
                      type="date"
                      value={monthDates[m] || ""}
                      onChange={(e) => setMonthDates((p) => ({ ...p, [m]: e.target.value }))}
                      title={`Date checked — ${m}`}
                      className="w-full border border-cream-300 rounded px-0.5 py-0.5 text-[9px] font-normal bg-white min-w-[96px] focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </th>
                ))}
                <th className="border-l border-cream-300" />
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300">
              {areaRows.length === 0 ? (
                <tr>
                  <td colSpan={MONTHS_SHORT.length + 3} className="px-4 py-8 text-center text-sm text-ink-400">
                    No item rows in this area yet — use <span className="font-semibold">+ Add Item Row</span>.
                  </td>
                </tr>
              ) : (
                areaRows.map((r) => (
                  <tr key={r.id} className="hover:bg-cream-100/60">
                    <td className="sticky left-0 z-10 bg-white px-1 py-1 align-top">
                      <input
                        type="text"
                        list="glass-item-options"
                        value={r.item}
                        onChange={(e) => up(r.id, "item", e.target.value)}
                        className="w-full border border-cream-300 rounded px-1.5 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                        placeholder="Select or type…"
                      />
                    </td>
                    {/* Textarea — these ID lists run to hundreds of characters. */}
                    <td className="px-1 py-1 align-top">
                      <textarea
                        value={r.glassNo}
                        onChange={(e) => up(r.id, "glassNo", e.target.value)}
                        rows={2}
                        className="w-full border border-cream-300 rounded px-1.5 py-1 text-[11px] leading-snug bg-white resize-y focus:outline-none focus:ring-1 focus:ring-brand-500"
                        placeholder="e.g. GL1, GL2, GL44…"
                      />
                    </td>
                    {MONTHS_SHORT.map((m) => (
                      <td
                        key={m}
                        onClick={() => upM(r.id, m, GLASS_TICK_NEXT[r.months[m]] ?? "✓")}
                        className={`border-l border-cream-300 px-1 py-1 text-center cursor-pointer select-none font-bold ${
                          r.months[m] === "✓" ? "bg-success-50 text-success-700" : r.months[m] === "✕" ? "bg-danger-50 text-danger-600" : ""
                        }`}
                      >
                        {r.months[m] || <span className="text-ink-300 text-[9px]">—</span>}
                      </td>
                    ))}
                    <td className="border-l border-cream-300 px-1 py-1 text-center align-top">
                      <button
                        onClick={() => rm(r.id)}
                        className="inline-flex items-center justify-center w-6 h-6 rounded-md text-ink-400 hover:text-danger-600 hover:bg-danger-50"
                        title="Remove this row"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <datalist id="glass-item-options">
        {GLASS_ITEM_TYPES.map((o) => <option key={o} value={o} />)}
      </datalist>

      <section className="surface-card p-4 sm:p-5">
        <h2 className="text-sm font-bold text-ink-600 mb-3">Observations &amp; Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label-base">Observations / Remarks</label>
            <textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={3} className="input-base" />
          </div>
          <div>
            <label className="label-base">Corrective / Preventive Actions</label>
            <textarea value={correctiveActions} onChange={(e) => setCorrectiveActions(e.target.value)} rows={3} className="input-base" />
          </div>
        </div>
      </section>

      <div className="surface-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-ink-400">
          Prepared by: <span className="font-semibold text-ink-500">FST</span>
          <span className="mx-2 text-cream-300">|</span>
          Verified by: <span className="font-semibold text-ink-500">FSTL</span>
        </p>
        <div className="flex items-center gap-3">
          {success && <span className="text-xs font-semibold text-success-600">Saved successfully</span>}
          <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
            {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===================== F.50a/b — Preventive Maintenance Checklist (Monthly) =====================
interface PMCheckpoint { equipment: string; checkpoint: string; }
interface PMSection { section: string; items: PMCheckpoint[]; }
const PM_SECTIONS: PMSection[] = [
  { section: "Lower Basement", items: [{ equipment: "Lift 1 Old", checkpoint: "Electrical connections, Doors, Switches" }, { equipment: "Lift 3 Hydraulic", checkpoint: "Electrical connections, Switches, Doors" }, { equipment: "L-sealer Manual", checkpoint: "Sealer & cutting knife intactness" }, { equipment: "Auto L-sealer (Shrink Wrapper)", checkpoint: "Sealer, Heater coil, Pressure/leakage, Cutting knife, Panel knobs/display" }, { equipment: "Shrink Wrap - Web Sealer", checkpoint: "Sealer, Heater coil, Pressure/leakage, Cutting knife, Panel" }, { equipment: "Pet Sealer", checkpoint: "Motor, Electric connection, Sealing check, Oiling/greasing, Conveyor belt" }, { equipment: "Cup Sealer 1 & 2", checkpoint: "Sealer intactness" }, { equipment: "Band Sealer", checkpoint: "Sealer, Conveyor, Airline/N2 pressure, Leakage" }, { equipment: "Hand Wash Station", checkpoint: "Blower & Dispenser, Water connections" }, { equipment: "Air Curtain", checkpoint: "Fan Blower" }] },
  { section: "Upper Basement Floor", items: [{ equipment: "Hand Pallet Truck", checkpoint: "Oiling/Greasing of bearings" }, { equipment: "Hand Wash Station", checkpoint: "Blower & Dispenser" }] },
  { section: "Production Floor", items: [{ equipment: "Paddle Mixer", checkpoint: "Motor, Paddle intactness, Electrical" }, { equipment: "Sheeting & Cutting Machine", checkpoint: "Blade, Belt, Motor, Conveyor" }, { equipment: "Hot Air Oven/Roaster", checkpoint: "Heating elements, Door seals, Thermostat" }, { equipment: "Flow Wrap Machine", checkpoint: "Sealing jaws, Conveyor, Film tension" }, { equipment: "X-Ray/Metal Detector", checkpoint: "Calibration, Conveyor, Sensitivity test" }, { equipment: "Weighing Scales", checkpoint: "Calibration, Display, Power supply" }] },
];

export function PreventiveMaintenanceChecklist({ initialData, onSubmit, isEdit }: DocFormProps = {}) {
  const [month, setMonth] = useState(() => initialData?.month || "");
  const [checkedBy, setCheckedBy] = useState(() => initialData?.checked_by || "");
  const [verifiedBy, setVerifiedBy] = useState(() => initialData?.verified_by || "");
  const [scores, setScores] = useState<Record<string, { status: "OK" | "Needs Repair" | "N/A" | ""; remarks: string }>>(() => {
    if (initialData?.scores && typeof initialData.scores === "object") {
      const init: Record<string, { status: "OK" | "Needs Repair" | "N/A" | ""; remarks: string }> = {};
      Object.entries(initialData.scores).forEach(([key, val]: [string, any]) => {
        init[key] = { status: val.status || "", remarks: val.remarks || "" };
      });
      return init;
    }
    return {};
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const upS = (key: string, field: "status" | "remarks", value: string) => setScores((p) => ({ ...p, [key]: { status: p[key]?.status || "", remarks: p[key]?.remarks || "", [field]: value } }));

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: getStoredWarehouse() || null,
      month, checked_by: checkedBy, verified_by: verifiedBy, scores,
    };
    try {
      if (onSubmit) { await onSubmit(payload); }
      else { const { docsApi } = await import("@/lib/api/documentations"); await docsApi.create("preventive-maintenance", payload); setSuccess(true); }
    } catch (e: any) { alert(e.message || "Submit failed"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="border border-gray-300 mb-4 rounded"><div className="bg-gray-50 p-3"><h1 className="font-bold text-lg">CANDOR FOODS PRIVATE LIMITED</h1><p className="text-sm font-semibold">Preventive Maintenance Checklist - Monthly</p><p className="text-xs text-gray-600">Doc No: CFPLA.C4.F.50a (also covers F.50b quarterly structure)</p></div></div>
      <div className="grid grid-cols-3 gap-3 mb-4"><div><label className="text-sm font-medium">Month</label><input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="border rounded px-3 py-2 w-full" /></div><div><label className="text-sm font-medium">Checked By</label><input type="text" value={checkedBy} onChange={(e) => setCheckedBy(e.target.value)} className="border rounded px-3 py-2 w-full" /></div><div><label className="text-sm font-medium">Verified By</label><input type="text" value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} className="border rounded px-3 py-2 w-full" /></div></div>
      <div className="border border-gray-300 rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100"><tr><th className="border border-gray-300 px-2 py-2">Equipment</th><th className="border border-gray-300 px-2 py-2">Checkpoints</th><th className="border border-gray-300 px-2 py-2 w-32">Status</th><th className="border border-gray-300 px-2 py-2 w-48">Remarks</th></tr></thead>
          <tbody>
            {PM_SECTIONS.map((sec) => (
              <Fragment key={sec.section}>
                <tr><td colSpan={4} className="border border-gray-300 px-3 py-2 bg-blue-50 font-bold">{sec.section}</td></tr>
                {sec.items.map((item) => {
                  const key = `${sec.section}-${item.equipment}`;
                  return (
                    <tr key={key} className="hover:bg-blue-50">
                      <td className="border border-gray-300 px-2 py-1 font-medium">{item.equipment}</td>
                      <td className="border border-gray-300 px-2 py-1 text-xs text-gray-600">{item.checkpoint}</td>
                      <td className="border border-gray-300 px-1 py-1"><select value={scores[key]?.status || ""} onChange={(e) => upS(key, "status", e.target.value)} className={`w-full border rounded px-1 py-0.5 text-xs ${scores[key]?.status === "OK" ? "bg-green-100" : scores[key]?.status === "Needs Repair" ? "bg-red-100" : ""}`}><option value="">-</option><option value="OK">OK</option><option value="Needs Repair">Needs Repair</option><option value="N/A">N/A</option></select></td>
                      <td className="border border-gray-300 px-1 py-1"><input type="text" value={scores[key]?.remarks || ""} onChange={(e) => upS(key, "remarks", e.target.value)} className="w-full border rounded px-1 py-0.5 text-xs" /></td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={handleSubmit} disabled={submitting} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
      </button>
      {success && <p className="text-green-600 text-sm mt-2">Record saved successfully!</p>}
    </div>
  );
}

// ===================== F.51 — New Equipment Clearance/Commissioning =====================
const SAFETY_CHECKS = ["Meets production needs (capacity, dust control)", "Accessible to clean and maintain", "Prevents contamination during operations", "Preventative Maintenance Program available", "Covered under HACCP plan?", "Pest risk?", "Product changeover cause problem?", "Contains glass or plastic?", "Equipment made from suitable material (SS 304)?", "Cleaning points safe to reach?", "Easy to take swab samples?"];
const MACHINERY_CHECKS = ["Critical parts identified?", "Spare parts easily available?", "Pulleys/belts/chains properly guarded?", "Rotating parts/pinch points guarded?", "Machine secured if fixed location?", "Commonly used parts in stock?"];
const SHUTDOWN_CHECKS = ["Single lockable electrical power disconnect?", "Isolation valves for air/steam available?", "Adequate manual reset emergency stops?", "Pneumatic/hydraulic cylinders safe?", "Environmental problem risk?", "Employees trained for maintenance?", "Equipment-specific procedures documented?"];
const WALKING_CHECKS = ["Floors/aisles clear of slippery areas?", "Floor elevation changes clearly identified?", "Equipment produces floor discharges?", "Non-slip coatings needed?", "Construction debris cleared?"];
const ELECTRICAL_CHECKS = ["All conduit/cable properly attached?"];

export function NewEquipmentClearance({ initialData, onSubmit, isEdit }: DocFormProps = {}) {
  const [meta, setMeta] = useState<Record<string, string>>(() => {
    if (initialData?.meta && typeof initialData.meta === "object") {
      const init: Record<string, string> = {};
      Object.entries(initialData.meta).forEach(([k, v]) => { init[k] = String(v || ""); });
      return init;
    }
    return {};
  });
  const upM = (k: string, v: string) => setMeta((p) => ({ ...p, [k]: v }));
  const [checks, setChecks] = useState<Record<string, { yn: "Yes" | "No" | ""; action: string }>>(() => {
    if (initialData?.checks && typeof initialData.checks === "object") {
      const init: Record<string, { yn: "Yes" | "No" | ""; action: string }> = {};
      Object.entries(initialData.checks).forEach(([k, v]: [string, any]) => { init[k] = { yn: v.yn || "", action: v.action || "" }; });
      return init;
    }
    return {};
  });
  const upC = (k: string, f: "yn" | "action", v: string) => setChecks((p) => ({ ...p, [k]: { yn: p[k]?.yn || "", action: p[k]?.action || "", [f]: v } }));
  const [qaSign, setQaSign] = useState(() => initialData?.qa_sign || "");
  const [maintSign, setMaintSign] = useState(() => initialData?.maint_sign || "");
  const [remark, setRemark] = useState(() => initialData?.remark || "");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: getStoredWarehouse() || null,
      meta, checks, qa_sign: qaSign, maint_sign: maintSign, remark,
    };
    try {
      if (onSubmit) { await onSubmit(payload); }
      else { const { docsApi } = await import("@/lib/api/documentations"); await docsApi.create("new-equipment-clearance", payload); setSuccess(true); }
    } catch (e: any) { alert(e.message || "Submit failed"); }
    finally { setSubmitting(false); }
  };

  const renderSection = (title: string, items: string[]) => (
    <Fragment key={title}>
      <tr><td colSpan={4} className="border border-gray-300 px-3 py-2 bg-blue-50 font-bold text-sm">{title}</td></tr>
      {items.map((item) => (
        <tr key={item} className="hover:bg-blue-50">
          <td className="border border-gray-300 px-2 py-1 text-sm" colSpan={1}>{item}</td>
          <td className="border border-gray-300 px-1 py-1 text-center w-16"><label className={`px-2 py-0.5 rounded border text-xs cursor-pointer ${checks[item]?.yn === "Yes" ? "bg-green-100 border-green-400" : "border-gray-300"}`}><input type="radio" name={item} className="sr-only" checked={checks[item]?.yn === "Yes"} onChange={() => upC(item, "yn", "Yes")} />Yes</label></td>
          <td className="border border-gray-300 px-1 py-1 text-center w-16"><label className={`px-2 py-0.5 rounded border text-xs cursor-pointer ${checks[item]?.yn === "No" ? "bg-red-100 border-red-400" : "border-gray-300"}`}><input type="radio" name={item} className="sr-only" checked={checks[item]?.yn === "No"} onChange={() => upC(item, "yn", "No")} />No</label></td>
          <td className="border border-gray-300 px-1 py-1"><input type="text" value={checks[item]?.action || ""} onChange={(e) => upC(item, "action", e.target.value)} className="w-full border rounded px-1 py-0.5 text-xs" placeholder="Action required" /></td>
        </tr>
      ))}
    </Fragment>
  );

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="border border-gray-300 mb-4 rounded"><div className="bg-gray-50 p-3"><h1 className="font-bold text-lg">CANDOR FOODS PRIVATE LIMITED</h1><p className="text-sm font-semibold">New Equipment Clearance Checklist (Commissioning) Record</p><p className="text-xs text-gray-600">Doc No: CFPLA.C4.F.51</p></div></div>
      <div className="grid grid-cols-2 gap-3 mb-4">{[{ l: "Name of Equipment" }, { l: "Manufacturer" }, { l: "Supplier (Contact)" }, { l: "Model & Serial Number" }, { l: "Location and Function" }, { l: "Commissioning Date", t: "date" }, { l: "Commissioning Time", t: "time" }].map((f) => <div key={f.l}><label className="text-sm font-medium">{f.l}</label><input type={f.t || "text"} value={meta[f.l] || ""} onChange={(e) => upM(f.l, e.target.value)} className="border rounded px-3 py-2 w-full text-sm" /></div>)}</div>
      <div className="border border-gray-300 rounded overflow-hidden mb-4">
        <table className="w-full">
          <thead className="bg-gray-100"><tr><th className="border border-gray-300 px-2 py-2 text-sm">Check Item</th><th className="border border-gray-300 px-2 py-2 w-16 text-sm">Yes</th><th className="border border-gray-300 px-2 py-2 w-16 text-sm">No</th><th className="border border-gray-300 px-2 py-2 text-sm">Action Required</th></tr></thead>
          <tbody>
            {renderSection("Food Safety", SAFETY_CHECKS)}
            {renderSection("Machinery Guarding/Engineering", MACHINERY_CHECKS)}
            {renderSection("Equipment Shutdown", SHUTDOWN_CHECKS)}
            {renderSection("Walking Surfaces", WALKING_CHECKS)}
            {renderSection("Electrical", ELECTRICAL_CHECKS)}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-3 gap-3"><div><label className="text-sm font-medium">Quality Assurance</label><input type="text" value={qaSign} onChange={(e) => setQaSign(e.target.value)} className="border rounded px-3 py-2 w-full" /></div><div><label className="text-sm font-medium">Maintenance Incharge</label><input type="text" value={maintSign} onChange={(e) => setMaintSign(e.target.value)} className="border rounded px-3 py-2 w-full" /></div><div><label className="text-sm font-medium">Remark</label><input type="text" value={remark} onChange={(e) => setRemark(e.target.value)} className="border rounded px-3 py-2 w-full" /></div></div>
      <button onClick={handleSubmit} disabled={submitting} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
      </button>
      {success && <p className="text-green-600 text-sm mt-2">Record saved successfully!</p>}
    </div>
  );
}

// ===================== F.52 / F.58 — Waste Disposal Record =====================
// A daily tick sheet: two waste streams down the side, one column per day of the
// month, and Checked By / Verified By signed per day. Document header differs by
// plant (A185 -> CFPLB.C4..F.58, W202 -> CFPLA.C4.F.52); see
// @/config/wasteDisposalTypes, which the print page reads too.

/** Click cycle for a day cell: blank -> disposed -> not disposed -> blank. */
const WASTE_MARKS = ["", "✓", "✕"] as const;
const nextMark = (cur: string) => WASTE_MARKS[(WASTE_MARKS.indexOf(cur as any) + 1) % WASTE_MARKS.length];

type WasteGrid = Record<string, Record<number, string>>;
type DaySignoff = Record<number, string>;

/** Read the saved per-day sign-off, tolerating string or number keys from JSONB. */
function readDaySignoff(saved: any, fallbackName?: string): DaySignoff {
  const out: DaySignoff = {};
  WASTE_DAYS.forEach((d) => {
    out[d] = saved?.[d] ?? saved?.[String(d)] ?? "";
  });
  // Records filed before the per-day columns existed carry one name for the month.
  if (fallbackName && !Object.values(out).some(Boolean)) out[1] = fallbackName;
  return out;
}

export function WasteDisposalRecord({ initialData, onSubmit, isEdit }: DocFormProps = {}) {
  const router = useRouter();
  // The record's own plant wins over the selector, so an A185 sheet opened from
  // a W202 session still shows the format it was filed under.
  const warehouse = initialData?.warehouse || getStoredWarehouse();
  const meta = wasteDisposalDocMeta(warehouse);

  const [month, setMonth] = useState(() => initialData?.month || "");
  const [area, setArea] = useState(() => initialData?.area || "");
  const [grid, setGrid] = useState<WasteGrid>(() => {
    const init: WasteGrid = {};
    WASTE_TYPES.forEach((t) => { init[t.key] = readWasteRow(initialData?.grid, t); });
    return init;
  });
  const [checkedDays, setCheckedDays] = useState<DaySignoff>(() =>
    readDaySignoff(initialData?.checked_by_days, initialData?.checked_by));
  const [verifiedDays, setVerifiedDays] = useState<DaySignoff>(() =>
    readDaySignoff(initialData?.verified_by_days, initialData?.verified_by));
  const [remarks, setRemarks] = useState(() => initialData?.remarks || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Days past the month's length stay on screen (the paper always shows 31) but
  // are locked, so February can't quietly collect a 30th.
  const lastDay = daysInMonth(month);

  const cycle = (typeKey: string, day: number) =>
    setGrid((p) => ({ ...p, [typeKey]: { ...p[typeKey], [day]: nextMark(p[typeKey]?.[day] || "") } }));

  /** Tick every in-month day of one waste row — the common "disposed daily" case. */
  const fillRow = (typeKey: string, mark: string) =>
    setGrid((p) => {
      const row = { ...p[typeKey] };
      WASTE_DAYS.forEach((d) => { if (d <= lastDay) row[d] = mark; });
      return { ...p, [typeKey]: row };
    });

  /** Stamp one signatory across every in-month day. */
  const fillSignoff = (setter: (f: (p: DaySignoff) => DaySignoff) => void, name: string) =>
    setter((p) => {
      const next = { ...p };
      WASTE_DAYS.forEach((d) => { if (d <= lastDay) next[d] = name; });
      return next;
    });

  const markedCount = WASTE_TYPES.reduce(
    (n, t) => n + WASTE_DAYS.filter((d) => d <= lastDay && grid[t.key]?.[d]).length, 0);
  const totalCells = WASTE_TYPES.length * lastDay;

  const handleSubmit = async () => {
    if (!month) { setError("Month is required."); return; }
    setSubmitting(true);
    setError("");
    const payload: Record<string, any> = {
      warehouse,
      month,
      // `area` is the "location:" field on the printed format.
      area,
      // Array of { waste_type, day1..day31 } — the shape the column was designed
      // for. The old object-keyed-by-label shape still loads (see readWasteRow).
      grid: WASTE_TYPES.map((t) => {
        const row: Record<string, any> = { waste_type: t.label, key: t.key };
        WASTE_DAYS.forEach((d) => { row[`day${d}`] = grid[t.key]?.[d] || ""; });
        return row;
      }),
      checked_by_days: checkedDays,
      verified_by_days: verifiedDays,
      // Scalar columns keep the list page and generic record view working.
      checked_by: WASTE_DAYS.map((d) => checkedDays[d]).find(Boolean) || "",
      verified_by: WASTE_DAYS.map((d) => verifiedDays[d]).find(Boolean) || "",
      remarks,
    };
    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const { docsApi } = await import("@/lib/api/documentations");
        await docsApi.create("waste-disposal", payload);
        router.push("/documentations/waste-disposal");
      }
    } catch (e: any) {
      setError(e?.message || "Submit failed. Nothing was saved — check the fields and try again.");
      setSubmitting(false);
    }
  };

  const dayCellTone = (v: string) =>
    v === "✓" ? "bg-emerald-100 text-emerald-700"
    : v === "✕" ? "bg-red-100 text-red-700"
    : "text-ink-300";

  return (
    <div className="max-w-full mx-auto space-y-4">
      {/* Document identity */}
      <section className="surface-card overflow-hidden">
        <div className="px-4 sm:px-6 py-4 flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-500">
              Candor Foods Private Limited
            </p>
            <h1 className="text-lg sm:text-xl font-bold text-ink-600 tracking-tight mt-1">
              Waste Disposal Record
            </h1>
            <p className="text-xs text-ink-400 font-medium mt-1">
              Document No: <span className="font-mono text-ink-500">{meta.docNo}</span>
              {meta.issueNo && (
                <span className="text-ink-300"> · Issue {meta.issueNo} · Rev {meta.revisionNo}</span>
              )}
            </p>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-cream-200 border border-cream-300 px-3 py-1.5 text-xs font-bold text-ink-600">
            <span className={`w-2 h-2 rounded-full ${warehouse === "A185" ? "bg-blue-500" : "bg-emerald-500"}`} />
            {warehouse}
          </span>
        </div>
      </section>

      {/* Month and location */}
      <section className="surface-card px-4 sm:px-6 py-5">
        <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
          <div>
            <label className="label-base" htmlFor="wd-month">
              Month <span className="text-brand-500">*</span>
            </label>
            <input
              id="wd-month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="input-base"
            />
          </div>
          <div>
            <label className="label-base" htmlFor="wd-area">Location</label>
            <input
              id="wd-area"
              type="text"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="e.g. Production Floor"
              className="input-base"
            />
          </div>
        </div>
      </section>

      {/* Day grid */}
      <section className="surface-card overflow-hidden">
        <header className="px-4 sm:px-6 py-3.5 border-b border-cream-300 bg-cream-100/60 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-bold text-ink-600">Daily Disposal</h2>
            <p className="text-[11px] text-ink-400 font-medium mt-0.5">
              Click a day to cycle it: blank → ✓ disposed → ✕ not disposed.
              {month && <> Showing {lastDay} days.</>}
            </p>
          </div>
          <span className="text-[11px] font-semibold text-ink-400 tabular-nums">
            {markedCount} / {totalCells} days marked
          </span>
        </header>

        {/* Row fill shortcuts */}
        <div className="px-4 sm:px-6 py-3 border-b border-cream-300 flex flex-wrap items-center gap-x-5 gap-y-2">
          {WASTE_TYPES.map((t) => (
            <div key={t.key} className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-ink-500">{t.label}</span>
              <button
                type="button"
                onClick={() => fillRow(t.key, "✓")}
                className="rounded-md border border-cream-300 bg-cream-50 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:border-emerald-400"
                title={`Mark every day of the month disposed`}
              >
                Tick all
              </button>
              <button
                type="button"
                onClick={() => fillRow(t.key, "")}
                className="rounded-md border border-cream-300 bg-cream-50 px-2 py-1 text-[11px] font-semibold text-ink-400 hover:border-brand-500"
                title="Clear this row"
              >
                Clear
              </button>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="text-[11px] border-separate border-spacing-0">
            <thead>
              <tr className="bg-cream-200/70 text-ink-500">
                <th className="sticky left-0 z-10 bg-cream-200 px-3 py-2 text-left font-bold text-[11px] uppercase tracking-wide min-w-[210px] border-r border-cream-300">
                  Type of Waste
                </th>
                {WASTE_DAYS.map((d) => (
                  <th
                    key={d}
                    className={`px-0 py-2 text-center font-bold w-[26px] min-w-[26px] tabular-nums ${d > lastDay ? "text-ink-300/60" : ""}`}
                  >
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Location band, as printed */}
              <tr>
                <td
                  colSpan={WASTE_DAYS.length + 1}
                  className="sticky left-0 bg-cream-200/60 px-3 py-1.5 text-[11px] font-bold text-ink-500 border-y border-cream-300"
                >
                  location: <span className="font-normal text-ink-400">{area || "—"}</span>
                </td>
              </tr>

              {WASTE_TYPES.map((t) => (
                <tr key={t.key} className="border-t border-cream-300">
                  <td className="sticky left-0 z-10 bg-cream-50 px-3 py-2 font-semibold text-ink-600 border-r border-cream-300 align-middle">
                    {t.label}
                  </td>
                  {WASTE_DAYS.map((d) => {
                    const locked = d > lastDay;
                    const val = grid[t.key]?.[d] || "";
                    return (
                      <td key={d} className="p-0 border-l border-cream-300/70">
                        <button
                          type="button"
                          disabled={locked}
                          onClick={() => cycle(t.key, d)}
                          aria-label={`${t.label} — day ${d}`}
                          className={`w-full h-9 text-center font-bold select-none transition-colors
                            ${locked ? "bg-cream-200/40 cursor-not-allowed" : `hover:bg-brand-50 ${dayCellTone(val)}`}`}
                        >
                          {locked ? "" : val}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Per-day sign-off, as printed */}
              {([
                { label: "Checked By", days: checkedDays, set: setCheckedDays },
                { label: "Verified By", days: verifiedDays, set: setVerifiedDays },
              ] as const).map((band) => (
                <tr key={band.label} className="border-t border-cream-300">
                  <td className="sticky left-0 z-10 bg-cream-50 px-3 py-2 font-semibold text-ink-600 border-r border-cream-300">
                    {band.label}
                  </td>
                  {WASTE_DAYS.map((d) => {
                    const locked = d > lastDay;
                    return (
                      <td key={d} className="p-0 border-l border-cream-300/70">
                        <input
                          type="text"
                          disabled={locked}
                          value={locked ? "" : band.days[d] || ""}
                          onChange={(e) => band.set((p) => ({ ...p, [d]: e.target.value }))}
                          aria-label={`${band.label} — day ${d}`}
                          title={band.days[d] || ""}
                          className={`w-full h-9 px-0.5 text-center text-[10px] text-ink-600 bg-transparent border-0
                            focus:outline-none focus:bg-brand-50 focus:ring-1 focus:ring-inset focus:ring-brand-500/40
                            ${locked ? "bg-cream-200/40 cursor-not-allowed" : ""}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Apply a signatory across the month */}
      <section className="surface-card overflow-hidden">
        <header className="px-4 sm:px-6 py-3.5 border-b border-cream-300 bg-cream-100/60">
          <h2 className="text-sm font-bold text-ink-600">Sign-off</h2>
          <p className="text-[11px] text-ink-400 font-medium mt-0.5">
            Pick a name to stamp it across every day above, then edit individual days in the grid where someone else signed.
          </p>
        </header>
        <div className="px-4 sm:px-6 py-5 grid gap-4 sm:grid-cols-2 max-w-2xl">
          <SignaturePicker
            label="Checked By — all days"
            value=""
            onChange={(v) => v && fillSignoff(setCheckedDays, v)}
            options={HYGIENE_CHECKED_BY_OPTIONS}
            inputCls="input-base"
          />
          <SignaturePicker
            label="Verified By — all days"
            value=""
            onChange={(v) => v && fillSignoff(setVerifiedDays, v)}
            options={QC_VERIFIED_BY_OPTIONS}
            inputCls="input-base"
          />
        </div>
      </section>

      {/* Remarks */}
      <section className="surface-card overflow-hidden">
        <header className="px-4 sm:px-6 py-3.5 border-b border-cream-300 bg-cream-100/60">
          <h2 className="text-sm font-bold text-ink-600">Remarks (if any)</h2>
        </header>
        <div className="px-4 sm:px-6 py-5">
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={3}
            placeholder="Anything worth noting about this month's disposal…"
            className="input-base resize-y"
            aria-label="Remarks"
          />
        </div>
      </section>

      {/* Submit */}
      {error && (
        <div role="alert" className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm font-medium text-danger-700">
          {error}
        </div>
      )}
      <div className="flex items-center justify-end gap-3 pb-2">
        <span className="text-xs text-ink-400 font-medium">
          Prepared By: FST &nbsp;·&nbsp; Approved By: FSTL
        </span>
        <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
          {submitting ? "Saving…" : isEdit ? "Update Record" : "Submit Record"}
        </button>
      </div>
    </div>
  );
}

// ===================== F.53 — Chemical Preparation Record =====================
interface ChemRow { id: number; date: string; chemicalName: string; expiryDate: string; manufacturer: string; qtyChemical: string; qtyWater: string; dilutionPercent: string; preparedBy: string; verifiedBy: string; }
const eChem = (id: number): ChemRow => ({ id, date: "", chemicalName: "", expiryDate: "", manufacturer: "", qtyChemical: "", qtyWater: "", dilutionPercent: "", preparedBy: "", verifiedBy: "" });

export function ChemicalPreparationRecord({ initialData, onSubmit, isEdit }: DocFormProps = {}) {
  const [rows, setRows] = useState<ChemRow[]>(() => {
    if (initialData?.rows && Array.isArray(initialData.rows)) {
      return initialData.rows.map((r: any, i: number) => ({
        id: i + 1, date: r.date || "", chemicalName: r.chemical_name || "", expiryDate: r.expiry_date || "",
        manufacturer: r.manufacturer || "", qtyChemical: r.qty_chemical?.toString() || "", qtyWater: r.qty_water?.toString() || "",
        dilutionPercent: r.dilution_percent?.toString() || "", preparedBy: r.prepared_by || "", verifiedBy: r.verified_by || "",
      }));
    }
    return Array.from({ length: 5 }, (_, i) => eChem(i + 1));
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const add = () => setRows((p) => [...p, eChem(p.length + 1)]);
  const rm = (id: number) => { if (rows.length > 1) setRows((p) => p.filter((r) => r.id !== id)); };
  const up = (id: number, f: keyof ChemRow, v: string) => setRows((p) => p.map((r) => (r.id === id ? { ...r, [f]: v } : r)));

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: getStoredWarehouse(),
      rows: rows.filter((r) => r.chemicalName || r.date).map((r) => ({
        date: r.date, chemical_name: r.chemicalName, expiry_date: r.expiryDate, manufacturer: r.manufacturer,
        qty_chemical: r.qtyChemical ? Number(r.qtyChemical) : null, qty_water: r.qtyWater ? Number(r.qtyWater) : null,
        dilution_percent: r.dilutionPercent ? Number(r.dilutionPercent) : null, prepared_by: r.preparedBy, verified_by: r.verifiedBy,
      })),
    };
    try {
      if (onSubmit) { await onSubmit(payload); }
      else { const { docsApi } = await import("@/lib/api/documentations"); await docsApi.create("chemical-preparation", payload); setSuccess(true); }
    } catch (e: any) { alert(e.message || "Submit failed"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="p-4 max-w-full mx-auto">
      <div className="border border-gray-300 mb-4 rounded"><div className="bg-gray-50 p-3"><h1 className="font-bold text-lg">CANDOR FOODS PRIVATE LIMITED</h1><p className="text-sm font-semibold">Chemical Preparation Record - Housekeeping</p><p className="text-xs text-gray-600">Doc No: CFPLA.C4.F.53</p></div></div>
      <div className="overflow-x-auto border border-gray-300 rounded">
        <table className="w-full text-xs">
          <thead className="bg-gray-100"><tr>{["Date", "Chemical Name", "Expiry Date", "Manufacturer", "Qty Chemical (ml/g)", "Qty Water (ml)", "Dilution %", "Prepared By", "Verified By", ""].map((h) => <th key={h} className="border border-gray-300 px-2 py-2">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-blue-50">
                {(["date", "chemicalName", "expiryDate", "manufacturer", "qtyChemical", "qtyWater", "dilutionPercent", "preparedBy", "verifiedBy"] as (keyof ChemRow)[]).map((f) => <td key={f} className="border border-gray-300 px-1 py-1"><input type={f === "date" || f === "expiryDate" ? "date" : ["qtyChemical", "qtyWater", "dilutionPercent"].includes(f as string) ? "number" : "text"} value={r[f] as string} onChange={(e) => up(r.id, f, e.target.value)} className="w-full border rounded px-1 py-0.5" /></td>)}
                <td className="border border-gray-300 px-1 py-1 text-center"><button onClick={() => rm(r.id)} className="text-red-500 text-xs">✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={add} className="mt-2 bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700">+ Add Row</button>
      <div className="mt-2 text-xs text-gray-500">Prepared by: FST | Approved by: FSTL</div>
      <button onClick={handleSubmit} disabled={submitting} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
      </button>
      {success && <p className="text-green-600 text-sm mt-2">Record saved successfully!</p>}
    </div>
  );
}

// ===================== F.55 / F.57 — Housekeeping Deep Cleaning Record =====================
// Two controlled formats behind one screen:
//   A185 -> CFPLB.C4.F.57 — 11 scheduled areas, carries an "Area:" header field
//   W202 -> CFPLA.C4.F.55 — 14 scheduled areas, no Area field
// Row seeds live in @/config/deepCleaningAreas so the print page reads the same list.

const DC_WEEKS = ["w1", "w2", "w3", "w4"] as const;
type DcWeek = (typeof DC_WEEKS)[number];
const DC_WEEK_LABELS: Record<DcWeek, string> = { w1: "Week 1", w2: "Week 2", w3: "Week 3", w4: "Week 4" };

interface DcRow { sr: number; area: string; method: string; freq: string; w1: string; w2: string; w3: string; w4: string; }

const emptyWeeks = (): Record<DcWeek, string> => ({ w1: "", w2: "", w3: "", w4: "" });

/** Colour the frequency pill so the cadence reads at a glance down the column. */
const freqTone = (freq: string) =>
  freq === "M" ? "bg-blue-100 text-blue-700"
  : freq === "FD" ? "bg-purple-100 text-purple-700"
  : freq === "D" ? "bg-amber-100 text-amber-700"
  : "bg-emerald-100 text-emerald-700";

/**
 * Build the editable grid for `warehouse`, merging anything already saved.
 * Saved rows are matched by area name, so a record keeps its dates even if the
 * seed list is later reordered. Legacy records that stored a `weeks` object
 * keyed by area (never persisted — the column is `rows` — but tolerated here)
 * are read too.
 */
function seedDeepCleanRows(warehouse: string, initialData?: Record<string, any>): DcRow[] {
  const saved: Record<string, any> = {};
  if (Array.isArray(initialData?.rows)) {
    initialData!.rows.forEach((r: any) => {
      if (r?.area) saved[String(r.area).trim().toLowerCase()] = r;
    });
  } else if (initialData?.weeks && typeof initialData.weeks === "object") {
    Object.entries(initialData.weeks).forEach(([a, w]: [string, any]) => {
      saved[a.trim().toLowerCase()] = { week1: w?.w1, week2: w?.w2, week3: w?.w3, week4: w?.w4 };
    });
  }
  return deepCleanItemsFor(warehouse).map((item) => {
    const prev = saved[item.area.trim().toLowerCase()] || {};
    return {
      sr: item.sr,
      area: item.area,
      method: item.method,
      freq: item.freq,
      w1: prev.week1 ?? prev.w1 ?? "",
      w2: prev.week2 ?? prev.w2 ?? "",
      w3: prev.week3 ?? prev.w3 ?? "",
      w4: prev.week4 ?? prev.w4 ?? "",
    };
  });
}

export function DeepCleaningRecord({ initialData, onSubmit, isEdit }: DocFormProps = {}) {
  const router = useRouter();
  // The record's own plant wins over the selector, so opening an A185 sheet from
  // a W202 session still edits it against the format it was filed under.
  const warehouse = initialData?.warehouse || getStoredWarehouse();
  const showArea = hasAreaField(warehouse);
  const docNo = deepCleanDocNo(warehouse);

  const [month, setMonth] = useState(() => initialData?.month || "");
  const [area, setArea] = useState(() => initialData?.area || "");
  const [rows, setRows] = useState<DcRow[]>(() => seedDeepCleanRows(warehouse, initialData));
  const [checkedByWeeks, setCheckedByWeeks] = useState<Record<DcWeek, string>>(() => ({
    ...emptyWeeks(),
    ...(initialData?.checked_by_weeks || {}),
    ...(initialData?.checked_by && !initialData?.checked_by_weeks ? { w1: initialData.checked_by } : {}),
  }));
  const [verifiedByWeeks, setVerifiedByWeeks] = useState<Record<DcWeek, string>>(() => ({
    ...emptyWeeks(),
    ...(initialData?.verified_by_weeks || {}),
    ...(initialData?.verified_by && !initialData?.verified_by_weeks ? { w1: initialData.verified_by } : {}),
  }));
  const [observations, setObservations] = useState(() => initialData?.observations || "");
  const [correctiveActions, setCorrectiveActions] = useState(() => initialData?.corrective_actions || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const setWeek = (idx: number, week: DcWeek, value: string) =>
    setRows((p) => p.map((r, i) => (i === idx ? { ...r, [week]: value } : r)));

  /** Stamp one date down a whole week column — the common case when a sweep happens in one go. */
  const fillColumn = (week: DcWeek, value: string) =>
    setRows((p) => p.map((r) => ({ ...r, [week]: value })));

  const filledCount = rows.reduce((n, r) => n + DC_WEEKS.filter((w) => r[w]).length, 0);
  const totalCells = rows.length * 4;

  const handleSubmit = async () => {
    if (!month) { setError("Month is required."); return; }
    setSubmitting(true);
    setError("");
    const payload: Record<string, any> = {
      warehouse,
      month,
      // `area` only exists on the A185 format; sending "" for W202 is harmless.
      area: showArea ? area : "",
      // Column is `rows` (JSONB), not `weeks` — a payload keyed `weeks` is
      // dropped by the backend column filter and the whole grid is lost.
      rows: rows.map((r) => ({
        sr: r.sr, area: r.area, method: r.method, freq: r.freq,
        week1: r.w1, week2: r.w2, week3: r.w3, week4: r.w4,
      })),
      checked_by_weeks: checkedByWeeks,
      verified_by_weeks: verifiedByWeeks,
      // Scalar columns keep the list page and the generic record view working;
      // the paper signs per week, so take the first week actually signed.
      checked_by: DC_WEEKS.map((w) => checkedByWeeks[w]).find(Boolean) || "",
      verified_by: DC_WEEKS.map((w) => verifiedByWeeks[w]).find(Boolean) || "",
      observations,
      corrective_actions: correctiveActions,
    };
    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const { docsApi } = await import("@/lib/api/documentations");
        await docsApi.create("deep-cleaning", payload);
        router.push("/documentations/deep-cleaning");
      }
    } catch (e: any) {
      setError(e?.message || "Submit failed. Nothing was saved — check the fields and try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Document identity */}
      <section className="surface-card overflow-hidden">
        <div className="px-4 sm:px-6 py-4 flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-500">
              Candor Foods Private Limited
            </p>
            <h1 className="text-lg sm:text-xl font-bold text-ink-600 tracking-tight mt-1">
              Housekeeping Deep Cleaning Record
            </h1>
            <p className="text-xs text-ink-400 font-medium mt-1">
              Document No: <span className="font-mono text-ink-500">{docNo}</span>
            </p>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-cream-200 border border-cream-300 px-3 py-1.5 text-xs font-bold text-ink-600">
            <span className={`w-2 h-2 rounded-full ${warehouse === "A185" ? "bg-blue-500" : "bg-emerald-500"}`} />
            {warehouse}
          </span>
        </div>
      </section>

      {/* Period and area */}
      <section className="surface-card px-4 sm:px-6 py-5">
        <div className={`grid gap-4 ${showArea ? "sm:grid-cols-2" : "sm:grid-cols-1 max-w-xs"}`}>
          <div>
            <label className="label-base" htmlFor="dc-month">
              Month <span className="text-brand-500">*</span>
            </label>
            <input
              id="dc-month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="input-base"
            />
          </div>
          {showArea && (
            <div>
              <label className="label-base" htmlFor="dc-area">Area</label>
              <input
                id="dc-area"
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g. Production Floor"
                className="input-base"
              />
            </div>
          )}
        </div>
      </section>

      {/* Cleaning schedule */}
      <section className="surface-card overflow-hidden">
        <header className="px-4 sm:px-6 py-3.5 border-b border-cream-300 bg-cream-100/60 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-bold text-ink-600">Cleaning Schedule</h2>
            <p className="text-[11px] text-ink-400 font-medium mt-0.5">{DEEP_CLEAN_FREQ_LEGEND}</p>
          </div>
          <span className="text-[11px] font-semibold text-ink-400 tabular-nums">
            {filledCount} / {totalCells} dates filled
          </span>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="bg-cream-200/70 text-ink-500">
                <th className="px-2 py-2.5 text-center font-bold text-[11px] uppercase tracking-wide w-14">Sr.</th>
                <th className="px-3 py-2.5 text-left font-bold text-[11px] uppercase tracking-wide">Area</th>
                <th className="px-3 py-2.5 text-left font-bold text-[11px] uppercase tracking-wide">Method</th>
                <th className="px-2 py-2.5 text-center font-bold text-[11px] uppercase tracking-wide w-20">Freq</th>
                {DC_WEEKS.map((w) => (
                  <th key={w} className="px-2 py-2 text-center font-bold text-[11px] uppercase tracking-wide w-[136px]">
                    <div>{DC_WEEK_LABELS[w]}</div>
                    <input
                      type="date"
                      aria-label={`Fill every row with one date for ${DC_WEEK_LABELS[w]}`}
                      title="Fill this date down the whole column"
                      onChange={(e) => fillColumn(w, e.target.value)}
                      className="mt-1 w-full rounded-md border border-cream-300 bg-cream-50 px-1.5 py-1 text-[11px] font-normal text-ink-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.area} className="border-t border-cream-300 even:bg-cream-100/40 hover:bg-brand-50/40 transition-colors">
                  <td className="px-2 py-2 text-center text-ink-400 font-semibold tabular-nums">{row.sr}</td>
                  <td className="px-3 py-2 font-semibold text-ink-600">{row.area}</td>
                  <td className="px-3 py-2 text-ink-400 text-xs">{row.method}</td>
                  <td className="px-2 py-2 text-center">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${freqTone(row.freq)}`}
                      title={DEEP_CLEAN_FREQ_LABELS[row.freq] || row.freq}
                    >
                      {row.freq}
                    </span>
                  </td>
                  {DC_WEEKS.map((w) => (
                    <td key={w} className="px-1.5 py-1.5">
                      <input
                        type="date"
                        aria-label={`${row.area} — ${DC_WEEK_LABELS[w]}`}
                        value={row[w]}
                        onChange={(e) => setWeek(idx, w, e.target.value)}
                        className="w-full rounded-md border border-cream-300 bg-cream-50 px-1.5 py-1.5 text-xs text-ink-600 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Weekly sign-off */}
      <section className="surface-card overflow-hidden">
        <header className="px-4 sm:px-6 py-3.5 border-b border-cream-300 bg-cream-100/60">
          <h2 className="text-sm font-bold text-ink-600">Weekly Sign-off</h2>
          <p className="text-[11px] text-ink-400 font-medium mt-0.5">
            The format is signed once per week column — leave a week blank if it was not worked.
          </p>
        </header>
        <div className="px-4 sm:px-6 py-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {DC_WEEKS.map((w) => (
            <div key={w} className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-500 pb-1.5 border-b border-cream-300">
                {DC_WEEK_LABELS[w]}
              </p>
              <SignaturePicker
                label="Checked By"
                value={checkedByWeeks[w]}
                onChange={(v) => setCheckedByWeeks((p) => ({ ...p, [w]: v }))}
                options={HYGIENE_CHECKED_BY_OPTIONS}
                inputCls="input-base"
                labelCls="block text-[11px] font-semibold text-ink-400 mb-1 uppercase tracking-wide"
              />
              <SignaturePicker
                label="Verified By"
                value={verifiedByWeeks[w]}
                onChange={(v) => setVerifiedByWeeks((p) => ({ ...p, [w]: v }))}
                options={QC_VERIFIED_BY_OPTIONS}
                inputCls="input-base"
                labelCls="block text-[11px] font-semibold text-ink-400 mb-1 uppercase tracking-wide"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Observations and corrective actions */}
      <section className="surface-card overflow-hidden">
        <header className="px-4 sm:px-6 py-3.5 border-b border-cream-300 bg-cream-100/60">
          <h2 className="text-sm font-bold text-ink-600">Observations &amp; Corrective Actions</h2>
        </header>
        <div className="px-4 sm:px-6 py-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label-base" htmlFor="dc-obs">Observations</label>
            <textarea
              id="dc-obs"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={4}
              placeholder="Anything noted during the month's deep cleaning…"
              className="input-base resize-y"
            />
          </div>
          <div>
            <label className="label-base" htmlFor="dc-ca">Corrective Actions</label>
            <textarea
              id="dc-ca"
              value={correctiveActions}
              onChange={(e) => setCorrectiveActions(e.target.value)}
              rows={4}
              placeholder="What was done about the observations above…"
              className="input-base resize-y"
            />
          </div>
        </div>
      </section>

      {/* Submit */}
      {error && (
        <div role="alert" className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm font-medium text-danger-700">
          {error}
        </div>
      )}
      <div className="flex items-center justify-end gap-3 pb-2">
        <span className="text-xs text-ink-400 font-medium">
          Prepared By: FST &nbsp;·&nbsp; Approved By: FSTL
        </span>
        <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
          {submitting ? "Saving…" : isEdit ? "Update Record" : "Submit Record"}
        </button>
      </div>
    </div>
  );
}

// ===================== F.57 — Non Conforming Product Report =====================
// META label -> real DB column (the table has one column per field, not a
// single JSON blob) — used to flatten `fields` into the create/update payload
// and to unflatten a saved record back into `fields` for editing.
const NCP_META_TO_DB: Record<string, string> = {
  "Non Conformity No.": "non_conformity_no",
  "Supplier": "supplier",
  "Broker": "broker",
  "Others": "others",
  "Detected By": "detected_by",
  "Invoice/Challan/GRN/PO No./Batch No": "invoice_ref",
  "R.C. No.": "rc_no",
  "Reason for Non Conformity": "reason",
  "Food Safety Issue": "food_safety_issue",
  "Description": "description",
  "Documented By": "documented_by",
};

export function NonConformingProductReport({ initialData, onSubmit, isEdit }: DocFormProps = {}) {
  const [fields, setFields] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    if (initialData) {
      Object.entries(NCP_META_TO_DB).forEach(([label, col]) => { init[label] = String(initialData[col] || ""); });
      init["details"] = String(initialData.disposition_details || "");
      init["authorizedPerson"] = String(initialData.authorized_person || "");
      init["receivedBy"] = String(initialData.received_by || "");
    }
    return init;
  });
  const [disposition, setDisposition] = useState<string[]>(() => {
    if (initialData?.disposition && Array.isArray(initialData.disposition)) return initialData.disposition;
    return [];
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const up = (k: string, v: string) => setFields((p) => ({ ...p, [k]: v }));
  const toggleDisp = (d: string) => setDisposition((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d]));

  const META = [{ l: "Non Conformity No." }, { l: "Supplier" }, { l: "Broker" }, { l: "Others" }, { l: "Detected By" }, { l: "Invoice/Challan/GRN/PO No./Batch No" }, { l: "R.C. No." }, { l: "Reason for Non Conformity" }, { l: "Food Safety Issue" }, { l: "Description" }, { l: "Documented By" }];

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: getStoredWarehouse() || null,
      disposition,
      disposition_details: fields["details"] || "",
      authorized_person: fields["authorizedPerson"] || "",
      received_by: fields["receivedBy"] || "",
    };
    Object.entries(NCP_META_TO_DB).forEach(([label, col]) => { payload[col] = fields[label] || ""; });
    try {
      if (onSubmit) { await onSubmit(payload); }
      else { const { docsApi } = await import("@/lib/api/documentations"); await docsApi.create("non-conforming-product", payload); setSuccess(true); }
    } catch (e: any) { alert(e.message || "Submit failed"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="border border-gray-300 mb-4 rounded"><div className="bg-gray-50 p-3"><h1 className="font-bold text-lg">CANDOR FOODS PRIVATE LIMITED</h1><p className="text-sm font-semibold">Product Non Conformity / Rejection Record</p><p className="text-xs text-gray-600">Doc No: CFPLA.C5.F.57</p></div></div>
      <div className="border border-gray-300 rounded mb-4">{META.map((f) => <div key={f.l} className="flex border-b border-gray-200 last:border-b-0"><label className="w-1/3 px-3 py-2 text-sm font-medium bg-gray-50 border-r border-gray-200">{f.l}</label><div className="w-2/3 px-2 py-1"><input type="text" value={fields[f.l] || ""} onChange={(e) => up(f.l, e.target.value)} className="w-full border rounded px-2 py-1 text-sm" /></div></div>)}</div>
      <h3 className="font-semibold text-sm mb-2">Suggested Disposition of Material</h3>
      <div className="flex gap-3 mb-4">{["Rejected", "Returned to Supplier/Broker", "Accepted by Dispensation"].map((d) => <label key={d} className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-sm cursor-pointer ${disposition.includes(d) ? "bg-orange-100 border-orange-400" : "border-gray-300"}`}><input type="checkbox" checked={disposition.includes(d)} onChange={() => toggleDisp(d)} className="sr-only" /><span className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${disposition.includes(d) ? "bg-orange-500 border-orange-500 text-white" : "border-gray-400"}`}>{disposition.includes(d) ? "✓" : ""}</span>{d}</label>)}</div>
      <div className="mb-4"><label className="text-sm font-medium">Details / Contact supplier for investigation</label><textarea value={fields["details"] || ""} onChange={(e) => up("details", e.target.value)} rows={3} className="border rounded px-3 py-2 w-full" /></div>
      <div className="grid grid-cols-2 gap-3"><div><label className="text-sm font-medium">Authorized Person</label><input type="text" value={fields["authorizedPerson"] || ""} onChange={(e) => up("authorizedPerson", e.target.value)} className="border rounded px-3 py-2 w-full" /></div><div><label className="text-sm font-medium">Received By</label><input type="text" value={fields["receivedBy"] || ""} onChange={(e) => up("receivedBy", e.target.value)} className="border rounded px-3 py-2 w-full" /></div></div>
      <button onClick={handleSubmit} disabled={submitting} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
      </button>
      {success && <p className="text-green-600 text-sm mt-2">Record saved successfully!</p>}
    </div>
  );
}

// ===================== F.58 — Re-Work / Re-Cycling / Re-Packing =====================
interface ReworkRow { id: number; date: string; time: string; productNameBatch: string; reason: string; qtyToRework: string; productApproval: string; reworkedProductBatch: string; totalReworkedQty: string; responsibility: string; checkedBy: string; verifiedBy: string; }
const eRW = (id: number): ReworkRow => ({ id, date: "", time: "", productNameBatch: "", reason: "", qtyToRework: "", productApproval: "", reworkedProductBatch: "", totalReworkedQty: "", responsibility: "", checkedBy: "", verifiedBy: "" });

export function ReworkRecyclingRepacking({ initialData, onSubmit, isEdit }: DocFormProps = {}) {
  const [rows, setRows] = useState<ReworkRow[]>(() => {
    if (initialData?.rows && Array.isArray(initialData.rows)) {
      return initialData.rows.map((r: any, i: number) => ({
        id: i + 1, date: r.date || "", time: r.time || "", productNameBatch: r.product_name_batch || "",
        reason: r.reason || "", qtyToRework: r.qty_to_rework?.toString() || "", productApproval: r.product_approval || "",
        reworkedProductBatch: r.reworked_product_batch || "", totalReworkedQty: r.total_reworked_qty?.toString() || "",
        responsibility: r.responsibility || "", checkedBy: r.checked_by || "", verifiedBy: r.verified_by || "",
      }));
    }
    return Array.from({ length: 3 }, (_, i) => eRW(i + 1));
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const add = () => setRows((p) => [...p, eRW(p.length + 1)]);
  const rm = (id: number) => { if (rows.length > 1) setRows((p) => p.filter((r) => r.id !== id)); };
  const up = (id: number, f: keyof ReworkRow, v: string) => setRows((p) => p.map((r) => (r.id === id ? { ...r, [f]: v } : r)));

  const handleSubmit = async () => {
    setSubmitting(true);
    setSuccess(false);
    const payload: Record<string, any> = {
      warehouse: getStoredWarehouse() || null,
      rows: rows.filter((r) => r.date || r.productNameBatch).map((r) => ({
        date: r.date, time: r.time, product_name_batch: r.productNameBatch, reason: r.reason,
        qty_to_rework: r.qtyToRework, product_approval: r.productApproval,
        reworked_product_batch: r.reworkedProductBatch, total_reworked_qty: r.totalReworkedQty,
        responsibility: r.responsibility, checked_by: r.checkedBy, verified_by: r.verifiedBy,
      })),
    };
    try {
      if (onSubmit) { await onSubmit(payload); }
      else { const { docsApi } = await import("@/lib/api/documentations"); await docsApi.create("rework-recycling", payload); setSuccess(true); }
    } catch (e: any) { alert(e.message || "Submit failed"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="p-4 max-w-full mx-auto">
      <div className="border border-gray-300 mb-4 rounded"><div className="bg-gray-50 p-3"><h1 className="font-bold text-lg">CANDOR FOODS PRIVATE LIMITED</h1><p className="text-sm font-semibold">Re-Work / Re-Cycling / Re-Packing Record</p><p className="text-xs text-gray-600">Doc No: CFPLA.C5.F.58</p></div></div>
      <div className="overflow-x-auto border border-gray-300 rounded">
        <table className="w-full text-xs">
          <thead className="bg-gray-100"><tr>{["Sr.", "Date", "Time", "Product & Batch", "Reason for Rework", "Qty to Rework", "Product Approval (Quality)", "Reworked Product & Batch", "Total Reworked Qty", "Responsibility", "Checked By", "Verified By", ""].map((h) => <th key={h} className="border border-gray-300 px-1 py-2">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="hover:bg-blue-50">
                <td className="border border-gray-300 px-1 py-1 text-center">{i + 1}</td>
                {(["date", "time", "productNameBatch", "reason", "qtyToRework", "productApproval", "reworkedProductBatch", "totalReworkedQty", "responsibility", "checkedBy", "verifiedBy"] as (keyof ReworkRow)[]).map((f) => <td key={f} className="border border-gray-300 px-1 py-1"><input type={f === "date" ? "date" : f === "time" ? "time" : "text"} value={r[f] as string} onChange={(e) => up(r.id, f, e.target.value)} className="w-full border rounded px-1 py-0.5 min-w-[80px]" /></td>)}
                <td className="border border-gray-300 px-1 py-1 text-center"><button onClick={() => rm(r.id)} className="text-red-500 text-xs">✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={add} className="mt-2 bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700">+ Add Row</button>
      <div className="mt-2 text-xs text-gray-500">Prepared by: FST | Approved by: FSTL</div>
      <button onClick={handleSubmit} disabled={submitting} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
        {submitting ? "Submitting..." : isEdit ? "Update" : "Submit"}
      </button>
      {success && <p className="text-green-600 text-sm mt-2">Record saved successfully!</p>}
    </div>
  );
}

export default OutgoingVehicleInspection;
