// frontend/src/config/dailyPestAreas.ts
//
// Areas and header metadata for the Daily Pest Inspection Report.
//
// Shared by the form and the print page so the rows printed are always the rows
// that were typed — the two plants run the same layout over different areas,
// and a list that lived in each page separately would drift the first time an
// area was added.
//
// W202 files it as CFPLA.C4.F.47, A185 as CFPLB.C4.RA.04.

import type { WarehouseCode } from '@/lib/warehouseAccess'

/** Cell codes, from the format's own legend. */
export const PEST_STATUS_CODES = ['T', 'A', 'D', 'M'] as const

export type PestStatus = (typeof PEST_STATUS_CODES)[number] | ''

/** What each code stands for — the dropdown shows these, the sheet prints the letter. */
export const PEST_STATUS_LABELS: Record<string, string> = {
  T: 'Trap',
  A: 'Absent',
  D: 'Damaged',
  M: 'Missing',
}

/** The heading printed above the grid, legend and all, exactly as on the paper form. */
export const PEST_SECTION_TITLE =
  '1. AREA PEST SIGHTING (Daily Record- Trap-T Absent-A Damaged- D Missing -M)'

/** W202's areas, in the order they are printed. */
export const W202_PEST_AREAS = [
  'Lower',
  'Upper',
  'Office Area',
  'Loading Unloading Area / Store Area',
  'First Floor',
  'First Mez',
  'Second Floor',
  'Second Mez',
  'Service Floor',
  'Terrace Area',
]

/** A185's areas, in the order they are printed on CFPLB.C4.RA.04. */
export const A185_PEST_AREAS = [
  'Production Area',
  'Cheese Section',
  'Seed Section 1',
  'Packing Section',
  'FG Storage Area',
  'RM Storage Area',
  'Mezzanine Area',
  'Printing Area',
  'Dock Area',
  'Canteen Area',
  'Cold Room',
  'Handwash Main Entry',
  'Outer Periphery',
]

/** The areas this plant inspects. Anything that is not A185 files the W202 sheet. */
export function pestAreasFor(warehouse: string | null | undefined): string[] {
  return warehouse === 'A185' ? A185_PEST_AREAS : W202_PEST_AREAS
}

/**
 * The two free-text rows running along the foot of the grid. They are rows on
 * the paper form with one cell per date — not a single note per sheet — so they
 * are stored day-keyed like the grid itself.
 */
export const PEST_NOTE_ROWS = [
  { key: 'correction', label: 'Correction' },
  { key: 'remark', label: 'Remark' },
] as const

export type PestNoteKey = (typeof PEST_NOTE_ROWS)[number]['key']

/** The header block of the controlled document, which differs per plant. */
export interface PestDocMeta {
  docNo: string
  issueDate: string
  issueNo: string
  revisionDate: string
  revisionNo: string
}

export const PEST_DOC_META: Record<WarehouseCode, PestDocMeta> = {
  W202: {
    docNo: 'CFPLA.C4.F.47',
    issueDate: '20/08/2026',
    // No issue number has been assigned to W202's copy yet; it prints as a dash
    // rather than borrowing A185's, which would put a wrong number on a
    // controlled record.
    issueNo: '--',
    revisionDate: '--',
    revisionNo: '--',
  },
  A185: {
    docNo: 'CFPLB.C4.RA.04',
    issueDate: '05/02/2026',
    issueNo: '01',
    revisionDate: '--',
    revisionNo: '--',
  },
}

export function pestDocMetaFor(warehouse: string | null | undefined): PestDocMeta {
  return warehouse === 'A185' ? PEST_DOC_META.A185 : PEST_DOC_META.W202
}

/** The most columns the paper form carries. */
export const MAX_PEST_DAYS = 31

/**
 * Day columns for a "YYYY-MM" month — 28 in February, 31 when no month has been
 * picked yet. The paper form is always printed with 31, but a saved record
 * should not offer a 31st of April to type into, and the print sheet renders
 * whatever the record actually covers.
 */
export function pestDaysInMonth(month: string | null | undefined): number {
  const match = /^(\d{4})-(\d{2})$/.exec((month || '').trim())
  if (!match) return MAX_PEST_DAYS
  const days = new Date(Number(match[1]), Number(match[2]), 0).getDate()
  return Number.isFinite(days) && days > 0 ? days : MAX_PEST_DAYS
}
