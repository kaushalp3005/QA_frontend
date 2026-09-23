/**
 * Complaint Calls — the AI voice agent's call log.
 *
 * Backed by the Sarvam module in the FactoryOps platform backend
 * (GET /api/sarvam/calls | /calls/{id} | /stats), restricted to QC super-admins
 * and authenticated with the ordinary QC access token.
 *
 * WHY THIS MODULE ATTACHES THE TOKEN ITSELF
 * -----------------------------------------
 * components/FetchInterceptor.tsx adds the Authorization header only to
 * requests whose ORIGIN matches NEXT_PUBLIC_API_BASE_URL. In development that
 * is http://localhost:8001 while these endpoints live on the Lambda, so those
 * requests are cross-origin and the interceptor deliberately skips them —
 * silently, as a 401 with no retry. So we set the header here (the interceptor
 * leaves an existing one untouched, so nothing is done twice) and reuse the
 * SAME single-flight refresh + force-logout path, rather than inventing a
 * second auth flow.
 */
import { getAuthToken, getFreshAccessToken, refreshTokens } from '@/lib/api/auth'

const SARVAM_BASE =
  process.env.NEXT_PUBLIC_SARVAM_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:8000'

const PREFIX = '/api/sarvam'

/** This section is the QUALITY team's view of the call log. */
export const QUALITY_INTENT = 'quality'

export type SummaryStatus = 'ready' | 'pending' | 'failed' | 'skipped'

export interface TranscriptTurn {
  role: string // 'agent' | 'user'
  en_text?: string | null
  indic_text?: string | null
}

export interface CallListItem {
  interaction_id: string
  started_at: string | null
  ended_at: string | null
  duration_seconds: number | null
  /** The REAL caller, asked for by the agent. Often absent — see CallDetail.gateway_number. */
  caller_mobile: string | null
  caller_name: string | null
  intent: string | null
  disposition: string | null
  transferred_to: string | null
  is_safety_issue: boolean | null
  summary: string | null
  summary_status: SummaryStatus
}

export interface CallDetail extends CallListItem {
  app_id?: string | null
  app_version?: number | null
  deployment_id?: string | null
  /** Telephony gateway (Knowlarity), identical on every call. NEVER the caller. */
  gateway_number?: string | null
  agent_phone_number?: string | null
  end_reason?: string | null
  summary_source?: string | null
  summary_attempts?: number
  transcript?: TranscriptTurn[] | null
  output_variables?: Record<string, unknown> | null
  final_variables?: Record<string, unknown> | null
  recording_url?: string | null
  received_count?: number
  created_at?: string | null
  updated_at?: string | null
}

export interface CallListResponse {
  items: CallListItem[]
  total: number
  page: number
  page_size: number
}

export interface CallStats {
  total_calls: number
  transferred: number
  safety_issues: number
  avg_duration_seconds: number | null
  by_intent: Record<string, number>
  by_disposition: Record<string, number>
}

export interface CallListParams {
  page?: number
  page_size?: number
  from?: string // YYYY-MM-DD, IST
  to?: string // YYYY-MM-DD, IST
  disposition?: string
  safety_only?: boolean
  q?: string
}

export class CallsApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'CallsApiError'
    this.status = status
  }
}

function buildUrl(path: string, params: Record<string, unknown> = {}): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.append(key, String(value))
  })
  const qs = search.toString()
  return `${SARVAM_BASE}${PREFIX}${path}${qs ? `?${qs}` : ''}`
}

async function authedFetch(url: string): Promise<Response> {
  const token = await getFreshAccessToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(url, { method: 'GET', headers })
  if (response.status !== 401) return response

  // One silent refresh, then replay — the same rule the global interceptor
  // follows. Refresh tokens rotate, so never more than one.
  const refreshed = await refreshTokens()
  if (!refreshed) {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('force-logout'))
    return response
  }
  const fresh = getAuthToken()
  return fetch(url, {
    method: 'GET',
    headers: { ...headers, ...(fresh ? { Authorization: `Bearer ${fresh}` } : {}) },
  })
}

async function request<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  let response: Response
  try {
    response = await authedFetch(buildUrl(path, params))
  } catch {
    // Network error, DNS failure, CORS rejection — never a useful raw message.
    throw new CallsApiError('Could not reach the call-log service.', 0)
  }

  if (!response.ok) {
    if (response.status === 401) throw new CallsApiError('Your session has expired.', 401)
    if (response.status === 403) {
      throw new CallsApiError('You do not have access to call logs.', 403)
    }
    if (response.status === 404) throw new CallsApiError('Call not found.', 404)
    let detail = ''
    try {
      const body = await response.json()
      detail = typeof body?.detail === 'string' ? body.detail : ''
    } catch {
      /* non-JSON error body */
    }
    throw new CallsApiError(detail || `Request failed (${response.status}).`, response.status)
  }
  return (await response.json()) as T
}

export const complaintCallsApi = {
  /** Quality calls. `include_safety` also returns safety-issue calls the agent
   *  classified as something else — a safety report must never be hidden by a
   *  misclassified intent. */
  list(params: CallListParams = {}): Promise<CallListResponse> {
    return request<CallListResponse>('/calls', {
      ...params,
      intent: QUALITY_INTENT,
      include_safety: true,
    })
  },

  /** Full record. The backend generates a missing summary during this request,
   *  which can take up to ~15 s. */
  get(interactionId: string): Promise<CallDetail> {
    return request<CallDetail>(`/calls/${encodeURIComponent(interactionId)}`)
  },

  stats(params: { from?: string; to?: string } = {}): Promise<CallStats> {
    return request<CallStats>('/stats', {
      ...params,
      intent: QUALITY_INTENT,
      include_safety: true,
    })
  },
}

/* ---------------------------------------------------------------------------
 * IST formatting.
 *
 * The backend returns ISO 8601 in UTC and interprets the from/to filters as IST
 * calendar dates. lib/date-utils.ts formats in the BROWSER's timezone, which is
 * right for the rest of the app but wrong here: a call at 00:30 IST must not
 * read as the previous day for someone abroad. These helpers pin Asia/Kolkata,
 * and stay local to this section rather than changing the shared helper.
 * ------------------------------------------------------------------------- */

const IST_TZ = 'Asia/Kolkata'

function istParts(value: string | null | undefined): Record<string, string> | null {
  if (!value) return null
  const date = new Date(value)
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

/** "23 Sep, 4:12 PM" (IST). */
export function formatIstDateTime(value: string | null | undefined): string {
  const p = istParts(value)
  if (!p) return '—'
  return `${p.day} ${p.month}, ${p.hour}:${p.minute} ${p.dayPeriod}`
}

/** "23 Sep 2026, 4:12 PM IST" — for the detail header. */
export function formatIstDateTimeLong(value: string | null | undefined): string {
  const p = istParts(value)
  if (!p) return '—'
  return `${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute} ${p.dayPeriod} IST`
}

/** Seconds -> m:ss. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(Number(seconds))) return '—'
  const total = Math.max(0, Math.round(Number(seconds)))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/** Today in IST as YYYY-MM-DD. en-CA yields exactly that shape. */
export function todayIst(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** `days` days before today, in IST, as YYYY-MM-DD. */
export function istDaysAgo(days: number): string {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

export const DISPOSITIONS = [
  { value: '', label: 'All outcomes' },
  { value: 'transferred', label: 'Transferred' },
  { value: 'callback_requested', label: 'Callback requested' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'abandoned', label: 'Abandoned' },
]

/** Callback requests are the ones a human still has to act on. */
export const DISPOSITION_STYLES: Record<string, string> = {
  transferred: 'bg-success-50 text-success-700',
  callback_requested: 'bg-warning-50 text-warning-700',
  resolved: 'bg-cream-200 text-ink-500',
  abandoned: 'bg-danger-50 text-danger-700',
}

export function prettyLabel(value: string | null | undefined): string {
  if (!value) return '—'
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
