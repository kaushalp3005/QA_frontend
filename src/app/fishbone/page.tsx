'use client'
// zale pushh
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, Edit3, FileText, Printer, Eye, Trash2, BarChart3 } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { formatDateShort } from '@/lib/date-utils'
import { useCompany } from '@/contexts/CompanyContext'
import { usePermissions } from '@/hooks/usePermissions'
import { getFishboneAnalyses, deleteFishbone } from '@/lib/api/fishbone'
import { toast } from 'react-hot-toast'
import PageHeader from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Loader'

export default function FishbonePage() {
  const { currentCompany } = useCompany()
  const { canCreate, canEdit, canDelete } = usePermissions()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter] = useState('all')
  const [fishboneData, setFishboneData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Fetch fishbone analyses from database
  const fetchFishboneData = async () => {
    setIsLoading(true)
    try {
      const response = await getFishboneAnalyses({
        company: currentCompany,
        page: currentPage,
        limit: 10,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchTerm || undefined
      })

      setFishboneData(response.data)
      setTotalPages(response.pages)
    } catch (error: any) {
      console.error('Failed to fetch fishbone analyses:', error)
      toast.error(error.message || 'Failed to load fishbone analyses')
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch data on mount and when filters change
  useEffect(() => {
    fetchFishboneData()
  }, [currentCompany, currentPage, statusFilter])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        fetchFishboneData()
      } else {
        setCurrentPage(1)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  const filteredData = fishboneData

  const handleDelete = async (id: number) => {
    if (!canDelete('fishbone')) {
      toast.error('You do not have permission to delete')
      return
    }
    const confirmed = window.confirm('Are you sure you want to delete this fishbone record? This cannot be undone.')
    if (!confirmed) return
    try {
      await deleteFishbone(id, currentCompany)
      toast.success('Fishbone record deleted')
      // Refresh list; if now-empty page, move to previous page
      const isLastItemOnPage = fishboneData.length === 1 && currentPage > 1
      if (isLastItemOnPage) {
        setCurrentPage(currentPage - 1)
      } else {
        fetchFishboneData()
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to delete record')
    }
  }


  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="FishBone Method"
          subtitle="Cause and Effect Analysis using Ishikawa Diagram"
          icon={BarChart3}
          actions={
            canCreate('fishbone') ? (
              <Link href="/fishbone/create" className="btn-primary">
                <Plus className="w-4 h-4 mr-1.5" />
                Create FishBone Analysis
              </Link>
            ) : undefined
          }
        />

        {/* Filters */}
        <div className="surface-card p-4 mb-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-300" />
              <input
                type="text"
                placeholder="Search by title, problem statement, or complaint ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-base pl-10"
              />
            </div>
          </div>
        </div>

        {/* FishBone Analysis List */}
        <div className="surface-card overflow-hidden animate-fade-in">
          <div className="px-5 py-4 border-b border-cream-300 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink-600">FishBone Analyses Records</h2>
            <span className="text-xs text-ink-400 font-medium tabular-nums">{filteredData.length} records</span>
          </div>

          {isLoading ? (
            <div className="text-center py-16">
              <Spinner size={32} className="text-brand-500 mx-auto" />
              <p className="mt-3 text-sm text-ink-400 font-medium">Loading fishbone analyses...</p>
            </div>
          ) : filteredData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-cream-300">
                <thead className="bg-cream-100">
                  <tr>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Analysis Details
                    </th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Complaint ID
                    </th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Created Date
                    </th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Created By
                    </th>
                    <th className="text-right text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-300 bg-white">
                  {filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-cream-100/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div>
                          <div className="text-sm font-semibold text-ink-600">
                            {item.fishbone_number || `FA-${item.id}`}
                          </div>
                          <div className="text-xs text-ink-400 mt-0.5 line-clamp-2">
                            {item.problem_statement}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="text-xs text-brand-500 font-semibold tabular-nums">
                          {item.complaint_id || '-'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-ink-400 font-medium tabular-nums">
                        {item.analysis_date ? formatDateShort(item.analysis_date) : formatDateShort(item.created_at)}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-sm text-ink-500">
                        {item.created_by || '-'}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/fishbone/${item.id}`}
                            className="text-ink-400 hover:text-brand-500 transition-colors p-1.5 rounded-md hover:bg-cream-100"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {canEdit('fishbone') && (
                            <Link
                              href={`/fishbone/${item.id}/edit`}
                              className="text-ink-400 hover:text-brand-500 transition-colors p-1.5 rounded-md hover:bg-cream-100"
                              title="Edit"
                            >
                              <Edit3 className="h-4 w-4" />
                            </Link>
                          )}
                          <Link
                            href={`/fishbone/${item.id}/print`}
                            target="_blank"
                            className="text-ink-400 hover:text-brand-500 transition-colors p-1.5 rounded-md hover:bg-cream-100"
                            title="Print"
                          >
                            <Printer className="h-4 w-4" />
                          </Link>
                          {canDelete('fishbone') && (
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="text-ink-400 hover:text-brand-500 transition-colors p-1.5 rounded-md hover:bg-cream-100"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="bg-cream-200 w-14 h-14 rounded-full mx-auto flex items-center justify-center">
                <FileText className="h-6 w-6 text-ink-400" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-ink-500">No FishBone analyses records found</h3>
              <p className="text-xs text-ink-400 mt-0.5">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by creating your first FishBone analysis.'
                }
              </p>
              {(!searchTerm && statusFilter === 'all') && canCreate('fishbone') && (
                <div className="mt-5">
                  <Link href="/fishbone/create" className="btn-primary inline-flex">
                    <Plus className="w-4 h-4 mr-1.5" />
                    Create FishBone Analysis
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Stats */}
      </div>
    </DashboardLayout>
  )
}
