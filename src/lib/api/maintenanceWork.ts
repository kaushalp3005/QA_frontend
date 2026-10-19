/**
 * Maintenance Work — QC sign-off of preventive-maintenance work orders.
 *
 * Backed by /maintenance-work on the QC backend (qc/routers/maintenance_work.py),
 * which reads and closes the maintenance team's mt_pm_work_order rows. A close
 * from here runs the same code as a close from the maintenance app: the plan is
 * rescheduled and the PM checklist document is filled.
 *
 * Same origin as NEXT_PUBLIC_API_BASE_URL, so FetchInterceptor attaches the
 * token and handles the 401 refresh; nothing auth-related happens here.
 *
 * Times arrive as epoch-ms UTC and are shown in IST.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
const PREFIX = '/maintenance-work'

export const MODULE_CODE = 'maintenance_work'

export interface TaskLog {
  id: string
  title: string
  description: string
  status: string // PENDING | PASS | FAIL
  notes: string | null
  completed_at: number | null
  completed_by: string | null
}

export interface Spare {
  id: string
  spare_name: string
  machine_name: string | null
  quantity_used: number
  unit: string | null
  notes: string | null
}

interface WorkOrderBase {
  id: string
  plan_id: string
  machine_id: string
  machine_name: string
  template_name: string
  status: string
  plant: string | null
  scheduled_date: number | null
  generated_at: number | null
  assigned_technician_name: string | null
  acknowledged_at: number | null
  started_at: number | null
  submitted_at: number | null
  final_notes: string | null
  overall_result: string | null
  supervisor_approved_by_name: string | null
  supervisor_approved_at: number | null
  supervisor_rejected_at: number | null
  supervisor_rejection_notes: string | null
  qc_acknowledged_by: string | null
  qc_acknowledged_by_name: string | null
  qc_acknowledged_at: number | null
  closed_at: number | null
  updated_at: number | null
}

export interface WorkOrderSummary extends WorkOrderBase {
  checks_total: number
  checks_failed: number
  spares_count: number
}

export interface WorkOrderDetail extends WorkOrderBase {
  asset_name: string | null
  in_asset_register: boolean
  task_logs: TaskLog[]
  spares: Spare[]
  /** QC sign-off blob. From the web: {decision, decided_by, notes?, source}.
   *  From the maintenance app it can be any shape the app chose to send. */
  qc_checklist: Record<string, unknown> | null
}

export interface WorkOrderListResponse {
  items: WorkOrderSummary[]
  total: number
  page: number
  page_size: number
  /** Per status, over the plant + search filter but not the status filter. */
  counts: Record<string, number>
}

export interface WorkOrderListParams {
  company: string
  status?: string
  plant?: string
  q?: string
  page?: number
  page_size?: number
}

export class MaintenanceWorkError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'MaintenanceWorkError'
    this.status = status
  }
}

function buildUrl(path: string, params: Record<string, unknown> = {}): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.append(key, String(value))
  })
  const qs = search.toString()
  return `${API_BASE_URL}${PREFIX}${path}${qs ? `?${qs}` : ''}`
}

/** FastAPI puts the reason in `detail` (a string here); the QC permission gate
 *  sends `detail: {message}` instead. */
function errorText(body: any): string {
  if (typeof body?.detail === 'string') return body.detail
  if (typeof body?.detail?.message === 'string') return body.detail.message
  if (typeof body?.message === 'string') return body.message
  return ''
}

async function request<T>(method: 'GET' | 'POST', path: string, params: Record<string, unknown>, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new MaintenanceWorkError('Could not reach the server.', 0)
  }

  if (!response.ok) {
    let detail = ''
    try {
      detail = errorText(await response.json())
    } catch {
      /* non-JSON error body */
    }
    if (response.status === 401) throw new MaintenanceWorkError('Your session has expired.', 401)
    if (response.status === 403) {
      throw new MaintenanceWorkError(detail || 'You do not have access to this.', 403)
    }
    if (response.status === 404) throw new MaintenanceWorkError('Work order not found.', 404)
    throw new MaintenanceWorkError(detail || `Request failed (${response.status}).`, response.status)
  }
  return (await response.json()) as T
}

const enc = encodeURIComponent

export const maintenanceWorkApi = {
  list({ company, ...params }: WorkOrderListParams): Promise<WorkOrderListResponse> {
    return request('GET', '/work-orders', { company, ...params })
  },

  get(id: string, company: string): Promise<WorkOrderDetail> {
    return request('GET', `/work-orders/${enc(id)}`, { company })
  },

  /** Pick the work order up for review. Status stays PENDING_QC. */
  acknowledge(id: string, company: string): Promise<WorkOrderDetail> {
    return request('POST', `/work-orders/${enc(id)}/qc/acknowledge`, { company })
  },

  /** Close it: machine back in service, next PM cycle scheduled. */
  approve(id: string, company: string, notes: string): Promise<WorkOrderDetail> {
    return request('POST', `/work-orders/${enc(id)}/qc/approve`, { company }, { notes })
  },

  /** Send it back to the maintenance supervisor. `notes` is required. */
  disapprove(id: string, company: string, notes: string): Promise<WorkOrderDetail> {
    return request('POST', `/work-orders/${enc(id)}/qc/disapprove`, { company }, { notes })
  },
}

/* ---------------------------------------------------------------------------
 * Status vocabulary. The work order walks
 *   NOTIFIED → ACKNOWLEDGED → IN_PROGRESS → SUBMITTED → (supervisor) →
 *   PENDING_QC → (QC) → CLOSED
 * and QC only acts at PENDING_QC. The tabs group everything else by who holds it.
 * ------------------------------------------------------------------------- */

export const AWAITING_QC = 'PENDING_QC'

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  NOTIFIED: 'Notified',
  ACKNOWLEDGED: 'Acknowledged',
  IN_PROGRESS: 'In progress',
  SUBMITTED: 'With supervisor',
  SUPERVISOR_APPROVED: 'Supervisor approved',
  PENDING_QC: 'Awaiting QC',
  QC_APPROVED: 'QC approved',
  CLOSED: 'Closed',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
}

export const STATUS_STYLES: Record<string, string> = {
  PENDING_QC: 'bg-warning-50 text-warning-700',
  CLOSED: 'bg-success-50 text-success-700',
  QC_APPROVED: 'bg-success-50 text-success-700',
  OVERDUE: 'bg-danger-50 text-danger-700',
  CANCELLED: 'bg-cream-200 text-ink-400',
}

export interface StatusTab {
  key: string
  label: string
  /** Comma-separated statuses sent to the API; empty = all. */
  statuses: string
}

export const STATUS_TABS: StatusTab[] = [
  { key: 'awaiting', label: 'Awaiting QC', statuses: AWAITING_QC },
  {
    key: 'maintenance',
    label: 'With maintenance',
    statuses: 'DRAFT,NOTIFIED,ACKNOWLEDGED,IN_PROGRESS,SUBMITTED,SUPERVISOR_APPROVED,OVERDUE',
  },
  { key: 'closed', label: 'Closed', statuses: 'CLOSED,QC_APPROVED' },
  { key: 'all', label: 'All', statuses: '' },
]

export function tabCount(tab: StatusTab, counts: Record<string, number>): number {
  if (!tab.statuses) return Object.values(counts).reduce((a, b) => a + b, 0)
  return tab.statuses.split(',').reduce((sum, s) => sum + (counts[s] || 0), 0)
}

export function statusLabel(status: string | null | undefined): string {
  if (!status) return '—'
  return STATUS_LABELS[status] || status.replace(/_/g, ' ').toLowerCase()
}

/* ---------------------------------------------------------------------------
 * IST formatting — the plants and the people are in India, and epoch-ms must
 * not drift by the viewer's browser timezone.
 * ------------------------------------------------------------------------- */

const IST_TZ = 'Asia/Kolkata'

function istParts(ms: number | null | undefined): Record<string, string> | null {
  if (ms === null || ms === undefined) return null
  const date = new Date(ms)
  if (isNaN(date.getTime())) return null
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: IST_TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(date)
  return parts.reduce<Record<string, string>>((acc, p) => {
    acc[p.type] = p.value
    return acc
  }, {})
}

/** "23 Sep 2026" (IST). */
export function formatIstDate(ms: number | null | undefined): string {
  const p = istParts(ms)
  return p ? `${p.day} ${p.month} ${p.year}` : '—'
}

/** "23 Sep 2026, 4:12 PM" (IST). */
export function formatIstDateTime(ms: number | null | undefined): string {
  const p = istParts(ms)
  return p ? `${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute} ${p.dayPeriod}` : '—'
}

/** "3 h" / "2 d" since `ms` — how long something has been waiting. */
export function waitingFor(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—'
  const minutes = Math.max(0, Math.round((Date.now() - ms) / 60000))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours} h`
  return `${Math.round(hours / 24)} d`
}
