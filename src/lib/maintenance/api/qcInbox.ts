/**
 * QC inbox derivation — ported from presentation/qc/QcHomeViewModel.kt,
 * QcInboxRow.kt and QcTicketRowUiModel.kt.
 *
 * Android builds Awaiting / My Active / Done today from Room; the web has no
 * local DB, so every tab is derived from the network:
 *   Awaiting   GET /breakdowns/open (PENDING_QC, not picked up) + GET /pm/work-orders?status=PENDING_QC (no qc_acknowledged_by)
 *   My Active  the same lists, picked up by me (breakdowns: local claim, see qcClaims.ts)
 *   Done today GET /qc/history decided by me today + CLOSED work orders I picked up, closed today
 *   History    GET /qc/history (all-time) + GET /pm/work-orders?status=CLOSED
 */
import type { MtSession } from '../client'
import { canonicalPlant, isoDateIst, startOfDayIst } from '../format'
import { listMachines, type MtMachine } from './assets'
import {
  breakdownHistory,
  listOpenBreakdowns,
  listWorkOrders,
  qcActivityHistory,
  type BreakdownHistory,
  type OpenBreakdown,
  type PmWorkOrder,
} from './qc'
import { getClaims, pruneClaims, type QcClaim } from './qcClaims'

/** Wide lower bound so History is effectively all-time (QcHomeViewModel.HISTORY_FROM). */
export const HISTORY_FROM = '2000-01-01'

export type Criticality = 'A' | 'B' | 'C'

/** One breakdown as QC sees it: the live /breakdowns/open row merged with the
 *  history rows that carry the repair + QC-decision columns. */
export interface QcFlag {
  id: string
  asset_id: string
  asset_name: string
  building: string | null
  reported_by: string | null
  reporter_name: string | null
  severity: string
  description: string
  status: string
  qc_status: string | null
  reported_at: number | null
  resolved_by_name: string | null
  resolved_at: number | null
  parts_used: string | null
  qc_decided_by: string | null
  qc_decided_by_name: string | null
  qc_decided_at: number | null
  qc_decision_notes: string | null
}

export function mergeFlag(open?: OpenBreakdown, hist?: BreakdownHistory, qcHist?: BreakdownHistory): QcFlag | null {
  const base = open ?? qcHist ?? hist
  if (!base) return null
  const pick = <K extends keyof BreakdownHistory>(k: K) => qcHist?.[k] ?? hist?.[k] ?? null
  return {
    id: base.id,
    asset_id: base.asset_id,
    asset_name: open?.asset_name || qcHist?.asset_name || hist?.asset_name || '',
    building: open?.building ?? qcHist?.building ?? hist?.building ?? null,
    reported_by: base.reported_by ?? null,
    reporter_name: open?.reporter_name ?? qcHist?.reporter_name ?? hist?.reporter_name ?? null,
    severity: (base.severity || 'MAJOR').toUpperCase(),
    description: open?.description || qcHist?.description || hist?.description || '',
    // /breakdowns/open is live; history rows can lag a decision behind
    status: (open?.status ?? qcHist?.status ?? hist?.status ?? 'OPEN').toUpperCase(),
    qc_status: (open?.qc_status ?? qcHist?.qc_status ?? hist?.qc_status ?? null)?.toUpperCase() ?? null,
    reported_at: base.reported_at ?? null,
    resolved_by_name: (pick('resolved_by_name') as string | null) ?? null,
    resolved_at: (pick('resolved_at') as number | null) ?? null,
    parts_used: (pick('parts_used') as string | null) ?? null,
    qc_decided_by: (pick('qc_decided_by') as string | null) ?? null,
    qc_decided_by_name: (pick('qc_decided_by_name') as string | null) ?? null,
    qc_decided_at: (pick('qc_decided_at') as number | null) ?? null,
    qc_decision_notes: (pick('qc_decision_notes') as string | null) ?? open?.qc_reject_reason ?? null,
  }
}

const isApproved = (f: QcFlag) =>
  f.qc_status === 'APPROVED' || f.status === 'CLOSED' || f.status === 'QC_APPROVED'
const isRejected = (f: QcFlag) =>
  f.status === 'REOPENED' ||
  f.qc_status === 'REJECTED' ||
  f.qc_status === 'DISAPPROVED' ||
  (f.status === 'OPEN' && !!f.qc_decision_notes?.trim())

export type QcDecision = 'APPROVED' | 'REJECTED' | null
/** Approved / disapproved, judged on qc_status first then the ticket status. */
export function flagDecision(f: QcFlag): QcDecision {
  if (f.status === 'PENDING_QC') return null
  if (isApproved(f)) return 'APPROVED'
  if (isRejected(f)) return 'REJECTED'
  return null
}

export const severityToCriticality = (s: string): Criticality =>
  s === 'CRITICAL' ? 'A' : s === 'MINOR' ? 'C' : 'B'

// ── Rows ─────────────────────────────────────────────────────────────────

interface RowBase {
  id: string
  machineCode: string
  machineName: string
  machineLocation: string
  criticality: Criticality
  /** higher = more recent */
  sortMillis: number
}
export interface BreakdownRow extends RowBase {
  kind: 'BD'
  flag: QcFlag
  claim: QcClaim | null
}
export interface PmRow extends RowBase {
  kind: 'PM'
  wo: PmWorkOrder
}
export type QcInboxRow = BreakdownRow | PmRow

export function breakdownRow(flag: QcFlag, assets: Map<string, MtMachine>, claim: QcClaim | null): BreakdownRow {
  const asset = assets.get(flag.asset_id)
  return {
    kind: 'BD',
    id: flag.id,
    flag,
    claim,
    machineCode: flag.asset_id,
    machineName: asset?.asset_name || flag.asset_name || flag.asset_id,
    machineLocation: asset?.sub_location || '',
    criticality: severityToCriticality(flag.severity),
    sortMillis: flag.qc_decided_at ?? claim?.at ?? flag.resolved_at ?? flag.reported_at ?? 0,
  }
}

export function pmRow(wo: PmWorkOrder, assets: Map<string, MtMachine>): PmRow {
  const asset = assets.get(wo.machine_id)
  return {
    kind: 'PM',
    id: wo.id,
    wo,
    machineCode: asset?.asset_id || wo.machine_id,
    machineName: asset?.asset_name || wo.template_name || wo.machine_name || wo.machine_id,
    machineLocation: asset?.sub_location || '',
    criticality: 'C',
    sortMillis: wo.qc_acknowledged_at ?? wo.submitted_at ?? wo.generated_at ?? 0,
  }
}

const byRecent = (a: QcInboxRow, b: QcInboxRow) => b.sortMillis - a.sortMillis

// ── Plant scoping ────────────────────────────────────────────────────────

/**
 * Is this asset inside the user's plant? HEAD / SUPERVISOR are cross-plant;
 * every other role (QC included) is bound to one. The asset register is the
 * authority. Fails OPEN when it can't judge (register not loaded, unknown
 * asset, no plant on the account) — blanking the inbox is worse than briefly
 * trusting the server, which already scopes these endpoints.
 */
export function inPlant(
  assetId: string,
  session: MtSession,
  assets: Map<string, MtMachine>,
  snapshotBuilding?: string | null,
): boolean {
  if (session.role === 'HEAD' || session.role === 'SUPERVISOR') return true
  const mine = canonicalPlant(session.plantId)
  if (!mine || mine.toLowerCase() === 'both') return true
  const asset = assets.get(assetId)
  if (asset) return canonicalPlant(asset.building) === mine
  if (snapshotBuilding) return canonicalPlant(snapshotBuilding) === mine
  return true
}

export const isMe = (id: string | null | undefined, session: MtSession) =>
  id !== null && id !== undefined && id !== '' && (String(id) === session.userId || String(id) === session.username)

// ── Loaders ──────────────────────────────────────────────────────────────

export interface QcInbox {
  awaiting: QcInboxRow[]
  myActive: QcInboxRow[]
  doneToday: QcInboxRow[]
  history: QcInboxRow[]
  /** Best-effort calls that failed (shown as a soft warning) */
  warnings: string[]
}

const settledValue = <T>(r: PromiseSettledResult<T>, fallback: T) => (r.status === 'fulfilled' ? r.value : fallback)
const settledError = (r: PromiseSettledResult<unknown>) =>
  r.status === 'rejected' ? (r.reason as Error)?.message || 'Request failed' : null

export async function loadQcInbox(session: MtSession): Promise<QcInbox> {
  const today = isoDateIst()
  const [openR, pendingPmR, assetsR, qcHistR, closedPmR, bdHistR] = await Promise.allSettled([
    listOpenBreakdowns('both'),
    listWorkOrders({ status: 'PENDING_QC' }),
    listMachines(),
    qcActivityHistory(HISTORY_FROM, today, 'both'),
    listWorkOrders({ status: 'CLOSED' }),
    // Only to enrich "Sent to QC by …" — /breakdowns/open has no resolver columns
    breakdownHistory(HISTORY_FROM, today, 'both'),
  ])

  // Both live sources down → nothing to show; surface the first error.
  if (openR.status === 'rejected' && pendingPmR.status === 'rejected') throw openR.reason

  const warnings = [openR, pendingPmR, qcHistR, closedPmR]
    .map(settledError)
    .filter((e): e is string => !!e)
    .filter((e, i, a) => a.indexOf(e) === i)

  const assets = new Map(settledValue(assetsR, [] as MtMachine[]).map((m) => [m.asset_id, m]))
  const open = settledValue(openR, [] as OpenBreakdown[])
  const pendingPm = settledValue(pendingPmR, [] as PmWorkOrder[]).filter((w) => w.status === 'PENDING_QC')
  const qcHist = settledValue(qcHistR, [] as BreakdownHistory[])
  const closedPm = settledValue(closedPmR, [] as PmWorkOrder[])
  const bdHist = new Map(settledValue(bdHistR, [] as BreakdownHistory[]).map((h) => [h.id, h]))
  const qcHistById = new Map(qcHist.map((h) => [h.id, h]))

  const pendingQc = open.filter((o) => (o.status || '').toUpperCase() === 'PENDING_QC')
  if (openR.status === 'fulfilled') pruneClaims(new Set(pendingQc.map((o) => o.id)))
  const claims = getClaims()

  const awaiting: QcInboxRow[] = []
  const myActive: QcInboxRow[] = []

  for (const o of pendingQc) {
    const flag = mergeFlag(o, bdHist.get(o.id), qcHistById.get(o.id))
    if (!flag) continue
    const claim = claims[o.id] ?? null
    if (claim && isMe(claim.userId, session)) myActive.push(breakdownRow(flag, assets, claim))
    else if (!claim && inPlant(o.asset_id, session, assets, o.building)) awaiting.push(breakdownRow(flag, assets, null))
  }
  for (const w of pendingPm) {
    if (!w.qc_acknowledged_by) {
      if (inPlant(w.machine_id, session, assets)) awaiting.push(pmRow(w, assets))
    } else if (isMe(w.qc_acknowledged_by, session)) {
      myActive.push(pmRow(w, assets))
    }
  }

  // History rows come straight off the (already plant-scoped) network.
  const bdHistoryRows = qcHist
    .map((h) => mergeFlag(undefined, bdHist.get(h.id), h))
    .filter((f): f is QcFlag => !!f)
    .map((f) => breakdownRow(f, assets, null))
  const pmHistoryRows = closedPm.map((w) => pmRow(w, assets))
  const history = [...bdHistoryRows, ...pmHistoryRows].sort(byRecent)

  const since = startOfDayIst()
  const doneToday = [
    ...bdHistoryRows.filter((r) => isMe(r.flag.qc_decided_by, session) && (r.flag.qc_decided_at ?? 0) >= since),
    ...pmHistoryRows.filter((r) => isMe(r.wo.qc_acknowledged_by, session) && (r.wo.closed_at ?? 0) >= since),
  ].sort(byRecent)

  return {
    awaiting: awaiting.sort(byRecent),
    myActive: myActive.sort(byRecent),
    doneToday,
    history,
    warnings,
  }
}

/** Resolve one breakdown for the QC ticket screen. There is no GET
 *  /breakdowns/{id}, so it is found in the open list, then the QC and full
 *  history (which carry the repair + decision columns). */
export async function loadQcFlag(id: string): Promise<{ flag: QcFlag | null; assets: Map<string, MtMachine> }> {
  const today = isoDateIst()
  const [openR, histR, qcHistR, assetsR] = await Promise.allSettled([
    listOpenBreakdowns('both'),
    breakdownHistory(HISTORY_FROM, today, 'both'),
    qcActivityHistory(HISTORY_FROM, today, 'both'),
    listMachines(),
  ])
  if (openR.status === 'rejected' && histR.status === 'rejected' && qcHistR.status === 'rejected') throw openR.reason
  const open = settledValue(openR, [] as OpenBreakdown[]).find((o) => o.id === id)
  const hist = settledValue(histR, [] as BreakdownHistory[]).find((h) => h.id === id)
  const qcHist = settledValue(qcHistR, [] as BreakdownHistory[]).find((h) => h.id === id)
  const assets = new Map(settledValue(assetsR, [] as MtMachine[]).map((m) => [m.asset_id, m]))
  return { flag: mergeFlag(open, hist, qcHist) ?? null, assets }
}
