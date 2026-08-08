'use client'

import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileText, Plus, Pencil, Eye, Trash2, Inbox, Printer, Copy, Search, X, ChevronRight, Loader2 } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import WarehouseSelector, { getStoredWarehouse } from '@/components/ui/WarehouseSelector'
import { docsApi, isDocAdminFor } from '@/lib/api/documentations'
import { PRINTABLE_SLUGS, DUPLICATABLE_SLUGS, type DocFormConfig } from '@/config/doc-forms'

interface Props {
  config: DocFormConfig
  /**
   * Opt in to click-to-expand rows. When supplied, each row gets a disclosure
   * chevron and clicking it reveals this panel underneath. The list endpoint
   * only returns the summary columns, so the full record is fetched on first
   * expand and cached for the rest of the visit.
   */
  renderExpanded?: (record: Record<string, any>) => ReactNode
}

export default function DocListPage({ config, renderExpanded }: Props) {
  const router = useRouter()
  const base = config.basePath ?? '/documentations'
  const [records, setRecords] = useState<Record<string, any>[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const [warehouse, setWarehouse] = useState<string>('')
  const hasWarehouseCol = config.listColumns.includes('warehouse')
  // Every row on screen belongs to the currently selected warehouse (the list
  // is server-filtered to it below), so one admin check covers the whole page.
  const admin = isDocAdminFor(hasWarehouseCol ? warehouse : undefined)
  const showPrint = PRINTABLE_SLUGS.has(config.routeSlug) || config.printable === true
  const showDuplicate = DUPLICATABLE_SLUGS.has(config.routeSlug)

  const expandable = typeof renderExpanded === 'function'
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [details, setDetails] = useState<Record<number, Record<string, any>>>({})
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null)
  const [detailErrors, setDetailErrors] = useState<Record<number, string>>({})

  // Column count of the summary table, so the detail row can span it.
  const bodyColSpan = (expandable ? 1 : 0) + 1 + config.listColumns.length + 1

  const loadDetail = async (id: number) => {
    setDetailLoadingId(id)
    setDetailErrors((prev) => {
      const { [id]: _drop, ...rest } = prev
      return rest
    })
    try {
      const res = await docsApi.get(config.formType, id)
      setDetails((prev) => ({ ...prev, [id]: res.data }))
    } catch (e: any) {
      setDetailErrors((prev) => ({ ...prev, [id]: e?.message || 'Could not load details' }))
    } finally {
      setDetailLoadingId((cur) => (cur === id ? null : cur))
    }
  }

  const toggleExpand = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    if (!details[id]) loadDetail(id)
  }

  const fetchRecords = async () => {
    setLoading(true)
    setExpandedId(null)
    setDetails({})
    setDetailErrors({})
    try {
      const wh = getStoredWarehouse()
      setWarehouse(wh)
      const res = await docsApi.list(config.formType, { page, per_page: 50, ...(hasWarehouseCol ? { warehouse: wh } : {}) })
      setRecords(res.records)
      setTotalPages(res.total_pages)
      setTotal(res.total)
    } catch (e) {
      console.error('Failed to load records:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRecords() }, [page])

  useEffect(() => {
    const handler = () => { setPage(1); fetchRecords() }
    window.addEventListener('warehouseChanged', handler)
    return () => window.removeEventListener('warehouseChanged', handler)
  }, [])

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this record?')) return
    try {
      await docsApi.delete(config.formType, id)
      fetchRecords()
    } catch (e: any) {
      alert(e.message || 'Delete failed')
    }
  }

  const formatValue = (val: any): string => {
    if (val == null || val === '') return '—'
    if (typeof val === 'object') return JSON.stringify(val).slice(0, 50) + '...'
    return String(val)
  }

  // Filter the loaded records by a free-text query across the visible columns.
  const query = search.trim().toLowerCase()
  const filtered = query
    ? records.filter((rec) =>
        config.listColumns.some((col) => formatValue(rec[col]).toLowerCase().includes(query))
      )
    : records

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in-up">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push('/documentations')}
              className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-cream-50 border border-cream-300 text-ink-500 hover:text-brand-500 hover:border-brand-500 shadow-soft transition-colors"
              title="Back to Documentations"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
            </button>
            <div className="shrink-0 w-11 h-11 rounded-xl bg-brand-500 text-white flex items-center justify-center shadow-brand">
              <FileText className="w-5 h-5" strokeWidth={2.25} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-ink-600 tracking-tight leading-tight truncate">
                {config.titlePrefixByWarehouse?.[warehouse]
                  ? `${config.titlePrefixByWarehouse[warehouse]} ${config.label}`
                  : config.label}
              </h1>
              {/* Document number is intentionally not shown here — it belongs on
                  the form and the printed record, not the list header. */}
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs text-ink-400 font-medium">
                  {total} record{total !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <WarehouseSelector />
            <button
              onClick={() => router.push(`${base}/${config.routeSlug}/create`)}
              className="btn-primary"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create New
            </button>
          </div>
        </div>

        {/* Search */}
        {!loading && records.length > 0 && (
          <div className="mb-4 flex items-center gap-3 flex-wrap animate-fade-in">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search records…"
                className="w-full rounded-xl border border-cream-300 bg-cream-50 pl-10 pr-9 py-2.5 text-sm text-ink-600 placeholder-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-500"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {query && (
              <span className="text-xs text-ink-400 font-medium">
                {filtered.length} match{filtered.length !== 1 ? 'es' : ''}
              </span>
            )}
          </div>
        )}

        {/* Body */}
        {loading ? (
          <div className="surface-card p-8 animate-fade-in">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-10 w-full" />
              ))}
            </div>
          </div>
        ) : records.length === 0 ? (
          <div className="surface-card p-12 flex flex-col items-center text-center animate-fade-in">
            <div className="bg-cream-200 w-16 h-16 rounded-full flex items-center justify-center mb-3">
              <Inbox className="w-7 h-7 text-ink-300" />
            </div>
            <p className="text-sm font-semibold text-ink-500">No records yet</p>
            <p className="text-xs text-ink-400 mt-0.5">
              {config.listColumns.includes('warehouse')
                ? <>Nothing logged for warehouse <span className="font-semibold text-ink-500">{warehouse || '—'}</span>.</>
                : 'No records have been saved yet.'}
            </p>
            <button
              onClick={() => router.push(`${base}/${config.routeSlug}/create`)}
              className="btn-primary mt-4"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create first record
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="surface-card p-12 flex flex-col items-center text-center animate-fade-in">
            <div className="bg-cream-200 w-16 h-16 rounded-full flex items-center justify-center mb-3">
              <Search className="w-7 h-7 text-ink-300" />
            </div>
            <p className="text-sm font-semibold text-ink-500">No matching records</p>
            <p className="text-xs text-ink-400 mt-0.5">
              Nothing matches &ldquo;<span className="font-semibold text-ink-500">{search}</span>&rdquo;{totalPages > 1 ? ' on this page' : ''}.
            </p>
            <button onClick={() => setSearch('')} className="btn-outline mt-4">
              Clear search
            </button>
          </div>
        ) : (
          <div className="surface-card overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cream-300 bg-cream-100/70">
                    {expandable && <th className="w-9 px-2 py-3" aria-label="Expand" />}
                    <th className="px-4 py-3 text-left font-semibold text-[11px] tracking-wider uppercase text-ink-400">#</th>
                    {config.listColumns.map((col) => (
                      <th key={col} className="px-4 py-3 text-left font-semibold text-[11px] tracking-wider uppercase text-ink-400">
                        {col.replace(/_/g, ' ')}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right font-semibold text-[11px] tracking-wider uppercase text-ink-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-300">
                  {filtered.map((rec, i) => {
                    const isOpen = expandable && expandedId === rec.id
                    return (
                    <Fragment key={rec.id}>
                    <tr
                      onClick={expandable ? () => toggleExpand(rec.id) : undefined}
                      className={`transition-colors ${
                        isOpen ? 'bg-cream-100/80' : 'hover:bg-cream-100/60'
                      } ${expandable ? 'cursor-pointer' : ''}`}
                    >
                      {expandable && (
                        <td className="px-2 py-3">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleExpand(rec.id) }}
                            className="inline-flex items-center justify-center w-6 h-6 rounded-md text-ink-400 hover:text-brand-500 hover:bg-cream-200/70 transition-colors"
                            aria-expanded={isOpen}
                            aria-label={isOpen ? 'Collapse details' : 'Expand details'}
                            title={isOpen ? 'Hide attendees' : 'Show attendees'}
                          >
                            <ChevronRight
                              className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                            />
                          </button>
                        </td>
                      )}
                      <td className="px-4 py-3 text-ink-400 font-medium">{(page - 1) * 50 + i + 1}</td>
                      {config.listColumns.map((col) => (
                        <td key={col} className="px-4 py-3 text-ink-600">{formatValue(rec[col])}</td>
                      ))}
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`${base}/${config.routeSlug}/${rec.id}`)}
                            className="action-btn-3d action-btn-blue"
                            title="View"
                            aria-label="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => router.push(`${base}/${config.routeSlug}/${rec.id}/edit`)}
                            className="action-btn-3d action-btn-amber"
                            title="Edit"
                            aria-label="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {showPrint && (
                            <button
                              onClick={() => router.push(`${base}/${config.routeSlug}/print?id=${rec.id}`)}
                              className="action-btn-3d action-btn-green"
                              title="Print"
                              aria-label="Print"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          )}
                          {showDuplicate && (
                            <button
                              onClick={() => router.push(`${base}/${config.routeSlug}/create?duplicateFrom=${rec.id}`)}
                              className="action-btn-3d action-btn-purple"
                              title="Duplicate (recreate as new record)"
                              aria-label="Duplicate"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          )}
                          {admin && (
                            <button
                              onClick={() => handleDelete(rec.id)}
                              className="action-btn-3d action-btn-red"
                              title="Delete"
                              aria-label="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-cream-100/40">
                        <td colSpan={bodyColSpan} className="p-0 border-t border-cream-300">
                          {detailLoadingId === rec.id ? (
                            <div className="flex items-center gap-2 px-4 py-4 text-xs text-ink-400">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Loading details…
                            </div>
                          ) : detailErrors[rec.id] ? (
                            <div className="flex items-center gap-3 px-4 py-4 text-xs text-danger-600">
                              <span>{detailErrors[rec.id]}</span>
                              <button
                                type="button"
                                onClick={() => loadDetail(rec.id)}
                                className="font-semibold underline hover:text-danger-700"
                              >
                                Retry
                              </button>
                            </div>
                          ) : details[rec.id] ? (
                            renderExpanded!(details[rec.id])
                          ) : null}
                        </td>
                      </tr>
                    )}
                    </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-outline"
            >
              Previous
            </button>
            <span className="text-xs sm:text-sm text-ink-400 font-medium">
              Page <span className="text-ink-600 font-bold">{page}</span> of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-outline"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
