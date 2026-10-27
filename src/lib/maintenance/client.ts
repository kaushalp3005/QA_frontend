/**
 * Maintenance system — transport + session.
 *
 * The maintenance backend is a separate service from the QC backend (AWS API
 * Gateway, stage /maintenance) with its own users table (mt_users) and its
 * own JWT. Every call carries "Authorization: Bearer <token>"; FetchInterceptor
 * only touches the QC origin, so it never interferes with these requests.
 *
 * Ported from the Android app (FactoryOps): NetworkModule + AuthPreferences.
 * Wire format is snake_case. Times are epoch-ms UTC unless a module says
 * otherwise (the /head/* views use ISO-8601 strings).
 */

export const MT_API_BASE = (
  process.env.NEXT_PUBLIC_MAINTENANCE_API_URL ||
  'https://cau0qqgw2h.execute-api.ap-south-1.amazonaws.com/maintenance'
).replace(/\/+$/, '')

const SESSION_KEY = 'mt_session'

export type MtRole =
  | 'OPERATOR'
  | 'TECHNICIAN'
  | 'HEAD'
  | 'QC_HEAD'
  | 'QC_MEMBER'
  | 'SUPERVISOR'
  | 'ADMIN'
  | 'IT_TECHNICIAN'

export interface MtSession {
  token: string
  userId: string
  name: string
  username: string
  /** Raw mt_users.role as the backend sent it */
  rawRole: string
  role: MtRole
  /** W202 | A185 | both — mt_users.location */
  plantId: string
  /** epoch ms */
  expiresAt: number
}

/** mt_users.role → role. Same table as parseUserRole() in the Android app:
 *  unknown values fall to OPERATOR, the least-privileged screen. */
export function parseMtRole(raw: string): MtRole {
  switch (raw.trim().toUpperCase()) {
    case 'TECHNICIAN':
      return 'TECHNICIAN'
    case 'HEAD':
      return 'HEAD'
    case 'QC':
    case 'QC_HEAD':
      return 'QC_HEAD'
    case 'QC_MEMBER':
    case 'QC-A185':
    case 'QC_A185':
    case 'QCA185':
    case 'QC-W202':
    case 'QC_W202':
    case 'QCW202':
      return 'QC_MEMBER'
    case 'SUPERVISOR':
      return 'SUPERVISOR'
    case 'ADMIN':
      return 'ADMIN'
    case 'IT_TECHNICIAN':
    case 'IT TECHNICIAN':
    case 'IT':
      return 'IT_TECHNICIAN'
    default:
      return 'OPERATOR'
  }
}

export const ROLE_LABEL: Record<MtRole, string> = {
  OPERATOR: 'Operator',
  TECHNICIAN: 'Technician',
  HEAD: 'Head',
  QC_HEAD: 'QC Head',
  QC_MEMBER: 'QC',
  SUPERVISOR: 'Supervisor',
  ADMIN: 'Admin',
  IT_TECHNICIAN: 'IT Technician',
}

export const isQcRole = (role: MtRole) => role === 'QC_HEAD' || role === 'QC_MEMBER'

// ── Session ──────────────────────────────────────────────────────────────

export function getMtSession(): MtSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as MtSession
    if (!s.token || (s.expiresAt && s.expiresAt <= Date.now())) return null
    return s
  } catch {
    return null
  }
}

export function clearMtSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(SESSION_KEY)
}

/** POST /auth/login → { token, user_id, name, role, plant_id, expires_at } */
export async function mtLogin(username: string, password: string): Promise<MtSession> {
  const data = await mtFetch<{
    token: string
    user_id: string | number
    name: string
    role: string
    plant_id: string
    expires_at?: number | string | null
  }>('/auth/login', { method: 'POST', body: { username, password }, auth: false })

  const exp = Number(data.expires_at)
  const session: MtSession = {
    token: data.token,
    userId: String(data.user_id),
    name: data.name,
    username,
    rawRole: data.role,
    role: parseMtRole(data.role),
    plantId: data.plant_id,
    // Backend sends login + 8h; fall back to the same window if it is missing.
    expiresAt: Number.isFinite(exp) && exp > 0 ? exp : Date.now() + 8 * 3600_000,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export function mtLogout(): void {
  clearMtSession()
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('mt-logout'))
}

// ── Fetch ────────────────────────────────────────────────────────────────

export class MtApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown,
  ) {
    super(message)
  }
}

type Query = Record<string, string | number | boolean | null | undefined>

export interface MtFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** JSON-encoded unless it is FormData */
  body?: unknown
  query?: Query
  /** false for /auth/login only */
  auth?: boolean
  /** Return the raw Response (file downloads) */
  raw?: boolean
}

function errorText(body: any, fallback: string): string {
  const d = body?.detail ?? body?.message ?? body?.error
  if (typeof d === 'string') return d
  // FastAPI validation errors: [{loc, msg}]
  if (Array.isArray(d) && d[0]?.msg) return d.map((e: any) => e.msg).join('; ')
  return fallback
}

export async function mtFetch<T = unknown>(path: string, opts: MtFetchOptions = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true, raw = false } = opts

  const url = new URL(MT_API_BASE + (path.startsWith('/') ? path : `/${path}`))
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
  }

  const headers: Record<string, string> = {}
  if (auth) {
    const s = getMtSession()
    if (!s) {
      mtLogout()
      throw new MtApiError('Your session has ended. Please sign in again.', 401, null)
    }
    headers.Authorization = `Bearer ${s.token}`
  }
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(url.toString(), {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    })
  } catch {
    throw new MtApiError("Can't reach the maintenance server. Check your connection and try again.", 0, null)
  }

  if (res.status === 401 && auth) {
    mtLogout()
    throw new MtApiError('Your session has ended. Please sign in again.', 401, null)
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => null)
    throw new MtApiError(
      errorText(
        errBody,
        res.status >= 500 ? 'The maintenance server had a problem. Please try again.' : `Request failed (${res.status})`,
      ),
      res.status,
      errBody,
    )
  }

  if (raw) return res as unknown as T
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}
