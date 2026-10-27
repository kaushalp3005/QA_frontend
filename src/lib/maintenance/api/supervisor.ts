/**
 * Supervisor PM manager — PM plans (mt_pm_plan) and the work-order lifecycle
 * (mt_pm_work_order). Ported from PmSyncApi.kt, PmPlanDto.kt, PmWorkOrderDto.kt,
 * PmWorkOrderRequestDtos.kt, PmPlanRepositoryImpl.kt and PmWorkOrderRepositoryImpl.kt
 * (supervisorApprove / supervisorReject / history).
 *
 * The Android app keeps a plan as a local template + plan pair in Room; on the
 * web the backend's single merged plan row is used directly. Every time on
 * these rows is epoch ms.
 */
import { mtFetch } from '../client'

// ── Plans ────────────────────────────────────────────────────────────────

export type PmTriggerType = 'TIME' | 'USAGE'

export interface PmPlanItem {
  id: string
  order_index: number
  title: string
  /** "Remarks" — supervisor guidance shown to the technician */
  description: string
}

export interface PmPlan {
  /** Server-assigned ('PLANAA001'…); legacy rows keep 'plan-<uuid>' */
  id: string
  /** Idempotency key sent on create so a retried POST updates instead of duplicating */
  client_ref?: string | null
  /** mt_asset_list.asset_id */
  machine_id: string
  /** The plan is named after its asset */
  machine_name: string
  description: string
  items: PmPlanItem[]
  trigger_type: PmTriggerType | string
  trigger_interval: number
  next_due_at: number
  last_completed_at?: number | null
  assigned_technician_id: string
  is_active: boolean
  created_by?: string | null
  created_at: number
  updated_at: number
}

export function listPlans() {
  return mtFetch<PmPlan[]>('/pm/plans')
}

export function getPlan(id: string) {
  return mtFetch<PmPlan>(`/pm/plans/${encodeURIComponent(id)}`)
}

/** Any id in the body is ignored — adopt the id from the response. */
export function createPlan(body: PmPlan) {
  return mtFetch<PmPlan>('/pm/plans', { method: 'POST', body })
}

export function updatePlan(id: string, body: PmPlan) {
  return mtFetch<PmPlan>(`/pm/plans/${encodeURIComponent(id)}`, { method: 'PUT', body })
}

// ── Work orders ──────────────────────────────────────────────────────────

export type PmWoStatus =
  | 'DRAFT'
  | 'NOTIFIED'
  | 'ACKNOWLEDGED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'SUPERVISOR_APPROVED'
  | 'PENDING_QC'
  | 'QC_APPROVED'
  | 'CLOSED'
  | 'OVERDUE'
  | 'CANCELLED'

export type PmTaskLogStatus = 'PENDING' | 'PASS' | 'FAIL' | 'NOT_APPLICABLE'

export interface PmTaskLog {
  id: string
  template_item_id?: string | null
  order_index: number
  title: string
  description: string
  /** PASS = "Is good", FAIL = not good */
  status: PmTaskLogStatus | string
  /** Technician remark; required when FAIL */
  notes?: string | null
  completed_at?: number | null
  completed_by?: string | null
}

export interface PmSpare {
  id: string
  part_id?: number | null
  spare_name: string
  machine_name?: string | null
  quantity_used: number
  unit: string
  notes?: string | null
  logged_at: number
  logged_by: string
  deducted?: boolean
}

export interface PmWorkOrder {
  id: string
  plan_id: string
  machine_id: string
  machine_name: string
  template_name: string
  estimated_duration_minutes: number
  scheduled_date: number
  generated_at: number
  status: PmWoStatus | string
  assigned_technician_id: string
  assigned_technician_name?: string | null
  acknowledged_at?: number | null
  started_at?: number | null
  submitted_at?: number | null
  final_notes?: string | null
  /** Machine-level PASS / FAIL chosen on the technician's summary */
  overall_result?: string | null
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

/** `status` may be a comma-separated list ("NOTIFIED,SUBMITTED"). */
export function listWorkOrders(filters: { technician_id?: string; status?: string } = {}) {
  return mtFetch<PmWorkOrder[]>('/pm/work-orders', { query: filters })
}

export function getWorkOrder(id: string) {
  return mtFetch<PmWorkOrder>(`/pm/work-orders/${encodeURIComponent(id)}`)
}

/** SUBMITTED → PENDING_QC */
export function supervisorApprove(id: string, body: { supervisor_id: string; supervisor_name: string; at?: number }) {
  return mtFetch<PmWorkOrder>(`/pm/work-orders/${encodeURIComponent(id)}/supervisor/approve`, {
    method: 'POST',
    body,
  })
}

/** SUBMITTED → IN_PROGRESS (technician rework) */
export function supervisorReject(
  id: string,
  body: { supervisor_id: string; supervisor_name: string; notes: string; at?: number },
) {
  return mtFetch<PmWorkOrder>(`/pm/work-orders/${encodeURIComponent(id)}/supervisor/reject`, {
    method: 'POST',
    body,
  })
}

// ── Derived (SupervisorHomeViewModel / screen chips) ─────────────────────

/** Statuses the PM manager mirrors (SupervisorHomeViewModel.refreshByStatuses) */
export const SUPERVISOR_WO_STATUSES = ['NOTIFIED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'SUBMITTED', 'PENDING_QC', 'CLOSED']

/** Off the Active tab — they live on History instead */
export const TERMINAL_WO_STATUSES = new Set(['CLOSED', 'QC_APPROVED', 'CANCELLED'])

/** QC's sign-off blob, as written by qcBlob() in the Android repo */
export function qcBlob(wo: Pick<PmWorkOrder, 'qc_checklist'>): { notes?: string; after_photo_url?: string } | null {
  const raw = wo.qc_checklist
  let v: unknown = raw
  if (typeof raw === 'string') {
    try {
      v = JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  const o = v as Record<string, unknown>
  return {
    notes: typeof o.notes === 'string' ? o.notes : undefined,
    after_photo_url: typeof o.after_photo_url === 'string' ? o.after_photo_url : undefined,
  }
}

export const DAY_MS = 86_400_000
