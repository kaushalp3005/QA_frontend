/**
 * Checklist documents — preventive-maintenance checklists (W-202 F.50a/F.50b,
 * A-185 F.41) and the Breakdown Maintenance Record sheet (F.06 / F.61).
 * Ported from data/remote/api/ChecklistApi.kt + dto/ChecklistDtos.kt +
 * data/repository/ChecklistRepositoryImpl.kt.
 *
 * Drafts are server records too: a checklist is POSTed once (DRAFT or
 * SUBMITTED) and later saves PUT the same id.
 *
 * The F.06 list also shows the operator breakdowns that feed it, so this
 * module carries the two small reads it needs from BreakdownApi.kt
 * (GET /breakdowns/open, GET /breakdowns/history — dto/HeadReportsDtos.kt).
 */
import { mtFetch } from '../client'

// ── PM checklist ─────────────────────────────────────────────────────────

/** Wire name of ChecklistType: MONTHLY | QUARTERLY | A185_QUARTERLY | A185_MONTHLY */
export type ChecklistFormType = 'MONTHLY' | 'QUARTERLY' | 'A185_QUARTERLY' | 'A185_MONTHLY'
export type ChecklistStatus = 'DRAFT' | 'SUBMITTED'
/** UNSET only ever travels on a DRAFT — a submit requires every row filled. */
export type CheckpointStatus = 'OK' | 'NOT_OK' | 'UNSET'

export interface ChecklistItemDto {
  section: string
  equipment: string
  sr_no?: number | null
  /** This machine's maintenance period, YYYY-MM-DD; same date at both ends for monthly */
  from_date?: string
  to_date?: string
  checkpoint: string
  status: string
  remarks: string
}

export interface ChecklistSubmissionDto {
  form_type: string
  doc_no: string
  status: ChecklistStatus
  /** YYYY-MM-DD — earliest machine date on the sheet */
  checklist_date: string
  done_by: string
  checked_by: string
  verified_by: string
  remarks: string
  items: ChecklistItemDto[]
}

export interface ChecklistSubmitResponseDto {
  id: number
}

export interface ChecklistRecordSummaryDto {
  id: number
  form_type: string
  status?: string
  doc_no?: string
  checklist_date?: string
  checklist_date_from?: string
  checklist_date_to?: string
  done_by?: string
  created_at?: string
  filled_count?: number
  total_count?: number
}

export interface ChecklistRecordDetailDto {
  id: number
  form_type: string
  status?: string
  doc_no?: string
  checklist_date?: string
  checklist_date_from?: string
  checklist_date_to?: string
  done_by?: string
  checked_by?: string
  verified_by?: string
  remarks?: string
  created_at?: string
  items?: ChecklistItemDto[]
}

/** Summary with every DTO default applied (ChecklistRecordSummaryDto.toDomain). */
export interface ChecklistRecordSummary {
  id: number
  formType: string
  status: string
  docNo: string
  checklistDate: string
  checklistDateFrom: string
  checklistDateTo: string
  doneBy: string
  createdAt: string
  filledCount: number
  totalCount: number
}

export interface ChecklistRecordItem {
  section: string
  equipment: string
  srNo: number | null
  equipmentDate: string
  equipmentDateTo: string
  checkpoint: string
  status: string
  remarks: string
}

export interface ChecklistRecordDetail extends Omit<ChecklistRecordSummary, 'filledCount' | 'totalCount'> {
  checkedBy: string
  verifiedBy: string
  remarks: string
  items: ChecklistRecordItem[]
}

const s = (v: string | null | undefined) => v ?? ''
const blank = (v: string) => v.trim() === ''

// Records written before the per-machine range existed carry only
// checklist_date; fall back so "Period" never renders empty.
function range(d: { checklist_date?: string; checklist_date_from?: string; checklist_date_to?: string }) {
  const date = s(d.checklist_date)
  const from = s(d.checklist_date_from)
  const to = s(d.checklist_date_to)
  return {
    checklistDate: date,
    checklistDateFrom: blank(from) ? date : from,
    checklistDateTo: blank(to) ? (blank(from) ? date : from) : to,
  }
}

export function toSummary(d: ChecklistRecordSummaryDto): ChecklistRecordSummary {
  return {
    id: d.id,
    formType: d.form_type,
    status: d.status ?? 'SUBMITTED',
    docNo: s(d.doc_no),
    ...range(d),
    doneBy: s(d.done_by),
    createdAt: s(d.created_at),
    filledCount: d.filled_count ?? 0,
    totalCount: d.total_count ?? 0,
  }
}

export function toDetail(d: ChecklistRecordDetailDto): ChecklistRecordDetail {
  return {
    id: d.id,
    formType: d.form_type,
    status: d.status ?? 'SUBMITTED',
    docNo: s(d.doc_no),
    ...range(d),
    doneBy: s(d.done_by),
    checkedBy: s(d.checked_by),
    verifiedBy: s(d.verified_by),
    remarks: s(d.remarks),
    createdAt: s(d.created_at),
    items: (d.items ?? []).map((it) => ({
      section: s(it.section),
      equipment: s(it.equipment),
      srNo: it.sr_no ?? null,
      equipmentDate: s(it.from_date),
      equipmentDateTo: s(it.to_date),
      checkpoint: s(it.checkpoint),
      status: s(it.status),
      remarks: s(it.remarks),
    })),
  }
}

export const isDraft = (r: { status: string }) => r.status.toUpperCase() === 'DRAFT'

/** True when the record covers a span rather than a single day. */
export const hasDateRange = (r: { checklistDateFrom: string; checklistDateTo: string }) =>
  !blank(r.checklistDateFrom) && !blank(r.checklistDateTo) && r.checklistDateFrom !== r.checklistDateTo

/** Create (no id) or update a checklist record. Returns the record id. */
export async function saveChecklist(body: ChecklistSubmissionDto, id?: number | null): Promise<number> {
  const r =
    id == null
      ? await mtFetch<ChecklistSubmitResponseDto>('/preventive-maintenance/checklists', { method: 'POST', body })
      : await mtFetch<ChecklistSubmitResponseDto>(`/preventive-maintenance/checklists/${id}`, { method: 'PUT', body })
  return r.id
}

/** Newest first. `status` is a comma-separated allow-list ("SUBMITTED"); omitted = every status. */
export async function listChecklists(status?: string): Promise<ChecklistRecordSummary[]> {
  const rows = await mtFetch<ChecklistRecordSummaryDto[]>('/preventive-maintenance/checklists', { query: { status } })
  return (rows ?? []).map(toSummary)
}

export async function getChecklist(id: number): Promise<ChecklistRecordDetail> {
  return toDetail(await mtFetch<ChecklistRecordDetailDto>(`/preventive-maintenance/checklists/${id}`))
}

// ── Breakdown Maintenance Record (F.06 / F.61) ───────────────────────────

export interface BreakdownEntryDto {
  record_date?: string | null
  location: string
  machine_name: string
  equipment_model_no: string
  problem_in_brief: string
  type_of_maintenance: string
  part_of_machine: string
  temporary_reason: string
  /** "HH:mm" */
  duration_start: string
  duration_end: string
  machine_operator_sign: string
  maintenance_person_sign: string
  qc_clearance_sign: string
}

export interface BreakdownSheetDto {
  doc_no: string
  verified_by: string
  entries: BreakdownEntryDto[]
}

export interface BreakdownSubmitResponseDto {
  ids?: number[]
}

export interface BreakdownRecordDto {
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

/** One row per entry; returns the new row ids. */
export async function submitBreakdownSheet(body: BreakdownSheetDto): Promise<number[]> {
  const r = await mtFetch<BreakdownSubmitResponseDto>('/preventive-maintenance/breakdowns', { method: 'POST', body })
  return r?.ids ?? []
}

/** Submitted F.06/F.61 rows, both plants (doc_no says whose). */
export async function listBreakdownSheets(): Promise<BreakdownRecordDto[]> {
  return (await mtFetch<BreakdownRecordDto[]>('/preventive-maintenance/breakdowns')) ?? []
}

// ── Operator breakdowns (BreakdownApi subset) ────────────────────────────

/** Union of OpenBreakdownDto and BreakdownHistoryDto — history adds the resolved/QC fields. */
export interface BreakdownFlagDto {
  id: string
  asset_id: string
  asset_name?: string
  building?: string | null
  reported_by?: string | null
  reporter_name?: string | null
  severity?: string | null
  description?: string
  /** OPEN | ACKNOWLEDGED | PENDING_QC | CLOSED | REOPENED */
  status: string
  /** epoch ms */
  reported_at?: number | null
  acknowledged_by?: string | null
  acknowledged_by_name?: string | null
  acknowledged_at?: number | null
  resolved_by?: string | null
  resolved_by_name?: string | null
  resolved_at?: number | null
  parts_used?: string | null
  /** APPROVED | DISAPPROVED | REJECTED | PENDING | null */
  qc_status?: string | null
  qc_decided_by?: string | null
  qc_decided_by_name?: string | null
  qc_decided_at?: number | null
  qc_reject_reason?: string | null
  qc_decision_notes?: string | null
}

/** Not-yet-closed breakdowns (plus recently closed) for a plant: W202 | A185 | both. */
export function listOpenBreakdowns(plantId: string) {
  return mtFetch<BreakdownFlagDto[]>('/breakdowns/open', { query: { plant_id: plantId } })
}

/** Every breakdown reported in [from, to] (YYYY-MM-DD, inclusive), any status unless given. */
export function breakdownHistory(from: string, to: string, plantId: string, status?: string) {
  return mtFetch<BreakdownFlagDto[]>('/breakdowns/history', { query: { from, to, plant_id: plantId, status } })
}
