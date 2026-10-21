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
  if (!Array.isArray(rows)) return null
  const weights = rows
    .map((r) => r?.flies_weight)
    .filter((v) => v !== null && v !== undefined && v !== '' && !Number.isNaN(Number(v)))
    .map(Number)
  if (!weights.length) return null
  return Math.round((weights.reduce((sum, w) => sum + w, 0) / weights.length) * 100) / 100
}

function ddmmyyyy(iso: string): string {
  const [y, m, d] = iso.split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
}

/**
 * The date the user entered on the sheet, as dd/mm/yyyy. Every row normally
 * carries the same date; if they differ, the span "first – last" is shown
 * rather than silently picking one. '' when no row has a date.
 */
export function sheetDate(rows: unknown): string {
  if (!Array.isArray(rows)) return ''
  // ISO yyyy-mm-dd sorts correctly as text.
  const dates = Array.from(
    new Set(rows.map((r) => r?.date).filter((d): d is string => typeof d === 'string' && d !== '')),
  ).sort()
  if (!dates.length) return ''
  const first = ddmmyyyy(dates[0])
  const last = ddmmyyyy(dates[dates.length - 1])
  return first === last ? first : `${first} – ${last}`
}
