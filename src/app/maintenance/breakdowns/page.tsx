'use client'

import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, ShieldAlert } from 'lucide-react'
import { Button, Chips, EmptyState, ErrorBanner, PageHeader, SkeletonRows, Tabs } from '@/components/maintenance/ui'
import { TicketCard, toTicketRow } from '@/components/maintenance/technician/TicketCard'
import { RaisedTicketList, SCOPE_OPTIONS, useRaisedTickets } from '@/components/maintenance/tickets/RaisedTicketList'
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

type TabId = 'open' | 'active' | 'resolved' | 'raised'

const EMPTY: Record<Exclude<TabId, 'raised'>, string> = {
  open: 'No open tickets — nothing flagged in this plant.',
  active: 'Nothing acknowledged by you. Open a ticket on the Open tab to acknowledge it.',
  resolved: 'No resolved tickets in the last 30 days.',
}

/** Technician breakdown tickets (TechnicianHomeScreen): Open · My Active · Resolved,
 *  plus Raised Tickets — maintenance complaints raised over WhatsApp
 *  (Maintenance → Raise Complaint). Each is routed to the technicians at the plant
 *  the raiser picked, and this tab shows only the ones routed to (or taken by)
 *  the signed-in technician. */
export default function BreakdownsPage() {
  const session = useMtSession()
  const [tab, setTab] = useState<TabId>('open')
  // Same as Android: ask for both plants; the backend scopes by the JWT.
  const plant = session ? 'both' : null

  // ?tab=raised — where a raised ticket's back button returns to. Read after
  // mount: useSearchParams would need a Suspense boundary for the static build.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tab') === 'raised') setTab('raised')
  }, [])

  const open = useMtQuery(async () => (plant ? (await listOpenBreakdowns(plant)).map(fromOpen) : []), [plant])
  const resolved = useMtQuery(async () => (plant ? listResolvedBreakdowns(plant) : []), [plant])
  const raised = useRaisedTickets('maintenance')
  // Register names so asset-register tickets show a real machine name.
  const assets = useMtQuery(async () => {
    const list = await listMachines().catch(() => [] as MtMachine[])
    return new Map<string, string>(list.map((m) => [m.asset_id, m.asset_name]))
  }, [])

  usePolling(() => {
    open.reload()
    if (raised.scope === 'live') raised.reload()
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

  // The tab badge counts what still needs work, so only Live data feeds it.
  const raisedLive = raised.scope === 'live' ? raised.data?.length || undefined : undefined
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
            loading={tab === 'raised' ? raised.loading && !!raised.data : open.loading || resolved.loading}
            onClick={() => {
              open.reload()
              resolved.reload()
              raised.reload()
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
          { id: 'raised', label: 'Raised Tickets', count: raisedLive },
        ]}
      />

      {tab === 'raised' ? (
        <>
          <div className="mb-4">
            <Chips options={SCOPE_OPTIONS} value={raised.scope} onChange={raised.changeScope} />
          </div>
          <RaisedTicketList q={raised} />
        </>
      ) : (
        <BreakdownList
          tab={tab}
          rows={rows[tab]}
          loading={tab === 'resolved' ? resolved.loading && !resolved.data : open.loading && !open.data}
          error={tab === 'resolved' ? resolved.error : open.error}
          onRetry={tab === 'resolved' ? resolved.reload : open.reload}
          now={now}
        />
      )}
    </>
  )
}

function BreakdownList({
  tab,
  rows,
  loading,
  error,
  onRetry,
  now,
}: {
  tab: Exclude<TabId, 'raised'>
  rows: ReturnType<typeof toTicketRow>[]
  loading: boolean
  error: string | null
  onRetry: () => void
  now: number
}) {
  return (
    <>
      <ErrorBanner error={error} onRetry={onRetry} />

      {loading ? (
        <SkeletonRows rows={4} />
      ) : rows.length === 0 ? (
        !error && <EmptyState icon={ShieldAlert} title="No tickets" message={EMPTY[tab]} />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {rows.map((row) => (
            <TicketCard key={row.flag.id} row={row} now={now} />
          ))}
        </div>
      )}
    </>
  )
}
