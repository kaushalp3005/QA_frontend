'use client'

import { useEffect } from 'react'
import { refreshTokens, getAuthToken } from '@/lib/api/auth'

/**
 * Global fetch wrapper that makes the 15-minute access token invisible.
 *
 * On a 401 it tries ONE silent refresh and replays the original request.
 * Only if the refresh itself fails does it fire `force-logout` (AuthGuard
 * listens for that and bounces to /login).
 *
 * Two rules this has to respect, both of which will log users out if broken:
 *
 *   1. Refresh ONCE per request. A retry loop would present a rotated token
 *      repeatedly; the server treats a spent refresh token as theft and
 *      revokes the whole session.
 *
 *   2. Never refresh for the auth endpoints themselves. A 401 from /auth/login
 *      is "wrong password", and a 401 from /auth/refresh is "session over" —
 *      retrying either is meaningless, and retrying /auth/refresh is exactly
 *      the double-spend in rule 1.
 *
 * Concurrency is handled inside refreshTokens(), which is single-flight: ten
 * simultaneous 401s await one refresh, then each replays its own request.
 */
export default function FetchInterceptor() {
  useEffect(() => {
    const originalFetch = window.fetch

    const urlOf = (input: RequestInfo | URL): string => {
      if (typeof input === 'string') return input
      if (input instanceof URL) return input.toString()
      return (input as Request).url
    }

    /** Swap in the newly minted access token before replaying. */
    const withFreshToken = (init: RequestInit | undefined): RequestInit | undefined => {
      const token = getAuthToken()
      if (!token) return init
      const headers = new Headers(init?.headers || {})
      if (headers.has('Authorization') || headers.has('authorization')) {
        headers.set('Authorization', `Bearer ${token}`)
        return { ...init, headers }
      }
      return init
    }

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await originalFetch(input, init)
      if (response.status !== 401) return response

      const url = urlOf(input)
      const isAuthEndpoint =
        url.includes('/auth/login') ||
        url.includes('/auth/refresh') ||
        url.includes('/auth/password/reset')
      // IPQC routes carry their own 401 handling and must not tear down the
      // complaint-module session.
      const isIPQC =
        url.includes('/qc/ipqc') ||
        url.includes('/qc/dropdown') ||
        url.includes('/qc/factories') ||
        url.includes('/qc/floors')

      if (isAuthEndpoint || isIPQC) return response

      // A Request object's body is already consumed by the first attempt, so
      // it cannot be replayed. Callers passing (url, init) — which is all of
      // this app's api/* modules — replay fine.
      const canReplay = typeof input === 'string' || input instanceof URL

      const refreshed = await refreshTokens()
      if (!refreshed) {
        window.dispatchEvent(new Event('force-logout'))
        return response
      }
      if (!canReplay) return response

      return originalFetch(input, withFreshToken(init))
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  return null
}
