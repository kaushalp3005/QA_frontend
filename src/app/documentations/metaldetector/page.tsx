'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { ArrowLeft, Plus, Calendar, Clock, User, Package, Check, Eye } from 'lucide-react'

interface MetalDetectorRecord {
  id: string
  date: string
  time: string
  identificationNo: string
  customerName: string
  productName: string
  batchLotNo: string
  sensitivityFE: string
  sensitivityNFE: string
  sensitivitySS: string
  sensitivityFEChecked: boolean
  sensitivityNFEChecked: boolean
  sensitivitySSChecked: boolean
  calibratedBy: string
  verifiedBy: string
  remarks?: string
}

export default function MetalDetectorPage() {
  const router = useRouter()
  const [records, setRecords] = useState<MetalDetectorRecord[]>([])

  // In a real app this would come from an API

  const handleAddEntry = () => {
    router.push('/documentations/metaldetector/entry')
  }

  const handleViewDetails = (recordId: string) => {
    // In a real app, this would navigate to a detailed view
    console.log('View details for record:', recordId)
  }

  const handleDeleteRecord = (recordId: string) => {
    setRecords(prev => prev.filter(record => record.id !== recordId))
  }

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

        {/* Page Header */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4 rounded-t-lg">
            <h3 className="text-2xl font-bold text-white">
              Metal Detector Monitoring
            </h3>
            <p className="text-blue-100 mt-1">
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
                    <p className="text-2xl font-bold text-green-600">{records.filter(r => r.date === new Date().toISOString().split('T')[0]).length}</p>
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
                      {records.length > 0 ? `${records[records.length - 1].date} ${records[records.length - 1].time}` : 'No entries'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Add Entry Button */}
            <div className="mb-6">
              <button
                onClick={handleAddEntry}
                className="w-full md:w-auto flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add New Metal Detector Entry
              </button>
            </div>
          </div>
        </div>

        {/* Records Section */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                Recent Metal Detector Records
              </h3>
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                {records.length} Records
              </span>
            </div>
          </div>
          
          {records.length > 0 ? (
            <div className="px-6 py-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detector ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch/Lot</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified By</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {records.map((record) => {
                      const allSensitivitiesChecked = record.sensitivityFEChecked && record.sensitivityNFEChecked && record.sensitivitySSChecked
                      return (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{record.date}</div>
                                <div className="text-sm text-gray-500 flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {record.time}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {record.identificationNo}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <User className="h-4 w-4 text-gray-400 mr-2" />
                              <span className="text-sm text-gray-900">{record.customerName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-gray-900">{record.productName}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-gray-900">{record.batchLotNo}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              allSensitivitiesChecked 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              <Check className={`h-3 w-3 mr-1 ${allSensitivitiesChecked ? 'text-green-600' : 'text-yellow-600'}`} />
                              {allSensitivitiesChecked ? 'All Passed' : 'Needs Review'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-gray-900">{record.verifiedBy}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleViewDetails(record.id)}
                                className="text-blue-600 hover:text-blue-900 flex items-center"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(record.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No records found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding your first metal detector calibration record.
              </p>
              <div className="mt-6">
                <button
                  onClick={handleAddEntry}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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