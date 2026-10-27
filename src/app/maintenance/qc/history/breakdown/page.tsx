'use client'

import { useEffect, useState } from 'react'
import { Printer } from 'lucide-react'
import { useMtQuery } from '@/lib/maintenance/hooks'
import { MT } from '@/lib/maintenance/nav'
import { listBreakdownRecords, type BreakdownRecord } from '@/lib/maintenance/api/qc'
import { Button, Card, EmptyState, ErrorBanner, PageHeader, SkeletonRows } from '@/components/maintenance/ui'
import { F06PrintSheet } from '@/components/maintenance/qc/F06PrintSheet'

/** QC read-only list of submitted F.06 / F.61 breakdown records
 *  (QcBreakdownHistoryScreen). The whole record is on the card; the per-row
 *  download prints that record as the controlled-copy sheet. */
export default function QcBreakdownHistoryPage() {
  const { data, error, loading, reload } = useMtQuery(
    async () => (await listBreakdownRecords()).sort((a, b) => b.id - a.id),
    [],
  )
  const [printing, setPrinting] = useState<BreakdownRecord | null>(null)

  // Print once the sheet for the chosen record has rendered.
  useEffect(() => {
    if (!printing) return
    const done = () => setPrinting(null)
    window.addEventListener('afterprint', done)
    const t = setTimeout(() => window.print(), 50)
    return () => {
      clearTimeout(t)
      window.removeEventListener('afterprint', done)
    }
  }, [printing])

  return (
    <>
      <PageHeader title="Breakdown Records" subtitle="View only" back={MT.qcHistory} />
      <ErrorBanner error={error} onRetry={reload} />
      {loading ? (
        <SkeletonRows />
      ) : error ? null : !data?.length ? (
        <EmptyState title="No breakdown records yet." />
      ) : (
        <div className="grid max-w-4xl gap-2">
          {data.map((r) => (
            <Row key={r.id} r={r} busy={printing?.id === r.id} onDownload={() => setPrinting(r)} />
          ))}
        </div>
      )}
      {printing && <F06PrintSheet record={printing} />}
    </>
  )
}

function Row({ r, busy, onDownload }: { r: BreakdownRecord; busy: boolean; onDownload: () => void }) {
  const info: Array<[string, string | undefined]> = [
    ['Type', r.type_of_maintenance],
    ['QC clearance', r.qc_clearance_sign],
    ['Verified by', r.verified_by],
  ]
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-zinc-900 dark:text-zinc-50">{r.machine_name?.trim() || '—'}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {[r.record_date, r.location].filter((s) => s && s.trim()).join(' · ')}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={Printer}
          loading={busy}
          onClick={onDownload}
          aria-label={`Download ${r.doc_no ?? 'record'}`}
        >
          Download
        </Button>
      </div>
      {r.problem_in_brief?.trim() && <p className="mt-1.5 text-sm text-zinc-800 dark:text-zinc-100">{r.problem_in_brief}</p>}
      <div className="mt-1 space-y-0.5">
        {info
          .filter(([, v]) => v && v.trim())
          .map(([label, v]) => (
            <p key={label} className="text-xs text-zinc-500 dark:text-zinc-400">
              {label}: {v}
            </p>
          ))}
      </div>
    </Card>
  )
}
