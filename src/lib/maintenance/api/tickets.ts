/**
 * Raised Tickets — maintenance complaints raised over WhatsApp, worked by an
 * it_technician. Ported from WaTicketsApi.kt, WaTicketDtos.kt,
 * domain/model/tickets/RaisedTicket.kt and RaisedTicketRepositoryImpl.kt.
 *
 * The app never creates a ticket (WhatsApp is the only intake); it can only be
 * acknowledged (taken) and resolved with a corrective action. Reads are open to any
 * signed-in user; acknowledge / resolve answer 403 to non-technicians and 409 when
 * someone else already took or closed it. Timestamps are ISO-8601 strings already
 * carrying the IST offset.
 */
import { MtApiError, mtFetch } from '../client'
import { toDate } from '../format'

export type TicketScope = 'live' | 'history'

/** One technician's delivery + acknowledgment record (wa_receives). */
export interface WaReceive {
  id: number
  name?: string | null
  ack_status: string
  done_by?: string | null
  done_at?: string | null
  /** What this person did to fix it — null until they close the ticket */
  corrective_action?: string | null
  received_at?: string | null
}

export interface WaTicket {
  id: number
  ticket_no: string
  module?: string | null
  asset?: string | null
  area?: string | null
  description?: string | null
  /** Public S3 URL (expires after 45 days), or null when the reporter skipped it */
  photo_url?: string | null
  /** open | acknowledged | resolved */
  status: string
  /** Technician who took it, by name */
  assigned_to?: string | null
  raised_by?: string | null
  created_at?: string | null
  closed_at?: string | null
  /** Detail endpoint only */
  recipients?: WaReceive[]
}

/** live = open + acknowledged (oldest first); history = resolved (newest first) */
export function listTickets(scope: TicketScope, limit = 100) {
  return mtFetch<WaTicket[]>('/wa-tickets', { query: { scope, limit } })
}

export function getTicket(id: number | string) {
  return mtFetch<WaTicket>(`/wa-tickets/${id}`)
}

export function acknowledgeTicket(id: number | string) {
  return mtFetch<WaTicket>(`/wa-tickets/${id}/acknowledge`, { method: 'POST' })
}

/** corrective_action is required — the server rejects a blank one with 400. */
export function resolveTicket(id: number | string, correctiveAction: string) {
  return mtFetch<WaTicket>(`/wa-tickets/${id}/resolve`, {
    method: 'POST',
    body: { corrective_action: correctiveAction },
  })
}

/** 409 = another technician got there first; the screen refreshes instead of retrying. */
export const isTicketConflict = (e: unknown) => e instanceof MtApiError && e.status === 409

// ── Domain helpers (RaisedTicket.kt) ─────────────────────────────────────

export type TicketStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: 'Open',
  ACKNOWLEDGED: 'In progress',
  RESOLVED: 'Resolved',
}

/** Unknown values fall back to OPEN — the backend owns this vocabulary. */
export function ticketStatus(raw: string | null | undefined): TicketStatus {
  switch ((raw ?? '').trim().toLowerCase()) {
    case 'acknowledged':
      return 'ACKNOWLEDGED'
    case 'resolved':
      return 'RESOLVED'
    default:
      return 'OPEN'
  }
}

/** "Packing Machine 3 — 1st Floor", collapsing when either is blank. */
export function assetWithArea(t: Pick<WaTicket, 'asset' | 'area'>): string {
  return [t.asset, t.area].filter((s) => s && s.trim()).join(' — ') || 'Unspecified asset'
}

/** The closing note, from whoever actually resolved it. */
export const correctiveActionOf = (t: WaTicket) =>
  t.recipients?.find((r) => r.corrective_action && r.corrective_action.trim())?.corrective_action ?? null

/** "just now" / "12m ago" / "2h ago" / "3d ago" — how long it has been waiting. */
export function ticketAge(createdAt: string | null | undefined, now = Date.now()): string {
  const d = toDate(createdAt)
  if (!d) return ''
  const ms = now - d.getTime()
  const min = Math.floor(ms / 60_000)
  if (ms < 0 || min < 1) return 'just now' // clock skew counts as just now
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}
