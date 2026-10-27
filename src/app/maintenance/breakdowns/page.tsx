'use client'

import { useMemo, useState } from 'react'
import { RefreshCw, ShieldAlert } from 'lucide-react'
import { Button, EmptyState, ErrorBanner, PageHeader, SkeletonRows, Tabs } from '@/components/maintenance/ui'
import { TicketCard, toTicketRow } from '@/components/maintenance/technician/TicketCard'
import { useMtQuery, useMtSession, usePolling } from '@/lib/maintenance/hooks'
import { plantLabel } from '@/lib/maintenance/format'
import { MT } from '@/lib/maintenance/nav'
import { listMachines, type MtMachine } from '@/lib/maintenance/api/assets'
import {
  fromOpen,
  listOpenBreakdowns,
  listResolvedBreakdowns,
  myActive,
  openPool,
} from '@/lib/maintenance/api/technicianBreakdowns'

type TabId = 'open' | 'active' | 'resolved'

const EMPTY: Record<TabId, string> = {
  open: 'No open tickets — nothing flagged in this plant.',
  active: 'Nothing acknowledged by you. Open a ticket on the Open tab to acknowledge it.',
  resolved: 'No resolved tickets in the last 30 days.',
}

/** Technician breakdown tickets (TechnicianHomeScreen): Open · My Active · Resolved. */
export default function BreakdownsPage() {
  const session = useMtSession()
  const [tab, setTab] = useState<TabId>('open')
  // Same as Android: ask for both plants; the backend scopes by the JWT.
  const plant = session ? 'both' : null

  const open = useMtQuery(async () => (plant ? (await listOpenBreakdowns(plant)).map(fromOpen) : []), [plant])
  const resolved = useMtQuery(async () => (plant ? listResolvedBreakdowns(plant) : []), [plant])
  // Register names so asset-register tickets show a real machine name.
  const assets = useMtQuery(async () => {
    const list = await listMachines().catch(() => [] as MtMachine[])
    return new Map<string, string>(list.map((m) => [m.asset_id, m.asset_name]))
  }, [])

  usePolling(() => {
    open.reload()
  }, 30_000)

  const names = useMemo(() => assets.data ?? new Map<string, string>(), [assets.data])
  const rows = useMemo(() => {
    const all = open.data ?? []
    return {
      open: openPool(all).map((f) => toTicketRow(f, names)),
      active: session ? myActive(all, session.userId, session.name).map((f) => toTicketRow(f, names)) : [],
      resolved: (resolved.data ?? []).map((f) => toTicketRow(f, names)),
    }
  }, [open.data, resolved.data, names, session])

  if (!session) return null

  const loading = tab === 'resolved' ? resolved.loading && !resolved.data : open.loading && !open.data
  const error = tab === 'resolved' ? resolved.error : open.error
  const list = rows[tab]
  const now = Date.now()

  return (
    <>
      <PageHeader
        title="Breakdowns"
        subtitle={`${session.name} · ${plantLabel(session.plantId)}`}
        back={MT.dashboard}
        actions={
          <Button
            variant="secondary"
            icon={RefreshCw}
            loading={open.loading || resolved.loading}
            onClick={() => {
              open.reload()
              resolved.reload()
            }}
          >
            Refresh
          </Button>
        }
      />

      <Tabs<TabId>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'open', label: 'Open', count: rows.open.length || undefined },
          { id: 'active', label: 'My Active', count: rows.active.length || undefined },
          { id: 'resolved', label: 'Resolved', count: rows.resolved.length || undefined },
        ]}
      />

      <ErrorBanner error={error} onRetry={tab === 'resolved' ? resolved.reload : open.reload} />

      {loading ? (
        <SkeletonRows rows={4} />
      ) : list.length === 0 ? (
        !error && <EmptyState icon={ShieldAlert} title="No tickets" message={EMPTY[tab]} />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map((row) => (
            <TicketCard key={row.flag.id} row={row} now={now} />
          ))}
        </div>
      )}
    </>
  )
}
