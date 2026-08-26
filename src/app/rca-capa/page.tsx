'use client'
// zale pushh
import { useState, useEffect } from 'react'
import { Plus, Search, FileText, Calendar, Users, AlertCircle, Edit, Eye, Printer } from 'lucide-react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { formatDateShort } from '@/lib/date-utils'
import { useCompany } from '@/contexts/CompanyContext'
import { usePermissions } from '@/hooks/usePermissions'
import { getRCAList, RCAResponse } from '@/lib/api/rca'
import { toast } from 'react-hot-toast'
import PageHeader from '@/components/ui/PageHeader'
import { Spinner, Skeleton } from '@/components/ui/Loader'

const severityColors: Record<string, string> = {
  low: 'bg-cream-200 text-ink-500',
  medium: 'bg-warning-50 text-warning-700',
  high: 'bg-warning-50 text-warning-700',
  critical: 'bg-danger-50 text-danger-700'
}

/**
 * RCA numbers read RCA-YYYY-MM-0001; the month prefix is the same for every row
 * on screen, so the table shows only the trailing sequence and keeps the full
 * number on hover.
 */
function rcaShortId(rcaNumber?: string, id?: number | string): string {
  const tail = (rcaNumber || '').split('-').pop() || ''
  const digits = tail.replace(/\D/g, '') || String(rcaNumber || '').replace(/\D/g, '')
  if (digits) return digits.slice(-4).padStart(4, '0')
  return String(id ?? '').padStart(4, '0')
}

export default function RCACAPAPage() {
  const { currentCompany } = useCompany()
  const { canCreate, canEdit } = usePermissions()
  const [searchTerm, setSearchTerm] = useState('')
  // The term actually sent to the API, settled after the user stops typing.
  const [activeSearch, setActiveSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [rcaData, setRcaData] = useState<RCAResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 15

  useEffect(() => {
    const t = setTimeout(() => setActiveSearch(searchTerm.trim()), 350)
    return () => clearTimeout(t)
  }, [searchTerm])

  // A new search starts from page 1 — otherwise searching from page 3 lands on
  // an empty page of a much shorter result set and looks like "no matches".
  useEffect(() => {
    setPage(1)
  }, [activeSearch, severityFilter, currentCompany])

  // Fetch RCA data
  useEffect(() => {
    fetchRCAData()
  }, [currentCompany, page, activeSearch, severityFilter])

  const fetchRCAData = async () => {
    try {
      setLoading(true)
      const response = await getRCAList({
        company: currentCompany,
        page,
        limit,
        search: activeSearch || undefined,
        severity: severityFilter || undefined
      })
      setRcaData(response.data)
      setTotalPages(response.totalPages)
      setTotal(response.total)
    } catch (error) {
      console.error('Error fetching RCA data:', error)
      toast.error('Failed to load RCA/CAPA records')
    } finally {
      setLoading(false)
    }
  }

  const stats = [
    {
      label: 'Total RCA',
      value: loading ? '-' : total,
      icon: FileText,
    },
    {
      label: 'Critical',
      value: loading ? '-' : rcaData.filter((item: any) => item.severity === 'critical').length,
      icon: AlertCircle,
    },
    {
      label: 'High Priority',
      value: loading ? '-' : rcaData.filter((item: any) => item.severity === 'high').length,
      icon: Users,
    },
    {
      label: 'On This Page',
      value: loading ? '-' : rcaData.length,
      icon: Calendar,
    },
  ]

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="RCA/CAPA Management"
          subtitle="Root Cause Analysis & Corrective Action Preventive Action"
          icon={Search}
          actions={
            canCreate('rca_capa') ? (
              <Link
                href="/rca-capa/create"
                className="btn-primary inline-flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                New RCA/CAPA
              </Link>
            ) : null
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {stats.map((stat, i) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className="surface-card p-5 animate-fade-in-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-ink-400 uppercase tracking-wider">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold text-ink-600 tabular-nums mt-1">
                      {stat.value}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-brand-500 text-white shadow-soft flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5" strokeWidth={2.25} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Filters */}
        <div className="surface-card p-4 mb-5 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-300" />
            <input
              type="text"
              placeholder="Search by RCA ID, complaint ID, item, batch or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-base pl-10 w-full"
            />
          </div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="input-base min-w-[180px]"
          >
            <option value="">All Severity</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        {/* RCA/CAPA List */}
        <div className="surface-card overflow-hidden animate-fade-in-up">
          <div className="px-5 py-4 border-b border-cream-300 bg-cream-100">
            <h2 className="text-sm font-semibold text-ink-600">RCA/CAPA Records</h2>
          </div>
          {loading ? (
            <div className="px-6 py-16 text-center">
              <Spinner size={32} className="text-brand-500 mx-auto" />
              <p className="mt-4 text-sm font-medium text-ink-500">Loading RCA/CAPA records...</p>
            </div>
          ) : rcaData.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="bg-cream-200 w-14 h-14 rounded-full mx-auto flex items-center justify-center">
                <FileText className="h-6 w-6 text-ink-400" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-ink-500">No RCA/CAPA items found</h3>
              <p className="mt-1 text-xs text-ink-400">
                {searchTerm || severityFilter
                  ? 'Try adjusting your search or filters.'
                  : 'No RCA/CAPA records found. Create one to get started.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-cream-300">
                <thead className="bg-cream-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider whitespace-nowrap">RCA ID</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider whitespace-nowrap">Complaint ID</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider whitespace-nowrap">Item</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider whitespace-nowrap">Batch</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider whitespace-nowrap">Customer</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider whitespace-nowrap">Severity</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider whitespace-nowrap">Report Date</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold text-ink-400 uppercase tracking-wider whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-300">
                  {rcaData.map((item: any) => {
                    const customer = item.name_of_customer_other || item.name_of_customer || ''
                    const itemPath = [item.item_category, item.item_subcategory].filter(Boolean).join(' › ')
                    return (
                      <tr key={item.id} className="hover:bg-cream-100/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Link
                            href={`/rca-capa/${item.id}`}
                            title={item.rca_number || undefined}
                            className="text-sm font-bold text-brand-500 hover:text-brand-600 hover:underline tabular-nums"
                          >
                            #{rcaShortId(item.rca_number, item.id)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-ink-600">
                          {item.complaint_id || '—'}
                        </td>
                        <td className="px-4 py-3 min-w-[220px]">
                          <div
                            className="text-[13px] font-semibold text-ink-600 truncate max-w-[260px]"
                            title={item.item_description || undefined}
                          >
                            {item.item_description || '—'}
                          </div>
                          {itemPath && (
                            <div className="text-[11px] text-ink-400 truncate max-w-[260px]" title={itemPath}>
                              {itemPath}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-ink-600 tabular-nums">
                          {item.batch_code || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-ink-500">
                          <span className="block truncate max-w-[160px]" title={customer || undefined}>
                            {customer || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {item.severity ? (
                            <span className={`inline-flex rounded-full text-[11px] font-semibold px-2.5 py-0.5 ${severityColors[item.severity as string] || 'bg-cream-200 text-ink-500'}`}>
                              {String(item.severity).toUpperCase()}
                            </span>
                          ) : (
                            <span className="text-sm text-ink-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-ink-500 tabular-nums">
                          {item.date_of_report ? formatDateShort(item.date_of_report) : '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-0.5">
                            <Link href={`/rca-capa/${item.id}`} className="p-1.5 rounded-md text-ink-400 hover:text-brand-500 hover:bg-cream-100 transition-colors" title="View">
                              <Eye className="w-4 h-4" />
                            </Link>
                            {canEdit('rca_capa') && (
                              <Link href={`/rca-capa/${item.id}/edit`} className="p-1.5 rounded-md text-ink-400 hover:text-brand-500 hover:bg-cream-100 transition-colors" title="Edit">
                                <Edit className="w-4 h-4" />
                              </Link>
                            )}
                            <Link
                              href={`/rca-capa/${item.id}/print`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-md text-ink-400 hover:text-brand-500 hover:bg-cream-100 transition-colors"
                              title="Print"
                            >
                              <Printer className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && rcaData.length > 0 && (
            <div className="px-5 py-4 border-t border-cream-300 flex items-center justify-between flex-wrap gap-3">
              <div className="text-xs text-ink-400">
                Showing <span className="font-semibold text-ink-600 tabular-nums">{((page - 1) * limit) + 1}</span> to <span className="font-semibold text-ink-600 tabular-nums">{Math.min(page * limit, total)}</span> of <span className="font-semibold text-ink-600 tabular-nums">{total}</span> records
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="btn-outline px-3 py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-ink-600 disabled:hover:border-cream-300"
                >
                  Previous
                </button>
                <span className="inline-flex items-center justify-center min-w-[2rem] px-3 py-1.5 text-xs font-semibold rounded-md bg-brand-500 text-white tabular-nums">
                  {page}
                </span>
                <span className="text-xs text-ink-400">of <span className="tabular-nums">{totalPages}</span></span>
                <button
                  onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  className="btn-outline px-3 py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-ink-600 disabled:hover:border-cream-300"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
