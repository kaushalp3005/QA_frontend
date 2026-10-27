'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import clsx from 'clsx'
import { Badge, Card, EmptyState, ErrorBanner, PageHeader, SkeletonRows, type Tone } from '@/components/maintenance/ui'
import { signedQuantity, sparePartHistory } from '@/lib/maintenance/api/spareparts'
import { useMtQuery } from '@/lib/maintenance/hooks'
import { MT } from '@/lib/maintenance/nav'

/** Chip tone per log action; anything unknown (incl. legacy "Not specified") is grey. */
function actionTone(action: string): Tone {
  switch (action) {
    case 'Breakdown':
      return 'red'
    case 'PM Maintenance':
      return 'teal'
    case 'Replacement / Wear & Tear':
      return 'violet'
    case 'Restock':
      return 'blue'
    default:
      return 'gray'
  }
}

/** Read-only usage / restock log for one part, newest first (SparePartHistoryScreen). */
function SparePartHistory() {
  const partId = parseInt(useSearchParams().get('partId') ?? '', 10) || 0
  const { data, error, loading, reload } = useMtQuery(() => sparePartHistory(partId), [partId])
  const entries = data ?? []

  return (
    <>
      <PageHeader title="Usage History" back={MT.spareParts} />
      {loading ? (
        <SkeletonRows />
      ) : error ? (
        <ErrorBanner error={error} onRetry={reload} />
      ) : entries.length === 0 ? (
        <EmptyState title="No usage recorded yet." />
      ) : (
        <div className="space-y-2">
          {entries.map((e) => {
            const inbound = e.direction === 'IN'
            return (
              <Card key={e.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <Badge tone={actionTone(e.action)} className="normal-case !tracking-normal">
                    {e.action}
                  </Badge>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {[e.performed_at?.slice(0, 10), e.performed_by_name].filter(Boolean).join(' · ')}
                  </p>
                  {e.note?.trim() && <p className="text-sm text-zinc-800 dark:text-zinc-200">{e.note}</p>}
                </div>
                <span
                  className={clsx(
                    'text-xl font-bold tabular-nums',
                    inbound ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
                  )}
                >
                  {signedQuantity(e)}
                </span>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}

export default function SparePartHistoryPage() {
  return (
    <Suspense fallback={null}>
      <SparePartHistory />
    </Suspense>
  )
}
