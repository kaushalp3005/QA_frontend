'use client'

import axios from 'axios'
import { refreshTokens, getFreshAccessToken, getAuthToken } from '@/lib/api/auth'

/**
 * Global fetch wrapper. Does two jobs, both of which have to be central.
 *
 * 1. ATTACHES the Authorization header to every request bound for our API.
 *
 *    Most of the api/* modules never sent one — they did not have to, because
 *    the old backend gate only inspected a token when a header was already
 *    present, so a request with no header skipped authentication entirely.
 *    Now that the gate fails closed, those modules would all 401. Adding the
 *    header here fixes every caller at once, including any added later, and
 *    means no module can forget.
 *
 *    Requests that already carry an Authorization header are left untouched.
 *
 * 2. RENEWS on 401: one silent refresh, then replay the original request.
 *    Only if the refresh itself fails does it fire `force-logout`, which
 *    AuthGuard listens for.
 *
 * WHY THE PATCH IS INSTALLED DURING RENDER AND NOT IN useEffect
 * -------------------------------------------------------------
 * This component sits in app/layout.tsx, and the pages under it fetch from
 * their own useEffect. React runs effects BOTTOM-UP — every child effect fires
 * before the parent's. So an effect here would install the patch AFTER the
 * first page had already fired its data request, and that first request of
 * every page would go out with no Authorization header and 401.
 *
 * Render order is the opposite: a parent renders before its children, so
 * installing here guarantees window.fetch is patched before any child renders,
 * let alone runs an effect.
 *
 * `installed` makes this idempotent, which is what keeps a side effect during
 * render safe under StrictMode's double-invoked render. The patch is never
 * removed: layout.tsx lives for the lifetime of the app, and restoring the
 * original fetch on unmount would only create a window where requests go out
 * unauthenticated.
 *
 * Two rules, both of which log users out if broken:
 *
 *   - Refresh at most ONCE per request. Refresh tokens rotate, so presenting
 *     a spent one is read by the server as theft and revokes the session.
 *   - Never attach or refresh for the auth endpoints themselves. A 401 from
 *     /auth/login means wrong password; from /auth/refresh it means the
 *     session is over. Retrying either is meaningless, and retrying
 *     /auth/refresh is exactly the double-spend above.
 *
 * Concurrency is handled inside refreshTokens(), which is single-flight.
 */

let installed = false

function installFetchInterceptor(): void {
  if (installed || typeof window === 'undefined') return
  installed = true

  const originalFetch = window.fetch
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

  // Resolve the API origin once. Anything not bound for it — Next.js chunks,
  // S3 uploads, the OpenAI proxy — must never receive our bearer token.
  let apiOrigin = ''
  try {
    apiOrigin = new URL(API_BASE, window.location.origin).origin
  } catch {
    apiOrigin = ''
  }

  const urlOf = (input: RequestInfo | URL): string => {
    if (typeof input === 'string') return input
    if (input instanceof URL) return input.toString()
    return (input as Request).url
  }

  const isOurApi = (url: string): boolean => {
    if (!apiOrigin) return false
    try {
      return new URL(url, window.location.origin).origin === apiOrigin
    } catch {
      return false
    }
  }

  const isAuthEndpoint = (url: string): boolean =>
    url.includes('/auth/login') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/password/reset')

  // IPQC routes carry their own 401 handling and must not tear down the
  // complaint-module session.
  const isIPQC = (url: string): boolean =>
    url.includes('/qc/ipqc') ||
    url.includes('/qc/dropdown') ||
    url.includes('/qc/factories') ||
    url.includes('/qc/floors')

  const headersFrom = (input: RequestInfo | URL, init?: RequestInit): Headers => {
    if (init?.headers) return new Headers(init.headers)
    if (typeof input !== 'string' && !(input instanceof URL)) {
      return new Headers((input as Request).headers)
    }
    return new Headers()
  }

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = urlOf(input)
    const ours = isOurApi(url)
    const authEndpoint = isAuthEndpoint(url)

    let effectiveInit = init

    // ── 1. attach ──
    if (ours && !authEndpoint) {
      const headers = headersFrom(input, init)
      if (!headers.has('Authorization') && !headers.has('authorization')) {
        // Renews first when the access token is inside its expiry skew, so a
        // request never leaves carrying a token that dies in flight.
        const token = await getFreshAccessToken()
        if (token) {
          headers.set('Authorization', `Bearer ${token}`)
          effectiveInit = { ...init, headers }
        }
      }
    }

    const response = await originalFetch(input, effectiveInit)
    if (response.status !== 401) return response

    // ── 2. renew on 401 ──
    if (authEndpoint || isIPQC(url)) return response

    // A Request object's body is consumed by the first attempt and cannot be
    // replayed. Every api/* module calls fetch(url, init), which replays fine.
    const canReplay = typeof input === 'string' || input instanceof URL

    const refreshed = await refreshTokens()
    if (!refreshed) {
      // No refresh token, or the session is genuinely over.
      window.dispatchEvent(new Event('force-logout'))
      return response
    }
    if (!canReplay) return response

    const retryHeaders = headersFrom(input, effectiveInit)
    const fresh = getAuthToken()
    if (fresh) retryHeaders.set('Authorization', `Bearer ${fresh}`)
    return originalFetch(input, { ...effectiveInit, headers: retryHeaders })
  }

  // ── axios ──
  // lib/api/settings.ts calls the bare `axios` default instance, which never
  // touches window.fetch, so the patch above cannot see it. Those calls DO
  // send a token already, but had no renewal path — with a 15-minute access
  // token that means the Settings screen simply starts failing. Registering on
  // the default instance covers every bare axios.* call.
  //
  // Note this does NOT cover instances made with axios.create(); those do not
  // inherit default-instance interceptors. lib/api-client.ts has its own, which
  // delegates to the same single-flight refreshTokens().
  axios.interceptors.request.use(async (config) => {
    const target = config.url || ''
    if (!isOurApi(target) || isAuthEndpoint(target)) return config
    const existing = (config.headers as any)?.Authorization ?? (config.headers as any)?.authorization
    if (existing) return config
    const token = await getFreshAccessToken()
    if (token) {
      config.headers = config.headers || {}
      ;(config.headers as any).Authorization = `Bearer ${token}`
    }
    return config
  })

  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const original = error?.config
      const target = original?.url || ''
      if (
        error?.response?.status !== 401 ||
        !original ||
        original._retried ||
        isAuthEndpoint(target) ||
        isIPQC(target)
      ) {
        return Promise.reject(error)
      }
      original._retried = true
      const refreshed = await refreshTokens()
      if (!refreshed) {
        window.dispatchEvent(new Event('force-logout'))
        return Promise.reject(error)
      }
      const fresh = getAuthToken()
      original.headers = original.headers || {}
      if (fresh) original.headers.Authorization = `Bearer ${fresh}`
      return axios.request(original)
    },
  )
}

// Runs during module evaluation on the client, which is earlier still than the
// first render. The guard inside makes the call from render a no-op.
installFetchInterceptor()

export default function FetchInterceptor() {
  installFetchInterceptor()
  return null
}
