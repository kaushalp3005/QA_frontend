'use client'

import { CheckCircle2 } from 'lucide-react'
import { EmptyState, ErrorBanner, PageHeader, Section, SkeletonRows } from '@/components/maintenance/ui'
import { QcCard } from '@/components/maintenance/head/FlagCard'
import { useMtQuery, useMtSession, usePolling } from '@/lib/maintenance/hooks'
import { plantLabel } from '@/lib/maintenance/format'
import { MT } from '@/lib/maintenance/nav'
import { SEVEN_DAYS_MS, headBreakdowns, headQc, stampMs, type HeadBreakdown } from '@/lib/maintenance/api/head'

/** Head › QC Activity: awaiting QC + decided in the last 7 days (HeadQcScreen.kt).
 *  Awaiting comes from GET /head/qc; decided is every row of /head/qc or
 *  /head/breakdowns (open + closed-in-7-days) that carries a QC decision. */
export default function HeadQcPage() {
  const session = useMtSession()
  const { data, error, loading, reload } = useMtQuery(async () => {
    const [qc, bds] = await Promise.all([headQc(), headBreakdowns().catch(() => [] as HeadBreakdown[])])
    return { qc, bds }
  }, [])
  usePolling(reload, 60_000)

  const since = Date.now() - SEVEN_DAYS_MS
  const awaiting = (data?.qc ?? []).filter((f) => {
    const st = f.status?.toUpperCase()
    return st ? st === 'PENDING_QC' : !f.qc_decided_at
  })
  const seen = new Set<string>()
  const decided = [...(data?.qc ?? []), ...(data?.bds ?? [])]
    .filter((f) => {
      const at = stampMs(f.qc_decided_at)
      if (!f.qc_status || at === null || at < since || seen.has(f.id)) return false
      seen.add(f.id)
      return true
    })
    .sort((a, b) => (stampMs(b.qc_decided_at) ?? 0) - (stampMs(a.qc_decided_at) ?? 0))

  return (
    <>
      <PageHeader title="QC Activity" subtitle="Pending & recently decided QC" back={MT.head} />
      <ErrorBanner error={error} onRetry={reload} />
      {loading && !data ? (
        <SkeletonRows rows={5} />
      ) : error && !data ? null : awaiting.length === 0 && decided.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title={`No QC activity for ${session?.plantId ? plantLabel(session.plantId) : 'your plant'}.`}
        />
      ) : (
        <>
          {awaiting.length > 0 && (
            <Section title={`Awaiting QC (${awaiting.length})`}>
              <div className="grid gap-2 lg:grid-cols-2">
                {awaiting.map((f) => (
                  <QcCard key={`a-${f.id}`} flag={f} decided={false} />
                ))}
              </div>
            </Section>
          )}
          {decided.length > 0 && (
            <Section title={`Decided · last 7 days (${decided.length})`}>
              <div className="grid gap-2 lg:grid-cols-2">
                {decided.map((f) => (
                  <QcCard key={`d-${f.id}`} flag={f} decided />
                ))}
              </div>
            </Section>
          )}
        </>
      )}
    </>
  )
}
