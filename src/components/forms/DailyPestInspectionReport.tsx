"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRightToLine,
  Bug,
  CalendarDays,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Copy,
  CopyCheck,
  LayoutGrid,
} from "lucide-react";
import DocSection from "@/components/documentations/DocSection";
import SignaturePicker from "@/components/ui/SignaturePicker";
import { getStoredWarehouse } from "@/components/ui/WarehouseSelector";
import { HYGIENE_CHECKED_BY_OPTIONS, QC_VERIFIED_BY_OPTIONS } from "@/lib/signatures";
import {
  A185_PEST_TYPES,
  PEST_NOTE_ROWS,
  PEST_SECTION_TITLE,
  PEST_STATUS_CODES,
  PEST_STATUS_LABELS,
  PEST_TYPE_SECTION_TITLE,
  hasPestTypeGrid,
  pestAreasFor,
  pestDaysInMonth,
  pestDocMetaFor,
  type PestNoteKey,
  type PestStatus,
} from "@/config/dailyPestAreas";

/*
 * Daily Pest Inspection Report.
 *
 *     W202  CFPLA.C4.F.47        A185  CFPLB.C4.RA.04
 *
 * One record is one month at one plant.
 *   Section 1, AREA PEST SIGHTING: every area × every day of the month.
 *   Section 2 (A185 only), PEST INSPECTION RECORD: every pest type × every
 *   day, in the same format (T/A/D/M codes, Fill buttons, Correction / Remark).
 * Both lists and both header blocks live in config/dailyPestAreas.ts, shared
 * with the print page.
 */

const FORM_TYPE = "daily-pest-inspection";

/** row (area or pest type) → day → legend code. Day keys are strings: they survive a JSON round trip. */
type Cells = Record<string, Record<string, PestStatus>>;
/** The Correction / Remark rows, each a day → free text map. */
type Notes = Record<PestNoteKey, Record<string, string>>;

interface DayGrid {
  cells: Cells;
  notes: Notes;
}

const EMPTY_NOTES = (): Notes =>
  PEST_NOTE_ROWS.reduce((acc, row) => ({ ...acc, [row.key]: {} }), {} as Notes);

/** Read one stored grid ({cells, correction, remark}) back, tolerating missing keys. */
function readGrid(raw: any): DayGrid {
  const src = raw && typeof raw === "object" ? raw : {};
  const cells: Cells = {};
  if (src.cells && typeof src.cells === "object") {
    for (const [row, days] of Object.entries(src.cells as Record<string, any>)) {
      if (!days || typeof days !== "object") continue;
      cells[row] = {};
      for (const [day, value] of Object.entries(days as Record<string, any>)) {
        if (typeof value === "string" && value) cells[row][day] = value as PestStatus;
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
 *  than every row holding 31 empty strings. */
function prunedGrid<T>(rows: Record<string, Record<string, T>>): Record<string, Record<string, T>> {
  const out: Record<string, Record<string, T>> = {};
  for (const [key, days] of Object.entries(rows)) {
    const kept = prunedRow(days);
    if (Object.keys(kept).length) out[key] = kept;
  }
  return out;
}

/** A grid in the shape it is stored: { cells, correction, remark }. */
function storedGrid(grid: DayGrid): Record<string, any> {
  return {
    cells: prunedGrid(grid.cells),
    ...Object.fromEntries(PEST_NOTE_ROWS.map(({ key }) => [key, prunedRow(grid.notes[key])])),
  };
}

/** One cell of a grid, as (row, day). */
type Target = [string, number];

/**
 * The first code already entered among these cells, scanning in order.
 *
 * This is what a Fill button copies — the same rule the training attendance
 * sheet's Fill all uses, so one behaviour covers both forms: enter the code
 * once, then spread it.
 */
export function firstCode(cells: Cells, targets: Target[]): PestStatus {
  for (const [row, day] of targets) {
    const value = cells[row]?.[String(day)];
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
  for (const [row, day] of targets) {
    next[row] = { ...(next[row] ?? {}), [String(day)]: code };
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

/** Colours per legend code: Absent is the all-clear, the rest need attention. */
const CODE_STYLE: Record<string, { on: string; cell: string }> = {
  A: { on: "bg-success-600 border-success-600 text-white", cell: "bg-success-50 text-success-700 border-success-200" },
  T: { on: "bg-warning-500 border-warning-500 text-white", cell: "bg-warning-50 text-warning-700 border-warning-200" },
  D: { on: "bg-danger-600 border-danger-600 text-white", cell: "bg-danger-50 text-danger-700 border-danger-200" },
  M: { on: "bg-ink-600 border-ink-600 text-white", cell: "bg-ink-50 text-ink-600 border-ink-200" },
};

type GridView = "day" | "grid";

/** Today's day number when `month` ("YYYY-MM") is the current month, else null. */
function todayInMonth(month: string): number | null {
  const now = new Date();
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return month === current ? now.getDate() : null;
}

/**
 * One daily code grid: `rows` × the month's days, a T/A/D/M code per cell,
 * and the Correction / Remark rows. Section 1 (areas) and Section 2 (pest
 * types) are both this.
 *
 * Two views of the same data:
 *   By day      one date at a time, big tap targets — the phone view.
 *   Month grid  every date at once with Fill buttons — the desktop view.
 */
function DayCodeGridSection({
  title,
  rowHeader,
  rowNoun,
  rows,
  days,
  month,
  grid,
  onChange,
}: {
  title: string;
  rowHeader: string;
  rowNoun: string;
  rows: string[];
  days: number[];
  month: string;
  grid: DayGrid;
  onChange: (update: (prev: DayGrid) => DayGrid) => void;
}) {
  const { cells, notes } = grid;
  const today = todayInMonth(month);

  const [view, setView] = useState<GridView>("grid");
  const [day, setDay] = useState<number>(today ?? 1);
  // Phones start in the day view; the 31-column grid is for wide screens.
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) setView("day");
  }, []);
  // Keep the selected day inside the month (31 → 30 when the month changes).
  useEffect(() => {
    if (day > days.length) setDay(days.length);
  }, [day, days.length]);
  useEffect(() => {
    if (today) setDay(today);
  }, [today]);

  const total = rows.length * days.length;
  const recorded = useMemo(
    () => rows.reduce((sum, row) => sum + days.filter((d) => cells[row]?.[String(d)]).length, 0),
    [cells, rows, days]
  );
  const pct = total ? Math.round((recorded / total) * 100) : 0;
  const filledOn = (d: number) => rows.filter((row) => cells[row]?.[String(d)]).length;

  const setCell = (row: string, d: number, value: PestStatus) =>
    onChange((prev) => ({
      ...prev,
      cells: { ...prev.cells, [row]: { ...(prev.cells[row] ?? {}), [String(d)]: value } },
    }));

  const setNote = (key: PestNoteKey, d: number, value: string) =>
    onChange((prev) => ({
      ...prev,
      notes: { ...prev.notes, [key]: { ...prev.notes[key], [String(d)]: value } },
    }));

  // Fill targets. Correction and Remark are free text and get no Fill button —
  // one note repeated under all 31 dates would say nothing.
  const rowTargets = (row: string): Target[] => days.map((d) => [row, d]);
  const dayTargets = (d: number): Target[] => rows.map((row) => [row, d]);
  const allTargets = (): Target[] => rows.flatMap((row) => days.map((d): Target => [row, d]));
  const fill = (targets: Target[]) => onChange((prev) => ({ ...prev, cells: filled(prev.cells, targets) }));

  /** Every row still blank on day `d` set to `code`; rows already coded are kept. */
  const markRest = (d: number, code: PestStatus) =>
    onChange((prev) => {
      const next = { ...prev.cells };
      for (const row of rows) {
        if (!next[row]?.[String(d)]) next[row] = { ...(next[row] ?? {}), [String(d)]: code };
      }
      return { ...prev, cells: next };
    });

  /** Day `d` set to whatever day `d - 1` holds, row by row (blanks stay blank). */
  const copyPrevious = (d: number) =>
    onChange((prev) => {
      const next = { ...prev.cells };
      for (const row of rows) {
        const code = prev.cells[row]?.[String(d - 1)];
        if (code) next[row] = { ...(next[row] ?? {}), [String(d)]: code };
      }
      return { ...prev, cells: next };
    });

  const dayStripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (view !== "day") return;
    const el = dayStripRef.current?.querySelector<HTMLElement>(`[data-day="${day}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [day, view]);

  return (
    <DocSection
      title={title}
      description={`${rows.length} ${rowNoun} · ${days.length} days`}
      actions={
        <div className="inline-flex rounded-lg border border-cream-300 bg-cream-50 p-0.5 text-xs font-semibold">
          {(
            [
              ["day", "By day", CalendarDays],
              ["grid", "Month grid", LayoutGrid],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              aria-pressed={view === key}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 transition-colors ${
                view === key ? "bg-white text-brand-600 shadow-soft" : "text-ink-400 hover:text-ink-600"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      }
      bleed
    >
      {/* Progress + legend */}
      <div className="flex flex-col gap-3 border-b border-cream-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-ink-500">
            <span>
              {recorded} of {total} cells recorded
            </span>
            <span>{pct}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cream-200">
            <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PEST_STATUS_CODES.map((code) => (
            <span
              key={code}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${CODE_STYLE[code].cell}`}
            >
              {code} <span className="font-normal">{PEST_STATUS_LABELS[code]}</span>
            </span>
          ))}
        </div>
      </div>

      {view === "day" ? (
        <div className="space-y-3 p-3 sm:p-4">
          {/* Date strip */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setDay((d) => Math.max(1, d - 1))}
              disabled={day <= 1}
              aria-label="Previous day"
              className="shrink-0 rounded-lg border border-cream-300 bg-white p-2 text-ink-500 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div ref={dayStripRef} className="flex flex-1 snap-x gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]">
              {days.map((d) => {
                const n = filledOn(d);
                const complete = n === rows.length;
                return (
                  <button
                    key={d}
                    type="button"
                    data-day={d}
                    onClick={() => setDay(d)}
                    className={`flex min-w-[44px] snap-center flex-col items-center rounded-lg border px-1.5 py-1.5 text-sm font-bold transition-colors ${
                      d === day
                        ? "border-brand-500 bg-brand-500 text-white"
                        : "border-cream-300 bg-white text-ink-600 hover:border-brand-400"
                    }`}
                  >
                    {d}
                    <span
                      className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                        complete ? (d === day ? "bg-white" : "bg-success-500") : n ? "bg-warning-500" : "bg-cream-300"
                      }`}
                    />
                    {d === today && <span className="sr-only">(today)</span>}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setDay((d) => Math.min(days.length, d + 1))}
              disabled={day >= days.length}
              aria-label="Next day"
              className="shrink-0 rounded-lg border border-cream-300 bg-white p-2 text-ink-500 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day header + quick actions */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-ink-600">
              Day {day}
              {day === today && <span className="ml-1.5 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] text-brand-600">TODAY</span>}
              <span className="ml-2 text-xs font-medium text-ink-400">
                {filledOn(day)}/{rows.length} done
              </span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => markRest(day, "A")}
                className="inline-flex items-center gap-1 rounded-lg border border-success-200 bg-success-50 px-2.5 py-1.5 text-xs font-semibold text-success-700 hover:bg-success-100"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark rest Absent
              </button>
              <button
                type="button"
                onClick={() => copyPrevious(day)}
                disabled={day <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-cream-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-500 hover:border-brand-400 disabled:opacity-40"
              >
                <Copy className="h-3.5 w-3.5" /> Copy day {Math.max(1, day - 1)}
              </button>
            </div>
          </div>

          {/* One card per row */}
          <ul className="divide-y divide-cream-200 overflow-hidden rounded-xl border border-cream-300 bg-white">
            {rows.map((row, i) => {
              const value = cells[row]?.[String(day)] || "";
              return (
                <li key={row} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-medium text-ink-600">
                    <span className="mr-1.5 text-xs text-ink-400">{i + 1}.</span>
                    {row}
                  </span>
                  <div className="grid grid-cols-4 gap-1.5 sm:flex">
                    {PEST_STATUS_CODES.map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setCell(row, day, value === code ? "" : code)}
                        aria-pressed={value === code}
                        title={PEST_STATUS_LABELS[code]}
                        className={`h-10 min-w-[44px] rounded-lg border text-sm font-bold transition-colors ${
                          value === code
                            ? CODE_STYLE[code].on
                            : "border-cream-300 bg-cream-50 text-ink-500 hover:border-brand-400"
                        }`}
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Correction / Remark for this day */}
          <div className="grid gap-3 sm:grid-cols-2">
            {PEST_NOTE_ROWS.map(({ key, label }) => (
              <div key={key}>
                <label className="label-base" htmlFor={`${title}-${key}-${day}`}>
                  {label} (day {day})
                </label>
                <input
                  id={`${title}-${key}-${day}`}
                  type="text"
                  value={notes[key][String(day)] || ""}
                  onChange={(e) => setNote(key, day, e.target.value)}
                  className="input-base"
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-[11px] text-ink-400">
            <span>Fill buttons copy the first code already entered in that row, day or grid.</span>
            <FillButton
              title="Fill the whole grid with the first code already entered"
              onClick={() => fill(allTargets())}
              icon={CopyCheck}
              text="Fill all"
            />
          </div>
          <div className="max-h-[70vh] overflow-auto border-t border-cream-200">
            <table className="w-full border-separate border-spacing-0 text-xs">
              <thead className="sticky top-0 z-20">
                <tr>
                  {/* Sticky so the row name stays readable while the date columns scroll. */}
                  <th className="sticky left-0 z-30 min-w-[150px] border-b border-r border-cream-300 bg-cream-100 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-400 sm:min-w-[210px]">
                    {rowHeader}
                  </th>
                  {days.map((d) => (
                    <th
                      key={d}
                      className={`border-b border-cream-300 px-1 py-1.5 text-center text-[10px] font-semibold ${
                        d === today ? "bg-brand-50 text-brand-600" : "bg-cream-100 text-ink-400"
                      }`}
                    >
                      <span className="flex flex-col items-center gap-0.5">
                        {d}
                        <FillButton
                          title={`Fill every row on day ${d} with the first code entered that day`}
                          onClick={() => fill(dayTargets(d))}
                          icon={ArrowDownToLine}
                        />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const done = days.filter((d) => cells[row]?.[String(d)]).length;
                  return (
                    <tr key={row} className="group">
                      <td className="sticky left-0 z-10 border-b border-r border-cream-200 bg-white px-3 py-1.5 text-[11px] font-medium text-ink-600 group-hover:bg-cream-50">
                        <span className="flex items-center justify-between gap-2">
                          <span className="min-w-0">
                            <span className="block truncate" title={row}>
                              {row}
                            </span>
                            <span className="text-[10px] text-ink-400">
                              {done}/{days.length}
                            </span>
                          </span>
                          <FillButton
                            title={`Fill the whole month for ${row} with the first code entered in this row`}
                            onClick={() => fill(rowTargets(row))}
                            icon={ArrowRightToLine}
                          />
                        </span>
                      </td>
                      {days.map((d) => {
                        const value = cells[row]?.[String(d)] || "";
                        return (
                          <td
                            key={d}
                            className={`border-b border-cream-200 px-0.5 py-1 ${d === today ? "bg-brand-50/40" : ""}`}
                          >
                            <select
                              value={value}
                              onChange={(e) => setCell(row, d, e.target.value as PestStatus)}
                              title={`${row} — ${d}${value ? ` — ${PEST_STATUS_LABELS[value]}` : ""}`}
                              aria-label={`${row}, day ${d}`}
                              className={`w-full min-w-[36px] cursor-pointer appearance-none rounded border px-0.5 py-1 text-center text-[11px] font-bold focus:outline-none focus:ring-1 focus:ring-brand-500 ${
                                value ? CODE_STYLE[value].cell : "border-cream-300 bg-white text-ink-300"
                              }`}
                            >
                              <option value="">—</option>
                              {PEST_STATUS_CODES.map((code) => (
                                <option key={code} value={code}>
                                  {code}
                                </option>
                              ))}
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Correction and Remark are rows on the paper form, one cell per date. */}
                {PEST_NOTE_ROWS.map(({ key, label }) => (
                  <tr key={key}>
                    <td className="sticky left-0 z-10 border-b border-r border-cream-200 bg-cream-50 px-3 py-1.5 text-[11px] font-semibold text-ink-500">
                      {label}
                    </td>
                    {days.map((d) => (
                      <td key={d} className="border-b border-cream-200 bg-cream-50/60 px-0.5 py-1">
                        <input
                          type="text"
                          value={notes[key][String(d)] || ""}
                          onChange={(e) => setNote(key, d, e.target.value)}
                          aria-label={`${label}, day ${d}`}
                          title={notes[key][String(d)] || `${label}, day ${d}`}
                          className="w-full min-w-[36px] rounded border border-cream-300 bg-white px-1 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </DocSection>
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
  const showPestTypes = hasPestTypeGrid(warehouse);

  const [month, setMonth] = useState<string>(initialData?.month || "");
  const [checkedBy, setCheckedBy] = useState<string>(initialData?.checked_by || "");
  const [verifiedBy, setVerifiedBy] = useState<string>(initialData?.verified_by || "");

  // Section 1 lives at the top of `grid` (as it always has); Section 2 under grid.pest_types.
  const [areaGrid, setAreaGrid] = useState<DayGrid>(() => readGrid(initialData?.grid));
  const [pestGrid, setPestGrid] = useState<DayGrid>(() => readGrid(initialData?.grid?.pest_types));

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dayCount = pestDaysInMonth(month);
  const days = useMemo(() => Array.from({ length: dayCount }, (_, i) => i + 1), [dayCount]);

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
        ...storedGrid(areaGrid),
        ...(showPestTypes ? { pest_types: storedGrid(pestGrid) } : {}),
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
            options={HYGIENE_CHECKED_BY_OPTIONS}
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

      <DayCodeGridSection
        title={PEST_SECTION_TITLE}
        rowHeader="Area / Date"
        rowNoun="areas"
        rows={areas}
        days={days}
        month={month}
        grid={areaGrid}
        onChange={setAreaGrid}
      />

      {showPestTypes && (
        <DayCodeGridSection
          title={PEST_TYPE_SECTION_TITLE}
          rowHeader="Type of Pest / Date"
          rowNoun="pest types"
          rows={A185_PEST_TYPES}
          days={days}
          month={month}
          grid={pestGrid}
          onChange={setPestGrid}
        />
      )}

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
