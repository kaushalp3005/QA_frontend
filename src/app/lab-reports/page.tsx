'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, FlaskConical, Eye, Trash2, FileText, Settings2, Printer } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { usePermissions } from '@/hooks/usePermissions'
import PageHeader from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Loader'
import { fgCoaApi, type FgCoaRecord } from '@/lib/api/documentations'

const SAMPLE_TYPE_LABELS: Record<string, string> = {
  FG: 'Finished Goods',
  RM: 'Raw Material',
  WIP: 'Work In Progress',
  PM: 'Packaging Material',
}

const SAMPLE_TYPE_COLORS: Record<string, string> = {
  FG: 'bg-success-50 text-success-700',
  RM: 'bg-brand-50 text-brand-700',
  WIP: 'bg-warning-50 text-warning-700',
  PM: 'bg-cream-200 text-ink-500',
}

export default function LabReportsPage() {
  const router = useRouter()
  const { canCreate, canDelete } = usePermissions()
  const [records, setRecords] = useState<FgCoaRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchRecords()
  }, [])

  const fetchRecords = async () => {
    try {
      setIsLoading(true)
      const res = await fgCoaApi.list({ page_size: 500 })
      setRecords(res.records ?? [])
    } catch {
      setRecords([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: number, coaNo: string) => {
    if (!confirm(`Delete COA "${coaNo}"? This cannot be undone.`)) return
    try {
      await fgCoaApi.remove(id)
      setRecords(prev => prev.filter(r => r.id !== id))
    } catch (err: any) {
      alert(err?.message || 'Failed to delete. Please try again.')
    }
  }

  const filtered = records.filter(r =>
    r.coa_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.sample_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.batch_no || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.ipqc_no || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Lab Reports — COA"
          subtitle="Certificate of Analysis records for finished goods and raw materials"
          icon={FlaskConical}
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/lab-reports/customer-tolerance')}
                className="btn-outline"
                title="Manage customer tolerance specs"
              >
                <Settings2 className="w-4 h-4 mr-1.5" />
                Update Tolerances
              </button>
              {canCreate('lab_reports') && (
                <button
                  onClick={() => router.push('/lab-reports/create')}
                  className="btn-primary"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Create COA
                </button>
              )}
            </div>
          }
        />

        {/* Search */}
        <div className="surface-card p-4 mb-4 animate-fade-in">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-300" />
            <input
              type="text"
              placeholder="Search by COA No., sample name, customer, or batch no..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-base pl-10 pr-24"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-semibold text-ink-500 hover:text-brand-500 bg-cream-100 hover:bg-cream-200 rounded-md transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* COA Records Table */}
        <div className="surface-card overflow-hidden animate-fade-in">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Spinner size={32} className="text-brand-500 mx-auto" />
                <p className="mt-3 text-sm text-ink-400 font-medium">Loading COA records...</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-cream-300">
                <thead className="bg-cream-100">
                  <tr>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3 whitespace-nowrap">Sr. No.</th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3 whitespace-nowrap">COA No.</th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3 whitespace-nowrap">Date</th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">Sample Name</th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3 whitespace-nowrap">Sample Type</th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3 whitespace-nowrap">Batch No.</th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">Customer</th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3 whitespace-nowrap">Analysed By</th>
                    <th className="text-right text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-300 bg-white">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="bg-cream-200 w-14 h-14 rounded-full flex items-center justify-center">
                            <FileText className="h-6 w-6 text-ink-400" />
                          </div>
                          <p className="mt-3 text-sm font-semibold text-ink-500">No COA records found</p>
                          <p className="text-xs text-ink-400 mt-0.5">
                            {searchQuery
                              ? 'Try adjusting your search query'
                              : 'Click "Create COA" to add your first record'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((record, index) => (
                      <tr key={record.id} className="hover:bg-cream-100/50 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap text-sm font-medium text-ink-500 tabular-nums">
                          {index + 1}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="font-bold text-brand-600 text-sm font-mono">{record.coa_no}</span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-ink-400 font-medium tabular-nums">
                          {record.coa_dated}
                        </td>
                        <td className="px-5 py-3.5 text-sm font-medium text-ink-600 max-w-[220px]">
                          <span className="line-clamp-2">{record.sample_name}</span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center rounded-full text-[11px] font-semibold px-2.5 py-0.5 ${SAMPLE_TYPE_COLORS[record.sample_type] || 'bg-cream-200 text-ink-500'}`}>
                            {record.sample_type}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {record.batch_no ? (
                            <span className="inline-flex items-center rounded-full text-[11px] font-semibold px-2.5 py-0.5 bg-cream-200 text-ink-500 font-mono">
                              {record.batch_no}
                            </span>
                          ) : (
                            <span className="text-ink-300 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-ink-500">
                          {record.customer_name}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-sm text-ink-400">
                          {record.analysed_by || <span className="text-ink-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => router.push(`/lab-reports/${record.id}`)}
                              className="text-ink-400 hover:text-brand-500 transition-colors p-1.5 rounded-md hover:bg-cream-100"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => window.open(`/lab-reports/${record.id}/print`, '_blank')}
                              className="text-ink-400 hover:text-brand-500 transition-colors p-1.5 rounded-md hover:bg-cream-100"
                              title="Print COA"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                            {canDelete('lab_reports') && (
                              <button
                                onClick={() => handleDelete(record.id, record.coa_no)}
                                className="text-ink-400 hover:text-danger-600 transition-colors p-1.5 rounded-md hover:bg-danger-50"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer stats */}
        {!isLoading && (
          <div className="mt-4 surface-card px-5 py-3 animate-fade-in">
            <div className="flex items-center justify-between text-xs text-ink-400 font-medium">
              <span className="tabular-nums">
                Showing <span className="text-ink-600 font-semibold">{filtered.length}</span> of{' '}
                <span className="text-ink-600 font-semibold">{records.length}</span> records
              </span>
              {searchQuery && (
                <span className="truncate">
                  Filtered by: <span className="text-ink-600 font-semibold">"{searchQuery}"</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
