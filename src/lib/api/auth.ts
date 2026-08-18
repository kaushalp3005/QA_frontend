/**
 * Authentication utilities.
 *
 * The backend now issues a SHORT-LIVED access token (15 min) plus a rotating
 * refresh token (7 days). That changes two things here:
 *
 *   1. `isAuthenticated()` reads the token's `exp` instead of just checking
 *      that a string exists in localStorage. The old check treated a token
 *      that expired days ago as a valid session, so the app rendered, fired a
 *      request, got a 401 and bounced to /login — a broken-looking flash.
 *
 *   2. `refreshTokens()` exists and is driven by FetchInterceptor, so a
 *      15-minute access token is invisible to the user.
 *
 * Every previously exported name is preserved — AuthGuard, Sidebar,
 * ModuleGuard, DashboardLayout and six pages import from here.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

const ACCESS_KEY = 'access_token'
const REFRESH_KEY = 'refresh_token'
const USER_KEY = 'user'
const COMPANY_KEY = 'company'
// Refresh this many seconds BEFORE expiry, so a request never leaves with a
// token that dies in flight.
const EXPIRY_SKEW_SECONDS = 30

export interface LoginCredentials {
  email: string
  password: string
}

export interface User {
  id: string
  email: string
  name?: string
  is_super_admin?: boolean
  is_developer?: boolean
  created_at?: string
  last_login?: string | null
}

export interface LoginResponse {
  access_token: string
  refresh_token?: string
  token_type: string
  expires_in?: number
  refresh_expires_in?: number
  must_change_password?: boolean
  email: string
  companies: Array<{ code: string; name: string; role: string }>
  permissions?: Record<string, Record<string, boolean>>
  user?: User
}

export interface ChangePasswordData {
  current_password: string
  new_password: string
}

/** Decode a JWT payload without verifying it. Read-only convenience — the
 *  server is the only thing that decides whether a token is valid. */
function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
}

/** Seconds until the access token expires. Negative when already expired,
 *  and 0 when the token is unreadable (treat as needing a refresh). */
export function secondsUntilExpiry(token?: string | null): number {
  const t = token ?? getAuthToken()
  if (!t) return -1
  const payload = decodeJwt(t)
  const exp = payload && typeof payload.exp === 'number' ? (payload.exp as number) : null
  if (!exp) return 0
  return Math.floor(exp - Date.now() / 1000)
}

export function accessTokenIsFresh(): boolean {
  return secondsUntilExpiry() > EXPIRY_SKEW_SECONDS
}

/** Login. Persists both tokens plus the permissions the server sends back,
 *  so the first paint already knows what the user may do. */
export async function login(
  credentials: LoginCredentials,
  company: 'CDPL' | 'CFPL',
): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', company },
    body: JSON.stringify({ ...credentials, company }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error?.detail?.message || error?.detail || error?.message || 'Login failed')
  }

  const data: LoginResponse = await response.json()
  if (typeof window !== 'undefined') {
    localStorage.setItem(ACCESS_KEY, data.access_token)
    if (data.refresh_token) localStorage.setItem(REFRESH_KEY, data.refresh_token)
    localStorage.setItem(USER_KEY, JSON.stringify(data))
    if (data.permissions) localStorage.setItem('permissions', JSON.stringify(data.permissions))
  }
  return data
}

/**
 * Exchange the refresh token for a new pair.
 *
 * Single-flight: concurrent callers share one in-flight request. Without this,
 * ten parallel 401s would fire ten refreshes — and because refresh tokens
 * ROTATE, nine of them would present an already-spent token, which the server
 * correctly treats as theft and answers by revoking the whole session.
 * Refreshing in parallel would log the user out.
 */
let inFlight: Promise<boolean> | null = null

export function refreshTokens(): Promise<boolean> {
  if (inFlight) return inFlight

  inFlight = (async () => {
    if (typeof window === 'undefined') return false
    const refresh_token = localStorage.getItem(REFRESH_KEY)
    if (!refresh_token) return false

    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token }),
      })
      if (!res.ok) {
        // Includes token_reuse_detected and session_expired — both mean the
        // session is over and the only correct move is a fresh login.
        clearTokens()
        return false
      }
      const data = await res.json()
      localStorage.setItem(ACCESS_KEY, data.access_token)
      if (data.refresh_token) localStorage.setItem(REFRESH_KEY, data.refresh_token)
      return true
    } catch {
      // A network failure is NOT an auth failure — keep the tokens so the user
      // is still signed in when connectivity returns.
      return false
    } finally {
      inFlight = null
    }
  })()

  return inFlight
}

/** A valid access token, refreshing first if it is about to expire.
 *  Returns null when the session is over. */
export async function getFreshAccessToken(): Promise<string | null> {
  if (accessTokenIsFresh()) return getAuthToken()
  const ok = await refreshTokens()
  return ok ? getAuthToken() : null
}

export async function changePassword(
  passwordData: ChangePasswordData,
  token: string,
  company: 'CDPL' | 'CFPL',
): Promise<{ message: string; success?: boolean }> {
  const response = await fetch(`${API_BASE_URL}/auth/password/change`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      company,
    },
    body: JSON.stringify(passwordData),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error?.detail?.message || error?.detail || 'Password change failed')
  }
  return response.json()
}

/** Request an emailed reset code. The response is identical whether or not
 *  the address is registered, so never imply otherwise in the UI. */
export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/password/reset/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error?.detail?.message || 'Could not send the reset code')
  }
  return res.json()
}

export async function confirmPasswordReset(payload: {
  email: string
  otp: string
  new_password: string
}): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/password/reset/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error?.detail?.message || 'That code is invalid or has expired')
  }
  return res.json()
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REFRESH_KEY)
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function getStoredCompany(): 'CDPL' | 'CFPL' {
  if (typeof window === 'undefined') return 'CDPL'
  return (localStorage.getItem(COMPANY_KEY) as 'CDPL' | 'CFPL') || 'CDPL'
}

function clearTokens(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

/** Tell the server to revoke this session, then clear local state.
 *  Fire-and-forget: local logout must succeed even if the call fails. */
export function logout(): void {
  if (typeof window === 'undefined') return
  const access = localStorage.getItem(ACCESS_KEY)
  const refresh = localStorage.getItem(REFRESH_KEY)
  if (access && refresh) {
    fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access}` },
      body: JSON.stringify({ refresh_token: refresh }),
      keepalive: true,
    }).catch(() => {})
  }
  clearTokens()
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(COMPANY_KEY)
  localStorage.removeItem('permissions')
}

/**
 * Signed in?
 *
 * True when the access token is still valid, OR when it has expired but a
 * refresh token remains — the interceptor will silently renew on the next
 * call. Returning false in that second case would bounce the user to /login
 * every time they left a tab open for 15 minutes.
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  if (!getAuthToken()) return false
  if (secondsUntilExpiry() > 0) return true
  return !!getRefreshToken()
}
