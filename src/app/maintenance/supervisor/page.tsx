'use client'

import { useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { Button, Card, EmptyState, ErrorBanner, PageHeader, SkeletonRows, Tabs } from '@/components/maintenance/ui'
import { WoStatusBadge } from '@/components/maintenance/supervisor/WoBadges'
import { useMtQuery, useMtSession } from '@/lib/maintenance/hooks'
import { fmtDate, fmtDateTime, fmtRelative, plantLabel } from '@/lib/maintenance/format'
import { MT } from '@/lib/maintenance/nav'
import { listMachines, type MtMachine } from '@/lib/maintenance/api/assets'
import {
  SUPERVISOR_WO_STATUSES,
  TERMINAL_WO_STATUSES,
  listPlans,
  listWorkOrders,
  type PmWorkOrder,
} from '@/lib/maintenance/api/supervisor'

type Tab = 'plans' | 'active' | 'approvals' | 'history'

/**
 * PM Manager (SupervisorHomeScreen.kt / SupervisorHomeViewModel.kt): plans,
 * active work orders, submissions awaiting approval, and QC-closed history.
 * Machine names resolve from the asset register, falling back to the WO's
 * template-name snapshot.
 */
export default function SupervisorHomePage() {
  const session = useMtSession()
  const [tab, setTab] = useState<Tab>('plans')

  const { data, error, loading, reload } = useMtQuery(async () => {
    const [plans, wos, assets] = await Promise.all([
      listPlans(),
      listWorkOrders({ status: SUPERVISOR_WO_STATUSES.join(',') }),
      // Names are a nicety — a register failure must not blank the screen.
      listMachines().catch(() => [] as MtMachine[]),
    ])
    return { plans, wos, assets: new Map(assets.map((a) => [a.asset_id, a])) }
  }, [])

  const assets = data?.assets ?? new Map<string, MtMachine>()
  const woName = (wo: PmWorkOrder) => assets.get(wo.machine_id)?.asset_name ?? (wo.template_name || wo.machine_name)

  const plans = (data?.plans ?? []).map((p) => {
    const asset = assets.get(p.machine_id)
    return {
      plan: p,
      machineName: asset?.asset_name ?? p.machine_name ?? '(machine)',
      templateName: p.machine_name || '(checklist)',
      machineType: asset?.category ?? 'OTHER',
    }
  })
  const wos = data?.wos ?? []
  const active = wos
    .filter((w) => !TERMINAL_WO_STATUSES.has(String(w.status).toUpperCase()))
    .sort((a, b) => a.scheduled_date - b.scheduled_date)
  const approvals = wos
    .filter((w) => String(w.status).toUpperCase() === 'SUBMITTED')
    .sort((a, b) => (a.submitted_at ?? Number.MAX_SAFE_INTEGER) - (b.submitted_at ?? Number.MAX_SAFE_INTEGER))
  const history = wos
    .filter((w) => String(w.status).toUpperCase() === 'CLOSED')
    .sort((a, b) => (b.closed_at ?? b.scheduled_date) - (a.closed_at ?? a.scheduled_date))

  const count = (n: number) => (n > 0 ? n : undefined)

  return (
    <>
      <PageHeader
        title="PM Manager"
        subtitle={session ? `${session.name} — ${plantLabel(session.plantId)}` : undefined}
        back={session?.role === 'HEAD' ? MT.head : MT.dashboard}
        actions={
          <>
            <Button variant="secondary" icon={RefreshCw} onClick={reload} disabled={loading}>
              Refresh
            </Button>
            {tab === 'plans' && (
              <Button icon={Plus} href={MT.planEditor()}>
                New plan
              </Button>
            )}
          </>
        }
      />

      <Tabs<Tab>
        tabs={[
          { id: 'plans', label: 'Plan', count: count(plans.length) },
          { id: 'active', label: 'Active WOs', count: count(active.length) },
          { id: 'approvals', label: 'Approvals', count: count(approvals.length) },
          { id: 'history', label: 'History', count: count(history.length) },
        ]}
        value={tab}
        onChange={setTab}
      />

      <ErrorBanner error={error} onRetry={reload} />
      {loading && !data ? (
        <SkeletonRows rows={5} />
      ) : !data ? null : tab === 'plans' ? (
        plans.length === 0 ? (
          <EmptyState title="No plans yet." message="Tap New plan to create one." />
        ) : (
          <List>
            {plans.map(({ plan, machineName, templateName, machineType }) => (
              <Card key={plan.id} href={MT.planEditor(plan.id)} className="p-4">
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">{machineName}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {plan.machine_id} · {machineType}
                </p>
                <p className="mt-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">{templateName}</p>
                <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-300">
                  {String(plan.trigger_type).toUpperCase() === 'USAGE'
                    ? `Every ${plan.trigger_interval} running hours`
                    : `Every ${plan.trigger_interval} days`}{' '}
                  · next due {fmtDate(plan.next_due_at)}
                </p>
              </Card>
            ))}
          </List>
        )
      ) : tab === 'active' ? (
        active.length === 0 ? (
          <EmptyState title="No active work orders." message="Scheduler will generate them as plans come due." />
        ) : (
          <List>
            {active.map((wo) => (
              <Card key={wo.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-50">{woName(wo)}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {wo.machine_id} · {wo.template_name}
                    </p>
                  </div>
                  <WoStatusBadge status={String(wo.status)} />
                </div>
                <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                  Scheduled {fmtDate(wo.scheduled_date)} · {wo.assigned_technician_name ?? ''}
                </p>
              </Card>
            ))}
          </List>
        )
      ) : tab === 'approvals' ? (
        approvals.length === 0 ? (
          <EmptyState title="Nothing waiting for approval." message="Submitted PM work orders show up here." />
        ) : (
          <List>
            {approvals.map((wo) => (
              <Card key={wo.id} href={MT.supervisorPmReview(wo.id)} className="p-4">
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">{woName(wo)}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {wo.machine_id} · {wo.template_name}
                </p>
                <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                  Submitted by {wo.assigned_technician_name ?? ''} {wo.submitted_at ? fmtRelative(wo.submitted_at) : ''} ·{' '}
                  {wo.task_logs?.length ?? 0} items
                </p>
              </Card>
            ))}
          </List>
        )
      ) : history.length === 0 ? (
        <EmptyState title="No completed PM tasks yet." message="QC-approved work orders show up here." />
      ) : (
        <List>
          {history.map((wo) => (
            <Card key={wo.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">{woName(wo)}</p>
                <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                  Completed
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {wo.machine_id} · {wo.template_name}
              </p>
              <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                Done by {wo.assigned_technician_name || 'technician'}
                {wo.supervisor_approved_by_name ? ` · approved by ${wo.supervisor_approved_by_name}` : ''}
                {wo.qc_acknowledged_by_name ? ` · QC ${wo.qc_acknowledged_by_name}` : ''}
              </p>
              {wo.closed_at && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Closed {fmtDateTime(wo.closed_at)}</p>
              )}
            </Card>
          ))}
        </List>
      )}
    </>
  )
}

function List({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 lg:grid-cols-2">{children}</div>
}
