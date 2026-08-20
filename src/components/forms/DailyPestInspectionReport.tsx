"use client";

import { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowRightToLine, Bug, CopyCheck } from "lucide-react";
import DocSection from "@/components/documentations/DocSection";
import SignaturePicker from "@/components/ui/SignaturePicker";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";
import { CHECKED_BY_OPTIONS, QC_VERIFIED_BY_OPTIONS } from "@/lib/signatures";
import {
  PEST_NOTE_ROWS,
  PEST_SECTION_TITLE,
  PEST_STATUS_CODES,
  PEST_STATUS_LABELS,
  pestAreasFor,
  pestDaysInMonth,
  pestDocMetaFor,
  type PestNoteKey,
  type PestStatus,
} from "@/config/dailyPestAreas";

/*
 * Daily Pest Inspection Report — Section 1, AREA PEST SIGHTING.
 *
 *     W202  CFPLA.C4.F.47        A185  CFPLB.C4.RA.04
 *
 * One record is one month at one plant, covering every area on the sheet. The
 * two plants run the same grid over different areas; both lists and both header
 * blocks live in config/dailyPestAreas.ts, shared with the print page.
 */

const FORM_TYPE = "daily-pest-inspection";

/** area → day → legend code. Day keys are strings: they survive a JSON round trip. */
type Cells = Record<string, Record<string, PestStatus>>;
/** The Correction / Remark rows, each a day → free text map. */
type Notes = Record<PestNoteKey, Record<string, string>>;

const EMPTY_NOTES = (): Notes =>
  PEST_NOTE_ROWS.reduce((acc, row) => ({ ...acc, [row.key]: {} }), {} as Notes);

/** Read the stored `grid` back, tolerating a record saved before a key existed. */
function readGrid(raw: any): { cells: Cells; notes: Notes } {
  const src = raw && typeof raw === "object" ? raw : {};
  const cells: Cells = {};
  if (src.cells && typeof src.cells === "object") {
    for (const [area, days] of Object.entries(src.cells as Record<string, any>)) {
      if (!days || typeof days !== "object") continue;
      cells[area] = {};
      for (const [day, value] of Object.entries(days as Record<string, any>)) {
        if (typeof value === "string" && value) cells[area][day] = value as PestStatus;
      }
    }
  }
  const notes = EMPTY_NOTES();
  for (const { key } of PEST_NOTE_ROWS) {
    const row = src[key];
    if (!row || typeof row !== "object") continue;
    for (const [day, value] of Object.entries(row as Record<string, any>)) {
      if (typeof value === "string" && value) notes[key][day] = value;
    }
  }
  return { cells, notes };
}

/** Drop the blanks from one day → value row. */
function prunedRow<T>(days: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(days).filter(([, v]) => v !== "" && v != null)) as Record<string, T>;
}

/** Drop empty cells and then empty rows, so a blank month saves as `{}` rather
 *  than a full set of areas each holding 31 empty strings. */
function prunedGrid<T>(rows: Record<string, Record<string, T>>): Record<string, Record<string, T>> {
  const out: Record<string, Record<string, T>> = {};
  for (const [key, days] of Object.entries(rows)) {
    const kept = prunedRow(days);
    if (Object.keys(kept).length) out[key] = kept;
  }
  return out;
}

/** One cell of the grid, as (area, day). */
type Target = [string, number];

/**
 * The first code already entered among these cells, scanning in order.
 *
 * This is what a Fill button copies — the same rule the training attendance
 * sheet's Fill all uses, so one behaviour covers both forms: enter the code
 * once, then spread it.
 */
export function firstCode(cells: Cells, targets: Target[]): PestStatus {
  for (const [area, day] of targets) {
    const value = cells[area]?.[String(day)];
    if (value) return value;
  }
  return "";
}

/**
 * Every one of `targets` set to the first code already entered among them.
 *
 * Cells that already hold a different code are overwritten: filling the row is
 * the point of pressing it, and unlike an automatic copy-down it only happens
 * when asked. Returns the grid untouched when there is nothing to spread, so
 * pressing Fill on an empty row is a no-op rather than a wipe.
 */
export function filled(cells: Cells, targets: Target[]): Cells {
  const code = firstCode(cells, targets);
  if (!code) return cells;
  const next: Cells = { ...cells };
  for (const [area, day] of targets) {
    next[area] = { ...(next[area] ?? {}), [String(day)]: code };
  }
  return next;
}

/** Spreads the first code already entered across a row, a date, or the sheet. */
function FillButton({
  title,
  onClick,
  icon: Icon,
  text,
}: {
  title: string;
  onClick: () => void;
  icon: typeof ArrowDownToLine;
  text?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded border border-cream-300 bg-cream-50 px-1 py-0.5 !min-h-0 text-[9px] font-bold uppercase tracking-wide text-ink-400 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600"
    >
      <Icon className="h-2.5 w-2.5" />
      {text}
    </button>
  );
}

interface Props {
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => Promise<void>;
  isEdit?: boolean;
}

export default function DailyPestInspectionReport({ initialData, onSubmit, isEdit }: Props = {}) {
  // An existing record is read at its OWN plant, not whichever one the selector
  // happens to be showing — otherwise opening a W202 sheet from A185 would
  // render it against the wrong area list and appear to have lost its rows.
  const warehouse = initialData?.warehouse || getStoredWarehouse();
  const areas = useMemo(() => pestAreasFor(warehouse), [warehouse]);
  const meta = pestDocMetaFor(warehouse);

  const [month, setMonth] = useState<string>(initialData?.month || "");
  const [checkedBy, setCheckedBy] = useState<string>(initialData?.checked_by || "");
  const [verifiedBy, setVerifiedBy] = useState<string>(initialData?.verified_by || "");

  const initialGrid = useMemo(() => readGrid(initialData?.grid), [initialData]);
  const [cells, setCells] = useState<Cells>(initialGrid.cells);
  const [notes, setNotes] = useState<Notes>(initialGrid.notes);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dayCount = pestDaysInMonth(month);
  const days = useMemo(() => Array.from({ length: dayCount }, (_, i) => i + 1), [dayCount]);

  const recorded = useMemo(
    () => Object.values(cells).reduce((sum, row) => sum + Object.values(row).filter(Boolean).length, 0),
    [cells]
  );

  const setCell = (area: string, day: number, value: PestStatus) =>
    setCells((prev) => ({ ...prev, [area]: { ...(prev[area] ?? {}), [String(day)]: value } }));

  const setNote = (key: PestNoteKey, day: number, value: string) =>
    setNotes((prev) => ({ ...prev, [key]: { ...prev[key], [String(day)]: value } }));

  // Fill targets. Correction and Remark are free text and get no Fill button —
  // one note repeated under all 31 dates would say nothing.
  const rowTargets = (area: string): Target[] => days.map((day) => [area, day]);
  const dayTargets = (day: number): Target[] => areas.map((area) => [area, day]);
  const allTargets = (): Target[] => areas.flatMap((area) => days.map((day): Target => [area, day]));

  const fill = (targets: Target[]) => setCells((prev) => filled(prev, targets));

  const handleSubmit = async () => {
    if (!month) {
      setError("Pick the month this sheet covers.");
      return;
    }
    setError(null);
    setSubmitting(true);
    setSuccess(false);

    const payload: Record<string, any> = {
      warehouse,
      month,
      checked_by: checkedBy,
      verified_by: verifiedBy,
      grid: {
        cells: prunedGrid(cells),
        ...Object.fromEntries(PEST_NOTE_ROWS.map(({ key }) => [key, prunedRow(notes[key])])),
      },
    };

    try {
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const { docsApi } = await import("@/lib/api/documentations");
        await docsApi.create(FORM_TYPE, payload);
        setSuccess(true);
      }
    } catch (e: any) {
      setError(e?.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <DocSection title="Sheet Details" icon={Bug}>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label-base">
              Month <span className="text-danger-600">*</span>
            </label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="input-base"
            />
          </div>
          <SignaturePicker
            label="Checked By"
            value={checkedBy}
            onChange={setCheckedBy}
            options={CHECKED_BY_OPTIONS}
            inputCls="input-base"
            labelCls="label-base"
          />
          <SignaturePicker
            label="Verified By"
            value={verifiedBy}
            onChange={setVerifiedBy}
            options={QC_VERIFIED_BY_OPTIONS}
            inputCls="input-base"
            labelCls="label-base"
          />
        </div>
        <p className="mt-3 text-[11px] text-ink-400">
          {warehouse} · Document No {meta.docNo} · Issue Date {meta.issueDate} · Issue No {meta.issueNo}
        </p>
      </DocSection>

      <DocSection
        title={PEST_SECTION_TITLE}
        description={`${areas.length} areas · ${recorded} cells recorded · Fill copies the first code already entered`}
        actions={
          <FillButton
            title="Fill the whole sheet with the first code already entered"
            onClick={() => fill(allTargets())}
            icon={CopyCheck}
            text="Fill all"
          />
        }
        bleed
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-cream-100/70">
                {/* Sticky so the area stays readable while the 31 date columns scroll. */}
                <th className="sticky left-0 z-10 min-w-[195px] border-b border-r border-cream-300 bg-cream-100 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                  Area / Date
                </th>
                {days.map((day) => (
                  <th key={day} className="border-b border-cream-300 px-1 py-1.5 text-center text-[10px] font-semibold text-ink-400">
                    <span className="flex flex-col items-center gap-0.5">
                      {day}
                      <FillButton
                        title={`Fill every area on day ${day} with the first code entered that day`}
                        onClick={() => fill(dayTargets(day))}
                        icon={ArrowDownToLine}
                      />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {areas.map((area) => (
                <tr key={area} className="hover:bg-cream-100/50">
                  <td className="sticky left-0 z-10 border-b border-r border-cream-200 bg-white px-3 py-1.5 text-[11px] font-medium text-ink-600">
                    <span className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate" title={area}>
                        {area}
                      </span>
                      <FillButton
                        title={`Fill the whole month for ${area} with the first code entered in this row`}
                        onClick={() => fill(rowTargets(area))}
                        icon={ArrowRightToLine}
                      />
                    </span>
                  </td>
                  {days.map((day) => (
                    <td key={day} className="border-b border-cream-200 px-0.5 py-1">
                      <select
                        value={cells[area]?.[String(day)] || ""}
                        onChange={(e) => setCell(area, day, e.target.value as PestStatus)}
                        title={`${area} — ${day}`}
                        aria-label={`${area}, day ${day}`}
                        className="w-full min-w-[34px] rounded border border-cream-300 bg-white px-0.5 py-0.5 text-center text-[11px] focus:outline-none focus:ring-1 focus:ring-brand-500"
                      >
                        <option value="">—</option>
                        {PEST_STATUS_CODES.map((code) => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        ))}
                      </select>
                    </td>
                  ))}
                </tr>
              ))}

              {/* Correction and Remark are rows on the paper form, one cell per date. */}
              {PEST_NOTE_ROWS.map(({ key, label }) => (
                <tr key={key} className="bg-cream-50/60">
                  <td className="sticky left-0 z-10 border-b border-r border-cream-200 bg-cream-50 px-3 py-1.5 text-[11px] font-semibold text-ink-500">
                    {label}
                  </td>
                  {days.map((day) => (
                    <td key={day} className="border-b border-cream-200 px-0.5 py-1">
                      <input
                        type="text"
                        value={notes[key][String(day)] || ""}
                        onChange={(e) => setNote(key, day, e.target.value)}
                        aria-label={`${label}, day ${day}`}
                        className="w-full min-w-[34px] rounded border border-cream-300 bg-white px-1 py-0.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-cream-200 px-4 py-2.5 text-[11px] text-ink-400">
          {PEST_STATUS_CODES.map((code) => (
            <span key={code}>
              <b className="text-ink-600">{code}</b> — {PEST_STATUS_LABELS[code]}
            </span>
          ))}
        </div>
      </DocSection>

      {error && <p className="text-sm font-medium text-danger-600">{error}</p>}
      {success && <p className="text-sm font-medium text-success-700">Record saved successfully.</p>}

      <div className="flex justify-end">
        <button type="button" onClick={handleSubmit} disabled={submitting} className="btn-primary">
          {submitting ? "Saving…" : isEdit ? "Update Record" : "Submit Record"}
        </button>
      </div>
    </div>
  );
}
