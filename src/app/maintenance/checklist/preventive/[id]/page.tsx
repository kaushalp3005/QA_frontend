'use client'

/**
 * One stored checklist, read-only, with PDF download —
 * presentation/checklist/PreventiveDetailScreen + PreventiveDetailViewModel.
 * ?from=head returns to the Head's Checklist Records.
 */

import { Fragment, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Download } from 'lucide-react'
import clsx from 'clsx'
import { getChecklist, hasDateRange, isDraft, type ChecklistRecordDetail, type ChecklistRecordItem } from '@/lib/maintenance/api/checklist'
import { useMtQuery } from '@/lib/maintenance/hooks'
import { MT } from '@/lib/maintenance/nav'
import { Badge, Button, Card, ErrorBanner, LoadingBlock, PageHeader } from '@/components/maintenance/ui'
import {
  equipmentTitle,
  formTypeLabel,
  isItemFilled,
  itemOutcome,
  periodLabel,
} from '@/components/maintenance/checklist/logic'
import { preventivePrintJob, usePrintDoc } from '@/components/maintenance/checklist/PrintDoc'

function Inner({ id }: { id: number }) {
  const fromHead = useSearchParams().get('from') === 'head'
  const back = fromHead ? MT.headChecklistRecords : MT.preventiveList
  const { data: record, error, loading, reload } = useMtQuery(() => getChecklist(id), [id])
  const { print, printing, portal } = usePrintDoc()

  return (
    <div>
      <PageHeader
        title="Checklist Record"
        back={back}
        actions={
          <Button
            variant="secondary"
            icon={Download}
            disabled={!record}
            loading={printing}
            onClick={() => record && print(preventivePrintJob(record))}
          >
            Download PDF
          </Button>
        }
      />
      {loading && !record ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBanner error={`Couldn't load — ${error}`} onRetry={reload} />
      ) : record ? (
        <RecordBody record={record} />
      ) : null}
      {portal}
    </div>
  )
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm text-zinc-700 dark:text-zinc-300">
      <span className="text-zinc-500 dark:text-zinc-400">{label}:</span> {value.trim() ? value : '—'}
    </p>
  )
}

function RecordBody({ record }: { record: ChecklistRecordDetail }) {
  // Counted here: the detail already carries every item.
  const total = record.items.length
  const filled = record.items.filter((it) => isItemFilled(it.status)).length
  const remaining = Math.max(0, total - filled)

  return (
    <div className="space-y-4">
      <Card className="space-y-1 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-zinc-900 dark:text-zinc-50">
            {formTypeLabel(record.formType)} · {record.docNo}
          </p>
          {isDraft(record) && <Badge tone="amber">Draft</Badge>}
        </div>
        {/* Leads: an auto-generated record has no signature date, and this identifies it. */}
        <InfoLine label="Period" value={periodLabel(record.checklistDateFrom, record.checklistDateTo, record.checklistDate)} />
        {hasDateRange(record) && <InfoLine label="Dates" value={`${record.checklistDateFrom} to ${record.checklistDateTo}`} />}
        {record.checklistDate.trim() && <InfoLine label="Date" value={record.checklistDate} />}
        {total > 0 && (
          <p
            className={clsx(
              'text-sm font-bold',
              remaining === 0 ? 'text-factory-700 dark:text-factory-300' : 'text-zinc-700 dark:text-zinc-300',
            )}
          >
            {filled} / {total} filled · {remaining === 0 ? 'complete' : `${remaining} remaining`}
          </p>
        )}
        <InfoLine label="Done by" value={record.doneBy} />
        <InfoLine label="Checked by" value={record.checkedBy} />
        <InfoLine label="Verified by" value={record.verifiedBy} />
        {record.remarks.trim() && <InfoLine label="Remarks" value={record.remarks} />}
      </Card>

      <Card className="overflow-hidden">
        {record.items.map((item, i) => {
          const prev = record.items[i - 1]
          const newSection = !prev || prev.section !== item.section
          const newEquipment = newSection || prev.equipment !== item.equipment || prev.srNo !== item.srNo
          return (
            <Fragment key={i}>
              {newSection && (
                <p className="border-t border-zinc-200 bg-factory-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-factory-800 first:border-t-0 dark:border-zinc-800 dark:bg-factory-500/10 dark:text-factory-300">
                  {item.section}
                </p>
              )}
              {newEquipment && (
                <p className="border-t border-zinc-200 px-4 pb-1 pt-3 font-bold text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
                  {equipmentTitle(item)}
                </p>
              )}
              <ItemRow item={item} />
            </Fragment>
          )
        })}
      </Card>
    </div>
  )
}

/** A word, not a bare colour; and UNSET reads as pending, never as a failure. */
function ItemRow({ item }: { item: ChecklistRecordItem }) {
  const o = itemOutcome(item.status)
  return (
    <div className="flex items-start gap-3 border-b border-zinc-100 px-4 py-2 last:border-b-0 dark:border-zinc-800/60">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-zinc-800 dark:text-zinc-200">{item.checkpoint.trim() || 'General check'}</p>
        {item.remarks.trim() && <p className="text-xs text-zinc-500 dark:text-zinc-400">{item.remarks}</p>}
      </div>
      <span
        className={clsx(
          'shrink-0 text-xs font-bold',
          o === 'OK' && 'text-factory-700 dark:text-factory-300',
          o === 'NOT_OK' && 'text-red-600 dark:text-red-400',
          o === 'PENDING' && 'text-zinc-400 dark:text-zinc-500',
        )}
      >
        {o === 'OK' ? 'OK' : o === 'NOT_OK' ? 'NOT OK' : '—'}
      </span>
    </div>
  )
}

export default function PreventiveDetailPage({ params }: { params: { id: string } }) {
  const id = Number.parseInt(decodeURIComponent(params.id), 10)
  return (
    <Suspense fallback={<LoadingBlock />}>
      {Number.isFinite(id) ? <Inner id={id} /> : <ErrorBanner error="Couldn't load — invalid record id" />}
    </Suspense>
  )
}
