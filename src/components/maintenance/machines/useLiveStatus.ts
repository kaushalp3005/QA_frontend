'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePolling } from '@/lib/maintenance/hooks'
import {
  listActiveRuns,
  listOpenBreakdowns,
  type ActiveRunDto,
  type OpenBreakdownDto,
} from '@/lib/maintenance/api/machines'

export const LIVE_POLL_MS = 20_000

/**
 * Live overlay for the asset register: who is running what (GET /energy/runs/active)
 * and which assets have an unresolved breakdown (GET /breakdowns/open). Polled
 * while the tab is visible. A failed poll keeps the last good value, as the
 * Android view models do.
 */
export function useLiveStatus() {
  const [runs, setRuns] = useState<ActiveRunDto[]>([])
  const [open, setOpen] = useState<OpenBreakdownDto[]>([])
  const [loaded, setLoaded] = useState(false)
  const alive = useRef(true)

  const reload = useCallback(async () => {
    const [r, b] = await Promise.allSettled([listActiveRuns(), listOpenBreakdowns('both')])
    if (!alive.current) return
    if (r.status === 'fulfilled') setRuns(r.value ?? [])
    if (b.status === 'fulfilled') setOpen(b.value ?? [])
    setLoaded(true)
  }, [])

  useEffect(() => {
    alive.current = true
    reload()
    return () => {
      alive.current = false
    }
  }, [reload])

  usePolling(reload, LIVE_POLL_MS)

  return { runs, open, loaded, reload }
}
