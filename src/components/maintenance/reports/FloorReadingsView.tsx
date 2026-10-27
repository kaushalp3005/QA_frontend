'use client'

/**
 * "Warehouse/Floor Readings" — mt_floor_utility_readings by plant and date range,
 * newest first (FloorReadingsReportScreen.kt / FloorReadingsReportViewModel.kt).
 * Mounted by both the Supervisor reports hub and Head Reports.
 */

import { useState } from 'react'
import { Warehouse } from 'lucide-react'
import { Card, EmptyState, ErrorBanner, PageHeader, SkeletonRows } from '@/components/maintenance/ui'
import { useMtQuery } from '@/lib/maintenance/hooks'
import { fmtDate } from '@/lib/maintenance/format'
import { floorReadingsReport } from '@/lib/maintenance/api/reports'
import { DateRangeFields, PlantFilterChips, defaultRange } from './ReportFilters'

const two = (v: number | null | undefined) => (v === null || v === undefined ? '—' : v.toFixed(2))

export default function FloorReadingsView({ back }: { back: string }) {
  const [plant, setPlant] = useState<string | null>(null)
  const [range, setRange] = useState<{ from: string; to: string } | null>(null)
  const shown = range ?? defaultRange()

  const { data, error, loading, reload } = useMtQuery(
    () => floorReadingsReport({ plant, from: range?.from, to: range?.to }),
    [plant, range?.from, range?.to],
  )
  const rows = data ?? []

  return (
    <>
      <PageHeader title="Warehouse/Floor Readings" subtitle="Per-floor meter readings, date-wise" back={back} />
      <div className="mb-5 space-y-3">
        <PlantFilterChips value={plant} onChange={setPlant} />
        <DateRangeFields from={shown.from} to={shown.to} onChange={(from, to) => setRange({ from, to })} />
      </div>

      <ErrorBanner error={error} onRetry={reload} />
      {loading ? (
        <SkeletonRows rows={6} />
      ) : error ? null : rows.length === 0 ? (
        <EmptyState icon={Warehouse} title="No readings in this range." />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <Card key={`${r.building}-${r.floor}-${r.reading_date}`} className="p-4">
              <div className="flex items-center justify-between gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                <span>{fmtDate(r.reading_date)}</span>
                <span className="font-medium">
                  {r.building} · {r.floor}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Actual (meter)</p>
                  <p className="text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{two(r.meter_reading)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">System</p>
                  <p className="text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{two(r.daily_kwh)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
