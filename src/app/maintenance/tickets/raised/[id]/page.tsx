'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { CheckCircle2, Hand, RefreshCw } from 'lucide-react'
import {
  Button,
  Card,
  DetailGrid,
  EmptyState,
  ErrorBanner,
  Field,
  LoadingBlock,
  Modal,
  PageHeader,
  Textarea,
} from '@/components/maintenance/ui'
import { TicketPhoto, TicketStatusBadge } from '@/components/maintenance/tickets/TicketBits'
import { useMtQuery } from '@/lib/maintenance/hooks'
import { fmtDateTime } from '@/lib/maintenance/format'
import { MT } from '@/lib/maintenance/nav'
import {
  acknowledgeTicket,
  correctiveActionOf,
  getTicket,
  isTicketConflict,
  resolveTicket,
  ticketStatus,
  type WaTicket,
} from '@/lib/maintenance/api/tickets'

const dash = (v: string | null | undefined) => (v && v.trim() ? v : '—')

/** One raised ticket (RaisedTicketDetailScreen / VM):
 *    open → Acknowledge · acknowledged → who has it + Resolve · resolved → read-only. */
export default function RaisedTicketDetailPage({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id)
  const { data: ticket, error, loading, reload, setData } = useMtQuery(() => getTicket(id), [id])

  const [acting, setActing] = useState(false)
  const [showResolve, setShowResolve] = useState(false)
  const [note, setNote] = useState('')

  /** A 409 means another technician got there first: show who, then refresh so
   *  the stale buttons go away instead of inviting another failing tap. */
  const act = async (run: () => Promise<WaTicket>, done: string, fallback: string) => {
    if (acting) return
    setActing(true)
    try {
      setData(await run())
      toast.success(done)
    } catch (e: any) {
      toast.error(e?.message || fallback)
      if (isTicketConflict(e)) {
        // Silent refresh: a failure here must not wipe the ticket on screen.
        getTicket(id).then(setData).catch(() => {})
      }
    } finally {
      setActing(false)
    }
  }

  const submitResolve = () => {
    const text = note.trim()
    if (!text) return
    setShowResolve(false)
    act(() => resolveTicket(id, text), 'Ticket resolved', 'Failed to resolve')
  }

  const status = ticket ? ticketStatus(ticket.status) : null

  return (
    <>
      <PageHeader
        title={ticket?.ticket_no ?? 'Ticket'}
        subtitle={ticket ? <TicketStatusBadge status={ticket.status} /> : undefined}
        back={MT.raisedTickets}
        actions={
          <Button variant="secondary" icon={RefreshCw} onClick={reload} disabled={loading}>
            Refresh
          </Button>
        }
      />

      {loading && !ticket ? (
        <LoadingBlock />
      ) : !ticket ? (
        <EmptyState
          title="Couldn't load the ticket"
          message={error ?? 'Unknown error'}
          action={
            <Button variant="secondary" onClick={reload}>
              Retry
            </Button>
          }
        />
      ) : (
        <div className="mx-auto max-w-3xl space-y-4">
          <ErrorBanner error={error} onRetry={reload} />
          <TicketPhoto url={ticket.photo_url} variant="hero" />

          <Card className="p-5">
            <DetailGrid
              items={[
                { label: 'Asset', value: dash(ticket.asset) },
                { label: 'Area', value: dash(ticket.area) },
                { label: 'Problem', value: dash(ticket.description), wide: true },
                { label: 'Raised by', value: dash(ticket.raised_by) },
                { label: 'Raised at', value: fmtDateTime(ticket.created_at) },
                { label: 'Status', value: <TicketStatusBadge status={ticket.status} /> },
                ...(ticket.assigned_to?.trim() ? [{ label: 'Assigned to', value: ticket.assigned_to }] : []),
                ...(status === 'RESOLVED' ? [{ label: 'Closed at', value: fmtDateTime(ticket.closed_at) }] : []),
              ]}
            />
          </Card>

          {status === 'RESOLVED' && (
            <Card className="p-5">
              <h2 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Corrective action</h2>
              <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                {correctiveActionOf(ticket)?.trim() || 'No note recorded.'}
              </p>
            </Card>
          )}

          {status === 'OPEN' && (
            <Button
              className="w-full py-3"
              icon={Hand}
              loading={acting}
              onClick={() => act(() => acknowledgeTicket(id), 'Ticket acknowledged', 'Failed to acknowledge')}
            >
              Acknowledge
            </Button>
          )}
          {status === 'ACKNOWLEDGED' && (
            <Button
              className="w-full py-3"
              variant="success"
              icon={CheckCircle2}
              loading={acting}
              onClick={() => {
                setNote('')
                setShowResolve(true)
              }}
            >
              Resolve
            </Button>
          )}
        </div>
      )}

      <Modal
        open={showResolve}
        onClose={() => setShowResolve(false)}
        title="Resolve ticket"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowResolve(false)}>
              Cancel
            </Button>
            {/* Disabled while blank — the server rejects an empty note with 400. */}
            <Button variant="success" onClick={submitResolve} disabled={!note.trim() || acting}>
              Submit
            </Button>
          </>
        }
      >
        <Field label="What did you do to fix it?">
          <Textarea
            rows={4}
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Replaced the charging cable"
          />
        </Field>
      </Modal>
    </>
  )
}
