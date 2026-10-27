'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getMtSession } from '@/lib/maintenance/client'
import { homePathFor } from '@/lib/maintenance/nav'
import { LoadingBlock } from '@/components/maintenance/ui'

/** Role router — the Android HomeRouterScreen. */
export default function MaintenanceHome() {
  const router = useRouter()
  useEffect(() => {
    const s = getMtSession()
    if (s) router.replace(homePathFor(s.role))
  }, [router])
  return <LoadingBlock />
}
