/**
 * QC verification — breakdown QC handoff, PM work-order QC and the read-only
 * checklist archive. Ported from:
 *   data/remote/api/BreakdownApi.kt (breakdowns/open, qc/acknowledge|approve|disapprove,
 *     breakdowns/history, qc/history) + dto/BreakdownDtos.kt, dto/HeadReportsDtos.kt
 *   data/remote/api/PmSyncApi.kt (pm/work-orders + QC lifecycle, pm/photos)
 *     + dto/PmWorkOrderDto.kt, dto/PmWorkOrderRequestDtos.kt
 *   data/remote/api/ChecklistApi.kt (preventive-maintenance/checklists, /breakdowns)
 *     + dto/ChecklistDtos.kt
 *   data/repository/BreakdownRepositoryImpl.kt, PmWorkOrderRepositoryImpl.kt,
 *     ChecklistRepositoryImpl.kt
 *
 * Times are epoch ms; checklist / F.06 dates are the strings the backend stores.
 */
import { mtFetch } from '../client'

// ── Breakdowns (mt_breakdown_records, source = OPERATOR_FLAG) ─────────────

/** Backend lifecycle: OPEN → ACKNOWLEDGED → PENDING_QC → QC_APPROVED/CLOSED, or → REOPENED */
export type BreakdownStatus = 'OPEN' | 'ACKNOWLEDGED' | 'PENDING_QC' | 'CLOSED' | 'REOPENED' | 'QC_APPROVED' | string
export type Severity = 'CRITICAL' | 'MAJOR' | 'MINOR'

/** GET /breakdowns/open — every breakdown not yet CLOSED (OpenBreakdownDto) */
export interface OpenBreakdown {
  id: string
  asset_id: string
  asset_name?: string
  reported_by?: string | null
  reporter_name?: string | null
  severity?: string | null
  description?: string
  status: BreakdownStatus
  reported_at?: number | null
  /** Acknowledging technician (not QC) */
  acknowledged_by?: string | null
  acknowledged_by_name?: string | null
  acknowledged_at?: number | null
  building?: string | null
  /** Set when the row is OPEN again because QC disapproved the last repair */
  qc_reject_reason?: string | null
  /** "APPROVED" | "DISAPPROVED" | "PENDING" | null */
  qc_status?: string | null
}

/** GET /breakdowns/history and GET /qc/history (BreakdownHistoryDto) */
export interface BreakdownHistory {
  id: string
  asset_id: string
  asset_name?: string
  building?: string | null
  reported_by?: string | null
  reporter_name?: string | null
  severity?: string | null
  description?: string
  status: BreakdownStatus
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
}

export interface QcAcknowledgeRequest {
  user_id: string
  user_name: string
  /** Login username — the backend writes it to mt_breakdown_records.qc_checked_by */
  qc_checked_by?: string | null
  acknowledged_at: number
  override?: boolean
}

export interface QcDecisionRequest {
  user_id: string
  user_name: string
  decided_at: number
  checklist_json: string
  after_photo_path: string | null
  notes?: string | null
  reason?: string | null
}

export interface QcUpdateResponse {
  id: string
  ticket_status: string
  machine_status: string
  qc_status: string | null
  sync_status: string
}

/** plant_id "both" = don't narrow; the server still clamps a plant-bound account. */
export function listOpenBreakdowns(plantId = 'both') {
  return mtFetch<OpenBreakdown[]>('/breakdowns/open', { query: { plant_id: plantId } })
}

export function qcAcknowledgeBreakdown(id: string, body: QcAcknowledgeRequest) {
  return mtFetch<QcUpdateResponse>(`/breakdowns/${encodeURIComponent(id)}/qc/acknowledge`, {
    method: 'POST',
    body,
  })
}

/** Closes the breakdown (status CLOSED, qc_status APPROVED) and frees the machine. */
export function qcApproveBreakdown(id: string, body: QcDecisionRequest) {
  return mtFetch<QcUpdateResponse>(`/breakdowns/${encodeURIComponent(id)}/qc/approve`, { method: 'POST', body })
}

/** Sends the breakdown back to the technician with a reason. */
export function qcDisapproveBreakdown(id: string, body: QcDecisionRequest) {
  return mtFetch<QcUpdateResponse>(`/breakdowns/${encodeURIComponent(id)}/qc/disapprove`, { method: 'POST', body })
}

/** Every breakdown (open + closed) reported in range. status: OPEN / CLOSED / omitted = all. */
export function breakdownHistory(from: string, to: string, plantId = 'both', status?: string) {
  return mtFetch<BreakdownHistory[]>('/breakdowns/history', { query: { from, to, plant_id: plantId, status } })
}

/** Every breakdown with a QC decision in range (latest decision only). */
export function qcActivityHistory(from: string, to: string, plantId = 'both') {
  return mtFetch<BreakdownHistory[]>('/qc/history', { query: { from, to, plant_id: plantId } })
}

// ── PM work orders (mt_pm_work_order) ────────────────────────────────────

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
  order_index?: number
  title?: string
  /** "Remarks" guidance snapshot */
  description?: string
  status?: PmTaskLogStatus | string
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
  unit?: string
  notes?: string | null
  logged_at?: number
  logged_by?: string
  deducted?: boolean
}

export interface PmWorkOrder {
  id: string
  plan_id: string
  /** mt_asset_list.asset_id */
  machine_id: string
  machine_name?: string
  template_name?: string
  estimated_duration_minutes?: number
  scheduled_date: number
  generated_at: number
  status: PmWoStatus | string
  assigned_technician_id: string
  assigned_technician_name?: string | null
  acknowledged_at?: number | null
  started_at?: number | null
  submitted_at?: number | null
  final_notes?: string | null
  /** PASS | FAIL — machine-level verdict from the technician */
  overall_result?: string | null
  supervisor_approved_by?: string | null
  supervisor_approved_by_name?: string | null
  supervisor_approved_at?: number | null
  supervisor_rejected_at?: number | null
  supervisor_rejection_notes?: string | null
  qc_acknowledged_by?: string | null
  qc_acknowledged_by_name?: string | null
  qc_acknowledged_at?: number | null
  /** Free-form QC sign-off blob — see QcSignOffBlob */
  qc_checklist?: unknown
  closed_at?: number | null
  task_logs?: PmTaskLog[]
  spares?: PmSpare[]
  created_at?: number
  updated_at?: number
}

export interface PmQcAckRequest {
  user_id: string
  user_name: string
  at?: number | null
}

export interface PmQcDecisionRequest {
  user_id: string
  user_name: string
  /** Stored verbatim in qc_checklist */
  checklist: QcSignOffBlob | null
  notes: string
  at?: number | null
}

/** One after-maintenance line of the QC snapshot (QcChecklistData.kt) */
export interface QcAfterMaintenanceLine {
  checkpoint: string
  /** "PASS" | "FAIL" — the backend maps these to OK / NOT_OK in the 50a/50b record */
  status: 'PASS' | 'FAIL'
  remarks: string | null
}

export interface QcChecklistSnapshot {
  after_maintenance: QcAfterMaintenanceLine[]
  notes: string | null
}

/** What the app folds into qc_checklist (PmWorkOrderRepositoryImpl.qcBlob) */
export interface QcSignOffBlob {
  checklist?: QcChecklistSnapshot
  after_photo_url?: string
  notes?: string
}

/** status is a comma-separated allow-list, e.g. "PENDING_QC" or "CLOSED". */
export function listWorkOrders(filters: { technician_id?: string; status?: string } = {}) {
  return mtFetch<PmWorkOrder[]>('/pm/work-orders', { query: filters })
}

export function getWorkOrder(id: string) {
  return mtFetch<PmWorkOrder>(`/pm/work-orders/${encodeURIComponent(id)}`)
}

const woAction = (id: string, action: string, body: unknown) =>
  mtFetch<PmWorkOrder>(`/pm/work-orders/${encodeURIComponent(id)}/${action}`, { method: 'POST', body })

export const qcAcknowledgeWorkOrder = (id: string, body: PmQcAckRequest) => woAction(id, 'qc/acknowledge', body)

/** QC_HEAD only — takes a pickup over from another QC user. */
export const qcOverrideAcknowledgeWorkOrder = (id: string, body: PmQcAckRequest) =>
  woAction(id, 'qc/override-acknowledge', body)

/** Persists qc_checklist and CLOSES the WO (advances the plan's next cycle). */
export const qcApproveWorkOrder = (id: string, body: PmQcDecisionRequest) => woAction(id, 'qc/approve', body)

/** Sends the WO back to the supervisor (status SUBMITTED). */
export const qcDisapproveWorkOrder = (id: string, body: PmQcDecisionRequest) => woAction(id, 'qc/disapprove', body)

/** POST /pm/photos — one jpeg/png (≤ 10 MB) as the multipart part "file"; returns its S3 URL. */
export function uploadPmPhoto(file: File) {
  const fd = new FormData()
  fd.append('file', file, file.name)
  return mtFetch<{ url: string }>('/pm/photos', { method: 'POST', body: fd })
}

/** Read qc_checklist defensively — older rows may hold a bare snapshot or a string. */
export function readSignOff(raw: unknown): QcSignOffBlob | null {
  let v = raw
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v)
    } catch {
      return null
    }
  }
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, any>
  if (Array.isArray(o.after_maintenance)) return { checklist: o as QcChecklistSnapshot, notes: o.notes ?? undefined }
  return o as QcSignOffBlob
}

// ── Checklist archive (preventive-maintenance/*) ─────────────────────────

/** GET /preventive-maintenance/checklists row (ChecklistRecordSummaryDto) */
export interface ChecklistRecordSummary {
  id: number
  /** ChecklistType name: MONTHLY, QUARTERLY, A185_MONTHLY… */
  form_type: string
  /** DRAFT | SUBMITTED */
  status?: string
  doc_no?: string
  /** YYYY-MM-DD */
  checklist_date?: string
  checklist_date_from?: string
  checklist_date_to?: string
  done_by?: string
  /** ISO string */
  created_at?: string
  filled_count?: number
  total_count?: number
}

/** No status filter → submitted + drafts (QC sees both, drafts labelled). */
export function listChecklists(status?: string) {
  return mtFetch<ChecklistRecordSummary[]>('/preventive-maintenance/checklists', { query: { status } })
}

/** GET /preventive-maintenance/breakdowns row — one submitted F.06 / F.61 entry */
export interface BreakdownRecord {
  id: number
  doc_no?: string
  record_date?: string
  location?: string
  machine_name?: string
  equipment_model_no?: string
  problem_in_brief?: string
  type_of_maintenance?: string
  part_of_machine?: string
  temporary_reason?: string
  duration_start?: string
  duration_end?: string
  machine_operator_sign?: string
  maintenance_person_sign?: string
  qc_clearance_sign?: string
  verified_by?: string
  created_at?: string
}

export function listBreakdownRecords() {
  return mtFetch<BreakdownRecord[]>('/preventive-maintenance/breakdowns')
}
