'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { ArrowLeft, Plus, Calendar, Clock, Package, Check, Eye, Loader2, Trash2 } from 'lucide-react'
import { getXRayRecords, deleteXRayRecord } from '@/lib/api/xray'

interface XRayRecordFromAPI {
  id: number
  date: string
  time: string
  product_name: string
  batch_no: string
  ss316: boolean
  ceramic: boolean
  soda_lime_glass: boolean
  action_on_xray: string
  action_on_product_passed: string
  calibrated_monitored_by: string
  verified_by: string
  remarks: string
  created_at: string | null
}

export default function XRayDetectionPage() {
  const router = useRouter()
  const [records, setRecords] = useState<XRayRecordFromAPI[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecords()
  }, [])

  const fetchRecords = async () => {
    try {
      setLoading(true)
      const data = await getXRayRecords()
      setRecords(data || [])
    } catch (error) {
      console.error('Error fetching X-Ray detection records:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddEntry = () => {
    router.push('/documentations/xray/create')
  }

  const handleDeleteRecord = async (recordId: number) => {
    if (!confirm('Delete this record?')) return
    try {
      await deleteXRayRecord(recordId.toString())
      fetchRecords()
    } catch (error: any) {
      alert(error.message)
    }
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const todayRecords = records.filter(r => r.date === todayStr)
  const lastRecord = records.length > 0 ? records[0] : null

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Documentations
          </button>
        </div>

        {/* Create Section */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="bg-gradient-to-r from-green-600 to-green-800 px-6 py-4 rounded-t-lg">
            <h3 className="text-2xl font-bold text-white">
              X-Ray Detection Monitoring
            </h3>
            <p className="text-green-100 mt-1">
              CCP Calibration, Monitoring and Verification Records
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Check className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-semibold text-green-800">Records Today</h4>
                    <p className="text-2xl font-bold text-green-600">{todayRecords.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Package className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-semibold text-blue-800">Total Records</h4>
                    <p className="text-2xl font-bold text-blue-600">{records.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Calendar className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-semibold text-purple-800">Last Entry</h4>
                    <p className="text-sm text-purple-600">
                      {lastRecord ? `${lastRecord.date || ''} ${lastRecord.time || ''}` : 'No entries'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Add Entry Button */}
            <div className="mb-6">
              <button
                onClick={handleAddEntry}
                className="w-full md:w-auto flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add New X-Ray Detection Entry
              </button>
            </div>
          </div>
        </div>

        {/* Records Section */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                Recent X-Ray Detection Records
              </h3>
              <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                {records.length} Records
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
              <span className="ml-2 text-gray-500">Loading records...</span>
            </div>
          ) : records.length > 0 ? (
            <div className="px-6 py-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch No</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">X-Ray Action</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Calibrated By</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified By</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {records.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.date || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.time || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.product_name || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.batch_no || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate">{record.action_on_xray || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.calibrated_monitored_by || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.verified_by || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate">{record.remarks || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => router.push(`/documentations/xray/${record.id}`)}
                              className="text-blue-600 hover:text-blue-900 flex items-center"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(record.id)}
                              className="text-red-600 hover:text-red-900 flex items-center"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No records found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding your first X-Ray detection calibration record.
              </p>
              <div className="mt-6">
                <button
                  onClick={handleAddEntry}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Entry
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}