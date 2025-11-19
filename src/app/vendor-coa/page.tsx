'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, FileText, Image as ImageIcon, Eye, Download, Search } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface VendorCOA {
  id: number
  vendor_name: string
  lot_batch_number: string
  item_name: string
  item_subcategory: string
  date: string
  file_name: string
  file_type: string
  file_url: string
}

export default function VendorCOAPage() {
  const router = useRouter()
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/vendor-coa/`)
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

  const filteredRecords = coaRecords.filter(record => 
    record.vendor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.lot_batch_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.item_subcategory.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 ">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Vendor COA Records</h1>
                <p className="text-sm text-gray-600 mt-2">
                  View and manage vendor Certificate of Analysis documents
                </p>
              </div>
              <button
                onClick={() => router.push('/vendor-coa/create')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-5 w-5" />
                Upload New COA
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-lg shadow-sm p-3 mb-4">
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by vendor name, lot/batch number, item name, or subcategory..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-24 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="font-medium">Searchable fields:</span>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded">Vendor Name</span>
                <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded">Lot/Batch No.</span>
                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded">Item Name</span>
                <span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded">Subcategory</span>
              </div>
            </div>
          </div>

          {/* COA Records Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading COA records...</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sr. No.
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendor Name
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lot/Batch Number
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item Name
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item Subcategory
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Document
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-2 py-3 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-500">
                          <FileText className="h-12 w-12 mb-3 text-gray-400" />
                          <p className="text-sm font-medium">No COA records found</p>
                          <p className="text-xs mt-1">
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
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {index + 1}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {record.date}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                          {record.vendor_name}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {record.lot_batch_number}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">
                          {record.item_name}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">
                          {record.item_subcategory}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                          <div className="flex items-center gap-2">
                            {record.file_type.startsWith('image/') ? (
                              <ImageIcon className="h-5 w-5 text-blue-600" />
                            ) : (
                              <FileText className="h-5 w-5 text-red-600" />
                            )}
                            <span className="truncate max-w-[150px]" title={record.file_name}>
                              {record.file_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => window.open(record.file_url, '_blank')}
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                              title="View Document"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                // TODO: Implement download
                                alert('Download functionality to be implemented')
                              }}
                              className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-md transition-colors"
                              title="Download Document"
                            >
                              <Download className="h-4 w-4" />
                            </button>
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
            <div className="mt-4 bg-white rounded-lg shadow-sm p-3">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  Showing {filteredRecords.length} of {coaRecords.length} records
                </span>
                <span>
                  {searchQuery && `Filtered by: "${searchQuery}"`}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}