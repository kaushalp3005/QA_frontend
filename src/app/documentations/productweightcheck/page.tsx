'use client'

import { Fragment, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileText, Plus, Pencil, Eye, Trash2, Inbox, Printer, LayoutTemplate, Search, X, Play, ChevronRight } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import WarehouseSelector, { getStoredWarehouse } from '@/components/ui/WarehouseSelector'
import { docsApi, isDocAdmin } from '@/lib/api/documentations'
import { DOC_FORMS } from '@/config/doc-forms'

const config = DOC_FORMS['productweightcheck']

export default function ProductWeightCheckListPage() {
  const router = useRouter()
  const [records, setRecords] = useState<Record<string, any>[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const [warehouse, setWarehouse] = useState<string>('')
  const [newLayout, setNewLayout] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const admin = isDocAdmin()
  const toggleDate = (d: string) => setExpanded((p) => ({ ...p, [d]: !p[d] }))

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const wh = getStoredWarehouse()
      setWarehouse(wh)
      const res = await docsApi.list(config.formType, { page, per_page: 50 })
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

  const printUrl = (id: number) =>
    `/documentations/productweightcheck/print?id=${id}${newLayout ? '&newLayout=1' : ''}`

  // Combined print for a whole date — entries oldest-first (id ascending).
  const printAllUrl = (ids: number[]) =>
    `/documentations/productweightcheck/print?ids=${ids.join(',')}${newLayout ? '&newLayout=1' : ''}`

  const formatValue = (val: any): string => {
    if (val == null || val === '') return '—'
    if (typeof val === 'object') return JSON.stringify(val).slice(0, 50) + '...'
    return String(val)
  }

  // Live filter the records table across every visible column (raw + formatted).
  const query = search.trim().toLowerCase()
  const filtered = query
    ? records.filter((r) =>
        config.listColumns
          .flatMap((col) => [r[col], formatValue(r[col])])
          .some((v) => (v ?? '').toString().toLowerCase().includes(query))
      )
    : records

  // Group entries by check_date → one date = one (expandable) row.
  const groupMap = new Map<string, Record<string, any>[]>()
  for (const rec of filtered) {
    const key = rec.check_date || '—'
    if (!groupMap.has(key)) groupMap.set(key, [])
    groupMap.get(key)!.push(rec)
  }
  const groups = Array.from(groupMap.entries()).map(([date, recs]) => ({
    date,
    recs,
    ids: [...recs].sort((a, b) => (a.id ?? 0) - (b.id ?? 0)).map((r) => r.id), // oldest first
  }))

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
                {config.label}
              </h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="inline-flex items-center rounded-full bg-brand-50 text-brand-600 text-[11px] font-semibold px-2 py-0.5">
                  {config.docNo}
                </span>
                <span className="text-xs text-ink-400 font-medium">
                  {query ? `${filtered.length} of ${total}` : total} record{(query ? filtered.length : total) !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Live search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search records…"
                className="pl-9 pr-8 py-2 w-64 max-w-full border border-cream-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {/* New Print Layout toggle */}
            <button
              type="button"
              onClick={() => setNewLayout((v) => !v)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                newLayout
                  ? 'bg-brand-500 text-white border-brand-500 shadow-brand'
                  : 'bg-white text-ink-500 border-cream-300 hover:border-brand-400 hover:text-brand-600'
              }`}
              title="Toggle new print layout (Issue 04 / Rev 03 / 02/06/2026)"
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
              New Print Layout
              <span className={`inline-flex items-center justify-center w-4 h-4 rounded border-2 transition-colors ${
                newLayout ? 'bg-white border-white' : 'border-ink-300'
              }`}>
                {newLayout && <span className="w-2 h-2 bg-brand-500 rounded-sm block" />}
              </span>
            </button>
            <WarehouseSelector />
            <button
              onClick={() => router.push(`/documentations/${config.routeSlug}/create`)}
              className="btn-primary"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create New
            </button>
          </div>
        </div>

        {/* New layout active banner */}
        {newLayout && (
          <div className="mb-4 px-4 py-2.5 bg-brand-50 border border-brand-200 rounded-xl text-xs text-brand-700 font-medium flex items-center gap-2 animate-fade-in">
            <LayoutTemplate className="w-3.5 h-3.5 shrink-0" />
            New print layout active — Issue 04 · Rev 03 · 02/06/2026 will appear on all print sheets.
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
            <p className="text-xs text-ink-400 mt-0.5">No records have been saved yet.</p>
            <button
              onClick={() => router.push(`/documentations/${config.routeSlug}/create`)}
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
              No records match &ldquo;{search}&rdquo;. Try a different search.
            </p>
            <button
              onClick={() => setSearch('')}
              className="btn-outline mt-4 inline-flex items-center"
            >
              <X className="w-4 h-4 mr-1.5" />
              Clear search
            </button>
          </div>
        ) : (
          <div className="surface-card overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cream-300 bg-cream-100/70">
                    <th className="px-4 py-3 text-left font-semibold text-[11px] tracking-wider uppercase text-ink-400 w-10"></th>
                    <th className="px-4 py-3 text-left font-semibold text-[11px] tracking-wider uppercase text-ink-400">Check Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-[11px] tracking-wider uppercase text-ink-400">Entries</th>
                    <th className="px-4 py-3 text-left font-semibold text-[11px] tracking-wider uppercase text-ink-400">Products</th>
                    <th className="px-4 py-3 text-right font-semibold text-[11px] tracking-wider uppercase text-ink-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-300">
                  {groups.map((g) => {
                    const open = !!expanded[g.date]
                    const products = g.recs.map((r) => r.product_name).filter(Boolean)
                    const productSummary =
                      products.slice(0, 3).join(', ') + (products.length > 3 ? `, +${products.length - 3} more` : '')
                    return (
                      <Fragment key={g.date}>
                        {/* Date group header — click to expand */}
                        <tr
                          className="hover:bg-cream-100/60 transition-colors cursor-pointer bg-cream-50/40"
                          onClick={() => toggleDate(g.date)}
                        >
                          <td className="px-4 py-3 text-ink-400">
                            <ChevronRight className={`w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`} />
                          </td>
                          <td className="px-4 py-3 font-semibold text-ink-600">{g.date}</td>
                          <td className="px-4 py-3 text-ink-500">{g.recs.length} entr{g.recs.length > 1 ? 'ies' : 'y'}</td>
                          <td className="px-4 py-3 text-ink-500 max-w-xs truncate">{productSummary || '—'}</td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => router.push(printAllUrl(g.ids))}
                                className={`action-btn-3d ${newLayout ? 'action-btn-purple' : 'action-btn-green'}`}
                                title={`Print all ${g.recs.length} entries${newLayout ? ' (New Layout)' : ''}`}
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {/* Individual entries for this date */}
                        {open && g.recs.map((rec, i) => (
                          <tr key={rec.id} className="hover:bg-cream-100/40 transition-colors">
                            <td className="px-4 py-2.5 text-right text-xs text-ink-300">{i + 1}</td>
                            <td className="px-4 py-2.5"></td>
                            <td className="px-4 py-2.5 text-ink-600" colSpan={2}>
                              <div className="flex flex-col">
                                <span className="font-medium">{formatValue(rec.product_name)}</span>
                                <span className="text-xs text-ink-400">
                                  Batch {formatValue(rec.batch_no)} · {formatValue(rec.customer)} · {formatValue(rec.location)}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => router.push(`/documentations/${config.routeSlug}/${rec.id}`)}
                                  className="action-btn-3d action-btn-blue"
                                  title="View"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => router.push(`/documentations/${config.routeSlug}/create?id=${rec.id}`)}
                                  className="action-btn-3d action-btn-orange"
                                  title="Continue (resume in the create form)"
                                >
                                  <Play className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => router.push(`/documentations/${config.routeSlug}/${rec.id}/edit`)}
                                  className="action-btn-3d action-btn-amber"
                                  title="Edit"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => router.push(printUrl(rec.id))}
                                  className={`action-btn-3d ${newLayout ? 'action-btn-purple' : 'action-btn-green'}`}
                                  title={newLayout ? 'Print (New Layout)' : 'Print'}
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                                {admin && (
                                  <button
                                    onClick={() => handleDelete(rec.id)}
                                    className="action-btn-3d action-btn-red"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
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
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-outline">
              Previous
            </button>
            <span className="text-xs sm:text-sm text-ink-400 font-medium">
              Page <span className="text-ink-600 font-bold">{page}</span> of {totalPages}
            </span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-outline">
              Next
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
