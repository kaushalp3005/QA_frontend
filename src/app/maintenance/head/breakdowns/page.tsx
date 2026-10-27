'use client'

import { ShieldAlert } from 'lucide-react'
import { EmptyState, ErrorBanner, PageHeader, Section, SkeletonRows } from '@/components/maintenance/ui'
import { FlagCard } from '@/components/maintenance/head/FlagCard'
import { useMtQuery, useMtSession, usePolling } from '@/lib/maintenance/hooks'
import { plantLabel } from '@/lib/maintenance/format'
import { MT } from '@/lib/maintenance/nav'
import { SEVEN_DAYS_MS, flagRaisedAt, headBreakdowns, stampMs } from '@/lib/maintenance/api/head'

/** Head › Breakdowns: unresolved flags + those resolved in the last 7 days
 *  (HeadBreakdownsScreen.kt). Served by GET /head/breakdowns. */
export default function HeadBreakdownsPage() {
  const session = useMtSession()
  const { data, error, loading, reload } = useMtQuery(() => headBreakdowns(), [])
  usePolling(reload, 60_000)

  const rows = [...(data ?? [])].sort((a, b) => (stampMs(flagRaisedAt(b)) ?? 0) - (stampMs(flagRaisedAt(a)) ?? 0))
  // Unresolved = anything not CLOSED, so acknowledged / PENDING_QC tickets stay visible.
  const open = rows.filter((f) => f.status?.toUpperCase() !== 'CLOSED')
  const since = Date.now() - SEVEN_DAYS_MS
  const resolved = rows.filter((f) => {
    if (f.status?.toUpperCase() !== 'CLOSED') return false
    const at = stampMs(f.resolved_at)
    return at === null || at >= since
  })

  return (
    <>
      <PageHeader title="Breakdowns" subtitle="Active & recent breakdown flags" back={MT.head} />
      <ErrorBanner error={error} onRetry={reload} />
      {loading && !data ? (
        <SkeletonRows rows={5} />
      ) : error && !data ? null : open.length === 0 && resolved.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title={`No breakdowns for ${session?.plantId ? plantLabel(session.plantId) : 'your plant'}.`}
        />
      ) : (
        <>
          {open.length > 0 && (
            <Section title={`Active (${open.length})`}>
              <div className="grid gap-2 lg:grid-cols-2">
                {open.map((f) => (
                  <FlagCard key={f.id} flag={f} />
                ))}
              </div>
            </Section>
          )}
          {resolved.length > 0 && (
            <Section title={`Resolved · last 7 days (${resolved.length})`}>
              <div className="grid gap-2 lg:grid-cols-2">
                {resolved.map((f) => (
                  <FlagCard key={`r-${f.id}`} flag={f} />
                ))}
              </div>
            </Section>
          )}
        </>
      )}
    </>
  )
}
