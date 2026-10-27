'use client'

/**
 * Day-by-day meter history shared by A-185 (HT / Cold / UV) and W-202
 * (Main / Solar): newest first, tap a day to edit, HEAD-only delete behind a
 * confirm, and a download of what's listed. The two Android screens are
 * deliberate mirrors of each other, so they share one web component.
 */
import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Card, ConfirmDialog, EmptyState, ErrorBanner, Modal, PageHeader, SkeletonRows } from '@/components/maintenance/ui'
import { MtApiError } from '@/lib/maintenance/client'
import { MT } from '@/lib/maintenance/nav'
import { DownloadButton, Metric } from './fields'

export interface MeterHistoryRow {
  date: string
  href: string
  metrics: Array<{ label: string; value: string }>
  remark?: string | null
}

export function MeterHistory({
  title,
  addHref,
  rows,
  loading,
  error,
  onRetry,
  emptyText,
  canDelete,
  deleteMessage,
  forbiddenMessage,
  onDelete,
  onDownload,
}: {
  title: string
  addHref: string
  rows: MeterHistoryRow[]
  loading: boolean
  error: string | null
  onRetry: () => void
  emptyText: string
  canDelete: boolean
  deleteMessage: (date: string) => string
  /** Shown instead of the server text on a 403 */
  forbiddenMessage: string
  onDelete: (date: string) => Promise<unknown>
  onDownload: () => void
}) {
  const [pending, setPending] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function confirmDelete() {
    if (!pending) return
    const date = pending
    setDeleting(true)
    try {
      await onDelete(date)
      toast.success(`Deleted ${date}`)
      onRetry()
    } catch (e: any) {
      setDeleteError(e instanceof MtApiError && e.status === 403 ? forbiddenMessage : e?.message || 'Failed to delete')
    } finally {
      setDeleting(false)
      setPending(null)
    }
  }

  return (
    <>
      <PageHeader
        title={title}
        back={MT.dailyReading}
        actions={
          <>
            <DownloadButton disabled={rows.length === 0} onClick={onDownload} />
            <Button icon={Plus} href={addHref}>
              Add reading
            </Button>
          </>
        }
      />

      {loading ? (
        <SkeletonRows />
      ) : error ? (
        <ErrorBanner error={error} onRetry={onRetry} />
      ) : rows.length === 0 ? (
        <EmptyState title="No readings yet" message={emptyText} />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.date} className="relative p-4 transition hover:border-factory-500/60 hover:shadow-md">
              {/* Whole card opens the day; the delete icon sits above the link. */}
              <Link href={r.href} className="absolute inset-0 rounded-xl" aria-label={`Edit ${r.date}`} />
              <div className="pointer-events-none relative">
                <p className="pr-8 font-bold text-zinc-900 dark:text-zinc-50">{r.date}</p>
                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
                  {r.metrics.map((m) => (
                    <Metric key={m.label} label={m.label} value={m.value} />
                  ))}
                </div>
                {r.remark?.trim() && <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{r.remark}</p>}
              </div>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => setPending(r.date)}
                  className="absolute right-3 top-3 rounded-md p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                  aria-label={`Delete ${r.date}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pending}
        title={`Delete ${pending ?? ''}?`}
        message={pending ? deleteMessage(pending) : ''}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => !deleting && setPending(null)}
      />

      <Modal
        open={!!deleteError}
        onClose={() => setDeleteError(null)}
        title="Could not delete"
        size="sm"
        footer={<Button onClick={() => setDeleteError(null)}>OK</Button>}
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-300">{deleteError}</p>
      </Modal>
    </>
  )
}
