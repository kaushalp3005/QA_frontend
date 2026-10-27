'use client'

import { ChevronRight } from 'lucide-react'
import { useMtQuery } from '@/lib/maintenance/hooks'
import { MT } from '@/lib/maintenance/nav'
import { listChecklists, type ChecklistRecordSummary } from '@/lib/maintenance/api/qc'
import { Badge, Card, EmptyState, ErrorBanner, PageHeader, SkeletonRows } from '@/components/maintenance/ui'

const typeLabel = (formType: string) => {
  switch (formType.toUpperCase()) {
    case 'MONTHLY':
      return 'Monthly'
    case 'QUARTERLY':
      return 'Quarterly'
    default:
      return formType
  }
}

/** QC read-only list of PM checklists — submitted AND drafts (QcPmHistoryScreen).
 *  A row opens the shared preventive detail page, which is view-only and
 *  carries the download. */
export default function QcPmHistoryPage() {
  // No status filter → the backend returns every status; drafts are labelled.
  const { data, error, loading, reload } = useMtQuery(() => listChecklists(), [])

  return (
    <>
      <PageHeader title="PM Checklist Records" subtitle="View & download" back={MT.qcHistory} />
      <ErrorBanner error={error} onRetry={reload} />
      {loading ? (
        <SkeletonRows />
      ) : error ? null : !data?.length ? (
        <EmptyState title="No checklists yet." />
      ) : (
        <div className="grid max-w-4xl gap-2">
          {data.map((r) => (
            <PmRow key={r.id} r={r} />
          ))}
        </div>
      )}
    </>
  )
}

function PmRow({ r }: { r: ChecklistRecordSummary }) {
  const isDraft = (r.status ?? '').toUpperCase() === 'DRAFT'
  return (
    <Card href={MT.preventiveDetail(r.id)} className="group flex items-center gap-3 p-4">
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-2">
          <p className="truncate font-bold text-zinc-900 dark:text-zinc-50">
            {[typeLabel(r.form_type), r.doc_no].filter((s) => s && s.trim()).join(' · ')}
          </p>
          {isDraft && <Badge tone="amber">Draft</Badge>}
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Date: {r.checklist_date?.trim() || '—'}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Done by: {r.done_by?.trim() || '—'}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-factory-600" />
    </Card>
  )
}
