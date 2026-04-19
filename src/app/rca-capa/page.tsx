'use client'
// zale pushh
import { useState, useEffect } from 'react'
import { Plus, Search, FileText, Calendar, Users, AlertCircle, Edit } from 'lucide-react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { formatDateShort } from '@/lib/date-utils'
import { useCompany } from '@/contexts/CompanyContext'
import { usePermissions } from '@/hooks/usePermissions'
import { getRCAList, RCAResponse } from '@/lib/api/rca'
import { toast } from 'react-hot-toast'
import PageHeader from '@/components/ui/PageHeader'
import { Spinner, Skeleton } from '@/components/ui/Loader'

interface RCAItem {
  id: string
  complaintId: string
  title: string
  status: 'open' | 'in_progress' | 'completed' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  assignedTo: string
  createdDate: string
  targetDate: string
  rootCause?: string
  correctiveActions?: string[]
}

const statusColors = {
  open: 'bg-danger-50 text-danger-700',
  in_progress: 'bg-warning-50 text-warning-700',
  completed: 'bg-success-50 text-success-700',
  closed: 'bg-cream-200 text-ink-500'
}

const severityColors: Record<string, string> = {
  low: 'bg-cream-200 text-ink-500',
  medium: 'bg-warning-50 text-warning-700',
  high: 'bg-warning-50 text-warning-700',
  critical: 'bg-danger-50 text-danger-700'
}

export default function RCACAPAPage() {
  const { currentCompany } = useCompany()
  const { canCreate, canEdit } = usePermissions()
  const [searchTerm, setSearchTerm] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [rcaData, setRcaData] = useState<RCAResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 15

  // Fetch RCA data
  useEffect(() => {
    fetchRCAData()
  }, [currentCompany, page, searchTerm, severityFilter])

  const fetchRCAData = async () => {
    try {
      setLoading(true)
      const response = await getRCAList({
        company: currentCompany,
        page,
        limit,
        search: searchTerm || undefined,
        severity: severityFilter || undefined
      })
      console.log('RCA Data Response:', response)
      console.log('RCA Data Items:', response.data)
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
      value: loading ? '-' : rcaData.length,
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
      label: 'Total',
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
            canCreate('rca') ? (
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
              placeholder="Search RCA/CAPA items..."
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
          <div className="divide-y divide-cream-300">
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
              rcaData.map((item: any) => (
                <div key={item.id} className="px-5 py-4 hover:bg-cream-100/50 transition-colors">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    {/* Left: Content */}
                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Header Row */}
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/rca-capa/${item.id}`}
                            className="text-sm font-semibold text-brand-500 hover:text-brand-600 transition-colors"
                          >
                            {item.rca_number}
                          </Link>
                          {item.severity && (
                            <span className={`inline-flex rounded-full text-[11px] font-semibold px-2.5 py-0.5 ${severityColors[item.severity as string] || 'bg-cream-200 text-ink-500'}`}>
                              {item.severity.toUpperCase()}
                            </span>
                          )}
                          {item.problem_category && (
                            <span className="inline-flex rounded-full text-[11px] font-semibold px-2.5 py-0.5 bg-brand-50 text-brand-500">
                              {item.problem_category}
                            </span>
                          )}
                        </div>
                        {item.date_of_report && (
                          <span className="text-[11px] text-ink-400 inline-flex items-center font-medium">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDateShort(item.date_of_report)}
                          </span>
                        )}
                      </div>

                      {/* Complaint ID */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium text-ink-400">Complaint:</span>
                        <span className="font-semibold text-ink-600">{item.complaint_id}</span>
                      </div>

                      {/* Item Details */}
                      {(item.item_category || item.item_subcategory || item.item_description) && (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                          {item.item_category && (
                            <div className="flex items-center">
                              <span className="text-ink-400">Category:</span>
                              <span className="ml-1 font-semibold text-ink-600">{item.item_category}</span>
                            </div>
                          )}
                          {item.item_subcategory && (
                            <div className="flex items-center">
                              <span className="text-ink-400">Sub-category:</span>
                              <span className="ml-1 font-semibold text-ink-600">{item.item_subcategory}</span>
                            </div>
                          )}
                          {item.item_description && (
                            <div className="flex items-center">
                              <span className="text-ink-400">Item:</span>
                              <span className="ml-1 font-semibold text-ink-600 truncate max-w-xs">{item.item_description}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Customer & Batch Info */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                        {item.name_of_customer && (
                          <div className="flex items-center">
                            <Users className="h-3 w-3 mr-1 text-ink-300" />
                            <span className="text-ink-400">Customer:</span>
                            <span className="ml-1 font-semibold text-ink-600">{item.name_of_customer}</span>
                          </div>
                        )}
                        {item.batch_code && (
                          <div className="flex items-center">
                            <span className="text-ink-400">Batch:</span>
                            <span className="ml-1 font-semibold text-ink-600">{item.batch_code}</span>
                          </div>
                        )}
                        {item.date_of_packing && (
                          <div className="flex items-center">
                            <span className="text-ink-400">Packing Date:</span>
                            <span className="ml-1 text-ink-600">{formatDateShort(item.date_of_packing)}</span>
                          </div>
                        )}
                      </div>

                      {/* Summary/Problem Statement */}
                      {(item.summary_of_incident || item.problem_statement) && (
                        <p className="text-sm text-ink-600 line-clamp-2 leading-relaxed">
                          {item.summary_of_incident || item.problem_statement}
                        </p>
                      )}

                      {/* Root Cause (if available) */}
                      {item.root_cause_description && (
                        <div className="bg-cream-100 border-l-4 border-brand-500 p-3 rounded-md">
                          <p className="text-[11px] font-semibold text-brand-500 uppercase tracking-wider mb-1">Root Cause Identified</p>
                          <p className="text-xs text-ink-600 line-clamp-2 leading-relaxed">{item.root_cause_description}</p>
                        </div>
                      )}
                    </div>

                    {/* Right: Action Buttons */}
                    <div className="flex flex-col gap-2 shrink-0">
                      <Link
                        href={`/rca-capa/${item.id}`}
                        className="btn-outline inline-flex items-center justify-center px-3 py-1.5 text-xs whitespace-nowrap"
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        View
                      </Link>
                      {canEdit('rca') && (
                        <Link
                          href={`/rca-capa/${item.id}/edit`}
                          className="btn-outline inline-flex items-center justify-center px-3 py-1.5 text-xs whitespace-nowrap"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

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
