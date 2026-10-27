'use client'

import { Suspense, useCallback, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { useMtQuery, useMtSession, usePolling } from '@/lib/maintenance/hooks'
import { plantLabel } from '@/lib/maintenance/format'
import { MT } from '@/lib/maintenance/nav'
import type { MtSession } from '@/lib/maintenance/client'
import { loadQcInbox, type QcInboxRow } from '@/lib/maintenance/api/qcInbox'
import { Button, EmptyState, ErrorBanner, PageHeader, SkeletonRows, Tabs } from '@/components/maintenance/ui'
import { QcInboxCard, qcRoleLabel, type QcTab } from '@/components/maintenance/qc/QcBits'

const TABS: QcTab[] = ['awaiting', 'active', 'done', 'history']
const LABEL: Record<QcTab, string> = {
  awaiting: 'Awaiting QC',
  active: 'My Active',
  done: 'Done today',
  history: 'History',
}
const EMPTY: Record<QcTab, string> = {
  awaiting: 'No tickets waiting for QC.',
  active: 'You have no active QC items.',
  done: 'Nothing decided today.',
  history: "You haven't decided anything yet.",
}

/** Live QC inbox (QcHomeScreen) — breakdowns and PM work orders side by side. */
export default function QcVerificationPage() {
  return (
    <Suspense fallback={<SkeletonRows />}>
      <QcVerification />
    </Suspense>
  )
}

function QcVerification() {
  const session = useMtSession()
  if (!session) return null
  return <Inbox session={session} />
}

function Inbox({ session }: { session: MtSession }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const raw = params.get('tab') as QcTab | null
  const tab: QcTab = raw && TABS.includes(raw) ? raw : 'awaiting'
  const setTab = (t: QcTab) => router.replace(t === 'awaiting' ? pathname : `${pathname}?tab=${t}`, { scroll: false })

  const { data, error, loading, reload } = useMtQuery(() => loadQcInbox(session), [session.userId])
  const [now, setNow] = useState(Date.now())
  const refresh = useCallback(() => {
    setNow(Date.now())
    reload()
  }, [reload])
  // Live list: the Android inbox is fed by Room + push; poll instead.
  usePolling(refresh, 60_000)

  const lists: Record<QcTab, QcInboxRow[]> = {
    awaiting: data?.awaiting ?? [],
    active: data?.myActive ?? [],
    done: data?.doneToday ?? [],
    history: data?.history ?? [],
  }
  const rows = lists[tab]

  return (
    <>
      <PageHeader
        title="QC Verification"
        subtitle={`${session.name} — ${qcRoleLabel(session.role)} — ${plantLabel(session.plantId)}`}
        back={MT.qc}
        actions={
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={refresh} loading={loading && !!data}>
            Refresh
          </Button>
        }
      />

      <Tabs
        tabs={TABS.map((id) => ({ id, label: LABEL[id], count: data && lists[id].length > 0 ? lists[id].length : undefined }))}
        value={tab}
        onChange={setTab}
      />

      <ErrorBanner error={error} onRetry={refresh} />
      {data && data.warnings.length > 0 && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          Some lists couldn&apos;t be loaded and may be incomplete: {data.warnings.join('; ')}
        </p>
      )}

      {loading && !data ? (
        <SkeletonRows rows={4} />
      ) : !data ? null : rows.length === 0 ? (
        <EmptyState title={EMPTY[tab]} />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {rows.map((row) => (
            <QcInboxCard
              key={`${row.kind}-${row.id}`}
              row={row}
              tab={tab}
              now={now}
              href={row.kind === 'BD' ? MT.qcTicket(row.id) : MT.qcPm(row.id)}
            />
          ))}
        </div>
      )}
    </>
  )
}
