/**
 * Summaries of a Daily Fly Catcher Check record, computed from its `rows`.
 * Shared by the records list and the print page so the two always agree.
 */

/**
 * Mean Flies Qty weight (gms) over the catchers that have a reading, to 2 dp,
 * or null when none do. A blank means "not recorded", not 0, so it is left out
 * rather than dragging the average down.
 */
export function averageFliesWeight(rows: unknown): number | null {
  const weights = recordedWeights(rows)
  if (!weights.length) return null
  return Math.round((weights.reduce((sum, w) => sum + w, 0) / weights.length) * 100) / 100
}

/**
 * Total Flies Qty weight (gms) over the catchers that have a reading, to 2 dp,
 * or null when none do. Rounded so float sums like 0.1 + 0.2 read as 0.3.
 */
export function totalFliesWeight(rows: unknown): number | null {
  const weights = recordedWeights(rows)
  if (!weights.length) return null
  return Math.round(weights.reduce((sum, w) => sum + w, 0) * 100) / 100
}

/** The fixed divisor QA uses for the "Per Flycatcher wise" figure. */
export const PER_FLYCATCHER_DIVISOR = 7

/**
 * "Per Flycatcher wise" on the records list: the Flies Qty total divided by
 * PER_FLYCATCHER_DIVISOR, to 2 dp, or null when no reading was entered.
 */
export function perFlycatcherWeight(rows: unknown): number | null {
  const total = totalFliesWeight(rows)
  if (total === null) return null
  return Math.round((total / PER_FLYCATCHER_DIVISOR) * 100) / 100
}

/**
 * Who did the round: each distinct Done By name across the rows, in the order
 * they first appear, joined with ", ". Usually one person; '' when none set.
 */
export function doneByNames(rows: unknown): string {
  if (!Array.isArray(rows)) return ''
  const names = rows
    .map((r) => (typeof r?.done_by === 'string' ? r.done_by.trim() : ''))
    .filter((n) => n !== '')
  return Array.from(new Set(names)).join(', ')
}

/** The Flies Qty readings that were actually entered; blanks are left out. */
function recordedWeights(rows: unknown): number[] {
  if (!Array.isArray(rows)) return []
  return rows
    .map((r) => r?.flies_weight)
    .filter((v) => v !== null && v !== undefined && v !== '' && !Number.isNaN(Number(v)))
    .map(Number)
}

function ddmmyyyy(iso: string): string {
  const [y, m, d] = iso.split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
}

/**
 * The sheet's date, as dd/mm/yyyy: the first row's date, since setting the date
 * on the first row is what fills the whole column in the form. If the first row
 * has none, the first row that does is used. A row that kept a different date
 * does not turn this into a range. '' when no row has a date.
 */
export function sheetDate(rows: unknown): string {
  if (!Array.isArray(rows)) return ''
  const date = rows
    .map((r) => r?.date)
    .find((d): d is string => typeof d === 'string' && d !== '')
  return date ? ddmmyyyy(date) : ''
}
