'use client'

/**
 * Preventive checklist register — presentation/checklist/PreventiveListScreen
 * + PreventiveListViewModel. The technician's own plant's records with
 * Create; `readOnly` is the Head's "Checklist Records" (submitted only, every
 * card opens the read-only record).
 */

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Eye, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { getChecklist, isDraft, listChecklists, type ChecklistRecordSummary } from '@/lib/maintenance/api/checklist'
import { useMtQuery, useMtSession } from '@/lib/maintenance/hooks'
import { MT } from '@/lib/maintenance/nav'
import { Badge, Button, Card, Chips, EmptyState, ErrorBanner, PageHeader, SkeletonRows } from '@/components/maintenance/ui'
import { formTypeLabel, isSpecificPlant, periodLabel, plantOf, plantOfRecord } from './logic'
import { preventivePrintJob, usePrintDoc } from './PrintDoc'

type PlantFilter = 'ALL' | 'W202' | 'A185'

export function PreventiveList({ readOnly = false }: { readOnly?: boolean }) {
  const router = useRouter()
  const session = useMtSession()
  const ownPlant = session ? plantOf(session.plantId) : null
  // A Head whose plant is "both" picks one; everyone else sees only their own plant.
  const canPickPlant = readOnly && !!session && !isSpecificPlant(session.plantId)
  const [plantFilter, setPlantFilter] = useState<PlantFilter>('ALL')

  const { data, error, loading, reload } = useMtQuery(
    // Read-only consumers ask the server to leave DRAFTs out.
    () => listChecklists(readOnly ? 'SUBMITTED' : undefined),
    [readOnly],
  )

  // Reload whenever the tab comes back (e.g. after submitting in another tab).
  useEffect(() => {
    const onVis = () => document.visibilityState === 'visible' && reload()
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [reload])

  const records = useMemo(() => {
    if (!data || !ownPlant) return []
    const plant = canPickPlant ? plantFilter : ownPlant
    return data.filter(
      (r) => (plant === 'ALL' || plantOfRecord(r.formType, r.docNo) === plant) && !(readOnly && isDraft(r)),
    )
  }, [data, ownPlant, canPickPlant, plantFilter, readOnly])

  const { print, portal } = usePrintDoc()
  const [exportingId, setExportingId] = useState<number | null>(null)

  async function download(id: number) {
    if (exportingId !== null) return
    setExportingId(id)
    try {
      print(preventivePrintJob(await getChecklist(id)))
    } catch (e: any) {
      toast.error(`Couldn't create PDF — ${e?.message ?? 'Request failed'}`)
    } finally {
      setExportingId(null)
    }
  }

  const detailHref = (id: number) => (readOnly ? `${MT.preventiveDetail(id)}?from=head` : MT.preventiveDetail(id))
  const open = (r: ChecklistRecordSummary) =>
    router.push(!readOnly && isDraft(r) ? MT.preventiveForm(r.id) : detailHref(r.id))

  return (
    <div>
      <PageHeader
        title={readOnly ? 'Checklist Records' : 'Preventive Checklist'}
        subtitle={readOnly ? 'Filled preventive maintenance checklists' : 'Records and drafts for your plant'}
        back={readOnly ? MT.head : MT.checklist}
        actions={
          !readOnly && (
            <Button icon={Plus} href={MT.preventiveForm()}>
              Create
            </Button>
          )
        }
      />

      {canPickPlant && (
        <div className="mb-4">
          <Chips<PlantFilter>
            options={[
              { id: 'ALL', label: 'All plants' },
              { id: 'W202', label: 'W-202' },
              { id: 'A185', label: 'A-185' },
            ]}
            value={plantFilter}
            onChange={setPlantFilter}
          />
        </div>
      )}

      {error ? (
        <ErrorBanner error={`Couldn't load records — ${error}.`} onRetry={reload} />
      ) : loading && !data ? (
        <SkeletonRows rows={4} />
      ) : records.length === 0 ? (
        <EmptyState
          title={readOnly ? 'No filled checklists yet.' : 'No checklists yet.'}
          message={readOnly ? undefined : 'Tap Create to fill the first one.'}
          action={
            !readOnly && (
              <Button icon={Plus} href={MT.preventiveForm()}>
                Create
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {records.map((r) => (
            <RecordCard
              key={r.id}
              record={r}
              exporting={exportingId === r.id}
              onOpen={() => open(r)}
              onView={() => router.push(detailHref(r.id))}
              onDownload={() => download(r.id)}
            />
          ))}
        </div>
      )}
      {portal}
    </div>
  )
}

function RecordCard({
  record,
  exporting,
  onOpen,
  onView,
  onDownload,
}: {
  record: ChecklistRecordSummary
  exporting: boolean
  onOpen: () => void
  onView: () => void
  onDownload: () => void
}) {
  const remaining = Math.max(0, record.totalCount - record.filledCount)
  return (
    <Card className="p-4">
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="flex items-center gap-2">
          <p className="flex-1 font-semibold text-zinc-900 dark:text-zinc-50">{formTypeLabel(record.formType)}</p>
          {isDraft(record) && <Badge tone="amber">Draft</Badge>}
        </div>
        {/* The period, not the signature date — auto-generated records leave that blank. */}
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          {periodLabel(record.checklistDateFrom, record.checklistDateTo, record.checklistDate)} · {record.docNo} · #
          {record.id}
        </p>
        {record.totalCount > 0 && (
          <p
            className={clsx(
              'mt-0.5 text-xs',
              remaining === 0 ? 'font-semibold text-factory-700 dark:text-factory-300' : 'text-zinc-500 dark:text-zinc-400',
            )}
          >
            {record.filledCount} / {record.totalCount} filled · {remaining === 0 ? 'complete' : `${remaining} remaining`}
          </p>
        )}
        {record.doneBy.trim() && (
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Done by {record.doneBy}</p>
        )}
      </button>
      <div className="mt-3 flex justify-end gap-2">
        {/* Always the read-only view, even for a draft — tapping the card still edits it. */}
        <Button variant="secondary" size="sm" icon={Eye} onClick={onView}>
          View
        </Button>
        <Button variant="secondary" size="sm" icon={Download} onClick={onDownload} loading={exporting}>
          Download
        </Button>
      </div>
    </Card>
  )
}
