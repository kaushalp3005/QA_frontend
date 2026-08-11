'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ChevronRight,
  Eye,
  ImageOff,
  Loader2,
  Pencil,
  Plus,
  Printer,
  Trash2,
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ModuleGuard from '@/components/ModuleGuard'
import PageHeader from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Loader'
import WarehouseSelector from '@/components/ui/WarehouseSelector'
import { formatDateShort } from '@/lib/date-utils'
import { isDocAdminFor } from '@/lib/api/documentations'
import {
  detailOf,
  DOC_META,
  isDraft,
  printingLabelsApi,
  type PrintingLabelRecord,
} from '@/lib/api/printingLabels'

const PER_PAGE = 25

/** Entries recorded against one date — one page of the paper register. */
interface DateGroup {
  /** entry_date as stored ('' when the entry has none). Also the group key. */
  date: string
  label: string
  /** The group's entries as they appear on this page of the listing. */
  onPage: PrintingLabelRecord[]
}

export default function Section1Page() {
  return (
    <ModuleGuard module="section_1">
      <DashboardLayout>
        <BatchCodingRegister />
      </DashboardLayout>
    </ModuleGuard>
  )
}

function BatchCodingRegister() {
  const [records, setRecords] = useState<PrintingLabelRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  // Bumped after a delete to re-run the fetch below without duplicating it.
  const [reloadKey, setReloadKey] = useState(0)

  // One date open at a time, plus its full set of entries. The listing is
  // paginated by record, so a date can straddle a page boundary — expanding
  // therefore asks the by-date endpoint rather than trusting what is on screen.
  const [openDate, setOpenDate] = useState<string | null>(null)
  const [entriesByDate, setEntriesByDate] = useState<Record<string, PrintingLabelRecord[]>>({})
  const [loadingDate, setLoadingDate] = useState<string | null>(null)

  // Switching plant changes what this listing is: drop the cached days, close
  // any open group and go back to page 1, then refetch. docsApi.list stamps the
  // active warehouse onto the query, so the fetch below picks the new one up.
  useEffect(() => {
    function onWarehouseChanged() {
      setEntriesByDate({})
      setOpenDate(null)
      setPage(1)
      setReloadKey((k) => k + 1)
    }
    window.addEventListener('warehouseChanged', onWarehouseChanged)
    return () => window.removeEventListener('warehouseChanged', onWarehouseChanged)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    printingLabelsApi
      .list({ page, per_page: PER_PAGE })
      .then((res) => {
        if (cancelled) return
        setRecords(res.records || [])
        setTotal(res.total || 0)
        setTotalPages(res.total_pages || 0)
        setError('')
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load entries')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [page, reloadKey])

  // Collapse date groups in listing order (the API returns newest first).
  const groups = useMemo<DateGroup[]>(() => {
    const byDate = new Map<string, PrintingLabelRecord[]>()
    for (const r of records) {
      const key = r.entry_date ?? ''
      const bucket = byDate.get(key)
      if (bucket) bucket.push(r)
      else byDate.set(key, [r])
    }
    return Array.from(byDate, ([date, onPage]) => ({
      date,
      label: date ? formatDateShort(date) : 'No date',
      onPage,
    }))
  }, [records])

  /** The entries to show for a group: the authoritative by-date set once
   *  fetched, otherwise what this page happens to hold. */
  function entriesOf(group: DateGroup): PrintingLabelRecord[] {
    return entriesByDate[group.date] ?? group.onPage
  }

  async function toggleDate(group: DateGroup) {
    if (openDate === group.date) {
      setOpenDate(null)
      return
    }
    setOpenDate(group.date)

    // An entry with no date cannot be looked up by one — show what we have.
    if (!group.date || entriesByDate[group.date]) return

    setLoadingDate(group.date)
    try {
      // No warehouse filter, matching the listing above — a date must expand to
      // every entry written on it, whichever plant stamped them.
      // includeDrafts: the listing is where a half-filled entry gets picked back
      // up, so drafts must appear here. Only the printed register hides them.
      const rows = await printingLabelsApi.byDate(group.date, null, true)
      setEntriesByDate((m) => ({ ...m, [group.date]: rows.length ? rows : group.onPage }))
    } catch (err: any) {
      setError(err.message || 'Failed to load entries for this date')
    } finally {
      setLoadingDate(null)
    }
  }

  async function handleDelete(record: PrintingLabelRecord) {
    const product = detailOf(record, 'Product Name')
    const what = product ? `the entry for ${product}` : 'this entry'
    if (!confirm(`Delete ${what} dated ${formatDateShort(record.entry_date)}? This cannot be undone.`))
      return

    setDeletingId(record.id)
    setError('')
    try {
      await printingLabelsApi.remove(record.id)
      // Drop the cached day so it is re-fetched with the row gone.
      setEntriesByDate((m) => {
        const { [record.entry_date ?? '']: _gone, ...rest } = m
        return rest
      })
      // Step back a page when the last row on it just went.
      if (records.length === 1 && page > 1) setPage((p) => p - 1)
      else setReloadKey((k) => k + 1)
    } catch (err: any) {
      setError(err.message || 'Failed to delete entry')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Batch Coding Register"
        subtitle={`${DOC_META.docNo} · Issue No ${DOC_META.issueNo}`}
        icon={Printer}
        badge={
          total > 0 ? (
            <span className="rounded-full bg-cream-200 px-2.5 py-0.5 text-[11px] font-bold text-ink-500">
              {total}
            </span>
          ) : null
        }
        actions={
          <>
            <WarehouseSelector />
            <Link href="/printing-label/create" className="btn-base btn-primary">
              <Plus className="h-4 w-4" />
              New entry
            </Link>
          </>
        }
      />

      {error && (
        <div className="mb-4 rounded-xl border border-danger-200 bg-danger-50 p-3 text-sm font-medium text-danger-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-24">
          <Spinner size={28} />
        </div>
      ) : records.length === 0 ? (
        <div className="surface-card p-12 text-center">
          <p className="text-sm font-medium text-ink-400">No entries yet.</p>
          <Link href="/printing-label/create" className="btn-base btn-primary mt-5">
            <Plus className="h-4 w-4" />
            Add the first entry
          </Link>
        </div>
      ) : (
        <>
          <div className="surface-card overflow-hidden">
            <div className="table-wrap">
              <table className="w-full">
                <thead className="border-b border-cream-300 bg-cream-100">
                  <tr>
                    <th className="w-9 px-2 py-2.5" aria-label="Expand" />
                    {['Date', 'Entries', 'Products'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-400"
                      >
                        {h}
                      </th>
                    ))}
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-300">
                  {groups.map((group) => {
                    const isOpen = openDate === group.date
                    const entries = entriesOf(group)
                    const products = Array.from(
                      new Set(entries.map((r) => detailOf(r, 'Product Name')).filter(Boolean)),
                    )
                    return (
                      <DateRows
                        key={group.date || 'no-date'}
                        group={group}
                        entries={entries}
                        products={products}
                        isOpen={isOpen}
                        isLoading={loadingDate === group.date}
                        deletingId={deletingId}
                        onToggle={() => toggleDate(group)}
                        onDelete={handleDelete}
                      />
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs font-medium text-ink-400">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="btn-base btn-outline"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="btn-base btn-outline"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/** One date's summary row plus, when open, its entries. */
function DateRows({
  group,
  entries,
  products,
  isOpen,
  isLoading,
  deletingId,
  onToggle,
  onDelete,
}: {
  group: DateGroup
  entries: PrintingLabelRecord[]
  products: string[]
  isOpen: boolean
  isLoading: boolean
  deletingId: number | null
  onToggle: () => void
  onDelete: (record: PrintingLabelRecord) => void
}) {
  // The print route prints the whole date it belongs to, so any entry of the
  // group is a valid entry point to the combined sheet.
  const printId = entries[0]?.id

  return (
    <>
      <tr onClick={onToggle} className="cursor-pointer hover:bg-cream-100">
        <td className="px-2 py-2.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-cream-200 hover:text-brand-500"
            aria-expanded={isOpen}
            aria-label={isOpen ? `Collapse ${group.label}` : `Expand ${group.label}`}
          >
            <ChevronRight
              className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
            />
          </button>
        </td>
        <td className="px-4 py-2.5 text-sm font-semibold text-brand-500">{group.label}</td>
        <td className="px-4 py-2.5 text-sm text-ink-600">
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-400" />
          ) : (
            <span className="rounded-full bg-cream-200 px-2 py-0.5 text-[11px] font-bold text-ink-500">
              {entries.length}
            </span>
          )}
        </td>
        <td className="px-4 py-2.5 text-sm text-ink-600">
          {products.length ? products.join(', ') : '—'}
        </td>
        <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-2">
            {printId != null && (
              <Link
                href={`/printing-label/${printId}/print`}
                className="action-btn-3d action-btn-green"
                title={`Print every entry dated ${group.label}`}
                aria-label={`Print every entry dated ${group.label}`}
              >
                <Printer className="h-4 w-4" />
              </Link>
            )}
          </div>
        </td>
      </tr>

      {isOpen && (
        <tr className="bg-cream-100/50">
          <td colSpan={5} className="p-0">
            {isLoading ? (
              <p className="flex items-center gap-2 px-6 py-4 text-xs font-medium text-ink-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading entries for {group.label}…
              </p>
            ) : (
              <div className="px-3 py-3">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-cream-300">
                      {['#', 'Product', 'Batch No', 'Label', 'Printed By', 'Approved By'].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-ink-400"
                          >
                            {h}
                          </th>
                        ),
                      )}
                      <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-ink-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-300">
                    {entries.map((r, i) => (
                      <tr key={r.id} className="hover:bg-cream-100">
                        <td className="px-3 py-2 text-sm font-medium text-ink-400">{i + 1}</td>
                        <td className="px-3 py-2 text-sm text-ink-600">
                          {detailOf(r, 'Product Name') || '—'}
                          {isDraft(r) && (
                            <span className="status-draft ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                              Draft
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono text-sm text-ink-600">
                          {detailOf(r, 'Batch No') || '—'}
                        </td>
                        <td className="px-3 py-2">
                          {r.actual_label_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={r.actual_label_url}
                              alt="Label sample"
                              className="h-9 w-16 rounded border border-cream-300 object-cover"
                            />
                          ) : (
                            <ImageOff
                              className="h-4 w-4 text-ink-300"
                              aria-label="No label sample"
                            />
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm text-ink-500">{r.printed_by || '—'}</td>
                        <td className="px-3 py-2 text-sm text-ink-500">{r.approved_by || '—'}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/printing-label/${r.id}`}
                              className="action-btn-3d action-btn-blue"
                              title="View entry"
                              aria-label={`View entry ${i + 1} dated ${group.label}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            <Link
                              href={`/printing-label/${r.id}/edit`}
                              className="action-btn-3d action-btn-amber"
                              title="Edit entry"
                              aria-label={`Edit entry ${i + 1} dated ${group.label}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                            {/* Delete is admin-only server-side; hide it when it would 403. */}
                            {isDocAdminFor(r.warehouse) && (
                              <button
                                type="button"
                                onClick={() => onDelete(r)}
                                disabled={deletingId === r.id}
                                className="action-btn-3d action-btn-red disabled:opacity-50"
                                title="Delete entry"
                                aria-label={`Delete entry ${i + 1} dated ${group.label}`}
                              >
                                {deletingId === r.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
