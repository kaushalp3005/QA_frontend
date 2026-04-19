'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, FileText, Image as ImageIcon, Eye, Download, Search, Trash2, ClipboardCheck } from 'lucide-react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { usePermissions } from '@/hooks/usePermissions'
import PageHeader from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Loader'

interface VendorCOA {
  id: number
  vendor_name: string
  lot_batch_number: string
  item_name: string
  item_subcategory: string
  item_type?: string
  date: string
  file_name: string
  file_type: string
  file_url: string
}

export default function VendorCOAPage() {
  const router = useRouter()
  const { canCreate, canDelete, canView } = usePermissions()
  const [searchQuery, setSearchQuery] = useState('')
  const [coaRecords, setCoaRecords] = useState<VendorCOA[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch COA records from API
  useEffect(() => {
    fetchCOARecords()
  }, [])

  const fetchCOARecords = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/vendor-coa/`)
      if (!response.ok) {
        throw new Error('Failed to fetch COA records')
      }
      const data = await response.json()
      setCoaRecords(data.records || [])
    } catch (error) {
      console.error('Error fetching COA records:', error)
      alert('Failed to load COA records. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: number, vendorName: string) => {
    if (!confirm(`Are you sure you want to delete COA record for "${vendorName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/vendor-coa/${id}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        throw new Error('Failed to delete COA record')
      }

      alert('COA record deleted successfully')
      fetchCOARecords() // Refresh the list
    } catch (error) {
      console.error('Error deleting COA record:', error)
      alert('Failed to delete COA record. Please try again.')
    }
  }

  const filteredRecords = coaRecords.filter(record =>
    record.vendor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.lot_batch_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.item_subcategory.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Vendor COA Records"
          subtitle="View and manage vendor Certificate of Analysis documents"
          icon={ClipboardCheck}
          actions={
            canCreate('vendor_coa') ? (
              <button
                onClick={() => router.push('/vendor-coa/create')}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Upload New COA
              </button>
            ) : undefined
          }
        />

        {/* Search Bar */}
        <div className="surface-card p-4 mb-4 animate-fade-in">
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-300" />
              <input
                type="text"
                placeholder="Search by vendor name, lot/batch number, item name, or subcategory..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
            <div className="flex items-center gap-2 text-[11px] text-ink-400 flex-wrap">
              <span className="font-semibold uppercase tracking-wider">Searchable:</span>
              <span className="px-2 py-0.5 bg-cream-100 text-ink-500 rounded-full font-medium">Vendor Name</span>
              <span className="px-2 py-0.5 bg-cream-100 text-ink-500 rounded-full font-medium">Lot/Batch No.</span>
              <span className="px-2 py-0.5 bg-cream-100 text-ink-500 rounded-full font-medium">Item Name</span>
              <span className="px-2 py-0.5 bg-cream-100 text-ink-500 rounded-full font-medium">Subcategory</span>
            </div>
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
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Sr. No.
                    </th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Date
                    </th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Vendor Name
                    </th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Lot/Batch Number
                    </th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Item Name
                    </th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Item Subcategory
                    </th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Item Type
                    </th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Document
                    </th>
                    <th className="text-right text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-300 bg-white">
                  {filteredRecords.length === 0 ? (
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
                              : 'Click "Upload New COA" to add your first record'
                            }
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((record, index) => (
                      <tr key={record.id} className="hover:bg-cream-100/50 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap text-sm font-medium text-ink-500 tabular-nums">
                          {index + 1}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-ink-400 font-medium tabular-nums">
                          {record.date}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-sm font-medium text-ink-600">
                          {record.vendor_name}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center rounded-full text-[11px] font-semibold px-2.5 py-0.5 bg-cream-200 text-ink-500 font-mono">
                            {record.lot_batch_number}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-ink-500">
                          {record.item_name}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-ink-500">
                          {record.item_subcategory}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {record.item_type ? (
                            <span className="inline-flex items-center rounded-full text-[11px] font-semibold px-2.5 py-0.5 bg-success-50 text-success-700">
                              {record.item_type}
                            </span>
                          ) : (
                            <span className="text-ink-300 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-sm text-ink-500">
                          <div className="flex items-center gap-2">
                            {record.file_type.startsWith('image/') ? (
                              <ImageIcon className="h-4 w-4 text-ink-400 shrink-0" />
                            ) : (
                              <FileText className="h-4 w-4 text-brand-500 shrink-0" />
                            )}
                            <span className="truncate max-w-[150px] text-xs" title={record.file_name}>
                              {record.file_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/vendor-coa/${record.id}`}
                              className="text-ink-400 hover:text-brand-500 transition-colors p-1.5 rounded-md hover:bg-cream-100"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={() => window.open(record.file_url, '_blank')}
                              className="text-ink-400 hover:text-brand-500 transition-colors p-1.5 rounded-md hover:bg-cream-100"
                              title="View Document"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                const link = document.createElement('a')
                                link.href = record.file_url
                                link.download = record.file_name
                                link.target = '_blank'
                                document.body.appendChild(link)
                                link.click()
                                document.body.removeChild(link)
                              }}
                              className="text-ink-400 hover:text-brand-500 transition-colors p-1.5 rounded-md hover:bg-cream-100"
                              title="Download Document"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            {canDelete('vendor_coa') && (
                              <button
                                onClick={() => handleDelete(record.id, record.vendor_name)}
                                className="text-ink-400 hover:text-brand-500 transition-colors p-1.5 rounded-md hover:bg-cream-100"
                                title="Delete Record"
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

        {/* Footer Stats */}
        {!isLoading && (
          <div className="mt-4 surface-card px-5 py-3 animate-fade-in">
            <div className="flex items-center justify-between text-xs text-ink-400 font-medium">
              <span className="tabular-nums">
                Showing <span className="text-ink-600 font-semibold">{filteredRecords.length}</span> of <span className="text-ink-600 font-semibold">{coaRecords.length}</span> records
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
