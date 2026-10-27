/**
 * Head oversight + Head Reports. Ported from presentation/head (HeadBreakdowns /
 * HeadQc ViewModels), presentation/head/reports (BreakdownHistory, QcActivityHistory,
 * PmHistory, PlantId.kt), BreakdownApi.kt (history reads) and HeadReportsDtos.kt.
 *
 * The Android Head Breakdowns / QC screens derive their lists from local Room.
 * The web has no local DB, so they call the /head/* views the backend contract
 * documents (ANDROID_BACKEND_CONNECTION_MAP "HEAD VIEWS"): HEAD sees both
 * plants, and timestamps there are ISO-8601 "…Z" strings. No Kotlin DTO exists
 * for these views, so the row type is lenient about which keys are present.
 *
 * /breakdowns/history and /qc/history use epoch-ms (BreakdownHistoryDto).
 */
import { mtFetch } from '../client'
import { toDate } from '../format'

type Stamp = number | string | null | undefined

/** One mt_breakdown_records row as the /head/* views and the history endpoints serve it. */
export interface HeadBreakdown {
  id: string
  asset_id?: string | null
  /** Some views key the machine as machine_id */
  machine_id?: string | null
  asset_name?: string | null
  machine_name?: string | null
  building?: string | null
  reported_by?: string | null
  reporter_name?: string | null
  severity?: string | null
  description?: string | null
  status: string
  /** epoch ms (history) or ISO-Z (/head/*) */
  reported_at?: Stamp
  raised_at?: Stamp
  created_at?: Stamp
  acknowledged_by?: string | null
  acknowledged_by_name?: string | null
  acknowledged_at?: Stamp
  resolved_by?: string | null
  resolved_by_name?: string | null
  resolved_at?: Stamp
  parts_used?: string | null
  /** PENDING | APPROVED | DISAPPROVED/REJECTED | null */
  qc_status?: string | null
  qc_decided_by?: string | null
  qc_decided_by_name?: string | null
  qc_decided_at?: Stamp
  qc_decision_notes?: string | null
}

/** History rows (BreakdownHistoryDto) — same shape, epoch-ms times. */
export type BreakdownHistoryRow = HeadBreakdown

/** Accept a bare array or a { rows | items | data } envelope. */
function asRows(v: unknown): HeadBreakdown[] {
  if (Array.isArray(v)) return v as HeadBreakdown[]
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    for (const k of ['rows', 'items', 'data', 'breakdowns']) if (Array.isArray(o[k])) return o[k] as HeadBreakdown[]
    // { pending: [...], decided: [...] } style
    return Object.values(o).filter(Array.isArray).flat() as HeadBreakdown[]
  }
  return []
}

/** Open breakdowns + those CLOSED within the last 7 days. */
export async function headBreakdowns() {
  return asRows(await mtFetch<unknown>('/head/breakdowns'))
}

/** Breakdowns waiting on / recently decided by QC. */
export async function headQc() {
  return asRows(await mtFetch<unknown>('/head/qc'))
}

/** GET /breakdowns/history — every breakdown reported in [from, to]. */
export function breakdownHistory(q: { from: string; to: string; plant_id: string; status?: string | null }) {
  return mtFetch<BreakdownHistoryRow[]>('/breakdowns/history', { query: q })
}

/** GET /qc/history — every breakdown that got a QC decision in [from, to] (latest only). */
export function qcActivityHistory(q: { from: string; to: string; plant_id: string }) {
  return mtFetch<BreakdownHistoryRow[]>('/qc/history', { query: q })
}

// ── Helpers ──────────────────────────────────────────────────────────────

/** PlantId.kt: chip value → backend plant id (null = "both"). */
export const toBackendPlantId = (plant: string | null | undefined) => (plant ? plant.replace(/-/g, '') : 'both')

export const flagMachineId = (f: HeadBreakdown) => f.asset_id || f.machine_id || ''
export const flagMachineName = (f: HeadBreakdown) => f.asset_name || f.machine_name || flagMachineId(f)
export const flagRaisedAt = (f: HeadBreakdown) => f.reported_at ?? f.raised_at ?? f.created_at ?? null

export const stampMs = (v: Stamp) => toDate(v)?.getTime() ?? null

/** BreakdownHistoryDto.toDomain() qc mapping, for display */
export function qcLabel(raw: string | null | undefined): string | null {
  switch ((raw ?? '').toUpperCase()) {
    case 'PENDING':
      return 'PENDING'
    case 'APPROVED':
    case 'QC_APPROVED':
      return 'APPROVED'
    case 'REJECTED':
    case 'DISAPPROVED':
    case 'QC_DISAPPROVED':
      return 'REJECTED'
    default:
      return null
  }
}

export const SEVEN_DAYS_MS = 7 * 86_400_000
