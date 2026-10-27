'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { Check, Save } from 'lucide-react'
import { Button, Card, EmptyState, ErrorBanner, Field, LoadingBlock, PageHeader, Textarea } from '@/components/maintenance/ui'
import { SparePartPickerModal, SpareLinesCard } from '@/components/maintenance/technician/SparePartPicker'
import { TaskResultPill } from '@/components/maintenance/technician/TaskResultPill'
import { clearPmDraft, loadPmDraft, savePmDraft, type PmLogDraft } from '@/components/maintenance/technician/drafts'
import { useMtQuery, useMtSession } from '@/lib/maintenance/hooks'
import { MT } from '@/lib/maintenance/nav'
import {
  getWorkOrder,
  submitWorkOrder,
  type PmOverallResult,
  type PmTaskLog,
  type PmWorkOrder,
} from '@/lib/maintenance/api/technicianPm'
import { addSpareLine, MAX_WO_SPARES, type SpareLine } from '@/lib/maintenance/api/technicianSpares'

/**
 * PM execution (TechnicianPmExecuteScreen): one checklist item at a time —
 * "Is good?" ticked = PASS (remark optional), unticked = FAIL (remark required) —
 * then a summary with spares, final notes and the machine-level Pass/Fail.
 *
 * The backend takes the results only at submit, so answers and spares are kept
 * on this device (as the Android app keeps them in Room) until then.
 */
export default function PmExecutePage({ params }: { params: { woId: string } }) {
  const woId = decodeURIComponent(params.woId)
  const q = useMtQuery(() => getWorkOrder(woId), [woId])

  return (
    <>
      <ErrorBanner error={q.error} onRetry={q.reload} />
      {q.loading && !q.data ? (
        <LoadingBlock />
      ) : !q.data ? (
        !q.error && <EmptyState title="Work order not found." />
      ) : q.data.status !== 'IN_PROGRESS' ? (
        <NotExecutable wo={q.data} />
      ) : (
        <Executor wo={q.data} />
      )}
    </>
  )
}

function NotExecutable({ wo }: { wo: PmWorkOrder }) {
  const notStarted = wo.status === 'NOTIFIED' || wo.status === 'ACKNOWLEDGED'
  return (
    <>
      <PageHeader title={wo.template_name || 'PM work order'} back={MT.pmDetail(wo.id)} />
      <EmptyState
        title={notStarted ? 'This PM has not been started' : 'This PM is no longer in progress'}
        message={
          notStarted
            ? 'Acknowledge and start it from the work order first.'
            : `It is ${wo.status.replace(/_/g, ' ').toLowerCase()} — there is nothing left to fill in.`
        }
        action={<Button href={MT.pmDetail(wo.id)}>Open work order</Button>}
      />
    </>
  )
}

const NOT_GOOD_HINT = 'Not marked good — add a remark describing the issue before continuing.'

interface ItemDraft {
  isGood: boolean
  notes: string
}

const toItemDraft = (l: PmTaskLog | undefined): ItemDraft | null =>
  l ? { isGood: l.status === 'PASS', notes: l.notes ?? '' } : null

function Executor({ wo }: { wo: PmWorkOrder }) {
  const router = useRouter()
  const session = useMtSession()
  const total = wo.task_logs.length

  // Resume from this device's draft over the server copy; first PENDING item, or the summary.
  const initial = useMemo(() => {
    const d = loadPmDraft(wo.id)
    const logs = wo.task_logs.map((l) => (d?.logs[l.id] ? { ...l, ...d.logs[l.id] } : l))
    const firstPending = logs.findIndex((l) => l.status === 'PENDING')
    const serverResult = wo.overall_result === 'PASS' || wo.overall_result === 'FAIL' ? wo.overall_result : null
    return {
      logs,
      spares: d ? d.spares : wo.spares,
      finalNotes: d?.finalNotes || wo.final_notes || '',
      overallResult: (d?.overallResult ?? serverResult) as PmOverallResult | null,
      index: firstPending < 0 ? logs.length : firstPending,
    }
  }, [wo])

  const [logs, setLogs] = useState<PmTaskLog[]>(initial.logs)
  const [spares, setSpares] = useState<SpareLine[]>(initial.spares)
  const [finalNotes, setFinalNotes] = useState(initial.finalNotes)
  const [overallResult, setOverallResult] = useState<PmOverallResult | null>(initial.overallResult)
  const [index, setIndex] = useState(initial.index)
  const [draft, setDraft] = useState<ItemDraft | null>(toItemDraft(initial.logs[initial.index]))
  const [pickerOpen, setPickerOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const topRef = useRef<HTMLDivElement>(null)

  // Keep the device draft in step with every answer.
  useEffect(() => {
    const answered: Record<string, PmLogDraft> = {}
    for (const l of logs) {
      if (l.status !== 'PENDING')
        answered[l.id] = {
          status: l.status,
          notes: l.notes ?? null,
          completed_at: l.completed_at ?? Date.now(),
          completed_by: l.completed_by ?? '',
        }
    }
    savePmDraft(wo.id, { logs: answered, spares, finalNotes, overallResult })
  }, [wo.id, logs, spares, finalNotes, overallResult])

  if (!session) return null

  const onSummary = index >= total
  const current = logs[index]

  const goTo = (i: number) => {
    const safe = Math.max(0, Math.min(i, total))
    setIndex(safe)
    setDraft(toItemDraft(logs[safe]))
    topRef.current?.scrollIntoView({ block: 'start' })
  }

  const onNext = () => {
    if (!draft || !current) return
    if (!draft.isGood && !draft.notes.trim()) {
      toast.error('This item is not marked good — add a remark explaining the issue, or tick "Is good?".')
      return
    }
    const updated: PmTaskLog = {
      ...current,
      status: draft.isGood ? 'PASS' : 'FAIL',
      notes: draft.notes.trim() ? draft.notes.trim() : null,
      completed_at: Date.now(),
      completed_by: session.userId,
    }
    const next = logs.map((l, i) => (i === index ? updated : l))
    setLogs(next)
    setIndex(index + 1)
    setDraft(toItemDraft(next[index + 1]))
    topRef.current?.scrollIntoView({ block: 'start' })
  }

  const saveAndExit = () => {
    toast.success('Draft saved on this device.')
    router.push(MT.pmDetail(wo.id))
  }

  const submit = async () => {
    if (logs.some((l) => l.status === 'PENDING')) {
      toast.error('Answer "Is good?" on every item before submit.')
      return
    }
    if (!overallResult) {
      toast.error('Select the machine result — Pass or Fail — before submit.')
      return
    }
    setSubmitting(true)
    try {
      await submitWorkOrder(wo.id, {
        final_notes: finalNotes.trim(),
        overall_result: overallResult,
        at: Date.now(),
        task_logs: logs.map((l) => ({
          id: l.id,
          template_item_id: l.template_item_id ?? null,
          order_index: l.order_index,
          title: l.title,
          description: l.description,
          status: l.status,
          notes: l.notes ?? null,
          completed_at: l.completed_at ?? null,
          completed_by: l.completed_by ?? null,
        })),
        spares,
      })
      clearPmDraft(wo.id)
      toast.success('Submitted for supervisor approval.')
      router.push(MT.pm)
    } catch (e: any) {
      toast.error(e?.message || 'Submit failed — your answers are still saved on this device.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div ref={topRef} className="mx-auto max-w-2xl scroll-mt-20">
      <PageHeader
        title={onSummary ? 'Summary' : `Item ${index + 1} of ${total}`}
        subtitle={wo.machine_name || wo.template_name}
        back={MT.pmDetail(wo.id)}
      />

      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-factory-600 transition-all"
          style={{ width: `${(Math.min(index, total) / Math.max(total, 1)) * 100}%` }}
        />
      </div>

      {!onSummary && current && draft ? (
        <div className="space-y-4">
          <Card className="p-4">
            <p className="font-bold text-zinc-900 dark:text-zinc-50">{current.title}</p>
            {current.description.trim() && (
              <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{current.description}</p>
            )}
          </Card>

          <button
            type="button"
            onClick={() => setDraft({ ...draft, isGood: !draft.isGood })}
            className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-left dark:border-zinc-800 dark:bg-zinc-900"
            aria-pressed={draft.isGood}
          >
            <span
              className={clsx(
                'inline-flex h-6 w-6 items-center justify-center rounded border-2 transition',
                draft.isGood
                  ? 'border-factory-600 bg-factory-600 text-white'
                  : 'border-zinc-400 bg-white dark:border-zinc-600 dark:bg-zinc-900',
              )}
            >
              {draft.isGood && <Check className="h-4 w-4" />}
            </span>
            <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Is good?</span>
          </button>

          <Field
            label={draft.isGood ? 'Remarks (optional)' : 'Remarks (required)'}
            error={!draft.isGood && !draft.notes.trim() ? NOT_GOOD_HINT : null}
            hint={!draft.isGood ? NOT_GOOD_HINT : undefined}
          >
            <Textarea
              rows={3}
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              className={clsx(!draft.isGood && !draft.notes.trim() && 'border-red-400')}
            />
          </Field>

          <div className="flex gap-2">
            {index > 0 && (
              <Button variant="secondary" className="flex-1" onClick={() => goTo(index - 1)}>
                Back
              </Button>
            )}
            <Button className="flex-[2] py-2.5" onClick={onNext}>
              {index === total - 1 ? 'Finish items' : 'Next'}
            </Button>
          </div>
          <Button variant="ghost" icon={Save} className="w-full" onClick={saveAndExit}>
            Save draft &amp; exit
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="p-4">
            <p className="mb-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">Items</p>
            {total === 0 ? (
              <p className="text-xs text-zinc-500">This work order has no checklist items.</p>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {logs.map((l, i) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => goTo(i)}
                      className="flex w-full items-center gap-2 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    >
                      <span className="w-7 shrink-0 font-bold text-zinc-500">{i + 1}.</span>
                      <span className="min-w-0 flex-1 text-zinc-900 dark:text-zinc-100">{l.title}</span>
                      <TaskResultPill status={l.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <SpareLinesCard
            lines={spares}
            onAdd={() => setPickerOpen(true)}
            onRemove={(s) => setSpares(spares.filter((l) => l.id !== s.id))}
            emptyText="No spares logged yet."
            disabled={submitting}
          />

          <Field label="Final notes (optional)">
            <Textarea rows={3} value={finalNotes} onChange={(e) => setFinalNotes(e.target.value)} disabled={submitting} />
          </Field>

          <Card className="p-4">
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Machine result</p>
            <p className="mb-3 text-xs text-zinc-500">Overall verdict for this machine after the PM.</p>
            <div className="grid grid-cols-2 gap-2">
              <ResultButton label="Pass" value="PASS" selected={overallResult} onSelect={setOverallResult} />
              <ResultButton label="Fail" value="FAIL" selected={overallResult} onSelect={setOverallResult} />
            </div>
          </Card>

          <Button
            variant="success"
            className="w-full py-3.5 text-base"
            loading={submitting}
            disabled={!overallResult}
            onClick={submit}
          >
            Submit for supervisor approval
          </Button>
          <Button variant="ghost" icon={Save} className="w-full" onClick={saveAndExit} disabled={submitting}>
            Save draft &amp; exit
          </Button>
          <p className="text-center text-xs text-zinc-500">
            Answers are kept on this device until you submit.{' '}
            <Link href={MT.pmDetail(wo.id)} className="font-semibold text-factory-700 hover:underline dark:text-factory-300">
              Work order
            </Link>
          </p>
        </div>
      )}

      <SparePartPickerModal
        open={pickerOpen}
        assetId={wo.machine_id}
        onClose={() => setPickerOpen(false)}
        onConfirm={(pick, qty, notes) => {
          const r = addSpareLine(spares, pick, qty, notes, session.userId, `You can log at most ${MAX_WO_SPARES} spare parts on one PM.`)
          if ('error' in r) toast.error(r.error)
          else setSpares(r.lines)
          setPickerOpen(false)
        }}
      />
    </div>
  )
}

function ResultButton({
  label,
  value,
  selected,
  onSelect,
}: {
  label: string
  value: PmOverallResult
  selected: PmOverallResult | null
  onSelect: (v: PmOverallResult) => void
}) {
  const on = selected === value
  const pass = value === 'PASS'
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      aria-pressed={on}
      className={clsx(
        'h-14 rounded-lg border-2 text-base font-bold transition',
        pass
          ? on
            ? 'border-emerald-600 bg-emerald-600 text-white'
            : 'border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10'
          : on
            ? 'border-red-600 bg-red-600 text-white'
            : 'border-red-600 text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10',
      )}
    >
      {label}
    </button>
  )
}
