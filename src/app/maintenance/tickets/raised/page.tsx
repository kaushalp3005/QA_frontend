'use client'

import { RefreshCw } from 'lucide-react'
import { Button, PageHeader, Tabs } from '@/components/maintenance/ui'
import { RaisedTicketList, SCOPE_OPTIONS, useRaisedTickets } from '@/components/maintenance/tickets/RaisedTicketList'
import { MT } from '@/lib/maintenance/nav'

/** WhatsApp-raised IT complaints sent to the signed-in IT technician
 *  (RaisedTicketsScreen / VM). Live = open + in progress, oldest first; History =
 *  resolved. Re-fetched on every tab switch and on Refresh — deliberately no
 *  polling, as on Android. Maintenance complaints are the Technicians' and live
 *  under Breakdowns. */
export default function RaisedTicketsPage() {
  const q = useRaisedTickets('it')

  return (
    <>
      <PageHeader
        title="Raised Tickets"
        subtitle="IT complaints sent to you over WhatsApp"
        back={MT.dashboard}
        actions={
          <Button variant="secondary" icon={RefreshCw} onClick={q.reload} loading={q.loading && !!q.data}>
            Refresh
          </Button>
        }
      />

      <Tabs tabs={SCOPE_OPTIONS} value={q.scope} onChange={q.changeScope} />

      <RaisedTicketList q={q} />
    </>
  )
}
