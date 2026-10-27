'use client'

import { useState } from 'react'
import { MessageSquare, RefreshCw } from 'lucide-react'
import { Button, Card, EmptyState, ErrorBanner, PageHeader, SkeletonRows, Tabs } from '@/components/maintenance/ui'
import { TicketPhoto, TicketStatusBadge } from '@/components/maintenance/tickets/TicketBits'
import { useMtQuery } from '@/lib/maintenance/hooks'
import { fmtDateTime } from '@/lib/maintenance/format'
import { MT } from '@/lib/maintenance/nav'
import {
  assetWithArea,
  listTickets,
  ticketAge,
  ticketStatus,
  type TicketScope,
} from '@/lib/maintenance/api/tickets'

/** WhatsApp-raised complaints for the IT technician (RaisedTicketsScreen / VM).
 *  Live = open + in progress, oldest first; History = resolved. Re-fetched on every
 *  tab switch and on Refresh — deliberately no polling, as on Android. */
export default function RaisedTicketsPage() {
  const [scope, setScope] = useState<TicketScope>('live')
  const { data, error, loading, reload, setData } = useMtQuery(() => listTickets(scope), [scope])
  const tickets = data ?? []

  return (
    <>
      <PageHeader
        title="Raised Tickets"
        subtitle="Complaints raised over WhatsApp"
        back={MT.dashboard}
        actions={
          <Button variant="secondary" icon={RefreshCw} onClick={reload} loading={loading && !!data}>
            Refresh
          </Button>
        }
      />

      <Tabs
        tabs={[
          { id: 'live' as TicketScope, label: 'Live' },
          { id: 'history' as TicketScope, label: 'History' },
        ]}
        value={scope}
        onChange={(s) => {
          if (s === scope) return
          setData(undefined) // a tab switch shows fresh data, never the other tab's rows
          setScope(s)
        }}
      />

      {loading && !data ? (
        <SkeletonRows rows={5} />
      ) : error ? (
        <ErrorBanner error={`Couldn't load tickets — ${error}`} onRetry={reload} />
      ) : tickets.length === 0 ? (
        // An empty queue is the normal, good state — not an error.
        <EmptyState
          icon={MessageSquare}
          title={scope === 'live' ? 'No open tickets. All clear.' : 'No resolved tickets yet.'}
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {tickets.map((t) => {
            const resolved = ticketStatus(t.status) === 'RESOLVED'
            return (
              <Card key={t.id} href={MT.raisedTicket(t.id)} className="flex items-center gap-4 p-3">
                <TicketPhoto url={t.photo_url} variant="thumb" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{t.ticket_no}</span>
                    <TicketStatusBadge status={t.status} />
                  </div>
                  <p className="mt-0.5 truncate text-sm text-zinc-800 dark:text-zinc-200">{assetWithArea(t)}</p>
                  {t.description?.trim() && (
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{t.description}</p>
                  )}
                  <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    {/* History: when it closed matters more than when it was raised. */}
                    {resolved ? `Closed ${fmtDateTime(t.closed_at)}` : ticketAge(t.created_at)}
                  </p>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
