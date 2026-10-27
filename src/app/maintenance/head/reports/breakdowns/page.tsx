'use client'

import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { Chips, EmptyState, ErrorBanner, PageHeader, SkeletonRows } from '@/components/maintenance/ui'
import { BreakdownHistoryCard } from '@/components/maintenance/head/FlagCard'
import { DateRangeFields, PlantFilterChips, defaultRange } from '@/components/maintenance/reports/ReportFilters'
import { useMtQuery } from '@/lib/maintenance/hooks'
import { MT } from '@/lib/maintenance/nav'
import { breakdownHistory, toBackendPlantId } from '@/lib/maintenance/api/head'

type StatusFilter = 'ALL' | 'OPEN' | 'CLOSED'

/** Breakdown — History: every breakdown in a date range, any status
 *  (BreakdownHistoryScreen.kt / BreakdownHistoryViewModel.kt). */
export default function BreakdownHistoryPage() {
  const [plant, setPlant] = useState<string | null>(null)
  const [status, setStatus] = useState<StatusFilter>('ALL')
  const [range, setRange] = useState(defaultRange)

  const { data, error, loading, reload } = useMtQuery(
    () =>
      breakdownHistory({
        from: range.from,
        to: range.to,
        plant_id: toBackendPlantId(plant),
        status: status === 'ALL' ? null : status,
      }),
    [plant, status, range.from, range.to],
  )
  const rows = data ?? []

  return (
    <>
      <PageHeader title="Breakdown — History" subtitle="Every breakdown, open or closed" back={MT.headReports} />
      <div className="mb-5 space-y-3">
        <PlantFilterChips value={plant} onChange={setPlant} />
        <DateRangeFields from={range.from} to={range.to} onChange={(from, to) => setRange({ from, to })} />
        <Chips<StatusFilter>
          options={[
            { id: 'ALL', label: 'All' },
            { id: 'OPEN', label: 'Open' },
            { id: 'CLOSED', label: 'Closed' },
          ]}
          value={status}
          onChange={setStatus}
        />
      </div>
      <ErrorBanner error={error} onRetry={reload} />
      {loading ? (
        <SkeletonRows rows={5} />
      ) : error ? null : rows.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="No breakdowns in this range." />
      ) : (
        <div className="grid gap-2 lg:grid-cols-2">
          {rows.map((r) => (
            <BreakdownHistoryCard key={r.id} row={r} />
          ))}
        </div>
      )}
    </>
  )
}
