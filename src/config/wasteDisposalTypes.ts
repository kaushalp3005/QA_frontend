// frontend/src/config/wasteDisposalTypes.ts
//
// Waste Disposal record (daily tick sheet, one column per day of the month).
//
//   A185 -> CFPLB.C4..F.58   (controlled print format exists)
//   W202 -> CFPLA.C4.F.52    (no approved print format yet)
//
// Both plants record the same two waste streams, so unlike the Deep Cleaning
// register there is no per-plant row list — only the document header differs.
// Shared by the form and the print page so the two cannot drift apart.

export interface WasteTypeDef {
  /** Stable key written into the `grid` JSONB. Never change once records exist. */
  key: string
  /** Row label, worded as it appears on the controlled format. */
  label: string
  /** Older labels the same row has been saved under, matched when loading. */
  aliases?: string[]
}

export const WASTE_TYPES: WasteTypeDef[] = [
  {
    key: 'biodegradable',
    label: 'Biodegradable waste',
  },
  {
    key: 'miscellaneous',
    // The paper runs the dash straight into the bracket — kept verbatim.
    label: 'Miscellaneous waste –(including plastic waste)',
    aliases: [
      'Miscellaneous waste (including plastic waste)',
      'Miscellaneous waste (including plastic)',
    ],
  },
]

/** Longest month on the paper form — every sheet prints all 31 columns. */
export const WASTE_DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

/** Days actually in `month` ("2026-02" -> 28), for greying out the rest. */
export function daysInMonth(month?: string): number {
  if (!month) return 31
  const [y, m] = String(month).split('-').map(Number)
  if (!y || !m || m < 1 || m > 12) return 31
  return new Date(y, m, 0).getDate()
}

/**
 * Controlled-document header, per plant.
 * A185 numbers are transcribed from the paper format — including the double dot
 * in "CFPLB.C4..F.58", which is how the document itself is numbered.
 */
export const WASTE_DISPOSAL_DOC_META: Record<string, {
  docNo: string
  issueDate: string
  issueNo: string
  revisionDate: string
  revisionNo: string
}> = {
  A185: {
    docNo: 'CFPLB.C4..F.58',
    issueDate: '04/08/2021',
    issueNo: '03',
    revisionDate: '02/02/2026',
    revisionNo: '02',
  },
  W202: {
    docNo: 'CFPLA.C4.F.52',
    issueDate: '',
    issueNo: '',
    revisionDate: '',
    revisionNo: '',
  },
}

export const wasteDisposalDocMeta = (warehouse: string) =>
  WASTE_DISPOSAL_DOC_META[warehouse] ?? WASTE_DISPOSAL_DOC_META.W202

export const wasteDisposalDocNo = (warehouse: string) => wasteDisposalDocMeta(warehouse).docNo

/** Only A185 has an approved print layout. */
export const hasWastePrintFormat = (warehouse: string) => warehouse === 'A185'

/**
 * Pull one waste row out of a saved `grid`, whichever shape it was stored in:
 *   - current: array of { waste_type, day1..day31 }
 *   - legacy:  object keyed by waste-type label -> { 1..31 }
 * Returns a day-number -> value map.
 */
export function readWasteRow(grid: any, type: WasteTypeDef): Record<number, string> {
  const out: Record<number, string> = {}
  const names = [type.label, type.key, ...(type.aliases ?? [])].map((n) => n.trim().toLowerCase())

  if (Array.isArray(grid)) {
    const row = grid.find((r: any) => {
      const t = String(r?.waste_type ?? r?.key ?? '').trim().toLowerCase()
      return names.includes(t)
    })
    if (row) {
      WASTE_DAYS.forEach((d) => { out[d] = row[`day${d}`] ?? '' })
    }
    return out
  }

  if (grid && typeof grid === 'object') {
    const matchKey = Object.keys(grid).find((k) => names.includes(k.trim().toLowerCase()))
    const row = matchKey ? grid[matchKey] : null
    if (row) {
      WASTE_DAYS.forEach((d) => { out[d] = row[d] ?? row[String(d)] ?? '' })
    }
  }
  return out
}
