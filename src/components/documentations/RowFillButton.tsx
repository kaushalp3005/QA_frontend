"use client";

/**
 * Row-wise "Fill" for the signatory rows that run across a grid's day (or
 * month) columns — Checked By / Verified By on the monthly checklists.
 *
 * The column grids already carry a vertical "tick all" per day. These rows run
 * the other way: one signatory repeated across the whole period, typed once in
 * the first cell and spread sideways.
 */

/**
 * What a row-wise fill should write into every cell of `values`.
 *
 *   a value → spread it (taken from the first filled cell, i.e. the one the
 *             user typed at the start of the row)
 *   ""      → every cell already holds that value, so the click is a toggle-off
 *             and clears the row
 *   null    → nothing is filled in yet, so there is nothing to spread; the
 *             caller must leave its state untouched rather than blanking it
 *
 * Extracted from the Temperature & Humidity record (CFPLA_QCRecordsForms),
 * which has worked this way since before the other checklists gained the
 * button — keeping one copy is what stops the four grids drifting apart.
 */
export function rowFillValue(values: string[]): string | null {
  const first = values.find((v) => v !== "");
  if (!first) return null;
  return values.every((v) => v === first) ? "" : first;
}

/** The small pill that sits in a signatory row's label cell. */
export default function RowFillButton({
  onClick,
  label,
  /** What the row's columns are, for the tooltip. */
  unit = "day",
}: {
  onClick: () => void;
  label: string;
  unit?: "day" | "month";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Fill every ${unit} of "${label}" with its first value (click again to clear)`}
      aria-label={`Fill every ${unit} of ${label} with its first value`}
      className="text-[9px] font-bold leading-none bg-success-50 text-success-700 px-1.5 py-0.5 rounded hover:bg-success-100 shrink-0"
    >
      Fill
    </button>
  );
}
