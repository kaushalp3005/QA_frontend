/** Display helpers. The plant runs on IST, so every timestamp is shown in
 *  Asia/Kolkata whatever the browser's own zone is (mirrors the Android
 *  app's util/DateTimeFormatter). */

const IST = 'Asia/Kolkata'

type Stamp = number | string | null | undefined

/** epoch-ms number, numeric string, ISO string or YYYY-MM-DD → Date */
export function toDate(v: Stamp): Date | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return new Date(v)
  if (/^\d+$/.test(v)) return new Date(Number(v))
  // A bare YYYY-MM-DD is a plant calendar day — pin it to IST midnight.
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(`${v}T00:00:00+05:30`)
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { timeZone: IST, ...opts })
const dateF = fmt({ day: '2-digit', month: 'short', year: 'numeric' })
const timeF = fmt({ hour: '2-digit', minute: '2-digit', hour12: false })
const dayMonthF = fmt({ day: '2-digit', month: 'short' })
const monthYearF = fmt({ month: 'long', year: 'numeric' })

/** "22 Aug 2026" */
export const fmtDate = (v: Stamp, empty = '—') => {
  const d = toDate(v)
  return d ? dateF.format(d) : empty
}
/** "14:05" */
export const fmtTime = (v: Stamp, empty = '—') => {
  const d = toDate(v)
  return d ? timeF.format(d) : empty
}
/** "22 Aug 2026, 14:05" */
export const fmtDateTime = (v: Stamp, empty = '—') => {
  const d = toDate(v)
  return d ? `${dateF.format(d)}, ${timeF.format(d)}` : empty
}
/** "22 Aug" */
export const fmtDayMonth = (v: Stamp, empty = '—') => {
  const d = toDate(v)
  return d ? dayMonthF.format(d) : empty
}
/** "August 2026" */
export const fmtMonthYear = (v: Stamp, empty = '—') => {
  const d = toDate(v)
  return d ? monthYearF.format(d) : empty
}

/** "3h 12m" */
export function fmtDuration(startMs: number, endMs: number): string {
  const diff = Math.max(0, endMs - startMs)
  return `${Math.floor(diff / 3_600_000)}h ${Math.floor((diff % 3_600_000) / 60_000)}m`
}

/** "5m ago" … falls back to the date after 30 days */
export function fmtRelative(v: Stamp, now = Date.now()): string {
  const d = toDate(v)
  if (!d) return '—'
  const sec = Math.max(0, Math.floor((now - d.getTime()) / 1000))
  const min = Math.floor(sec / 60)
  const hr = Math.floor(min / 60)
  const day = Math.floor(hr / 24)
  if (sec < 30) return 'just now'
  if (min < 1) return `${sec}s ago`
  if (min < 60) return `${min}m ago`
  if (hr < 24) return `${hr}h ago`
  if (day < 30) return `${day}d ago`
  return dateF.format(d)
}

/** YYYY-MM-DD of the given instant on the IST calendar — what the backend
 *  stores in reading_date / checklist_date / record_date. */
export function isoDateIst(v: Stamp = Date.now()): string {
  const d = toDate(v) ?? new Date()
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: IST }).format(d)
}

/** Epoch ms of IST midnight for a YYYY-MM-DD (or now) */
export function startOfDayIst(v: Stamp = Date.now()): number {
  return new Date(`${isoDateIst(v)}T00:00:00+05:30`).getTime()
}

export function fmtNumber(n: number | null | undefined, digits = 2, empty = '—'): string {
  if (n === null || n === undefined || Number.isNaN(n)) return empty
  return n.toLocaleString('en-IN', { maximumFractionDigits: digits })
}

export function fmtInr(n: number | null | undefined, empty = '—'): string {
  if (n === null || n === undefined || Number.isNaN(n)) return empty
  return n.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })
}

/** "A-185", "a185", "185-Koparkhairnae" → "A185"; same rule as canonicalPlant()
 *  in the Android app and building_for() on the backend. */
export function canonicalPlant(raw: string | null | undefined): string {
  const trimmed = (raw ?? '').trim()
  const squashed = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (squashed.includes('A185') || squashed.includes('185')) return 'A185'
  if (squashed.includes('W202') || squashed.includes('202')) return 'W202'
  return trimmed
}

/** "A185" → "A-185" for display */
export function plantLabel(raw: string | null | undefined): string {
  const c = canonicalPlant(raw)
  if (c === 'A185') return 'A-185'
  if (c === 'W202') return 'W-202'
  if (!c) return '—'
  return c.toLowerCase() === 'both' ? 'Both plants' : c
}
