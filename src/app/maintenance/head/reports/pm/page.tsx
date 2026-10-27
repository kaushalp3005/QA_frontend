'use client'

import { useState } from 'react'
import { Wrench } from 'lucide-react'
import { Card, Chips, EmptyState, ErrorBanner, PageHeader, SkeletonRows, StatusBadge } from '@/components/maintenance/ui'
import { DateRangeFields, defaultRange } from '@/components/maintenance/reports/ReportFilters'
import { useMtQuery } from '@/lib/maintenance/hooks'
import { fmtDate, startOfDayIst } from '@/lib/maintenance/format'
import { MT } from '@/lib/maintenance/nav'
import { DAY_MS, listWorkOrders } from '@/lib/maintenance/api/supervisor'

type StatusFilter = 'ALL' | 'CLOSED'

/** PM — History: every PM work order, live or closed. Status filters server-side;
 *  the API has no date param, so the range filters scheduled_date here
 *  (PmHistoryScreen.kt / PmHistoryViewModel.kt). */
export default function PmHistoryPage() {
  const [status, setStatus] = useState<StatusFilter>('ALL')
  const [range, setRange] = useState(defaultRange)

  const { data, error, loading, reload } = useMtQuery(
    () => listWorkOrders({ status: status === 'ALL' ? undefined : status }),
    [status],
  )
  const start = startOfDayIst(range.from)
  const end = startOfDayIst(range.to) + DAY_MS - 1
  const rows = (data ?? []).filter((wo) => wo.scheduled_date >= start && wo.scheduled_date <= end)

  return (
    <>
      <PageHeader title="PM — History" subtitle="Every PM work order, live or closed" back={MT.headReports} />
      <div className="mb-5 space-y-3">
        <DateRangeFields from={range.from} to={range.to} onChange={(from, to) => setRange({ from, to })} />
        <Chips<StatusFilter>
          options={[
            { id: 'ALL', label: 'All' },
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
        <EmptyState icon={Wrench} title="No PM work orders in this range." />
      ) : (
        <div className="grid gap-2 lg:grid-cols-2">
          {rows.map((wo) => (
            <Card key={wo.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {wo.template_name?.trim() || wo.machine_name?.trim() || wo.machine_id}
                </p>
                <StatusBadge status={wo.status} />
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {wo.machine_id} · scheduled {fmtDate(wo.scheduled_date)}
              </p>
              {wo.assigned_technician_name?.trim() && (
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">Technician: {wo.assigned_technician_name}</p>
              )}
              {wo.closed_at && <p className="text-xs text-zinc-500 dark:text-zinc-400">Closed {fmtDate(wo.closed_at)}</p>}
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
