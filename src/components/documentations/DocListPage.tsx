'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/documentations')}
              className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-300 hover:bg-gray-100 transition-colors"
              title="Back to Documentations"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{config.label}</h1>
              <p className="text-sm text-gray-500">{config.docNo} — {total} record{total !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <WarehouseSelector />
            <button
              onClick={() => router.push(`/documentations/${config.routeSlug}/create`)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
            >
              + Create New
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading...</div>
        ) : records.length === 0 ? (
          <div className="text-center py-10 text-gray-400">No records found for warehouse {warehouse}.</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">#</th>
                  {config.listColumns.map((col) => (
                    <th key={col} className="px-4 py-3 text-left font-medium text-gray-600">
                      {col.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {records.map((rec, i) => (
                  <tr key={rec.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{(page - 1) * 50 + i + 1}</td>
                    {config.listColumns.map((col) => (
                      <td key={col} className="px-4 py-3">{formatValue(rec[col])}</td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/documentations/${config.routeSlug}/${rec.id}`)}
                          className="text-blue-600 hover:underline text-xs"
                        >
                          View
                        </button>
                        <button
                          onClick={() => router.push(`/documentations/${config.routeSlug}/${rec.id}/edit`)}
                          className="text-green-600 hover:underline text-xs"
                        >
                          Edit
                        </button>
                        {admin && (
                          <button
                            onClick={() => handleDelete(rec.id)}
                            className="text-red-600 hover:underline text-xs"
                          >
                            Delete
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

        {totalPages > 1 && (
          <div className="flex justify-between items-center">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
