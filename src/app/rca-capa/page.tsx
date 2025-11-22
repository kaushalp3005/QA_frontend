'use client'
// zale pushh
import { useState, useEffect } from 'react'
import { Plus, Search, FileText, Calendar, Users, AlertCircle, Loader2, Edit } from 'lucide-react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { formatDateShort } from '@/lib/date-utils'
import { useCompany } from '@/contexts/CompanyContext'
import { usePermissions } from '@/hooks/usePermissions'
import { getRCAList, RCAResponse } from '@/lib/api/rca'
import { toast } from 'react-hot-toast'

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
  open: 'bg-red-100 text-red-800',
  in_progress: 'bg-yellow-100 text-yellow-800', 
  completed: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800'
}

const severityColors = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
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
  const limit = 10

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
    } catch (error) {
      console.error('Error fetching RCA data:', error)
      toast.error('Failed to load RCA/CAPA records')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">RCA/CAPA Management</h1>
            <p className="text-gray-600 mt-1">Root Cause Analysis & Corrective Action Preventive Action</p>
          </div>
          {/* New RCA/CAPA Button - Only show if user can create */}
          {canCreate('rca') && (
            <Link 
              href="/rca-capa/create"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              New RCA/CAPA
            </Link>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total RCA</p>
                <p className="text-2xl font-semibold text-blue-600">
                  {loading ? '-' : rcaData.length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Critical</p>
                <p className="text-2xl font-semibold text-red-600">
                  {loading ? '-' : rcaData.filter(item => item.severity === 'critical').length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High Priority</p>
                <p className="text-2xl font-semibold text-orange-600">
                  {loading ? '-' : rcaData.filter(item => item.severity === 'high').length}
                </p>
              </div>
              <Users className="h-8 w-8 text-orange-500" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-semibold text-blue-600">
                  {loading ? '-' : rcaData.length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search RCA/CAPA items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Severity</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        {/* RCA/CAPA List */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">RCA/CAPA Records</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="px-6 py-12 text-center">
                <Loader2 className="mx-auto h-12 w-12 text-blue-500 animate-spin" />
                <p className="mt-4 text-sm text-gray-600">Loading RCA/CAPA records...</p>
              </div>
            ) : rcaData.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No RCA/CAPA items found</h3>
                <p className="mt-2 text-sm text-gray-600">
                  {searchTerm || severityFilter 
                    ? 'Try adjusting your search or filters.' 
                    : 'No RCA/CAPA records found. Create one to get started.'}
                </p>
                <div className="mt-4 text-xs text-gray-500">
                  <p>Debug: Total records: {rcaData.length}</p>
                </div>
              </div>
            ) : (
              rcaData.map((item: any) => (
                <div key={item.id} className="px-6 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Content */}
                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Header Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Link 
                            href={`/rca-capa/${item.id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800"
                          >
                            {item.rca_number}
                          </Link>
                          {item.severity && (
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${severityColors[item.severity as keyof typeof severityColors]}`}>
                              {item.severity.toUpperCase()}
                            </span>
                          )}
                          {item.problem_category && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                              {item.problem_category}
                            </span>
                          )}
                        </div>
                        {item.date_of_report && (
                          <span className="text-xs text-gray-500 flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDateShort(item.date_of_report)}
                          </span>
                        )}
                      </div>

                      {/* Complaint ID */}
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-gray-600">Complaint:</span>
                        <span className="text-xs text-gray-900 font-medium">{item.complaint_id}</span>
                      </div>

                      {/* Item Details */}
                      {(item.item_category || item.item_subcategory || item.item_description) && (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                          {item.item_category && (
                            <div className="flex items-center">
                              <span className="text-gray-600">Category:</span>
                              <span className="ml-1 font-medium text-gray-900">{item.item_category}</span>
                            </div>
                          )}
                          {item.item_subcategory && (
                            <div className="flex items-center">
                              <span className="text-gray-600">Sub-category:</span>
                              <span className="ml-1 font-medium text-gray-900">{item.item_subcategory}</span>
                            </div>
                          )}
                          {item.item_description && (
                            <div className="flex items-center">
                              <span className="text-gray-600">Item:</span>
                              <span className="ml-1 font-medium text-gray-900 truncate max-w-xs">{item.item_description}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Customer & Batch Info */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                        {item.name_of_customer && (
                          <div className="flex items-center">
                            <Users className="h-3 w-3 mr-1 text-gray-500" />
                            <span className="text-gray-600">Customer:</span>
                            <span className="ml-1 font-medium text-gray-900">{item.name_of_customer}</span>
                          </div>
                        )}
                        {item.batch_code && (
                          <div className="flex items-center">
                            <span className="text-gray-600">Batch:</span>
                            <span className="ml-1 font-medium text-gray-900">{item.batch_code}</span>
                          </div>
                        )}
                        {item.date_of_packing && (
                          <div className="flex items-center">
                            <span className="text-gray-600">Packing Date:</span>
                            <span className="ml-1 text-gray-900">{formatDateShort(item.date_of_packing)}</span>
                          </div>
                        )}
                      </div>

                      {/* Summary/Problem Statement */}
                      {(item.summary_of_incident || item.problem_statement) && (
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {item.summary_of_incident || item.problem_statement}
                        </p>
                      )}

                      {/* Root Cause (if available) */}
                      {item.root_cause_description && (
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                          <p className="text-xs font-medium text-blue-900 mb-1">Root Cause Identified:</p>
                          <p className="text-xs text-blue-800 line-clamp-2">{item.root_cause_description}</p>
                        </div>
                      )}
                    </div>

                    {/* Right: Action Buttons */}
                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/rca-capa/${item.id}`}
                        className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors whitespace-nowrap"
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        View
                      </Link>
                      {canEdit('rca') && (
                        <Link
                          href={`/rca-capa/${item.id}/edit`}
                          className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors whitespace-nowrap"
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
          {!loading && totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}