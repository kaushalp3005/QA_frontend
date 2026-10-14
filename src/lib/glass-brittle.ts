/**
 * Glass and Brittle Check Record — reading a saved record, shared by the form,
 * the record view and the print page so all three agree on what was saved.
 *
 * One table (doc_glass_brittle_check) holds two layouts:
 *
 *  - yearly  (W202, CFPLA.C4.F.48): `year`, and `rows` of
 *      { floor, item, location, glass_no, glass_details, months: { jan … dec } }
 *    plus `month_dates` { jan: "2026-01-05" … } and
 *    `month_signoffs` { jan: { checked_by, verified_by } … }.
 *
 *  - monthly (A185, CFPLB.C4.F.59): `month` ("2026-10"), and `rows` of
 *      { location, item, glass_no, date, condition, remark, action_taken, qc_verification }
 *    where `location` is the area sheet the row belongs to.
 *
 * The record's own warehouse picks the layout.
 */
import {
  A185_GLASS_AREAS,
  W202_GLASS_FLOORS,
  glassBrittleFormatFor,
  type GlassBrittleFormat,
} from '@/config/glassBrittleAreas'

export const GB_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const
export type GbMonth = (typeof GB_MONTHS)[number]

/** Column headings exactly as the F.48 sheet prints them. */
export const GB_MONTH_PRINT_LABELS: Record<GbMonth, string> = {
  Jan: 'Jan', Feb: 'Feb', Mar: 'March', Apr: 'April', May: 'May', Jun: 'Jun',
  Jul: 'Jul', Aug: 'Aug', Sep: 'Sep', Oct: 'Oct', Nov: 'Nov', Dec: 'Dec',
}

export const GB_TICK = '✓'
export const GB_CROSS = '✕'

export type GbMonthMap = Record<GbMonth, string>

export interface GbYearlyRow {
  id: number
  floor: string
  item: string
  location: string
  glassNo: string
  details: string
  months: GbMonthMap
}

export interface GbSignoff {
  checkedBy: string
  verifiedBy: string
}

export interface GbMonthlyRow {
  id: number
  area: string
  item: string
  glassNo: string
  date: string
  condition: string
  remark: string
  actionTaken: string
  qcVerification: string
}

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v))

export const gbEmptyMonths = (): GbMonthMap =>
  Object.fromEntries(GB_MONTHS.map((m) => [m, ''])) as GbMonthMap

/** Layout of a record: its own plant decides, the selector is only a fallback. */
export const gbFormatOf = (
  record: Record<string, any> | null | undefined,
  fallbackWarehouse?: string | null,
): GlassBrittleFormat => glassBrittleFormatFor(record?.warehouse || fallbackWarehouse)

/** A per-month value saved under "jan" or "Jan" — both spellings exist. */
const monthValue = (obj: any, m: GbMonth): unknown => obj?.[m.toLowerCase()] ?? obj?.[m]

/* ───────────────────────────── yearly (F.48) ───────────────────────────── */

export const gbSeedYearlyRows = (): GbYearlyRow[] => {
  const out: GbYearlyRow[] = []
  W202_GLASS_FLOORS.forEach((f) =>
    f.rows.forEach((r) =>
      out.push({ id: out.length + 1, floor: f.floor, ...r, months: gbEmptyMonths() }),
    ),
  )
  return out
}

/**
 * Month ticks are nested under `months` on current records and flat on the row
 * (jan / feb / …) on the oldest ones — read both so no record loses its ticks.
 */
export function gbYearlyRows(record?: Record<string, any> | null): GbYearlyRow[] {
  const raw = Array.isArray(record?.rows) ? record!.rows : []
  return raw.map((r: any, i: number) => ({
    id: i + 1,
    floor: str(r?.floor).trim(),
    item: str(r?.item),
    location: str(r?.location),
    glassNo: str(r?.glass_no),
    details: str(r?.glass_details ?? r?.details),
    months: Object.fromEntries(
      GB_MONTHS.map((m) => [m, str(monthValue(r?.months, m) ?? monthValue(r, m))]),
    ) as GbMonthMap,
  }))
}

export const gbMonthDates = (record?: Record<string, any> | null): GbMonthMap =>
  Object.fromEntries(GB_MONTHS.map((m) => [m, str(monthValue(record?.month_dates, m))])) as GbMonthMap

export function gbSignoffs(record?: Record<string, any> | null): Record<GbMonth, GbSignoff> {
  return Object.fromEntries(
    GB_MONTHS.map((m) => {
      const s = monthValue(record?.month_signoffs, m) as any
      return [m, { checkedBy: str(s?.checked_by), verifiedBy: str(s?.verified_by) }]
    }),
  ) as Record<GbMonth, GbSignoff>
}

/* ───────────────────────────── monthly (F.59) ──────────────────────────── */

const emptyMonthly = (id: number, area: string, item: string, glassNo: string): GbMonthlyRow => ({
  id, area, item, glassNo, date: '', condition: '', remark: '', actionTaken: '', qcVerification: '',
})

export const gbSeedMonthlyRows = (): GbMonthlyRow[] => {
  const out: GbMonthlyRow[] = []
  A185_GLASS_AREAS.forEach((a) =>
    a.rows.forEach((r) => out.push(emptyMonthly(out.length + 1, a.area, r.item, r.glassNo))),
  )
  return out
}

export function gbMonthlyRows(record?: Record<string, any> | null): GbMonthlyRow[] {
  const raw = Array.isArray(record?.rows) ? record!.rows : []
  return raw.map((r: any, i: number) => ({
    id: i + 1,
    area: str(r?.location ?? r?.area).trim(),
    item: str(r?.item),
    glassNo: str(r?.glass_no),
    date: str(r?.date),
    condition: str(r?.condition),
    remark: str(r?.remark),
    actionTaken: str(r?.action_taken),
    qcVerification: str(r?.qc_verification),
  }))
}

/** A row with nothing to inspect: the source leaves these ID cells blank or "-". */
export const gbHasItems = (glassNo: string) => {
  const v = glassNo.trim()
  return v !== '' && v !== '-'
}

/** "OK"-like conditions; anything else written in the cell is a finding. */
export const gbConditionIsOk = (condition: string) =>
  /^(ok|okay|intact|good|fine|✓)$/i.test(condition.trim())

/* ─────────────────────────────── shared ────────────────────────────────── */

/** Rows grouped by floor / area, in first-seen order. */
export function gbGroup<T>(rows: T[], keyOf: (row: T) => string): { key: string; rows: T[] }[] {
  const groups: { key: string; rows: T[] }[] = []
  rows.forEach((r) => {
    const key = keyOf(r)
    const g = groups.find((x) => x.key === key)
    if (g) g.rows.push(r)
    else groups.push({ key, rows: [r] })
  })
  return groups
}

/** "2026-10-05" → "05/10/2026"; anything else is returned as typed. */
export function gbFmtDate(value?: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str(value))
  return m ? `${m[3]}/${m[2]}/${m[1]}` : str(value)
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** "2026-10" (what <input type="month"> stores) → "October 2026". */
export function gbFmtMonth(value?: string | null): string {
  const m = /^(\d{4})-(\d{2})/.exec(str(value))
  if (!m) return str(value)
  const name = MONTH_NAMES[Number(m[2]) - 1]
  return name ? `${name} ${m[1]}` : str(value)
}
