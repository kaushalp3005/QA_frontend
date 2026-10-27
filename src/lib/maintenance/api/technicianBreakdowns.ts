/**
 * Technician breakdown tickets — mt_breakdown_records (source OPERATOR_FLAG).
 * Ported from BreakdownApi.kt, BreakdownDtos.kt, HeadReportsDtos.kt
 * (BreakdownHistoryDto), BreakdownRepositoryImpl.kt (acknowledgeFlag,
 * resolveFlag, refreshOpenFlags), AcknowledgeBreakdownUseCase.kt,
 * ResolveBreakdownUseCase.kt and the DAO queries behind TechnicianHomeViewModel.
 *
 * The Android app mirrors these rows into Room; the web reads the backend
 * directly. Status lifecycle:
 *   OPEN → ACKNOWLEDGED → PENDING_QC → CLOSED (QC approved)
 *   PENDING_QC → REOPENED (QC disapproved) → PENDING_QC …
 */
import { mtFetch } from '../client'
import { isoDateIst } from '../format'
import type { SpareLine } from './technicianSpares'

export type BreakdownStatus = 'OPEN' | 'ACKNOWLEDGED' | 'PENDING_QC' | 'CLOSED' | 'REOPENED'
export type BreakdownSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR'
/** A/B/C — derived from severity on the web (the legacy machines table that
 *  carried a criticality column has no asset-register rows). */
export type Criticality = 'A' | 'B' | 'C'

/** GET /breakdowns/open row (OpenBreakdownDto) */
export interface OpenBreakdown {
  id: string
  asset_id: string
  asset_name?: string
  reported_by?: string | null
  reporter_name?: string | null
  severity?: string | null
  description?: string
  status: string
  /** epoch ms */
  reported_at?: number | null
  /** Acknowledging technician's user id — what "My Active" matches on */
  acknowledged_by?: string | null
  acknowledged_by_name?: string | null
  acknowledged_at?: number | null
  building?: string | null
  /** Set while the row is OPEN again because QC disapproved a prior repair */
  qc_reject_reason?: string | null
  /** APPROVED | DISAPPROVED | PENDING | null */
  qc_status?: string | null
  /** Not in the Android DTO; the backend stores the S3 URLs and the page shows
   *  them when they are sent. */
  before_photo_url?: string | null
  after_photo_url?: string | null
  photo_url?: string | null
}

/** GET /breakdowns/history row (BreakdownHistoryDto) */
export interface BreakdownHistoryRow {
  id: string
  asset_id: string
  asset_name?: string
  building?: string | null
  reported_by?: string | null
  reporter_name?: string | null
  severity?: string | null
  description?: string
  status: string
  reported_at?: number | null
  acknowledged_by?: string | null
  acknowledged_by_name?: string | null
  acknowledged_at?: number | null
  resolved_by?: string | null
  resolved_by_name?: string | null
  resolved_at?: number | null
  parts_used?: string | null
  qc_status?: string | null
  qc_decided_by?: string | null
  qc_decided_by_name?: string | null
  qc_decided_at?: number | null
  qc_decision_notes?: string | null
  /** see OpenBreakdown */
  before_photo_url?: string | null
  after_photo_url?: string | null
  photo_url?: string | null
}

/** QcUpdateResponseDto */
export interface BreakdownUpdateResponse {
  id: string
  ticket_status: string
  machine_status: string
  qc_status: string | null
  sync_status: string
}

/** One breakdown as the technician screens use it (domain BreakdownFlag,
 *  merged from whichever endpoint carried the row). */
export interface Breakdown {
  id: string
  machineId: string
  assetName: string | null
  building: string | null
  operatorId: string
  reporterName: string | null
  severity: BreakdownSeverity
  description: string
  raisedAt: number
  status: BreakdownStatus
  acknowledgedBy: string | null
  acknowledgedByName: string | null
  acknowledgedAt: number | null
  resolvedBy: string | null
  resolvedByName: string | null
  resolvedAt: number | null
  partsUsed: string | null
  /** APPROVED | REJECTED | PENDING | null */
  qcStatus: 'APPROVED' | 'REJECTED' | 'PENDING' | null
  qcDecidedByName: string | null
  qcDecidedAt: number | null
  /** QC notes on approve, the rejection reason on disapprove */
  qcDecisionNotes: string | null
  beforePhotoUrl: string | null
  afterPhotoUrl: string | null
}

// ── Mapping (BreakdownRepositoryImpl.toDomain / BreakdownHistoryDto.toDomain) ──

export function parseSeverity(raw: string | null | undefined): BreakdownSeverity {
  if (raw === 'CRITICAL') return 'CRITICAL'
  // refreshOpenFlags defaults a missing severity to MAJOR
  if (raw === 'MAJOR' || raw === null || raw === undefined || raw === '') return 'MAJOR'
  return 'MINOR'
}

export function parseBreakdownStatus(raw: string | null | undefined): BreakdownStatus {
  switch ((raw ?? '').toUpperCase()) {
    case 'ACKNOWLEDGED':
      return 'ACKNOWLEDGED'
    case 'PENDING_QC':
      return 'PENDING_QC'
    // The backend contract names the terminal state QC_APPROVED; the app calls it CLOSED.
    case 'CLOSED':
    case 'QC_APPROVED':
      return 'CLOSED'
    case 'REOPENED':
      return 'REOPENED'
    default:
      return 'OPEN'
  }
}

function parseQcStatus(raw: string | null | undefined): Breakdown['qcStatus'] {
  switch ((raw ?? '').toUpperCase()) {
    case 'PENDING':
      return 'PENDING'
    case 'APPROVED':
      return 'APPROVED'
    // Newer backend says DISAPPROVED, older builds REJECTED.
    case 'REJECTED':
    case 'DISAPPROVED':
      return 'REJECTED'
    default:
      return null
  }
}

const blank = (s: string | null | undefined) => (s && s.trim() ? s : null)

export function fromOpen(d: OpenBreakdown): Breakdown {
  return {
    id: d.id,
    machineId: d.asset_id,
    assetName: blank(d.asset_name),
    building: d.building ?? null,
    operatorId: d.reported_by ?? '',
    reporterName: blank(d.reporter_name),
    severity: parseSeverity(d.severity),
    description: d.description ?? '',
    raisedAt: d.reported_at ?? Date.now(),
    status: parseBreakdownStatus(d.status),
    acknowledgedBy: d.acknowledged_by ?? null,
    acknowledgedByName: d.acknowledged_by_name ?? null,
    acknowledgedAt: d.acknowledged_at ?? null,
    resolvedBy: null,
    resolvedByName: null,
    resolvedAt: null,
    partsUsed: null,
    qcStatus: parseQcStatus(d.qc_status),
    qcDecidedByName: null,
    qcDecidedAt: null,
    qcDecisionNotes: d.qc_reject_reason ?? null,
    beforePhotoUrl: blank(d.before_photo_url),
    afterPhotoUrl: blank(d.after_photo_url) ?? blank(d.photo_url),
  }
}

export function fromHistory(d: BreakdownHistoryRow): Breakdown {
  return {
    id: d.id,
    machineId: d.asset_id,
    assetName: blank(d.asset_name),
    building: d.building ?? null,
    operatorId: d.reported_by ?? '',
    reporterName: blank(d.reporter_name),
    severity: parseSeverity(d.severity),
    description: d.description ?? '',
    raisedAt: d.reported_at ?? 0,
    status: parseBreakdownStatus(d.status),
    acknowledgedBy: d.acknowledged_by ?? null,
    acknowledgedByName: d.acknowledged_by_name ?? null,
    acknowledgedAt: d.acknowledged_at ?? null,
    resolvedBy: d.resolved_by ?? null,
    resolvedByName: d.resolved_by_name ?? null,
    resolvedAt: d.resolved_at ?? null,
    partsUsed: d.parts_used ?? null,
    qcStatus: parseQcStatus(d.qc_status),
    qcDecidedByName: d.qc_decided_by_name ?? null,
    qcDecidedAt: d.qc_decided_at ?? null,
    qcDecisionNotes: d.qc_decision_notes ?? null,
    beforePhotoUrl: blank(d.before_photo_url),
    afterPhotoUrl: blank(d.after_photo_url) ?? blank(d.photo_url),
  }
}

/** Severity → A/B/C (TechnicianHomeViewModel.toCriticality) */
export const criticalityOf = (s: BreakdownSeverity): Criticality => (s === 'CRITICAL' ? 'A' : s === 'MAJOR' ? 'B' : 'C')

/** OPEN + DISAPPROVED is how the server reports a QC kick-back on other devices. */
export const isKickedBack = (b: Breakdown) =>
  b.status === 'REOPENED' || (b.status === 'OPEN' && b.qcStatus === 'REJECTED')

// ── Endpoints ────────────────────────────────────────────────────────────

/** GET /breakdowns/open — every breakdown not yet CLOSED. plant_id: W202 | A185 | both */
export function listOpenBreakdowns(plantId = 'both') {
  return mtFetch<OpenBreakdown[]>('/breakdowns/open', { query: { plant_id: plantId } })
}

/** GET /breakdowns/history — every breakdown reported in [from, to] (YYYY-MM-DD).
 *  status: OPEN | CLOSED | omitted = all. */
export function breakdownHistory(params: { from: string; to: string; plantId?: string; status?: 'OPEN' | 'CLOSED' }) {
  return mtFetch<BreakdownHistoryRow[]>('/breakdowns/history', {
    query: { from: params.from, to: params.to, plant_id: params.plantId ?? 'both', status: params.status },
  })
}

/** Technician picks a ticket up: OPEN → ACKNOWLEDGED. The Android app reuses the
 *  QC acknowledge route for this (qc_checked_by stays null on this path). */
export function acknowledgeBreakdown(id: string, user: { userId: string; userName: string }) {
  return mtFetch<BreakdownUpdateResponse>(`/breakdowns/${encodeURIComponent(id)}/qc/acknowledge`, {
    method: 'POST',
    body: {
      user_id: user.userId,
      user_name: user.userName,
      qc_checked_by: null,
      acknowledged_at: Date.now(),
      override: false,
    },
  })
}

export const MIN_WORK_DONE_CHARS = 4

/** ResolveBreakdownUseCase validation — null when the input is acceptable. */
export function validateResolution(workDone: string, afterPhoto: File | null): string | null {
  if (workDone.trim().length < MIN_WORK_DONE_CHARS) return 'Describe parts/work in at least 4 characters.'
  if (!afterPhoto) return 'After-repair photo is required.'
  return null
}

/**
 * POST /breakdowns/{id}/work-done (multipart) → PENDING_QC. The after-photo is
 * the "after_photo" file part (jpeg/png ≤ 10 MB, uploaded to S3 server-side);
 * `spares` is a JSON array the server decrements stock from ([] = none used).
 */
export function submitBreakdownWorkDone(
  id: string,
  args: { userId: string; userName: string; workDone: string; spares: SpareLine[]; afterPhoto: File | null },
) {
  const fd = new FormData()
  fd.append('user_id', args.userId)
  fd.append('user_name', args.userName)
  fd.append('work_done', args.workDone.trim())
  fd.append(
    'spares',
    JSON.stringify(
      args.spares.map((s) => ({
        id: s.id,
        part_id: s.part_id,
        spare_name: s.spare_name,
        machine_name: s.machine_name ?? null,
        quantity_used: s.quantity_used,
        unit: s.unit,
        notes: s.notes ?? null,
        logged_at: s.logged_at,
        logged_by: args.userId,
      })),
    ),
  )
  fd.append('done_at', String(Date.now()))
  if (args.afterPhoto) fd.append('after_photo', args.afterPhoto, args.afterPhoto.name || 'after.jpg')
  return mtFetch<BreakdownUpdateResponse>(`/breakdowns/${encodeURIComponent(id)}/work-done`, {
    method: 'POST',
    body: fd,
  })
}

// ── Technician home tabs (BreakdownFlagDao queries) ──────────────────────

const RESOLVED_WINDOW_MS = 30 * 24 * 3_600_000

/** Open pool: OPEN + REOPENED, newest first (observeAllOpenFlags). */
export const openPool = (all: Breakdown[]) =>
  all.filter((b) => b.status === 'OPEN' || b.status === 'REOPENED').sort((a, b) => b.raisedAt - a.raisedAt)

/** "My Active": ACKNOWLEDGED by this user — matched by id, or by name when the
 *  server has no acknowledger id (observeAcknowledgedFlagsByUser). */
export const myActive = (all: Breakdown[], userId: string, userName: string) =>
  all
    .filter(
      (b) =>
        b.status === 'ACKNOWLEDGED' &&
        (b.acknowledgedBy === userId || (!b.acknowledgedBy && b.acknowledgedByName === userName)),
    )
    .sort((a, b) => (b.acknowledgedAt ?? 0) - (a.acknowledgedAt ?? 0))

/** "Resolved": QC-approved in the last 30 days, newest decision first. */
export async function listResolvedBreakdowns(plantId: string): Promise<Breakdown[]> {
  const since = Date.now() - RESOLVED_WINDOW_MS
  // A ticket reported a while back can close inside the window, so query a
  // wider report range and filter on the decision time.
  const rows = await breakdownHistory({
    from: isoDateIst(since - 60 * 24 * 3_600_000),
    to: isoDateIst(),
    plantId,
    status: 'CLOSED',
  })
  return rows
    .map(fromHistory)
    .filter((b) => b.status === 'CLOSED' && b.qcDecidedAt !== null && b.qcDecidedAt >= since)
    .sort((a, b) => (b.qcDecidedAt ?? 0) - (a.qcDecidedAt ?? 0))
}

/**
 * One ticket for the detail screen. /breakdowns/open carries the live status
 * and acknowledger; /breakdowns/history adds the repair + QC columns (and is
 * the only source once the ticket is CLOSED).
 */
export async function getBreakdown(id: string, plantId = 'both'): Promise<Breakdown | null> {
  const o = (await listOpenBreakdowns(plantId)).find((r) => r.id === id)
  // Fresh OPEN / ACKNOWLEDGED tickets have nothing history could add.
  if (o) {
    const live = fromOpen(o)
    if ((live.status === 'OPEN' || live.status === 'ACKNOWLEDGED') && !isKickedBack(live)) return live
  }
  let h: BreakdownHistoryRow | undefined
  try {
    const rows = await breakdownHistory({
      from: isoDateIst(Date.now() - 180 * 24 * 3_600_000),
      to: isoDateIst(),
      plantId,
    })
    h = rows.find((r) => r.id === id)
  } catch (e) {
    // The live row is still worth showing without the repair details.
    if (!o) throw e
  }
  if (!o && !h) return null
  if (o && !h) return fromOpen(o)
  if (!o && h) return fromHistory(h)
  const live = fromOpen(o!)
  const past = fromHistory(h!)
  return {
    ...past,
    ...live,
    resolvedBy: past.resolvedBy,
    resolvedByName: past.resolvedByName,
    resolvedAt: past.resolvedAt,
    partsUsed: past.partsUsed,
    qcDecidedByName: past.qcDecidedByName,
    qcDecidedAt: past.qcDecidedAt,
    qcDecisionNotes: live.qcDecisionNotes ?? past.qcDecisionNotes,
    qcStatus: live.qcStatus ?? past.qcStatus,
    beforePhotoUrl: live.beforePhotoUrl ?? past.beforePhotoUrl,
    afterPhotoUrl: live.afterPhotoUrl ?? past.afterPhotoUrl,
  }
}
