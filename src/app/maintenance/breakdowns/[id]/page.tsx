'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { CheckCircle2, Wrench } from 'lucide-react'
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Field,
  LoadingBlock,
  Modal,
  PageHeader,
  Textarea,
} from '@/components/maintenance/ui'
import { SeverityChip } from '@/components/maintenance/technician/TicketCard'
import { SparePartPickerModal, SpareLinesCard } from '@/components/maintenance/technician/SparePartPicker'
import { PhotoCapture } from '@/components/maintenance/technician/PhotoCapture'
import { loadBreakdownSpares, saveBreakdownSpares } from '@/components/maintenance/technician/drafts'
import { useMtQuery, useMtSession } from '@/lib/maintenance/hooks'
import { fmtDateTime, fmtRelative } from '@/lib/maintenance/format'
import { MT } from '@/lib/maintenance/nav'
import { listMachines, type MtMachine } from '@/lib/maintenance/api/assets'
import {
  acknowledgeBreakdown,
  getBreakdown,
  isKickedBack,
  MIN_WORK_DONE_CHARS,
  submitBreakdownWorkDone,
  validateResolution,
  type Breakdown,
} from '@/lib/maintenance/api/technicianBreakdowns'
import { addSpareLine, MAX_WO_SPARES, type SpareLine } from '@/lib/maintenance/api/technicianSpares'

/** Breakdown ticket (TicketDetailScreen): acknowledge, then resolve with work
 *  done, spares and an after-repair photo → PENDING_QC. */
export default function BreakdownDetailPage({ params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id)
  const router = useRouter()
  const session = useMtSession()
  // Same as Android: ask for both plants; the backend scopes by the JWT.
  const plant = session ? 'both' : null

  const ticket = useMtQuery(async () => (plant ? getBreakdown(id, plant) : null), [id, plant])
  const machineId = ticket.data?.machineId
  const asset = useMtQuery(async () => {
    if (!machineId) return null
    const list = await listMachines().catch(() => [] as MtMachine[])
    return list.find((m) => m.asset_id === machineId) ?? null
  }, [machineId])

  const [acking, setAcking] = useState(false)
  const [resolveOpen, setResolveOpen] = useState(false)

  if (!session) return null
  const flag = ticket.data
  const title = asset.data?.asset_name ?? flag?.assetName ?? 'Ticket'

  const onAcknowledge = async () => {
    if (!flag) return
    setAcking(true)
    try {
      await acknowledgeBreakdown(flag.id, { userId: session.userId, userName: session.name })
      toast.success('Ticket acknowledged.')
      ticket.reload()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to acknowledge')
    } finally {
      setAcking(false)
    }
  }

  return (
    <>
      <PageHeader title={title} subtitle={flag ? flag.machineId : undefined} back={MT.breakdowns} />

      <ErrorBanner error={ticket.error} onRetry={ticket.reload} />

      {ticket.loading && !flag ? (
        <LoadingBlock />
      ) : !flag ? (
        !ticket.error && <EmptyState title="Ticket not found." message="It may have been closed more than six months ago." />
      ) : (
        <div className="mx-auto max-w-2xl space-y-4">
          <Card className="p-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-zinc-900 dark:text-zinc-50">{flag.machineId}</p>
                  <p className="text-xs text-zinc-500">{asset.data?.sub_location ?? flag.building ?? ''}</p>
                </div>
                <SeverityChip severity={flag.severity} />
              </div>
              <hr className="border-zinc-200 dark:border-zinc-800" />
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Reported by operator {flag.reporterName || flag.operatorId || '—'}
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Flagged {fmtRelative(flag.raisedAt)} ({fmtDateTime(flag.raisedAt)})
              </p>
              <p className="pt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Operator description</p>
              <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{flag.description}</p>
              {flag.beforePhotoUrl && <Photo src={flag.beforePhotoUrl} alt="Before photo" />}
            </div>
          </Card>

          <StatusSection
            flag={flag}
            busy={acking}
            onAcknowledge={onAcknowledge}
            onOpenResolve={() => setResolveOpen(true)}
          />
        </div>
      )}

      {flag && (
        <ResolveModal
          open={resolveOpen}
          flag={flag}
          userId={session.userId}
          userName={session.name}
          onClose={() => setResolveOpen(false)}
          onResolved={() => {
            setResolveOpen(false)
            toast.success('Ticket resolved. Operator will verify.')
            router.push(MT.breakdowns)
          }}
        />
      )}
    </>
  )
}

function Photo({ src, alt }: { src: string; alt: string }) {
  return (
    <a href={src} target="_blank" rel="noreferrer" className="block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-48 w-full rounded-lg bg-zinc-100 object-cover dark:bg-zinc-800" />
    </a>
  )
}

function Panel({ tone, children }: { tone: 'amber' | 'gray' | 'green' | 'red'; children: React.ReactNode }) {
  const cls = {
    amber: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
    gray: 'border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200',
    green:
      'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
    red: 'border-red-200 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200',
  }[tone]
  return <div className={`space-y-2 rounded-xl border p-4 ${cls}`}>{children}</div>
}

function StatusSection({
  flag,
  busy,
  onAcknowledge,
  onOpenResolve,
}: {
  flag: Breakdown
  busy: boolean
  onAcknowledge: () => void
  onOpenResolve: () => void
}) {
  const by = (name: string | null, at: number | null, fallback: string, word = 'at') =>
    `by ${name ?? fallback}${at ? ` ${word} ${fmtDateTime(at)}` : ''}`

  switch (flag.status) {
    case 'OPEN':
      return (
        <>
          {isKickedBack(flag) && (
            // A QC kick-back reported as OPEN + DISAPPROVED on other devices.
            <Panel tone="red">
              <p className="font-bold">QC disapproved the previous repair</p>
              <p className="text-sm font-semibold">Reason</p>
              <p className="text-sm">{flag.qcDecisionNotes || '(no reason given)'}</p>
            </Panel>
          )}
          <button
            type="button"
            onClick={onAcknowledge}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 text-base font-bold text-black shadow-sm transition hover:bg-amber-400 disabled:opacity-50"
          >
            <Wrench className="h-5 w-5" />
            {busy ? 'Acknowledging…' : 'Acknowledge — I’ll fix this'}
          </button>
        </>
      )
    case 'ACKNOWLEDGED':
      return (
        <>
          <Panel tone="amber">
            <p className="font-semibold">Acknowledged by {flag.acknowledgedByName ?? 'you'}</p>
            {flag.acknowledgedAt && <p className="text-xs opacity-80">at {fmtDateTime(flag.acknowledgedAt)}</p>}
          </Panel>
          <Button variant="success" icon={CheckCircle2} className="w-full py-3" onClick={onOpenResolve} disabled={busy}>
            Mark Resolved
          </Button>
        </>
      )
    case 'PENDING_QC':
      return (
        <Panel tone="gray">
          <p className="font-semibold">Sent to QC — awaiting verification</p>
          <p className="text-sm">Resolved by {flag.resolvedByName ?? 'technician'}</p>
          {flag.resolvedAt && <p className="text-xs text-zinc-500">at {fmtDateTime(flag.resolvedAt)}</p>}
          <hr className="border-zinc-200 dark:border-zinc-700" />
          <p className="text-sm font-semibold">Parts used / work done</p>
          <p className="whitespace-pre-wrap text-sm">{flag.partsUsed || '—'}</p>
          {flag.afterPhotoUrl && <Photo src={flag.afterPhotoUrl} alt="After-repair photo" />}
        </Panel>
      )
    case 'CLOSED':
      return (
        <Panel tone="green">
          <p className="text-lg font-bold">QC approved</p>
          <p className="text-xs">{by(flag.qcDecidedByName, flag.qcDecidedAt, 'QC')}</p>
          {flag.qcDecisionNotes?.trim() && (
            <>
              <hr className="border-emerald-200 dark:border-emerald-500/30" />
              <p className="text-sm font-semibold">QC notes</p>
              <p className="whitespace-pre-wrap text-sm">{flag.qcDecisionNotes}</p>
            </>
          )}
        </Panel>
      )
    case 'REOPENED':
      return (
        <>
          <Panel tone="red">
            <p className="text-lg font-bold">QC disapproved</p>
            <p className="text-xs">{by(flag.qcDecidedByName, flag.qcDecidedAt, 'QC', 'on')}</p>
            <hr className="border-red-200 dark:border-red-500/30" />
            <p className="text-sm font-semibold">Reason</p>
            <p className="whitespace-pre-wrap text-sm">{flag.qcDecisionNotes ?? ''}</p>
          </Panel>
          <Button variant="success" icon={CheckCircle2} className="w-full py-3" onClick={onOpenResolve} disabled={busy}>
            Rework
          </Button>
        </>
      )
  }
}

function ResolveModal({
  open,
  flag,
  userId,
  userName,
  onClose,
  onResolved,
}: {
  open: boolean
  flag: Breakdown
  userId: string
  userName: string
  onClose: () => void
  onResolved: () => void
}) {
  const [workDone, setWorkDone] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [spares, setSpares] = useState<SpareLine[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Spares survive backing out of the sheet (and a page reload); the text and photo start fresh.
  useEffect(() => {
    setSpares(loadBreakdownSpares(flag.id))
  }, [flag.id])
  useEffect(() => {
    if (open) {
      setWorkDone('')
      setPhoto(null)
      setError(null)
    }
  }, [open])

  const updateSpares = (next: SpareLine[]) => {
    setSpares(next)
    saveBreakdownSpares(flag.id, next)
  }

  const canSubmit = !submitting && workDone.trim().length >= MIN_WORK_DONE_CHARS && !!photo

  const submit = async () => {
    const invalid = validateResolution(workDone, photo)
    if (invalid) {
      setError(invalid)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await submitBreakdownWorkDone(flag.id, { userId, userName, workDone, spares, afterPhoto: photo })
      // The server owns the spares now; a later rework must not re-post them.
      saveBreakdownSpares(flag.id, [])
      setSpares([])
      onResolved()
    } catch (e: any) {
      const msg = e?.message || "Couldn't submit the repair to the server. Check your connection and try again."
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Modal
        open={open && !pickerOpen}
        onClose={() => !submitting && onClose()}
        title="Resolve ticket"
        size="lg"
        footer={
          <Button variant="success" className="w-full sm:w-auto" onClick={submit} loading={submitting} disabled={!canSubmit}>
            Submit resolution
          </Button>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-zinc-500">Document what you did. Operator must verify before machine can resume.</p>

          {/* Spares first: these move stock; the text box only records what was done. */}
          <SpareLinesCard
            lines={spares}
            onAdd={() => setPickerOpen(true)}
            onRemove={(s) => updateSpares(spares.filter((l) => l.id !== s.id))}
            emptyText="None logged. Add any part you took from stock."
            disabled={submitting}
          />

          <Field label="Work done" hint={`At least ${MIN_WORK_DONE_CHARS} characters.`}>
            <Textarea
              rows={4}
              value={workDone}
              onChange={(e) => {
                setWorkDone(e.target.value)
                setError(null)
              }}
              placeholder="e.g. replaced V-belt, cleaned filter, tightened mounts"
              disabled={submitting}
            />
          </Field>

          <PhotoCapture
            file={photo}
            onChange={setPhoto}
            title="After-repair photo (required)"
            captureLabel="Capture after-repair photo"
            disabled={submitting}
          />

          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
      </Modal>

      <SparePartPickerModal
        open={open && pickerOpen}
        assetId={flag.machineId}
        onClose={() => setPickerOpen(false)}
        onConfirm={(pick, qty, notes) => {
          const r = addSpareLine(
            spares,
            pick,
            qty,
            notes,
            userId,
            `You can log at most ${MAX_WO_SPARES} spare parts on one repair.`,
          )
          if ('error' in r) toast.error(r.error)
          else updateSpares(r.lines)
          setPickerOpen(false)
        }}
      />
    </>
  )
}
