'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { ArrowLeft, Plus, Calendar, Package, Check, Clock, Eye, Loader2, Trash2, Printer, Search, X, Play } from 'lucide-react'
import { getXRayRecords, deleteXRayRecord } from '@/lib/api/xray'
import type { XRayRecordSummary } from '@/lib/api/xray'

const AUTHORIZED_EMAIL = 'pooja.parkar@candorfoods.in'

export default function XRayDetectionPage() {
  const router = useRouter()
  const [records, setRecords] = useState<XRayRecordSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user')
      if (userStr) setIsAuthorized(JSON.parse(userStr).email === AUTHORIZED_EMAIL)
    } catch {
      setIsAuthorized(false)
    }
  }, [])

  useEffect(() => { fetchRecords() }, [])

  const fetchRecords = async () => {
    try {
      setLoading(true)
      setRecords((await getXRayRecords()) || [])
    } catch (error) {
      console.error('Error fetching X-Ray records:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRecord = async (recordId: number) => {
    if (!confirm('Delete this whole X-Ray sheet and all its rows?')) return
    setDeletingId(recordId)
    try {
      await deleteXRayRecord(recordId)
      await fetchRecords()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setDeletingId(null)
    }
  }

  const fmtDate = (d: string) => {
    if (!d) return '—'
    const [y, m, day] = d.split('-')
    return day ? `${day}/${m}/${y}` : d
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const todayCount = records.filter(r => r.check_date === todayStr).length
  const lastRecord = records.length > 0 ? records[0] : null

  // Filter the sheets table by a free-text query across the visible columns.
  const query = search.trim().toLowerCase()
  const filtered = query
    ? records.filter((r) =>
        [
          r.check_date,
          fmtDate(r.check_date),
          r.batch_id,
          r.products,
          r.batch_nos,
          r.entry_count,
          r.verified_by,
          r.status,
        ].some((v) => (v ?? '').toString().toLowerCase().includes(query))
      )
    : records

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-5 w-5 mr-2" /> Back to Documentations
          </button>
        </div>

        {/* Top card */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-4 rounded-t-lg">
            <h3 className="text-2xl font-bold text-white">X-Ray Detection Monitoring</h3>
            <p className="text-brand-100 mt-1">CCP Calibration, Monitoring and Verification Records</p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-brand-50 p-4 rounded-lg border border-brand-200">
                <div className="flex items-center">
                  <div className="p-2 bg-brand-100 rounded-lg"><Check className="h-6 w-6 text-brand-600" /></div>
                  <div className="ml-4">
                    <h4 className="text-lg font-semibold text-brand-800">Sheets Today</h4>
                    <p className="text-2xl font-bold text-brand-600">{todayCount}</p>
                  </div>
                </div>
              </div>
              <div className="bg-cream-100 p-4 rounded-lg border border-cream-300">
                <div className="flex items-center">
                  <div className="p-2 bg-cream-200 rounded-lg"><Package className="h-6 w-6 text-ink-500" /></div>
                  <div className="ml-4">
                    <h4 className="text-lg font-semibold text-ink-600">Total Sheets</h4>
                    <p className="text-2xl font-bold text-ink-700">{records.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-cream-100 p-4 rounded-lg border border-cream-300">
                <div className="flex items-center">
                  <div className="p-2 bg-cream-200 rounded-lg"><Calendar className="h-6 w-6 text-ink-500" /></div>
                  <div className="ml-4">
                    <h4 className="text-lg font-semibold text-ink-600">Last Sheet</h4>
                    <p className="text-sm text-ink-500">{lastRecord ? fmtDate(lastRecord.check_date) : 'No entries'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-2">
              <button
                onClick={() => router.push('/documentations/xray/create')}
                className="w-full md:w-auto flex items-center justify-center px-6 py-3 text-base font-medium rounded-md text-white bg-brand-500 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors"
              >
                <Plus className="h-5 w-5 mr-2" /> Add New X-Ray Sheet
              </button>
            </div>
          </div>
        </div>

        {/* Records list */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-4 flex-wrap">
            <h3 className="text-xl font-bold text-gray-900">Recent X-Ray Detection Sheets</h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search records…"
                  className="pl-9 pr-8 py-2 w-64 max-w-full border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
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
              <span className="bg-brand-50 text-brand-700 text-sm font-medium px-3 py-1 rounded-full whitespace-nowrap">{filtered.length}{query ? ` of ${records.length}` : ''} Sheets</span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
              <span className="ml-2 text-gray-500">Loading records...</span>
            </div>
          ) : filtered.length > 0 ? (
            <div className="px-6 py-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product(s)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch No(s)</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Entries</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified By</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {fmtDate(record.check_date)}
                        <div className="text-[11px] font-mono text-gray-400">{record.batch_id}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-[220px] truncate" title={record.products || ''}>{record.products || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-[160px] truncate" title={record.batch_nos || ''}>{record.batch_nos || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        <span className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">{record.entry_count}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{record.verified_by || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          record.status === 'passed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {record.status === 'passed' ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {record.status === 'passed' ? 'Passed' : 'Review'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button onClick={() => router.push(`/documentations/xray/${record.id}`)} className="action-btn-3d action-btn-blue" title="View">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button onClick={() => router.push(`/documentations/xray/create?id=${record.id}`)} className="action-btn-3d action-btn-orange" title="Continue (resume in the create form)">
                            <Play className="h-4 w-4" />
                          </button>
                          <button onClick={() => router.push(`/documentations/xray/print?id=${record.id}`)} className="action-btn-3d action-btn-green" title="Print">
                            <Printer className="h-4 w-4" />
                          </button>
                          {isAuthorized && (
                            <button onClick={() => handleDeleteRecord(record.id)} disabled={deletingId === record.id} className="action-btn-3d action-btn-red" title="Delete">
                              {deletingId === record.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : records.length > 0 ? (
            <div className="px-6 py-12 text-center">
              <Search className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No matching records</h3>
              <p className="mt-1 text-sm text-gray-500">No records match &ldquo;{search}&rdquo;. Try a different search.</p>
              <div className="mt-6">
                <button
                  onClick={() => setSearch('')}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear search
                </button>
              </div>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No sheets yet</h3>
              <p className="mt-1 text-sm text-gray-500">Create your first X-Ray detection sheet.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
