'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, History, RefreshCw } from 'lucide-react'
import { Button, EmptyState, ErrorBanner, PageHeader, SkeletonRows, Tabs } from '@/components/maintenance/ui'
import {
  PmHistoryCard,
  PmPlanCard,
  PmTaskCard,
  toPlanRows,
  toTaskRow,
  type PmPlanRow,
  type PmTaskRow,
} from '@/components/maintenance/technician/PmCards'
import { PlanDetailModal } from '@/components/maintenance/technician/PlanDetailModal'
import { useMtQuery, useMtSession } from '@/lib/maintenance/hooks'
import { fmtMonthYear } from '@/lib/maintenance/format'
import { MT } from '@/lib/maintenance/nav'
import { listMachines, type MtMachine } from '@/lib/maintenance/api/assets'
import {
  listAssignedPlans,
  listWorkOrders,
  PM_ACTIVE,
  PM_HISTORY,
} from '@/lib/maintenance/api/technicianPm'

type TabId = 'today' | 'all' | 'history'

/**
 * Technician PM Tasks (TechnicianPmScreen):
 *  Today   — work orders due today or overdue, most overdue first
 *  All     — every assigned plan + work orders generated ahead of their due date
 *  History — everything finished, all time, grouped by month
 */
export default function PmTasksPage() {
  const router = useRouter()
  const session = useMtSession()
  const [tab, setTab] = useState<TabId>('today')
  const [sheetPlan, setSheetPlan] = useState<PmPlanRow | null>(null)
  const techId = session?.userId

  const wos = useMtQuery(async () => (techId ? listWorkOrders({ technicianId: techId }) : []), [techId])
  // Plans fail separately so a broken GET /pm/plans is visible, not "nothing assigned".
  const plans = useMtQuery(async () => (techId ? listAssignedPlans(techId) : []), [techId])
  const assets = useMtQuery(async () => {
    const list = await listMachines().catch(() => [] as MtMachine[])
    return new Map(list.map((m) => [m.asset_id, m]))
  }, [])

  const view = useMemo(() => {
    const now = Date.now()
    const assetMap = assets.data ?? new Map<string, MtMachine>()
    const all = (wos.data ?? []).filter((w) => PM_ACTIVE.includes(w.status) || PM_HISTORY.includes(w.status))
    const woRows = all.map((w) => toTaskRow(w, assetMap, now))
    const planRows = toPlanRows(plans.data ?? [], all, assetMap, now)

    const today = woRows
      .filter((r) => PM_ACTIVE.includes(r.wo.status) && r.daysToDue <= 0)
      .sort((a, b) => a.daysToDue - b.daysToDue || a.machineName.localeCompare(b.machineName))
    // Safety net: due plans that never produced a work order must not vanish.
    const planned = new Set(all.map((w) => w.plan_id))
    const ungenerated = planRows
      .filter((p) => p.daysToDue <= 0 && !planned.has(p.plan.id))
      .sort((a, b) => a.daysToDue - b.daysToDue || a.machineName.localeCompare(b.machineName))
    const active = woRows
      .filter((r) => PM_ACTIVE.includes(r.wo.status))
      .sort((a, b) => a.wo.scheduled_date - b.wo.scheduled_date)

    const groups: Array<{ label: string; rows: PmTaskRow[] }> = []
    for (const r of woRows.filter((r) => PM_HISTORY.includes(r.wo.status)).sort((a, b) => b.doneAt - a.doneAt)) {
      const label = fmtMonthYear(r.doneAt)
      const g = groups[groups.length - 1]
      if (g && g.label === label) g.rows.push(r)
      else groups.push({ label, rows: [r] })
    }
    return { today, ungenerated, active, planRows, groups }
  }, [wos.data, plans.data, assets.data])

  if (!session) return null

  // A plan with a work order opens it whatever its state; only a plan without one gets the preview.
  const onPlanClick = (p: PmPlanRow) => (p.woId ? router.push(MT.pmDetail(p.woId)) : setSheetPlan(p))
  const refresh = () => {
    wos.reload()
    plans.reload()
  }
  const loading = (wos.loading && !wos.data) || (plans.loading && !plans.data)
  const historyCount = view.groups.reduce((n, g) => n + g.rows.length, 0)

  return (
    <>
      <PageHeader
        title="PM Tasks"
        subtitle="Preventive maintenance assigned to you"
        back={MT.dashboard}
        actions={
          <Button variant="secondary" icon={RefreshCw} loading={wos.loading || plans.loading} onClick={refresh}>
            Refresh
          </Button>
        }
      />

      <Tabs<TabId>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'today', label: 'Today', count: view.today.length + view.ungenerated.length },
          { id: 'all', label: 'All', count: view.planRows.length },
          { id: 'history', label: 'History', count: historyCount },
        ]}
      />

      <ErrorBanner error={wos.error} onRetry={wos.reload} />

      {loading ? (
        <SkeletonRows rows={4} />
      ) : tab === 'today' ? (
        view.today.length === 0 && view.ungenerated.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Nothing left to do today"
            message="Anything you've already submitted is on History; what's coming up is on All."
          />
        ) : (
          <>
            <TaskSection title="Overdue" rows={view.today.filter((r) => r.daysToDue < 0)} />
            <TaskSection title="Due today" rows={view.today.filter((r) => r.daysToDue === 0)} />
            {view.ungenerated.length > 0 && (
              <Group title={`Awaiting task creation (${view.ungenerated.length})`}>
                {view.ungenerated.map((p) => (
                  <PmPlanCard key={p.plan.id} row={p} onClick={() => onPlanClick(p)} showActionHint />
                ))}
              </Group>
            )}
          </>
        )
      ) : tab === 'all' ? (
        <>
          {plans.error && (
            <p className="mb-4 text-sm text-red-600 dark:text-red-400">Couldn&apos;t load assigned plans: {plans.error}</p>
          )}
          {view.planRows.length === 0 && view.active.length === 0 && !plans.error ? (
            <EmptyState
              icon={CalendarClock}
              title="No PM plans assigned to you yet"
              message="They appear here as soon as a supervisor assigns one. Use Refresh to check again."
            />
          ) : (
            <>
              {view.planRows.length > 0 && (
                <Group title={`Assigned PM plans (${view.planRows.length})`}>
                  {view.planRows.map((p) => (
                    <PmPlanCard key={p.plan.id} row={p} onClick={() => onPlanClick(p)} showActionHint />
                  ))}
                </Group>
              )}
              <TaskSection title="Active" rows={view.active} />
            </>
          )}
        </>
      ) : view.groups.length === 0 ? (
        <EmptyState
          icon={History}
          title="No completed PMs yet"
          message="Every PM you submit shows up here with its approval status."
        />
      ) : (
        view.groups.map((g) => (
          <Group key={g.label} title={`${g.label} (${g.rows.length})`}>
            {g.rows.map((r) => (
              <PmHistoryCard key={r.wo.id} row={r} href={MT.pmDetail(r.wo.id)} />
            ))}
          </Group>
        ))
      )}

      <PlanDetailModal row={sheetPlan} onClose={() => setSheetPlan(null)} />
    </>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-3 text-sm font-bold text-zinc-700 dark:text-zinc-300">{title}</h2>
      <div className="grid gap-3 lg:grid-cols-2">{children}</div>
    </section>
  )
}

function TaskSection({ title, rows }: { title: string; rows: PmTaskRow[] }) {
  if (rows.length === 0) return null
  return (
    <Group title={`${title} (${rows.length})`}>
      {rows.map((r) => (
        <PmTaskCard key={r.wo.id} row={r} href={MT.pmDetail(r.wo.id)} />
      ))}
    </Group>
  )
}
