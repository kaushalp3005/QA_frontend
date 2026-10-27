'use client'

import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react'
import { getMtSession, type MtSession } from './client'

/** Load data on mount / when deps change. `reload()` re-runs it; `setData`
 *  lets a page patch the cached value after a mutation. A stale response
 *  (deps changed mid-flight) is dropped. */
export function useMtQuery<T>(fn: () => Promise<T>, deps: DependencyList = []) {
  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const seq = useRef(0)

  const run = useCallback(async () => {
    const id = ++seq.current
    setLoading(true)
    setError(null)
    try {
      const result = await fn()
      if (id === seq.current) setData(result)
    } catch (e: any) {
      if (id === seq.current) setError(e?.message || 'Something went wrong')
    } finally {
      if (id === seq.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    run()
  }, [run])

  return { data, error, loading, reload: run, setData }
}

/** Re-run `fn` every `ms` while the tab is visible (live lists). */
export function usePolling(fn: () => void, ms: number) {
  const saved = useRef(fn)
  saved.current = fn
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') saved.current()
    }, ms)
    return () => clearInterval(t)
  }, [ms])
}

/** The signed-in maintenance user. Pages render inside MtGuard, so this is
 *  non-null there; it is null only during the first client render. */
export function useMtSession(): MtSession | null {
  const [session, setSession] = useState<MtSession | null>(null)
  useEffect(() => {
    setSession(getMtSession())
  }, [])
  return session
}
