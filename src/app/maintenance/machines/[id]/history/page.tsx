'use client'

/**
 * 30-day run history — ported from history/HistoryScreen + HistoryViewModel.
 * The Android app read its own device's Room rows; the web reads the backend's
 * per-day rollups (GET /energy/machines/{id}/history), so runs from every
 * device appear, grouped by day.
 */

import { useMemo } from 'react'
import { Card, EmptyState, ErrorBanner, LoadingBlock, PageHeader, StatCard } from '@/components/maintenance/ui'
import { useMtQuery } from '@/lib/maintenance/hooks'
import { fmtDate, fmtDuration, fmtInr, fmtNumber, fmtTime } from '@/lib/maintenance/format'
import { listMachines } from '@/lib/maintenance/api/assets'
import { fmtKwh, getMachineHistory } from '@/lib/maintenance/api/machines'
import { MT } from '@/lib/maintenance/nav'

const DAY_MS = 24 * 3_600_000

export default function MachineHistoryPage({ params }: { params: { id: string } }) {
  const assetId = decodeURIComponent(params.id)

  const history = useMtQuery(() => {
    const to = Date.now()
    return getMachineHistory(assetId, to - 30 * DAY_MS, to)
  }, [assetId])

  // Name for the subtitle only — failures are ignored.
  const name = useMtQuery(
    () =>
      listMachines()
        .then((all) => all.find((m) => m.asset_id === assetId)?.asset_name ?? null)
        .catch(() => null),
    [assetId],
  )

  const days = useMemo(
    () =>
      [...(history.data ?? [])]
        .filter((d) => d.runs?.length)
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((d) => ({ ...d, runs: [...d.runs].sort((a, b) => b.started_at - a.started_at) })),
    [history.data],
  )

  const runs = days.flatMap((d) => d.runs)
  const totalKwh = runs.reduce((s, r) => s + (r.kwh ?? 0), 0)
  const completed = runs.filter((r) => r.ended_at != null).length
  const totalCost = days.reduce((s, d) => s + (d.estimated_cost ?? 0), 0)

  return (
    <>
      <PageHeader
        title="30-Day History"
        subtitle={name.data ? `${name.data} · ${assetId}` : assetId}
        back={MT.machine(assetId)}
      />

      {history.loading && !history.data ? (
        <LoadingBlock />
      ) : history.error ? (
        <ErrorBanner error={history.error} onRetry={history.reload} />
      ) : runs.length === 0 ? (
        <EmptyState title="No history in the last 30 days" />
      ) : (
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total Runs" value={runs.length} />
            <StatCard label="Completed" value={completed} />
            <StatCard label="Total kWh" value={fmtKwh(totalKwh)} />
            <StatCard label="Est. cost" value={fmtInr(totalCost)} />
          </div>

          <div className="space-y-5">
            {days.map((d) => (
              <section key={d.date}>
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{fmtDate(d.date)}</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {fmtNumber(d.total_run_hours, 1)} h · {fmtKwh(d.total_kwh ?? 0)} · {fmtInr(d.estimated_cost)}
                  </p>
                </div>
                <div className="space-y-2">
                  {d.runs.map((r) => (
                    <Card key={r.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                          {fmtTime(r.started_at)} → {r.ended_at != null ? fmtTime(r.ended_at) : 'Running'}
                        </p>
                        {r.ended_at != null && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">{fmtDuration(r.started_at, r.ended_at)}</p>
                        )}
                      </div>
                      {r.kwh != null && (
                        <p className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{fmtKwh(r.kwh)}</p>
                      )}
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
