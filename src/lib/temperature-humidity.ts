/**
 * Temperature & Humidity Record (CFPLA.C6.F.17) — saved-readings parsing shared
 * by the form (edit) and the record view page.
 *
 * Two storage shapes exist in `readings`:
 *  - v2: `{ version: 2, sections: [{ area, rows, observations, corrective_action }] }`
 *    — one section per monitored area.
 *  - legacy: a flat day-rows array, with the area (and any notes) on the record.
 */

export const TH_DAYS = 31

/** Monitored areas — the form always offers a tab for each. */
export const TH_SECTIONS = ['Lab', 'Cold storage', 'Mezzanine']

/** Start, Mid and End of shift, in that order. */
export const TH_READING_LABELS = ['Start', 'Mid', 'End'] as const

export type THReading = { temp: string; humidity: string }

export interface THSection {
  area: string
  /** day number → [Start, Mid, End] */
  grid: Record<number, THReading[]>
  checkedBy: Record<number, string>
  verifiedBy: Record<number, string>
  observations: string
  correctiveAction: string
}

/** Humidity outside this band is flagged. */
export const TH_HUMIDITY_MIN = 50
export const TH_HUMIDITY_MAX = 70

/** Older records stored readings as numbers; the form works in strings. */
const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v))

export const thEmptyGrid = (): Record<number, THReading[]> => {
  const g: Record<number, THReading[]> = {}
  for (let d = 1; d <= TH_DAYS; d++) {
    g[d] = [{ temp: '', humidity: '' }, { temp: '', humidity: '' }, { temp: '', humidity: '' }]
  }
  return g
}

export const thEmptySection = (area: string): THSection => ({
  area,
  grid: thEmptyGrid(),
  checkedBy: {},
  verifiedBy: {},
  observations: '',
  correctiveAction: '',
})

/** Day-rows (legacy flat array, or one v2 section's rows) → section. */
export function thSectionFromRows(
  area: string,
  rows: any[],
  observations?: string,
  correctiveAction?: string,
): THSection {
  const s = thEmptySection(area)
  for (const r of Array.isArray(rows) ? rows : []) {
    const d = Number(r?.day)
    if (!d || d < 1 || d > TH_DAYS) continue
    s.grid[d] = [
      { temp: str(r.start_temp), humidity: str(r.start_humidity) },
      { temp: str(r.mid_temp), humidity: str(r.mid_humidity) },
      { temp: str(r.end_temp), humidity: str(r.end_humidity) },
    ]
    if (r.checked_by) s.checkedBy[d] = r.checked_by
    if (r.verified_by) s.verifiedBy[d] = r.verified_by
  }
  s.observations = observations || ''
  s.correctiveAction = correctiveAction || ''
  return s
}

export const thHasData = (s: THSection) =>
  s.observations.trim() !== '' ||
  s.correctiveAction.trim() !== '' ||
  Object.values(s.checkedBy).some(Boolean) ||
  Object.values(s.verifiedBy).some(Boolean) ||
  Object.values(s.grid).some((day) => day.some((r) => r.temp !== '' || r.humidity !== ''))

/** The sections actually saved on a record, in stored order (either shape). */
export function thSavedSections(record?: Record<string, any> | null): THSection[] {
  const raw = record?.readings
  if (raw && !Array.isArray(raw) && typeof raw === 'object' && Array.isArray(raw.sections)) {
    return raw.sections.map((s: any) =>
      thSectionFromRows(s?.area || '', s?.rows, s?.observations, s?.corrective_action),
    )
  }
  if (Array.isArray(raw) && raw.length > 0) {
    return [thSectionFromRows(record?.area || '', raw, record?.observations, record?.corrective_action)]
  }
  return []
}

/**
 * The form's tab list: always the three standard areas, plus any other area a
 * saved record used (older records stored one free-text area like "First floor",
 * so those keep their data instead of silently disappearing).
 */
export function thFormSections(record?: Record<string, any> | null): THSection[] {
  const parsed = thSavedSections(record)
  const key = (a: string) => a.trim().toLowerCase()
  const byArea = new Map(parsed.map((s) => [key(s.area), s]))
  const out = TH_SECTIONS.map((name) => byArea.get(key(name)) ?? thEmptySection(name))
  parsed.forEach((s) => {
    if (s.area.trim() && !TH_SECTIONS.some((n) => key(n) === key(s.area))) out.push(s)
  })
  return out
}

export const thHumidityOutOfRange = (value: string) => {
  const v = parseFloat(value)
  return !isNaN(v) && (v < TH_HUMIDITY_MIN || v > TH_HUMIDITY_MAX)
}
