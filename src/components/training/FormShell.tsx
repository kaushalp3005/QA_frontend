"use client";

import { ReactNode } from "react";
import { CheckCircle2, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { cn } from "@/lib/styles";
import { draftTime, type DraftState } from "@/components/training/useFormDraft";

/**
 * Shared building blocks for the CFPLA.C7.F.03 training forms.
 *
 * Every training form is a paper record with a wide grid. On desktop that grid
 * stays a table; below `lg` each row is re-rendered as a stacked card so the
 * form is usable on a phone without horizontal scrolling.
 */

/* ── Document header ────────────────────────────────────────────────── */

export function DocHeader({
  title,
  docNo,
  meta,
  children,
}: {
  title: string;
  docNo: string;
  meta?: string;
  children?: ReactNode;
}) {
  return (
    <section className="surface-card p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-500">
            Candor Foods Private Limited
          </p>
          <h1 className="mt-1 text-base sm:text-lg font-bold leading-snug text-ink-600">{title}</h1>
          <p className="mt-1 text-[11px] sm:text-xs text-ink-400">
            <span className="font-semibold font-mono">{docNo}</span>
            {meta && (
              <>
                <span className="mx-2 text-cream-300">|</span>
                {meta}
              </>
            )}
          </p>
        </div>
        {children && <div className="shrink-0">{children}</div>}
      </div>
    </section>
  );
}

/* ── Section card ───────────────────────────────────────────────────── */

export function Section({
  title,
  hint,
  action,
  bodyClassName,
  children,
}: {
  title?: string;
  hint?: string;
  action?: ReactNode;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className="surface-card overflow-hidden">
      {(title || action) && (
        <header className="flex flex-col gap-2 border-b border-cream-300 bg-cream-100/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-bold text-ink-600">{title}</h2>}
            {hint && <p className="mt-0.5 text-[11px] text-ink-400">{hint}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      {/* bodyClassName REPLACES the default padding — pass "p-0" for full-bleed tables */}
      <div className={bodyClassName ?? "p-4 sm:p-5"}>{children}</div>
    </section>
  );
}

/* ── Field ──────────────────────────────────────────────────────────── */

export function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <label className="label-base">{label}</label>
      {children}
    </div>
  );
}

/* ── Checkbox / radio chips ─────────────────────────────────────────── */

export function OptionChip({
  label,
  checked,
  onToggle,
  type = "checkbox",
  tone = "brand",
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  type?: "checkbox" | "radio";
  tone?: "brand" | "warning";
}) {
  const active =
    tone === "warning"
      ? "border-warning-400 bg-warning-50 text-warning-800"
      : "border-brand-300 bg-brand-50 text-brand-700";
  const mark =
    tone === "warning" ? "border-warning-500 bg-warning-500" : "border-brand-500 bg-brand-500";

  return (
    <label
      className={cn(
        "inline-flex cursor-pointer select-none items-center gap-2 rounded-xl border px-3 py-2 text-xs sm:text-[13px] font-semibold transition-all",
        checked
          ? `${active} shadow-soft`
          : "border-cream-300 bg-cream-50 text-ink-500 hover:border-brand-300 hover:text-brand-600"
      )}
    >
      <input
        type={type}
        checked={checked}
        onChange={onToggle}
        className="sr-only"
        aria-label={label}
      />
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center border text-[10px] font-bold text-white",
          type === "radio" ? "rounded-full" : "rounded",
          checked ? mark : "border-cream-300 bg-cream-100"
        )}
      >
        {checked && (type === "radio" ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : "✓")}
      </span>
      {label}
    </label>
  );
}

/**
 * Shown when a form restored a partial save, with the way to throw it away.
 * `onDiscard` is expected to reload the route so every field resets at once.
 */
export function DraftBanner({ savedAt, onDiscard }: { savedAt: string; onDiscard: () => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between">
      <span className="text-ink-600">
        <span className="font-semibold">Unsaved draft restored</span>
        {savedAt && <span className="text-ink-400"> · saved {savedAt}</span>}
        <span className="text-ink-400"> · nothing is filed until you submit</span>
      </span>
      <button
        type="button"
        onClick={onDiscard}
        className="shrink-0 rounded-lg border border-cream-300 bg-white px-2.5 py-1 font-semibold text-ink-500 transition-colors hover:border-danger-300 hover:text-danger-700"
      >
        Discard draft
      </button>
    </div>
  );
}

/* ── Score / status pills ───────────────────────────────────────────── */

/**
 * Training scores are marked out of 5 across the whole module.
 *
 * A single score passes above 3 (so 3 itself fails). The average of the
 * evaluation and effectiveness scores drives the status band below.
 */
export const SCORE_MAX = 5;
/** A single evaluation/effectiveness score passes strictly above this. */
export const SCORE_PASS = 3;
/** Average at or above this is Effective; at or above SCORE_REFRESHER, Refresher. */
export const SCORE_EFFECTIVE = 4;
export const SCORE_REFRESHER = 3;

/**
 * The average of the two scores is carried as a percentage of SCORE_MAX — the
 * paper format's column is "Average Scoring (%)" and its criteria are written
 * in percent, so 5/5 reads as 100%. The bands below are the /5 bands scaled.
 */
export const SCORE_EFFECTIVE_PCT = (SCORE_EFFECTIVE / SCORE_MAX) * 100; // 80
export const SCORE_REFRESHER_PCT = (SCORE_REFRESHER / SCORE_MAX) * 100; // 60

/** A 0–SCORE_MAX score as a percentage, trimmed of a trailing ".0". */
export function toPercent(score: number): string {
  const pct = (score / SCORE_MAX) * 100;
  return Number.isInteger(pct) ? String(pct) : pct.toFixed(1);
}

/** Colour band shared by every score in these forms: ≥4 / 3–3.9 / <3. */
export function scoreTone(value: string | number | null | undefined) {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  if (!Number.isFinite(n) || !String(value ?? "").length) return "none" as const;
  if (n >= SCORE_EFFECTIVE) return "good" as const;
  if (n >= SCORE_REFRESHER) return "warn" as const;
  return "bad" as const;
}

/** Same bands as scoreTone, for values already expressed as a percentage. */
export function percentTone(value: string | number | null | undefined) {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  if (!Number.isFinite(n) || !String(value ?? "").length) return "none" as const;
  if (n >= SCORE_EFFECTIVE_PCT) return "good" as const;
  if (n >= SCORE_REFRESHER_PCT) return "warn" as const;
  return "bad" as const;
}

const PILL_TONES = {
  good: "bg-success-100 text-success-800 border-success-200",
  warn: "bg-warning-100 text-warning-800 border-warning-200",
  bad: "bg-danger-100 text-danger-700 border-danger-200",
  none: "bg-cream-200 text-ink-400 border-cream-300",
};

export function Pill({
  children,
  tone = "none",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof PILL_TONES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-lg border px-2 py-0.5 text-[11px] font-bold whitespace-nowrap",
        PILL_TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Effective / Refresher / Retraining — the three training-status outcomes. */
export function statusTone(status: string) {
  if (status === "Effective") return "good" as const;
  if (status === "Refresher") return "warn" as const;
  if (status === "Retraining") return "bad" as const;
  return "none" as const;
}

/** Pass / Fail / Effective / Non-Effective result labels. */
export function resultTone(result: string) {
  if (result === "Pass" || result === "Effective") return "good" as const;
  if (result === "Fail" || result === "Non-Effective") return "bad" as const;
  return "none" as const;
}

/* ── Table primitives ───────────────────────────────────────────────── */

export function Th({
  children,
  className,
  ...rest
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      {...rest}
      className={cn(
        "border-b border-cream-300 px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-400",
        className
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  ...rest
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td {...rest} className={cn("border-b border-cream-200 px-1.5 py-1.5 align-middle", className)}>
      {children}
    </td>
  );
}

/** Compact input styling used inside table cells. */
export const cellInput =
  "w-full rounded-lg border border-cream-300 bg-cream-50 px-2 py-1.5 text-xs text-ink-600 " +
  "placeholder:text-ink-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

/* ── Mobile row card ────────────────────────────────────────────────── */

export function RowCard({
  index,
  label = "Row",
  onRemove,
  badge,
  children,
}: {
  index: number;
  label?: string;
  onRemove?: () => void;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-cream-300 bg-cream-50 p-3.5 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-cream-200 pb-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 min-w-[24px] items-center justify-center rounded-lg bg-brand-500 px-1.5 text-[11px] font-bold text-white">
            {index}
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
            {label}
          </span>
          {badge}
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${label} ${index}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-300 transition-colors hover:bg-danger-50 hover:text-danger-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

/** Small stacked label + control used inside <RowCard>. */
export function CardField({
  label,
  action,
  className,
  children,
}: {
  label: string;
  /** Optional control shown at the right of the label — e.g. a fill-all button.
   *  The label keeps its plain layout when nothing is passed, so the cards in
   *  every other form are untouched. */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const labelText = "text-[10px] font-bold uppercase tracking-wide text-ink-400";
  return (
    <div className={cn("min-w-0", className)}>
      {action ? (
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className={labelText}>{label}</p>
          {action}
        </div>
      ) : (
        <p className={cn("mb-1", labelText)}>{label}</p>
      )}
      {children}
    </div>
  );
}

/* ── Buttons / footer ───────────────────────────────────────────────── */

export function AddRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand-300 px-4 py-2.5 text-xs font-bold text-brand-600 transition-colors hover:bg-brand-50 sm:w-auto"
    >
      <Plus className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

export function RemoveRowButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-300 transition-colors hover:bg-danger-50 hover:text-danger-600"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}

/**
 * Sticky action bar. On mobile it pins to the bottom of the viewport so Submit
 * is always one tap away no matter how long the row list is.
 */
export function SubmitBar({
  submitting,
  isEdit,
  success,
  onSubmit,
  note,
  draft,
}: {
  submitting: boolean;
  isEdit?: boolean;
  success: boolean;
  onSubmit: () => void;
  note?: string;
  /** Partial save. Omit on forms (or routes) that don't keep a draft. */
  draft?: DraftState;
}) {
  return (
    <div className="sticky bottom-0 z-20 -mx-3 mt-2 border-t border-cream-300 bg-cream-50/95 px-3 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-5 sm:shadow-card">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-ink-400">{note ?? "Prepared by: HR · Approved by: FSTL"}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {draft && (
            <span className={`text-[11px] ${draft.error ? "font-semibold text-danger-700" : "text-ink-400"}`}>
              {draft.error
                ? draft.error
                : draft.savedAt
                  ? `Draft saved on this device · ${draftTime(draft.savedAt)}`
                  : "Nothing saved yet"}
            </span>
          )}
          {success && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-success-700">
              <CheckCircle2 className="h-4 w-4" /> Saved
            </span>
          )}
          <div className="flex items-center gap-2">
            {draft && (
              <button
                type="button"
                onClick={draft.saveNow}
                // Only blocked mid-submit. Gating this on `dirty` meant that
                // whenever autosave had not marked the form dirty the button sat
                // there looking live but doing nothing on click — an explicit
                // "Save draft" should always either save or say why it couldn't.
                disabled={submitting}
                className="btn-outline shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Keep what you have filled in so far on this device — it is not filed until you submit"
              >
                <Save className="mr-1.5 h-4 w-4" />
                Save draft
              </button>
            )}
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting}
              className="btn-primary w-full sm:w-auto"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitting ? "Submitting…" : isEdit ? "Update Record" : "Submit Record"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Legend explaining the ≥4 / 3–3.9 / <3 bands on the 0–5 scale. */
export function CriteriaLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-cream-300 bg-cream-100/60 px-3 py-2.5 text-[11px]">
      <span className="font-bold text-ink-500">Criteria (average %):</span>
      <Pill tone="good">≥80% Effective</Pill>
      <Pill tone="warn">60–79% Refresher</Pill>
      <Pill tone="bad">&lt;60% Retraining</Pill>
      <span className="text-ink-400">· scores are out of 5 (5 = 100%) and pass above 3</span>
    </div>
  );
}
