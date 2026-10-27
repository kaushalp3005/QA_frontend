'use client'

/**
 * "Machines Reading" — mt_machine_daily_kwh rows by plant and date range, newest
 * first (MachinesReadingScreen.kt / MachinesReadingViewModel.kt). Mounted by both
 * the Supervisor reports hub and Head Reports.
 */

import { useState } from 'react'
import { Gauge } from 'lucide-react'
import { Card, EmptyState, ErrorBanner, PageHeader, SkeletonRows } from '@/components/maintenance/ui'
import { useMtQuery } from '@/lib/maintenance/hooks'
import { fmtDate, fmtNumber } from '@/lib/maintenance/format'
import { machinesReading } from '@/lib/maintenance/api/reports'
import { DateRangeFields, PlantFilterChips, defaultRange } from './ReportFilters'

export default function MachinesReadingView({ back }: { back: string }) {
  const [plant, setPlant] = useState<string | null>(null)
  // null = server default (last 30 days); the fields still show that window.
  const [range, setRange] = useState<{ from: string; to: string } | null>(null)
  const shown = range ?? defaultRange()

  const { data, error, loading, reload } = useMtQuery(
    () => machinesReading({ plant, from: range?.from, to: range?.to }),
    [plant, range?.from, range?.to],
  )
  const rows = data ?? []

  return (
    <>
      <PageHeader title="Machines Reading" subtitle="Per-machine kWh, date-wise" back={back} />
      <div className="mb-5 space-y-3">
        <PlantFilterChips value={plant} onChange={setPlant} />
        <DateRangeFields from={shown.from} to={shown.to} onChange={(from, to) => setRange({ from, to })} />
      </div>

      <ErrorBanner error={error} onRetry={reload} />
      {loading ? (
        <SkeletonRows rows={6} />
      ) : error ? null : rows.length === 0 ? (
        <EmptyState icon={Gauge} title="No readings in this range." />
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <Card key={`${r.machine_id}-${r.reading_date}-${i}`} className="p-4">
              <div className="flex items-center justify-between gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                <span>{fmtDate(r.reading_date)}</span>
                <span>
                  {r.building ?? ''} · {r.floor ?? ''}
                </span>
              </div>
              <div className="mt-1 flex items-start justify-between gap-3">
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {r.asset_name} <span className="font-normal text-zinc-500">({r.machine_id})</span>
                </p>
                <p className="shrink-0 text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {r.daily_kwh !== null && r.daily_kwh !== undefined ? `${r.daily_kwh.toFixed(2)} kWh` : '—'}
                </p>
              </div>
              <div className="mt-1 flex items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                <span>{r.source?.trim() || '—'}</span>
                {r.operator_name?.trim() && <span>{r.operator_name}</span>}
              </div>
            </Card>
          ))}
          <p className="pt-2 text-xs text-zinc-500">
            {rows.length} rows · {fmtNumber(rows.reduce((t, r) => t + (r.daily_kwh ?? 0), 0))} kWh total
          </p>
        </div>
      )}
    </>
  )
}
