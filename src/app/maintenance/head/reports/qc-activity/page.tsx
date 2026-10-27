'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { EmptyState, ErrorBanner, PageHeader, SkeletonRows } from '@/components/maintenance/ui'
import { QcHistoryCard } from '@/components/maintenance/head/FlagCard'
import { DateRangeFields, PlantFilterChips, defaultRange } from '@/components/maintenance/reports/ReportFilters'
import { useMtQuery } from '@/lib/maintenance/hooks'
import { MT } from '@/lib/maintenance/nav'
import { qcActivityHistory, toBackendPlantId } from '@/lib/maintenance/api/head'

/** QC Activity — History: every breakdown with a QC decision in the range — the
 *  latest decision only, so no status filter (QcActivityHistoryScreen.kt). */
export default function QcActivityHistoryPage() {
  const [plant, setPlant] = useState<string | null>(null)
  const [range, setRange] = useState(defaultRange)

  const { data, error, loading, reload } = useMtQuery(
    () => qcActivityHistory({ from: range.from, to: range.to, plant_id: toBackendPlantId(plant) }),
    [plant, range.from, range.to],
  )
  const rows = data ?? []

  return (
    <>
      <PageHeader title="QC Activity — History" subtitle="Every QC decision, date-wise" back={MT.headReports} />
      <div className="mb-5 space-y-3">
        <PlantFilterChips value={plant} onChange={setPlant} />
        <DateRangeFields from={range.from} to={range.to} onChange={(from, to) => setRange({ from, to })} />
      </div>
      <ErrorBanner error={error} onRetry={reload} />
      {loading ? (
        <SkeletonRows rows={5} />
      ) : error ? null : rows.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="No QC activity in this range." />
      ) : (
        <div className="grid gap-2 lg:grid-cols-2">
          {rows.map((r) => (
            <QcHistoryCard key={r.id} row={r} />
          ))}
        </div>
      )}
    </>
  )
}
