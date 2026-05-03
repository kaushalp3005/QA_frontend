'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileText, Plus, Pencil, Eye, Trash2, Inbox } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import WarehouseSelector, { getStoredWarehouse } from '@/components/ui/WarehouseSelector'
import { docsApi, isDocAdmin } from '@/lib/api/documentations'
import type { DocFormConfig } from '@/config/doc-forms'

interface Props {
  config: DocFormConfig
}

export default function DocListPage({ config }: Props) {
  const router = useRouter()
  const [records, setRecords] = useState<Record<string, any>[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const [warehouse, setWarehouse] = useState<string>('')
  const admin = isDocAdmin()

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const wh = getStoredWarehouse()
      setWarehouse(wh)
      const res = await docsApi.list(config.formType, { page, per_page: 50, warehouse: wh })
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
                  {total} record{total !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
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
              Nothing logged for warehouse <span className="font-semibold text-ink-500">{warehouse || '—'}</span>.
            </p>
            <button
              onClick={() => router.push(`/documentations/${config.routeSlug}/create`)}
              className="btn-primary mt-4"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create first record
            </button>
          </div>
        ) : (
          <div className="surface-card overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cream-300 bg-cream-100/70">
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
                  {records.map((rec, i) => (
                    <tr key={rec.id} className="hover:bg-cream-100/60 transition-colors">
                      <td className="px-4 py-3 text-ink-400 font-medium">{(page - 1) * 50 + i + 1}</td>
                      {config.listColumns.map((col) => (
                        <td key={col} className="px-4 py-3 text-ink-600">{formatValue(rec[col])}</td>
                      ))}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => router.push(`/documentations/${config.routeSlug}/${rec.id}`)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-ink-500 hover:text-brand-500 hover:bg-brand-50"
                            title="View"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">View</span>
                          </button>
                          <button
                            onClick={() => router.push(`/documentations/${config.routeSlug}/${rec.id}/edit`)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-ink-500 hover:text-success-700 hover:bg-success-50"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                          {admin && (
                            <button
                              onClick={() => handleDelete(rec.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-ink-500 hover:text-danger-600 hover:bg-danger-50"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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
