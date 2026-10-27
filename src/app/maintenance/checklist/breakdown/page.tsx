'use client'

/**
 * Breakdown Checklist — presentation/checklist/BreakdownListScreen + VM.
 * Two sources: the submitted F.06/F.61 rows (downloadable), and the plant's
 * operator breakdowns, of which only QC-approved ones can be completed.
 *
 * Android lists the breakdowns cached in Room (every one the device has
 * seen); the web reads GET /breakdowns/open plus the last 90 days of
 * /breakdowns/history so approved-and-closed ones still appear.
 */

import { useEffect, useMemo } from 'react'
import { ChevronRight, Download, Lock, Plus } from 'lucide-react'
import clsx from 'clsx'
import {
  breakdownHistory,
  listBreakdownSheets,
  listOpenBreakdowns,
  type BreakdownFlagDto,
  type BreakdownRecordDto,
} from '@/lib/maintenance/api/checklist'
import { fmtDate, isoDateIst } from '@/lib/maintenance/format'
import { useMtQuery, useMtSession } from '@/lib/maintenance/hooks'
import { MT } from '@/lib/maintenance/nav'
import { Badge, Button, Card, EmptyState, ErrorBanner, PageHeader, Section, SkeletonRows } from '@/components/maintenance/ui'
import {
  breakdownShortDoc,
  breakdownSpecForDocNo,
  breakdownSpecForPlant,
  breakdownStatusLabel,
  isApproved,
  plantOf,
  recordToF06Row,
} from '@/components/maintenance/checklist/logic'
import { breakdownPrintJob, usePrintDoc } from '@/components/maintenance/checklist/PrintDoc'

async function loadFlags(plant: string): Promise<BreakdownFlagDto[]> {
  const from = isoDateIst(Date.now() - 90 * 86_400_000)
  const [open, hist] = await Promise.allSettled([listOpenBreakdowns(plant), breakdownHistory(from, isoDateIst(), plant)])
  if (open.status === 'rejected' && hist.status === 'rejected') throw open.reason
  const byId = new Map<string, BreakdownFlagDto>()
  for (const f of hist.status === 'fulfilled' ? hist.value ?? [] : []) byId.set(f.id, f)
  // The open feed is the live status; history adds the resolved/QC fields.
  for (const f of open.status === 'fulfilled' ? open.value ?? [] : []) byId.set(f.id, { ...byId.get(f.id), ...f })
  return Array.from(byId.values())
}

export default function BreakdownListPage() {
  const session = useMtSession()
  const plant = session ? plantOf(session.plantId) : null
  const spec = breakdownSpecForPlant(session?.plantId)
  const short = `F.${breakdownShortDoc(spec)}`

  const submittedQ = useMtQuery(async () => (plant ? listBreakdownSheets() : undefined), [plant])
  const flagsQ = useMtQuery(async () => (plant ? loadFlags(plant) : undefined), [plant])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible') return
      submittedQ.reload()
      flagsQ.reload()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [submittedQ.reload, flagsQ.reload]) // eslint-disable-line react-hooks/exhaustive-deps

  // Both plants' sheets come back; doc_no says whose.
  const submitted = useMemo(
    () =>
      (submittedQ.data ?? [])
        .filter((r) => breakdownSpecForDocNo(r.doc_no).plant === plant)
        .sort((a, b) => b.id - a.id),
    [submittedQ.data, plant],
  )

  // A flag with no building can't be attributed, so it stays visible.
  const flags = useMemo(
    () =>
      (flagsQ.data ?? [])
        .filter((f) => !f.building?.trim() || plantOf(f.building) === plant)
        .sort((a, b) => (b.reported_at ?? 0) - (a.reported_at ?? 0)),
    [flagsQ.data, plant],
  )

  const { print, printing, portal } = usePrintDoc()
  const download = (r: BreakdownRecordDto) =>
    print(breakdownPrintJob(breakdownSpecForDocNo(r.doc_no), [recordToF06Row(r)], r.verified_by ?? ''))

  // No plant yet = the session is still resolving, which is loading too.
  const submittedLoading = !plant || (submittedQ.loading && !submittedQ.data)
  const flagsLoading = !plant || (flagsQ.loading && !flagsQ.data)
  const allEmpty = !submittedLoading && !flagsLoading && submitted.length === 0 && flags.length === 0

  return (
    <div>
      <PageHeader
        title="Breakdown Checklist"
        subtitle={`Breakdown maintenance record · ${spec.docNo}`}
        back={MT.checklist}
        actions={
          <Button icon={Plus} href={MT.breakdownSheetForm()}>
            Create
          </Button>
        }
      />

      {submittedLoading && flagsLoading ? (
        <SkeletonRows rows={4} />
      ) : allEmpty && !submittedQ.error && !flagsQ.error ? (
        <EmptyState title="No breakdown records yet." />
      ) : (
        <>
          <Section title={`Submitted ${short} records`}>
            {submittedQ.error ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Couldn&apos;t load submitted records — tap Create to add one, or{' '}
                <button className="font-semibold text-factory-700 hover:underline dark:text-factory-300" onClick={submittedQ.reload}>
                  retry
                </button>
                .
              </p>
            ) : submitted.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{submittedLoading ? 'Loading…' : 'None yet.'}</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {submitted.map((r) => (
                  <SubmittedCard key={r.id} record={r} disabled={printing} onDownload={() => download(r)} />
                ))}
              </div>
            )}
          </Section>

          <Section title="Operator breakdowns (QC-approved can be completed)">
            {flagsQ.error ? (
              <ErrorBanner error={`Couldn't load operator breakdowns — ${flagsQ.error}`} onRetry={flagsQ.reload} />
            ) : flags.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {flagsLoading ? 'Loading…' : 'No operator breakdowns yet.'}
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {flags.map((f) => (
                  <FlagCard key={f.id} flag={f} short={short} />
                ))}
              </div>
            )}
          </Section>
        </>
      )}
      {portal}
    </div>
  )
}

function SubmittedCard({ record, disabled, onDownload }: { record: BreakdownRecordDto; disabled: boolean; onDownload: () => void }) {
  const name = record.machine_name?.trim() ? record.machine_name : record.equipment_model_no ?? ''
  return (
    <Card className="p-4">
      <p className="font-semibold text-zinc-900 dark:text-zinc-50">{name || '—'}</p>
      {record.location?.trim() && <p className="text-xs text-zinc-500 dark:text-zinc-400">{record.location}</p>}
      <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-300">
        {record.record_date ?? ''} · {record.problem_in_brief ?? ''}
      </p>
      <div className="mt-3 flex justify-end">
        <Button variant="secondary" size="sm" icon={Download} onClick={onDownload} disabled={disabled}>
          Download
        </Button>
      </div>
    </Card>
  )
}

function FlagCard({ flag, short }: { flag: BreakdownFlagDto; short: string }) {
  const name = flag.asset_name?.trim() ? flag.asset_name : flag.asset_id
  const approved = isApproved(flag)
  const body = (
    <div className={clsx('p-4', !approved && 'opacity-60')}>
      <div className="flex items-center gap-2">
        <p className="flex-1 font-semibold text-zinc-900 dark:text-zinc-50">{name}</p>
        <Badge tone={approved ? 'teal' : 'gray'}>{breakdownStatusLabel(flag)}</Badge>
      </div>
      {flag.building?.trim() && <p className="text-xs text-zinc-500 dark:text-zinc-400">{flag.building}</p>}
      <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-300">
        {fmtDate(flag.reported_at)} · {flag.description ?? ''}
      </p>
      {approved ? (
        <p className="mt-2 flex items-center text-xs font-semibold text-factory-700 dark:text-factory-300">
          <span className="flex-1">Tap to complete {short}</span>
          <ChevronRight className="h-4 w-4" />
        </p>
      ) : (
        <p className="mt-2 flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          <Lock className="h-3.5 w-3.5" /> Awaiting QC approval
        </p>
      )}
    </div>
  )
  return approved ? <Card href={MT.breakdownSheetForm(flag.id)}>{body}</Card> : <Card>{body}</Card>
}
