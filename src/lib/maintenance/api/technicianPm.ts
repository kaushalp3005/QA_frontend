/**
 * Preventive maintenance — plans (mt_pm_plan) and work orders (mt_pm_work_order)
 * as the technician sees and executes them.
 * Ported from PmSyncApi.kt, PmWorkOrderDto.kt, PmWorkOrderRequestDtos.kt,
 * PmPlanDto.kt, domain/model/Enums.kt + PmWorkOrder.kt, PmWorkOrderRepositoryImpl
 * (refreshForTechnician, acknowledge, start, submit), PmPlanRepositoryImpl
 * (getAssignedPlans), ComputePmEscalationTierUseCase and util/Constants.kt.
 *
 * Every timestamp is epoch ms. Task logs and spares are JSONB arrays on the work
 * order; there is no per-item endpoint — results go up in one submit.
 */
import { mtFetch } from '../client'
import { startOfDayIst } from '../format'
import type { SpareLine } from './technicianSpares'

// ── Enums ────────────────────────────────────────────────────────────────

export const PM_WO_STATUSES = [
  'DRAFT',
  'NOTIFIED',
  'ACKNOWLEDGED',
  'IN_PROGRESS',
  'SUBMITTED',
  'SUPERVISOR_APPROVED',
  'PENDING_QC',
  'QC_APPROVED',
  'CLOSED',
  'OVERDUE',
  'CANCELLED',
] as const
export type PmWoStatus = (typeof PM_WO_STATUSES)[number]

/** PENDING until answered; PASS = "Is good", FAIL = not good (remark required). */
export type PmTaskLogStatus = 'PENDING' | 'PASS' | 'FAIL' | 'NOT_APPLICABLE'
export type PmTriggerType = 'TIME' | 'USAGE'
/** Machine-level verdict chosen on the summary screen */
export type PmOverallResult = 'PASS' | 'FAIL'

/** Unknown strings fall back to NOTIFIED, like PmWorkOrderDto.toDomain(). */
export function parsePmWoStatus(raw: string | null | undefined): PmWoStatus {
  const s = (raw ?? '').toUpperCase()
  return (PM_WO_STATUSES as readonly string[]).includes(s) ? (s as PmWoStatus) : 'NOTIFIED'
}

export function parsePmTaskLogStatus(raw: string | null | undefined): PmTaskLogStatus {
  const s = (raw ?? '').toUpperCase()
  return s === 'PASS' || s === 'FAIL' || s === 'NOT_APPLICABLE' ? s : 'PENDING'
}

/** Still the technician's to do */
export const PM_ACTIVE: readonly PmWoStatus[] = ['NOTIFIED', 'ACKNOWLEDGED', 'IN_PROGRESS']
/** Done by the technician, waiting on supervisor / QC */
export const PM_IN_REVIEW: readonly PmWoStatus[] = ['SUBMITTED', 'SUPERVISOR_APPROVED', 'PENDING_QC']
export const PM_COMPLETED: readonly PmWoStatus[] = ['QC_APPROVED', 'CLOSED']
/** Everything the technician has finished, whether or not review caught up */
export const PM_HISTORY: readonly PmWoStatus[] = [...PM_IN_REVIEW, ...PM_COMPLETED]
/** A plan has an open cycle while its work order is in one of these */
export const PM_OPEN: readonly PmWoStatus[] = ['DRAFT', ...PM_ACTIVE, ...PM_IN_REVIEW]

// ── Wire shapes ──────────────────────────────────────────────────────────

/** One checklist line on a work order (PmTaskLogDto) */
export interface PmTaskLog {
  id: string
  template_item_id?: string | null
  order_index: number
  title: string
  /** "Remarks" guidance snapshot from the plan item */
  description: string
  status: PmTaskLogStatus
  /** Technician remark — required when status is FAIL */
  notes?: string | null
  completed_at?: number | null
  completed_by?: string | null
  // Older contract fields the server may still send; the app no longer uses them.
  expected_result?: string | null
  requires_photo?: boolean
  requires_measurement?: boolean
  measurement_unit?: string | null
  measurement_min?: number | null
  measurement_max?: number | null
  measurement_value?: number | null
  photo_url?: string | null
}

/** One spare consumed on a work order (PmSpareDto) — same shape as SpareLine */
export type PmSpare = SpareLine

/** mt_pm_work_order row (PmWorkOrderDto) */
export interface PmWorkOrder {
  id: string
  plan_id: string
  /** asset_id */
  machine_id: string
  machine_name: string
  /** Shown as the PM title; the server sets it to the machine name */
  template_name: string
  estimated_duration_minutes: number
  scheduled_date: number
  generated_at: number
  status: PmWoStatus
  assigned_technician_id: string
  assigned_technician_name?: string | null
  acknowledged_at?: number | null
  started_at?: number | null
  submitted_at?: number | null
  final_notes?: string | null
  overall_result?: PmOverallResult | string | null
  supervisor_approved_by?: string | null
  supervisor_approved_by_name?: string | null
  supervisor_approved_at?: number | null
  supervisor_rejected_at?: number | null
  supervisor_rejection_notes?: string | null
  qc_acknowledged_by?: string | null
  qc_acknowledged_by_name?: string | null
  qc_acknowledged_at?: number | null
  /** Freeform QC sign-off blob: { checklist?, after_photo_url?, notes? } */
  qc_checklist?: unknown
  closed_at?: number | null
  task_logs: PmTaskLog[]
  spares: PmSpare[]
  created_at: number
  updated_at: number
}

/** mt_pm_plan checklist item (PmPlanItemDto) */
export interface PmPlanItem {
  id: string
  order_index: number
  title: string
  /** "Remarks" — supervisor guidance */
  description: string
}

/** mt_pm_plan row (PmPlanDto) */
export interface PmPlan {
  /** Server-assigned ('PLANAA001'…; legacy rows 'plan-<uuid>') */
  id: string
  /** Create idempotency key, echoed back */
  client_ref?: string | null
  machine_id: string
  machine_name: string
  description: string
  items: PmPlanItem[]
  trigger_type: PmTriggerType
  /** days (TIME) or running hours (USAGE) */
  trigger_interval: number
  next_due_at: number
  last_completed_at?: number | null
  assigned_technician_id: string
  is_active: boolean
  created_by?: string | null
  created_at: number
  updated_at: number
}

// Request bodies (PmWorkOrderRequestDtos.kt). `at` = client epoch ms; server
// uses its own clock when null.
export interface PmAtRequest {
  at?: number | null
}
export interface PmSubmitRequest {
  final_notes: string
  overall_result: string
  at?: number | null
  task_logs: PmTaskLog[]
  spares: PmSpare[]
}
export interface PmSupervisorApproveRequest {
  supervisor_id: string
  supervisor_name: string
  at?: number | null
}
export interface PmSupervisorRejectRequest extends PmSupervisorApproveRequest {
  notes: string
}
export interface PmQcAckRequest {
  user_id: string
  user_name: string
  at?: number | null
}
export interface PmQcDecisionRequest extends PmQcAckRequest {
  checklist?: unknown
  notes: string
}
export interface PmPhotoUploadResponse {
  url: string
}

// ── Normalisation (defaults the Kotlin DTO declares) ─────────────────────

export function normalizeWorkOrder(raw: any): PmWorkOrder {
  return {
    ...raw,
    machine_name: raw.machine_name ?? '',
    template_name: raw.template_name || raw.machine_name || '',
    estimated_duration_minutes: raw.estimated_duration_minutes ?? 0,
    status: parsePmWoStatus(raw.status),
    task_logs: (raw.task_logs ?? [])
      .map((l: any) => ({
        ...l,
        order_index: l.order_index ?? 0,
        title: l.title ?? '',
        description: l.description ?? '',
        status: parsePmTaskLogStatus(l.status),
      }))
      .sort((a: PmTaskLog, b: PmTaskLog) => a.order_index - b.order_index),
    spares: (raw.spares ?? []).map((s: any) => ({
      ...s,
      part_id: s.part_id ?? null,
      unit: s.unit ?? '',
      logged_at: s.logged_at ?? 0,
      logged_by: s.logged_by ?? '',
    })),
    created_at: raw.created_at ?? 0,
    updated_at: raw.updated_at ?? 0,
  }
}

function normalizePlan(raw: any): PmPlan {
  return {
    ...raw,
    description: raw.description ?? '',
    items: [...(raw.items ?? [])].sort((a: PmPlanItem, b: PmPlanItem) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    trigger_type: raw.trigger_type === 'USAGE' ? 'USAGE' : 'TIME',
    is_active: raw.is_active ?? true,
  }
}

// ── Endpoints ────────────────────────────────────────────────────────────

/** GET /pm/work-orders — optional technician_id and comma-separated status filter */
export async function listWorkOrders(filters: { technicianId?: string; status?: PmWoStatus | PmWoStatus[] } = {}) {
  const status = Array.isArray(filters.status) ? filters.status.join(',') : filters.status
  const rows = await mtFetch<any[]>('/pm/work-orders', {
    query: { technician_id: filters.technicianId, status },
  })
  return (rows ?? []).map(normalizeWorkOrder)
}

export async function getWorkOrder(id: string) {
  return normalizeWorkOrder(await mtFetch<any>(`/pm/work-orders/${encodeURIComponent(id)}`))
}

/** NOTIFIED → ACKNOWLEDGED */
export async function acknowledgeWorkOrder(id: string) {
  const body: PmAtRequest = { at: Date.now() }
  return normalizeWorkOrder(
    await mtFetch<any>(`/pm/work-orders/${encodeURIComponent(id)}/acknowledge`, { method: 'POST', body }),
  )
}

/** ACKNOWLEDGED → IN_PROGRESS */
export async function startWorkOrder(id: string) {
  const body: PmAtRequest = { at: Date.now() }
  return normalizeWorkOrder(await mtFetch<any>(`/pm/work-orders/${encodeURIComponent(id)}/start`, { method: 'POST', body }))
}

/** IN_PROGRESS → SUBMITTED. Replaces the WO's task_logs + spares with these. */
export async function submitWorkOrder(id: string, body: PmSubmitRequest) {
  return normalizeWorkOrder(await mtFetch<any>(`/pm/work-orders/${encodeURIComponent(id)}/submit`, { method: 'POST', body }))
}

/** GET /pm/plans — every plan; callers filter */
export async function listPlans() {
  const rows = await mtFetch<any[]>('/pm/plans')
  return (rows ?? []).map(normalizePlan)
}

/** Active plans assigned to this technician (PmPlanRepositoryImpl.getAssignedPlans) */
export async function listAssignedPlans(technicianId: string) {
  return (await listPlans()).filter((p) => p.assigned_technician_id === technicianId && p.is_active)
}

/** POST /pm/photos — one jpeg/png ≤ 10 MB to S3; returns its URL */
export function uploadPmPhoto(file: File) {
  const fd = new FormData()
  fd.append('file', file, file.name || 'photo.jpg')
  return mtFetch<PmPhotoUploadResponse>('/pm/photos', { method: 'POST', body: fd })
}

// ── Derived facts ────────────────────────────────────────────────────────

const DAY_MS = 86_400_000
/** The server creates a plan's work order this many days before it is due. */
export const PM_GENERATION_LEAD_DAYS = 7
const PM_TIER_DAYS = [1, 4, 7, 14] as const

/** Negative = overdue, 0 = due today, positive = future — on the plant (IST) calendar. */
export function daysToDue(dueAt: number, now = Date.now()): number {
  return Math.round((startOfDayIst(dueAt) - startOfDayIst(now)) / DAY_MS)
}

/** Whole days past the scheduled instant (0 when not yet due) */
export const daysOverdue = (scheduledAt: number, now = Date.now()) => Math.floor(Math.max(0, now - scheduledAt) / DAY_MS)

/** Escalation tier 0..4 (ComputePmEscalationTierUseCase). The Android app keeps
 *  this on the device; the backend doesn't carry it, so it is computed here. */
export function escalationTier(scheduledAt: number, now = Date.now()): number {
  const d = daysOverdue(scheduledAt, now)
  if (d >= PM_TIER_DAYS[3]) return 4
  if (d >= PM_TIER_DAYS[2]) return 3
  if (d >= PM_TIER_DAYS[1]) return 2
  if (d >= PM_TIER_DAYS[0]) return 1
  return 0
}

/** When the technician finished it — closed → submitted → scheduled */
export const woDoneAt = (wo: PmWorkOrder) => wo.closed_at ?? wo.submitted_at ?? wo.scheduled_date

export const planIntervalLabel = (p: Pick<PmPlan, 'trigger_type' | 'trigger_interval'>) =>
  p.trigger_type === 'USAGE' ? `Every ${p.trigger_interval} running hours` : `Every ${p.trigger_interval} days`

/** plan_id → its most recent work order (any status) */
export function latestWorkOrderByPlan(wos: PmWorkOrder[]): Map<string, PmWorkOrder> {
  const m = new Map<string, PmWorkOrder>()
  for (const wo of wos) {
    const cur = m.get(wo.plan_id)
    if (!cur || wo.scheduled_date > cur.scheduled_date) m.set(wo.plan_id, wo)
  }
  return m
}

/** Where a plan's current cycle stands, in the technician's terms (PmPlanRowUiModel.actionHint) */
export function planActionHint(woStatus: PmWoStatus | null | undefined): string {
  switch (woStatus) {
    case null:
    case undefined:
      return 'Not generated yet'
    case 'NOTIFIED':
      return 'Ready to start →'
    case 'ACKNOWLEDGED':
      return 'Acknowledged →'
    case 'IN_PROGRESS':
      return 'In progress →'
    case 'SUBMITTED':
    case 'SUPERVISOR_APPROVED':
    case 'PENDING_QC':
      return 'Submitted — in review'
    default:
      return 'Completed'
  }
}

export const isStartable = (s: PmWoStatus | null | undefined) => !!s && PM_ACTIVE.includes(s)
