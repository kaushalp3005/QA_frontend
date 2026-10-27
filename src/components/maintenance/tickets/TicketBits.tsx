'use client'

import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import clsx from 'clsx'
import { Badge, type Tone } from '@/components/maintenance/ui'
import { TICKET_STATUS_LABEL, ticketStatus, type TicketStatus } from '@/lib/maintenance/api/tickets'

const TONE: Record<TicketStatus, Tone> = {
  OPEN: 'red',
  ACKNOWLEDGED: 'amber',
  RESOLVED: 'green',
}

export function TicketStatusBadge({ status }: { status: string | null | undefined }) {
  const s = ticketStatus(status)
  return <Badge tone={TONE[s]}>{TICKET_STATUS_LABEL[s]}</Badge>
}

/** Ticket photo. The S3 URLs expire after 45 days, so a history ticket can 404 —
 *  a failed or missing photo falls back to an icon rather than an empty gap. */
export function TicketPhoto({
  url,
  variant,
}: {
  url: string | null | undefined
  /** thumb = 56px list thumbnail, hero = full-width detail photo */
  variant: 'thumb' | 'hero'
}) {
  const [failed, setFailed] = useState(false)
  const box =
    variant === 'thumb'
      ? 'h-14 w-14 shrink-0 rounded-lg'
      : 'h-60 w-full rounded-xl sm:h-80'

  if (!url || failed)
    return (
      <div
        className={clsx(
          box,
          'flex flex-col items-center justify-center gap-1 bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500',
        )}
      >
        <ImageOff className="h-5 w-5" />
        {variant === 'hero' && <span className="text-xs">No photo</span>}
      </div>
    )

  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt="Ticket photo"
      onError={() => setFailed(true)}
      className={clsx(box, 'bg-zinc-100 object-cover dark:bg-zinc-800', variant === 'hero' && 'object-contain')}
    />
  )
  return variant === 'hero' ? (
    <a href={url} target="_blank" rel="noreferrer" title="Open full photo" className="block">
      {img}
    </a>
  ) : (
    img
  )
}
