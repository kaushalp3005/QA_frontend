'use client'

import { useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { Badge, Card, EmptyState, ErrorBanner, SkeletonRows } from '@/components/maintenance/ui'
import { TicketPhoto, TicketStatusBadge } from '@/components/maintenance/tickets/TicketBits'
import { useMtQuery } from '@/lib/maintenance/hooks'
import { fmtDateTime, plantLabel } from '@/lib/maintenance/format'
import { MT } from '@/lib/maintenance/nav'
import {
  assetWithArea,
  listTickets,
  ticketAge,
  ticketStatus,
  type TicketModule,
  type TicketScope,
} from '@/lib/maintenance/api/tickets'

export const SCOPE_OPTIONS: Array<{ id: TicketScope; label: string }> = [
  { id: 'live', label: 'Live' },
  { id: 'history', label: 'History' },
]

/** The signed-in technician's WhatsApp-raised tickets in one pool, Live or
 *  History — only those routed to them (`mine`: their pool and, for maintenance,
 *  their plant) or already taken by them. Shared by the IT technician's Raised
 *  Tickets screen and the Technician's Breakdowns tab. */
export function useRaisedTickets(module: TicketModule) {
  const [scope, setScope] = useState<TicketScope>('live')
  const query = useMtQuery(() => listTickets(scope, { module, mine: true }), [scope, module])

  const changeScope = (s: TicketScope) => {
    if (s === scope) return
    query.setData(undefined) // a scope switch shows fresh data, never the other scope's rows
    setScope(s)
  }

  return { scope, changeScope, ...query }
}

export type RaisedTickets = ReturnType<typeof useRaisedTickets>

export function RaisedTicketList({ q }: { q: RaisedTickets }) {
  const tickets = q.data ?? []

  if (q.loading && !q.data) return <SkeletonRows rows={5} />
  if (q.error) return <ErrorBanner error={`Couldn't load tickets — ${q.error}`} onRetry={q.reload} />
  if (tickets.length === 0) {
    // An empty queue is the normal, good state — not an error.
    return (
      <EmptyState
        icon={MessageSquare}
        title={q.scope === 'live' ? 'No open tickets. All clear.' : 'No resolved tickets yet.'}
      />
    )
  }

  return (
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
                {t.plant && <Badge>{plantLabel(t.plant)}</Badge>}
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
  )
}
