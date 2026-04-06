'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { ArrowLeft, Plus, Calendar, Clock, User, Package, Check, Eye, X, Printer, Edit2, Save, Loader2 } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
const AUTHORIZED_EMAIL = 'pooja.parkar@candorfoods.in'

// Convert 24hr time (HH:MM) to 12hr format (hh:mm AM/PM)
const to12Hour = (time24: string): string => {
  if (!time24) return ''
  const [h, m] = time24.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`
}

// Convert 12hr time (hh:mm AM/PM) to 24hr format (HH:MM)
const to24Hour = (hour: number, minute: number, period: string): string => {
  let h = hour
  if (period === 'AM' && h === 12) h = 0
  else if (period === 'PM' && h !== 12) h += 12
  return `${h.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}

// Parse 24hr time string into 12hr components
const parse12Hour = (time24: string): { hour: number; minute: number; period: string } => {
  if (!time24) return { hour: 12, minute: 0, period: 'AM' }
  const [h, m] = time24.split(':').map(Number)
  return { hour: h === 0 ? 12 : h > 12 ? h - 12 : h, minute: m, period: h >= 12 ? 'PM' : 'AM' }
}

interface MetalDetectorRecord {
  id: number
  batch_id: string
  entry_date: string
  entry_time: string
  identification_no: string
  location: string | null
  customer_name: string | null
  batch_lot_no: string | null
  calibrated_by: string
  verified_by: string
  status: string | null
  remarks: string | null
  entry_count: number
  created_at: string
  updated_at: string
}

interface MDEntry {
  id: number
  record_id: number
  entry_date: string
  entry_time: string
  identification_no: string
  location: string | null
  machine_details: string | null
  customer_name: string | null
  product_name: string | null
  batch_lot_no: string | null
  sensitivity_fe: string | null
  sensitivity_fe_checked: boolean
  sensitivity_nfe: string | null
  sensitivity_nfe_checked: boolean
  sensitivity_ss: string | null
  sensitivity_ss_checked: boolean
  corrective_action_on_detector: string | null
  corrective_action_on_product: string | null
  calibrated_by: string
  verified_by: string
  remarks: string | null
}

interface MDRecordWithEntries extends MetalDetectorRecord {
  entries: MDEntry[]
}

export default function MetalDetectorPage() {
  const router = useRouter()
  const [records, setRecords] = useState<MetalDetectorRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [viewRecord, setViewRecord] = useState<MDRecordWithEntries | null>(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [printRecord, setPrintRecord] = useState<MDRecordWithEntries | null>(null)
  const [printLoading, setPrintLoading] = useState(false)
  const [editRecord, setEditRecord] = useState<MDRecordWithEntries | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editFormData, setEditFormData] = useState<{
    entry_date: string
    entry_time: string
    identification_no: string
    customer_name: string
    batch_lot_no: string
    calibrated_by: string
    verified_by: string
    remarks: string
    entries: {
      entry_time: string
      product_name: string
      batch_lot_no: string
      corrective_action_on_detector: string
      corrective_action_on_product: string
      calibrated_by: string
      verified_by: string
      remarks: string
    }[]
  } | null>(null)

  // Inline entry editing state
  const [inlineEditEntryId, setInlineEditEntryId] = useState<number | null>(null)
  const [inlineEditData, setInlineEditData] = useState<{
    entry_time: string
    identification_no: string
    customer_name: string
    product_name: string
    batch_lot_no: string
    sensitivity_fe_checked: boolean
    sensitivity_nfe_checked: boolean
    sensitivity_ss_checked: boolean
    corrective_action_on_detector: string
    corrective_action_on_product: string
    calibrated_by: string
    verified_by: string
    remarks: string
  } | null>(null)
  const [inlineEditSaving, setInlineEditSaving] = useState(false)

  // Check if current user is authorized for edit/delete
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const user = JSON.parse(userStr)
        setIsAuthorized(user.email === AUTHORIZED_EMAIL)
      }
    } catch {
      setIsAuthorized(false)
    }
  }, [])

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('access_token')
    if (token) {
      return { Authorization: `Bearer ${token}` }
    }
    return {}
  }

  const fetchRecords = async () => {
    try {
      const apiUrl = `${API_BASE}/metaldetector/`
      const response = await fetch(apiUrl)
      if (response.ok) {
        const data = await response.json()
        setRecords(data.records || [])
      } else {
        console.error('Failed to fetch records:', response.status)
      }
    } catch (error) {
      console.error('Error fetching records:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [])

  const handleAddEntry = () => {
    router.push('/documentations/metaldetector/entry')
  }

  const handleViewDetails = async (recordId: number) => {
    setViewLoading(true)
    setViewRecord(null)
    setInlineEditEntryId(null)
    setInlineEditData(null)
    try {
      const response = await fetch(`${API_BASE}/metaldetector/${recordId}`)
      if (response.ok) {
        const data = await response.json()
        setViewRecord(data)
      } else {
        alert('Failed to fetch record details.')
      }
    } catch (error) {
      console.error('Error fetching record details:', error)
      alert('Error fetching record details.')
    } finally {
      setViewLoading(false)
    }
  }

  const handlePrintRecord = async (recordId: number) => {
    setPrintLoading(true)
    setPrintRecord(null)
    try {
      const response = await fetch(`${API_BASE}/metaldetector/${recordId}`)
      if (response.ok) {
        const data = await response.json()
        setPrintRecord(data)
      } else {
        alert('Failed to fetch record details for print.')
      }
    } catch (error) {
      console.error('Error fetching record for print:', error)
      alert('Error fetching record for print.')
    } finally {
      setPrintLoading(false)
    }
  }

  const triggerPrint = () => {
    window.print()
  }

  const getPrintRows = (entries: MDEntry[], minRows = 10) => {
    const rows: (MDEntry | null)[] = [...entries]
    while (rows.length < minRows) rows.push(null)
    return rows
  }

  const groupEntriesByIdentification = (entries: MDEntry[]) => {
    const groups: Record<string, MDEntry[]> = {}
    entries.forEach(entry => {
      const key = entry.identification_no || 'Unknown'
      if (!groups[key]) groups[key] = []
      groups[key].push(entry)
    })
    return Object.entries(groups)
  }

  const W202_IDENTIFICATIONS = ['CCP-1', 'CCP-1A', 'CCP-1B', 'CCP-1C']

  const getDocNumber = (identificationNo: string) => {
    return W202_IDENTIFICATIONS.includes(identificationNo) ? 'CFPLA.C2.F.24' : 'CFPLB.C2.F.18'
  }

  const handleDeleteRecord = async (recordId: number) => {
    if (!isAuthorized) {
      alert('You are not authorized to delete records. Only pooja.parkar@candorfoods.in can delete.')
      return
    }
    if (!confirm('Are you sure you want to delete this record and all its entries?')) return

    try {
      const response = await fetch(`${API_BASE}/metaldetector/${recordId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        setRecords(prev => prev.filter(record => record.id !== recordId))
      } else {
        const data = await response.json().catch(() => ({}))
        alert(data.detail || 'Failed to delete record.')
      }
    } catch (error) {
      console.error('Error deleting record:', error)
      alert('Error deleting record.')
    }
  }

  const handleEditRecord = async (recordId: number) => {
    if (!isAuthorized) {
      alert('You are not authorized to edit records. Only pooja.parkar@candorfoods.in can edit.')
      return
    }
    setEditLoading(true)
    setEditRecord(null)
    setEditFormData(null)
    try {
      const response = await fetch(`${API_BASE}/metaldetector/${recordId}`)
      if (response.ok) {
        const data: MDRecordWithEntries = await response.json()
        setEditRecord(data)
        setEditFormData({
          entry_date: data.entry_date || '',
          entry_time: data.entry_time || '',
          identification_no: data.identification_no || '',
          customer_name: data.customer_name || '',
          batch_lot_no: data.batch_lot_no || '',
          calibrated_by: data.calibrated_by || '',
          verified_by: data.verified_by || '',
          remarks: data.remarks || '',
          entries: data.entries.map(e => ({
            entry_time: e.entry_time || '',
            product_name: e.product_name || '',
            batch_lot_no: e.batch_lot_no || '',
            corrective_action_on_detector: e.corrective_action_on_detector || '',
            corrective_action_on_product: e.corrective_action_on_product || '',
            calibrated_by: e.calibrated_by || '',
            verified_by: e.verified_by || '',
            remarks: e.remarks || '',
          })),
        })
      } else {
        alert('Failed to fetch record details for editing.')
      }
    } catch (error) {
      console.error('Error fetching record for edit:', error)
      alert('Error fetching record for editing.')
    } finally {
      setEditLoading(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editRecord || !editFormData) return
    setEditSaving(true)
    try {
      const response = await fetch(`${API_BASE}/metaldetector/${editRecord.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(editFormData),
      })
      if (response.ok) {
        alert('Record updated successfully!')
        setEditRecord(null)
        setEditFormData(null)
        fetchRecords()
      } else {
        const data = await response.json().catch(() => ({}))
        alert(data.detail || 'Failed to update record.')
      }
    } catch (error) {
      console.error('Error updating record:', error)
      alert('Error updating record.')
    } finally {
      setEditSaving(false)
    }
  }

  const handleInlineEditStart = (entry: MDEntry) => {
    if (!isAuthorized) {
      alert('You are not authorized to edit entries. Only pooja.parkar@candorfoods.in can edit.')
      return
    }
    setInlineEditEntryId(entry.id)
    setInlineEditData({
      entry_time: entry.entry_time || '',
      identification_no: entry.identification_no || '',
      customer_name: entry.customer_name || '',
      product_name: entry.product_name || '',
      batch_lot_no: entry.batch_lot_no || '',
      sensitivity_fe_checked: entry.sensitivity_fe_checked,
      sensitivity_nfe_checked: entry.sensitivity_nfe_checked,
      sensitivity_ss_checked: entry.sensitivity_ss_checked,
      corrective_action_on_detector: entry.corrective_action_on_detector || '',
      corrective_action_on_product: entry.corrective_action_on_product || '',
      calibrated_by: entry.calibrated_by || '',
      verified_by: entry.verified_by || '',
      remarks: entry.remarks || '',
    })
  }

  const handleInlineEditSave = async () => {
    if (!inlineEditEntryId || !inlineEditData || !viewRecord) return
    setInlineEditSaving(true)
    try {
      const response = await fetch(`${API_BASE}/metaldetector/entry/${inlineEditEntryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(inlineEditData),
      })
      if (response.ok) {
        // Refresh the view record
        const refreshResponse = await fetch(`${API_BASE}/metaldetector/${viewRecord.id}`)
        if (refreshResponse.ok) {
          const data = await refreshResponse.json()
          setViewRecord(data)
        }
        setInlineEditEntryId(null)
        setInlineEditData(null)
        fetchRecords()
      } else {
        const data = await response.json().catch(() => ({}))
        alert(data.detail || 'Failed to update entry.')
      }
    } catch (error) {
      console.error('Error updating entry:', error)
      alert('Error updating entry.')
    } finally {
      setInlineEditSaving(false)
    }
  }

  const handleInlineEditCancel = () => {
    setInlineEditEntryId(null)
    setInlineEditData(null)
  }

  const todayStr = new Date().toISOString().split('T')[0]

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
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Clock className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-semibold text-orange-800">Pending Records</h4>
                    <p className="text-2xl font-bold text-orange-600">{records.filter(r => r.status === 'pending').length}</p>
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
                      {records.length > 0 ? `${records[0].entry_date} ${to12Hour(records[0].entry_time)}` : 'No entries'}
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

          {loading ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-gray-500">Loading records...</p>
            </div>
          ) : records.length > 0 ? (
            <div className="px-6 py-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detector ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch/Lot</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entries</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified By</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {records.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{record.entry_date}</div>
                              <div className="text-sm text-gray-500 flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {to12Hour(record.entry_time)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-mono text-gray-900">{record.batch_id}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {record.identification_no}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <User className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">{record.customer_name || '-'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{record.batch_lot_no || '-'}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">{record.entry_count}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            record.status === 'passed'
                              ? 'bg-green-100 text-green-800'
                              : record.status === 'pending'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {record.status === 'pending' ? (
                              <>
                                <Clock className="h-3 w-3 mr-1 text-orange-600" />
                                Pending
                              </>
                            ) : (
                              <>
                                <Check className={`h-3 w-3 mr-1 ${record.status === 'passed' ? 'text-green-600' : 'text-yellow-600'}`} />
                                {record.status === 'passed' ? 'All Passed' : 'Needs Review'}
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{record.verified_by}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            {record.status === 'pending' && (
                              <button
                                onClick={() => router.push(`/documentations/metaldetector/entry?resumeRecordId=${record.id}`)}
                                className="text-orange-600 hover:text-orange-900 flex items-center font-semibold"
                              >
                                <Edit2 className="h-4 w-4 mr-1" />
                                Continue
                              </button>
                            )}
                            <button
                              onClick={() => handleViewDetails(record.id)}
                              className="text-blue-600 hover:text-blue-900 flex items-center"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </button>
                            {isAuthorized && (
                              <button
                                onClick={() => handleViewDetails(record.id)}
                                className="text-amber-600 hover:text-amber-900 flex items-center"
                                title="Edit entries"
                              >
                                <Edit2 className="h-4 w-4 mr-1" />
                                Edit
                              </button>
                            )}
                            <button
                              onClick={() => handlePrintRecord(record.id)}
                              className="text-green-600 hover:text-green-900 flex items-center"
                            >
                              <Printer className="h-4 w-4 mr-1" />
                              Print
                            </button>
                            {isAuthorized && (
                              <button
                                onClick={() => handleDeleteRecord(record.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            )}
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

      {/* View Details Modal */}
      {(viewRecord || viewLoading) && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => { setViewRecord(null); handleInlineEditCancel() }} />

            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden z-10">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Record Details {viewRecord ? `- ${viewRecord.batch_id}` : ''}
                  </h3>
                  {viewRecord && (
                    <p className="text-blue-100 text-sm mt-0.5">
                      {viewRecord.entry_date} | Detector: {viewRecord.identification_no} | Customer: {viewRecord.customer_name || '-'}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => { setViewRecord(null); handleInlineEditCancel() }}
                  className="text-white hover:text-blue-200 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
                {viewLoading ? (
                  <div className="px-6 py-12 text-center">
                    <p className="text-sm text-gray-500">Loading record details...</p>
                  </div>
                ) : viewRecord && viewRecord.entries.length > 0 ? (
                  <div className="p-6">
                    {/* Summary Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase">Batch ID</p>
                        <p className="text-sm font-semibold text-gray-900">{viewRecord.batch_id}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase">Batch/Lot No</p>
                        <p className="text-sm font-semibold text-gray-900">{viewRecord.batch_lot_no || '-'}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase">Calibrated By</p>
                        <p className="text-sm font-semibold text-gray-900">{viewRecord.calibrated_by}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase">Verified By</p>
                        <p className="text-sm font-semibold text-gray-900">{viewRecord.verified_by}</p>
                      </div>
                    </div>

                    {/* Entries Table */}
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-md font-semibold text-gray-800">
                        Entries ({viewRecord.entries.length})
                      </h4>
                      {isAuthorized && (
                        <span className="text-xs text-blue-600 font-medium">Click any row to edit</span>
                      )}
                    </div>
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID No</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Batch/Lot</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">FE</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">NFE</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">SS</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">On Detector</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">On Product</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Calibrated</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Verified</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                            {isAuthorized && <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {viewRecord.entries.map((entry, index) => (
                            inlineEditEntryId === entry.id && inlineEditData ? (
                              <tr key={entry.id} className="bg-amber-50">
                                <td className="px-3 py-2 text-sm text-gray-500">{index + 1}</td>
                                <td className="px-3 py-2">
                                  <input type="text" value={inlineEditData.identification_no} onChange={(e) => setInlineEditData(prev => prev ? { ...prev, identification_no: e.target.value } : prev)} className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500" />
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{entry.entry_date}</td>
                                <td className="px-3 py-2">
                                  <input type="time" value={inlineEditData.entry_time} onChange={(e) => setInlineEditData(prev => prev ? { ...prev, entry_time: e.target.value } : prev)} className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500" />
                                </td>
                                <td className="px-3 py-2">
                                  <input type="text" value={inlineEditData.customer_name} onChange={(e) => setInlineEditData(prev => prev ? { ...prev, customer_name: e.target.value } : prev)} className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500" />
                                </td>
                                <td className="px-3 py-2">
                                  <input type="text" value={inlineEditData.product_name} onChange={(e) => setInlineEditData(prev => prev ? { ...prev, product_name: e.target.value } : prev)} className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500" />
                                </td>
                                <td className="px-3 py-2">
                                  <input type="text" value={inlineEditData.batch_lot_no} onChange={(e) => setInlineEditData(prev => prev ? { ...prev, batch_lot_no: e.target.value } : prev)} className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500" />
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <label className="cursor-pointer inline-flex">
                                    <input type="checkbox" checked={inlineEditData.sensitivity_fe_checked} onChange={(e) => setInlineEditData(prev => prev ? { ...prev, sensitivity_fe_checked: e.target.checked } : prev)} className="sr-only" />
                                    <div className={`w-7 h-7 border-2 rounded flex items-center justify-center transition-all ${inlineEditData.sensitivity_fe_checked ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`}>
                                      {inlineEditData.sensitivity_fe_checked && <Check className="w-4 h-4 text-white" />}
                                    </div>
                                  </label>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <label className="cursor-pointer inline-flex">
                                    <input type="checkbox" checked={inlineEditData.sensitivity_nfe_checked} onChange={(e) => setInlineEditData(prev => prev ? { ...prev, sensitivity_nfe_checked: e.target.checked } : prev)} className="sr-only" />
                                    <div className={`w-7 h-7 border-2 rounded flex items-center justify-center transition-all ${inlineEditData.sensitivity_nfe_checked ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`}>
                                      {inlineEditData.sensitivity_nfe_checked && <Check className="w-4 h-4 text-white" />}
                                    </div>
                                  </label>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <label className="cursor-pointer inline-flex">
                                    <input type="checkbox" checked={inlineEditData.sensitivity_ss_checked} onChange={(e) => setInlineEditData(prev => prev ? { ...prev, sensitivity_ss_checked: e.target.checked } : prev)} className="sr-only" />
                                    <div className={`w-7 h-7 border-2 rounded flex items-center justify-center transition-all ${inlineEditData.sensitivity_ss_checked ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`}>
                                      {inlineEditData.sensitivity_ss_checked && <Check className="w-4 h-4 text-white" />}
                                    </div>
                                  </label>
                                </td>
                                <td className="px-3 py-2">
                                  <input type="text" value={inlineEditData.corrective_action_on_detector} onChange={(e) => setInlineEditData(prev => prev ? { ...prev, corrective_action_on_detector: e.target.value } : prev)} className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500" />
                                </td>
                                <td className="px-3 py-2">
                                  <input type="text" value={inlineEditData.corrective_action_on_product} onChange={(e) => setInlineEditData(prev => prev ? { ...prev, corrective_action_on_product: e.target.value } : prev)} className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500" />
                                </td>
                                <td className="px-3 py-2">
                                  <input type="text" value={inlineEditData.calibrated_by} onChange={(e) => setInlineEditData(prev => prev ? { ...prev, calibrated_by: e.target.value } : prev)} className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500" />
                                </td>
                                <td className="px-3 py-2">
                                  <select value={inlineEditData.verified_by} onChange={(e) => setInlineEditData(prev => prev ? { ...prev, verified_by: e.target.value } : prev)} className="w-28 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500">
                                    <option value="Pooja Parkar">Pooja Parkar</option>
                                    <option value="Shraddha Jadhav">Shraddha Jadhav</option>
                                    <option value="Pooja Mhalim">Pooja Mhalim</option>
                                    <option value="Nikita Jarag">Nikita Jarag</option>
                                    <option value="Other">Other</option>
                                  </select>
                                </td>
                                <td className="px-3 py-2">
                                  <input type="text" value={inlineEditData.remarks} onChange={(e) => setInlineEditData(prev => prev ? { ...prev, remarks: e.target.value } : prev)} className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500" />
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-1">
                                    <button onClick={handleInlineEditSave} disabled={inlineEditSaving} className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50" title="Save">
                                      {inlineEditSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    </button>
                                    <button onClick={handleInlineEditCancel} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Cancel">
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              <tr key={entry.id} onClick={() => isAuthorized && handleInlineEditStart(entry)} className={`hover:bg-gray-50 ${isAuthorized ? 'cursor-pointer' : ''}`}>
                                <td className="px-3 py-2 text-sm text-gray-500">{index + 1}</td>
                                <td className="px-3 py-2 text-sm font-medium text-blue-800">{entry.identification_no || '-'}</td>
                                <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{entry.entry_date}</td>
                                <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{to12Hour(entry.entry_time)}</td>
                                <td className="px-3 py-2 text-sm text-gray-900">{entry.customer_name || '-'}</td>
                                <td className="px-3 py-2 text-sm text-gray-900">{entry.product_name || '-'}</td>
                                <td className="px-3 py-2 text-sm text-gray-900">{entry.batch_lot_no || '-'}</td>
                                <td className="px-3 py-2 text-sm whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${entry.sensitivity_fe_checked ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {entry.sensitivity_fe || '-'} {entry.sensitivity_fe_checked ? '\u2713' : '\u2717'}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-sm whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${entry.sensitivity_nfe_checked ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {entry.sensitivity_nfe || '-'} {entry.sensitivity_nfe_checked ? '\u2713' : '\u2717'}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-sm whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${entry.sensitivity_ss_checked ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {entry.sensitivity_ss || '-'} {entry.sensitivity_ss_checked ? '\u2713' : '\u2717'}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-900">{entry.corrective_action_on_detector || '-'}</td>
                                <td className="px-3 py-2 text-sm text-gray-900">{entry.corrective_action_on_product || '-'}</td>
                                <td className="px-3 py-2 text-sm text-gray-900">{entry.calibrated_by || '-'}</td>
                                <td className="px-3 py-2 text-sm text-gray-900">{entry.verified_by || '-'}</td>
                                <td className="px-3 py-2 text-sm text-gray-500">{entry.remarks || '-'}</td>
                                {isAuthorized && (
                                  <td className="px-3 py-2 text-sm">
                                    <button onClick={(e) => { e.stopPropagation(); handleInlineEditStart(entry) }} className="text-amber-600 hover:text-amber-800">
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            )
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : viewRecord ? (
                  <div className="px-6 py-12 text-center">
                    <p className="text-sm text-gray-500">No entries found for this record.</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Record Modal */}
      {(editRecord || editLoading) && editFormData && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => { setEditRecord(null); setEditFormData(null) }} />

            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden z-10">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-amber-500 to-amber-700 px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Edit Record {editRecord ? `- ${editRecord.batch_id}` : ''}
                  </h3>
                  {editRecord && (
                    <p className="text-amber-100 text-sm mt-0.5">
                      {editRecord.entry_date} | Detector: {editRecord.identification_no}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => { setEditRecord(null); setEditFormData(null) }}
                  className="text-white hover:text-amber-200 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
                {editLoading ? (
                  <div className="px-6 py-12 text-center">
                    <p className="text-sm text-gray-500">Loading record for editing...</p>
                  </div>
                ) : editRecord ? (
                  <div className="p-6 space-y-6">
                    {/* Record-level fields */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-800 mb-3">Record Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                          <input
                            type="date"
                            value={editFormData.entry_date}
                            onChange={(e) => setEditFormData(prev => prev ? { ...prev, entry_date: e.target.value } : prev)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                          <div className="flex gap-1.5 items-center">
                            <select
                              value={parse12Hour(editFormData.entry_time).hour}
                              onChange={(e) => {
                                const { minute, period } = parse12Hour(editFormData.entry_time)
                                setEditFormData(prev => prev ? { ...prev, entry_time: to24Hour(Number(e.target.value), minute, period) } : prev)
                              }}
                              className="w-[65px] px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                            >
                              {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                            <span className="text-gray-500 font-bold">:</span>
                            <select
                              value={parse12Hour(editFormData.entry_time).minute}
                              onChange={(e) => {
                                const { hour, period } = parse12Hour(editFormData.entry_time)
                                setEditFormData(prev => prev ? { ...prev, entry_time: to24Hour(hour, Number(e.target.value), period) } : prev)
                              }}
                              className="w-[65px] px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                            >
                              {Array.from({ length: 60 }, (_, i) => i).map(m => (
                                <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                              ))}
                            </select>
                            <select
                              value={parse12Hour(editFormData.entry_time).period}
                              onChange={(e) => {
                                const { hour, minute } = parse12Hour(editFormData.entry_time)
                                setEditFormData(prev => prev ? { ...prev, entry_time: to24Hour(hour, minute, e.target.value) } : prev)
                              }}
                              className="w-[60px] px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                            >
                              <option value="AM">AM</option>
                              <option value="PM">PM</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Identification No</label>
                          <input
                            type="text"
                            value={editFormData.identification_no}
                            onChange={(e) => setEditFormData(prev => prev ? { ...prev, identification_no: e.target.value } : prev)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                          <input
                            type="text"
                            value={editFormData.customer_name}
                            onChange={(e) => setEditFormData(prev => prev ? { ...prev, customer_name: e.target.value } : prev)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Batch/Lot No</label>
                          <input
                            type="text"
                            value={editFormData.batch_lot_no}
                            onChange={(e) => setEditFormData(prev => prev ? { ...prev, batch_lot_no: e.target.value } : prev)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Calibrated By</label>
                          <input
                            type="text"
                            value={editFormData.calibrated_by}
                            onChange={(e) => setEditFormData(prev => prev ? { ...prev, calibrated_by: e.target.value } : prev)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Verified By</label>
                          <input
                            type="text"
                            value={editFormData.verified_by}
                            onChange={(e) => setEditFormData(prev => prev ? { ...prev, verified_by: e.target.value } : prev)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                          <input
                            type="text"
                            value={editFormData.remarks}
                            onChange={(e) => setEditFormData(prev => prev ? { ...prev, remarks: e.target.value } : prev)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Entry-level fields */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-800 mb-3">
                        Entries ({editFormData.entries.length})
                      </h4>
                      <div className="overflow-x-auto border border-gray-200 rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Batch/Lot</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Corrective (Detector)</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Corrective (Product)</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Calibrated By</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Verified By</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {editFormData.entries.map((entry, index) => (
                              <tr key={index}>
                                <td className="px-3 py-2 text-sm text-gray-500">{index + 1}</td>
                                <td className="px-3 py-2">
                                  <div className="flex gap-1 items-center">
                                    <select
                                      value={parse12Hour(entry.entry_time).hour}
                                      onChange={(e) => {
                                        const { minute, period } = parse12Hour(entry.entry_time)
                                        const newEntries = [...editFormData.entries]
                                        newEntries[index] = { ...newEntries[index], entry_time: to24Hour(Number(e.target.value), minute, period) }
                                        setEditFormData(prev => prev ? { ...prev, entries: newEntries } : prev)
                                      }}
                                      className="w-[50px] px-1 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    >
                                      {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                                        <option key={h} value={h}>{h}</option>
                                      ))}
                                    </select>
                                    <span className="text-gray-500 text-sm">:</span>
                                    <select
                                      value={parse12Hour(entry.entry_time).minute}
                                      onChange={(e) => {
                                        const { hour, period } = parse12Hour(entry.entry_time)
                                        const newEntries = [...editFormData.entries]
                                        newEntries[index] = { ...newEntries[index], entry_time: to24Hour(hour, Number(e.target.value), period) }
                                        setEditFormData(prev => prev ? { ...prev, entries: newEntries } : prev)
                                      }}
                                      className="w-[50px] px-1 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    >
                                      {Array.from({ length: 60 }, (_, i) => i).map(m => (
                                        <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                                      ))}
                                    </select>
                                    <select
                                      value={parse12Hour(entry.entry_time).period}
                                      onChange={(e) => {
                                        const { hour, minute } = parse12Hour(entry.entry_time)
                                        const newEntries = [...editFormData.entries]
                                        newEntries[index] = { ...newEntries[index], entry_time: to24Hour(hour, minute, e.target.value) }
                                        setEditFormData(prev => prev ? { ...prev, entries: newEntries } : prev)
                                      }}
                                      className="w-[50px] px-1 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    >
                                      <option value="AM">AM</option>
                                      <option value="PM">PM</option>
                                    </select>
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="text"
                                    value={entry.product_name}
                                    onChange={(e) => {
                                      const newEntries = [...editFormData.entries]
                                      newEntries[index] = { ...newEntries[index], product_name: e.target.value }
                                      setEditFormData(prev => prev ? { ...prev, entries: newEntries } : prev)
                                    }}
                                    className="w-28 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="text"
                                    value={entry.batch_lot_no}
                                    onChange={(e) => {
                                      const newEntries = [...editFormData.entries]
                                      newEntries[index] = { ...newEntries[index], batch_lot_no: e.target.value }
                                      setEditFormData(prev => prev ? { ...prev, entries: newEntries } : prev)
                                    }}
                                    className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="text"
                                    value={entry.corrective_action_on_detector}
                                    onChange={(e) => {
                                      const newEntries = [...editFormData.entries]
                                      newEntries[index] = { ...newEntries[index], corrective_action_on_detector: e.target.value }
                                      setEditFormData(prev => prev ? { ...prev, entries: newEntries } : prev)
                                    }}
                                    className="w-28 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="text"
                                    value={entry.corrective_action_on_product}
                                    onChange={(e) => {
                                      const newEntries = [...editFormData.entries]
                                      newEntries[index] = { ...newEntries[index], corrective_action_on_product: e.target.value }
                                      setEditFormData(prev => prev ? { ...prev, entries: newEntries } : prev)
                                    }}
                                    className="w-28 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="text"
                                    value={entry.calibrated_by}
                                    onChange={(e) => {
                                      const newEntries = [...editFormData.entries]
                                      newEntries[index] = { ...newEntries[index], calibrated_by: e.target.value }
                                      setEditFormData(prev => prev ? { ...prev, entries: newEntries } : prev)
                                    }}
                                    className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="text"
                                    value={entry.verified_by}
                                    onChange={(e) => {
                                      const newEntries = [...editFormData.entries]
                                      newEntries[index] = { ...newEntries[index], verified_by: e.target.value }
                                      setEditFormData(prev => prev ? { ...prev, entries: newEntries } : prev)
                                    }}
                                    className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="text"
                                    value={entry.remarks}
                                    onChange={(e) => {
                                      const newEntries = [...editFormData.entries]
                                      newEntries[index] = { ...newEntries[index], remarks: e.target.value }
                                      setEditFormData(prev => prev ? { ...prev, entries: newEntries } : prev)
                                    }}
                                    className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Modal Footer */}
              {editRecord && (
                <div className="border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
                  <button
                    onClick={() => { setEditRecord(null); setEditFormData(null) }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={editSaving}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50"
                  >
                    {editSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Overlay */}
      {(printRecord || printLoading) && (
        <div className="print-overlay fixed inset-0 z-[60] bg-white overflow-y-auto">
          {/* Print Controls - hidden during print */}
          <div className="no-print sticky top-0 z-10 bg-gray-100 border-b border-gray-300 px-6 py-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Print Preview</h3>
            <div className="flex items-center space-x-3">
              <button
                onClick={triggerPrint}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </button>
              <button
                onClick={() => setPrintRecord(null)}
                className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                <X className="h-4 w-4 mr-2" />
                Close
              </button>
            </div>
          </div>

          {printLoading ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-gray-500">Loading record for print...</p>
            </div>
          ) : printRecord ? (
            <div className="print-content" style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
              {groupEntriesByIdentification(printRecord.entries).map(([identificationNo, groupEntries], groupIndex, allGroups) => (
                <div key={identificationNo} className="print-page" style={{ pageBreakAfter: groupIndex < allGroups.length - 1 ? 'always' : 'auto' }}>
                  {/* ===== DOCUMENT START ===== */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000' }}>
                    {/* Company Header */}
                    <thead>
                      <tr>
                        <td rowSpan={4} style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', width: '150px', verticalAlign: 'middle' }}>
                          <img src="/candor-logo.jpg" alt="Candor Foods" style={{ width: '140px', height: '80px', objectFit: 'contain' }} />
                        </td>
                        <td rowSpan={2} style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                          CANDOR FOODS PRIVATE LIMITED
                        </td>
                        <td style={{ border: '1px solid #000', padding: '4px 8px', fontSize: '11px', width: '120px' }}>Issue Date:</td>
                        <td style={{ border: '1px solid #000', padding: '4px 8px', fontSize: '11px', width: '110px' }}>05/02/2023</td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #000', padding: '4px 8px', fontSize: '11px' }}>Issue No:</td>
                        <td style={{ border: '1px solid #000', padding: '4px 8px', fontSize: '11px' }}>02</td>
                      </tr>
                      <tr>
                        <td rowSpan={2} style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontSize: '12px' }}>
                          <div style={{ fontWeight: 'bold' }}>Format : CCP calibration, Monitoring and Verification Record</div>
                          <div style={{ fontWeight: 'bold' }}>(Metal Detector)</div>
                          <div style={{ fontSize: '11px', marginTop: '2px' }}>Document No: {getDocNumber(identificationNo)}</div>
                        </td>
                        <td style={{ border: '1px solid #000', padding: '4px 8px', fontSize: '11px' }}>Revision Date:</td>
                        <td style={{ border: '1px solid #000', padding: '4px 8px', fontSize: '11px' }}>01/10/2025</td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #000', padding: '4px 8px', fontSize: '11px' }}>Revision No.:</td>
                        <td style={{ border: '1px solid #000', padding: '4px 8px', fontSize: '11px' }}>01</td>
                      </tr>
                    </thead>
                  </table>

                  {/* Frequency Line */}
                  <div style={{ padding: '8px 4px', fontSize: '12px' }}>
                    Frequency: Start - Mid - End (Every Hour)
                  </div>

                  {/* Machine Details Row */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000' }}>
                    <tbody>
                      <tr>
                        <td style={{ border: '1px solid #000', padding: '6px 10px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#d9d9d9', width: '140px' }}>
                          MACHINE DETAILS
                        </td>
                        <td style={{ border: '1px solid #000', padding: '6px 10px', fontSize: '11px', width: '200px' }}>
                          {groupEntries[0]?.machine_details || 'METAL DETECTOR'}
                        </td>
                        <td style={{ border: '1px solid #000', padding: '6px 10px', fontSize: '11px' }}>
                          <strong>LOCATION:</strong> {groupEntries[0]?.location || ''}
                        </td>
                        <td style={{ border: '1px solid #000', padding: '6px 10px', fontSize: '11px', textAlign: 'right' }}>
                          <strong>Identification No:</strong> {identificationNo}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Main Data Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', marginTop: '-2px' }}>
                    <thead>
                      <tr>
                        <th rowSpan={2} style={{ border: '1px solid #000', padding: '4px', fontSize: '10px', textAlign: 'center', fontWeight: 'bold', width: '80px', verticalAlign: 'middle' }}>
                          DATE
                        </th>
                        <th rowSpan={2} style={{ border: '1px solid #000', padding: '4px', fontSize: '10px', textAlign: 'center', fontWeight: 'bold', width: '60px', verticalAlign: 'middle' }}>
                          TIME
                        </th>
                        <th rowSpan={2} style={{ border: '1px solid #000', padding: '4px', fontSize: '10px', textAlign: 'center', fontWeight: 'bold', width: '110px', verticalAlign: 'middle' }}>
                          PRODUCT NAME
                        </th>
                        <th rowSpan={2} style={{ border: '1px solid #000', padding: '4px', fontSize: '10px', textAlign: 'center', fontWeight: 'bold', width: '80px', verticalAlign: 'middle' }}>
                          BATCH/LOT<br />NO.
                        </th>
                        <th colSpan={3} style={{ border: '1px solid #000', padding: '4px', fontSize: '10px', textAlign: 'center', fontWeight: 'bold' }}>
                          SENSITIVITIES
                        </th>
                        <th colSpan={2} style={{ border: '1px solid #000', padding: '4px', fontSize: '9px', textAlign: 'center', fontWeight: 'bold', lineHeight: '1.3' }}>
                          IF METAL DETECTOR IS NOT<br />WORKING, CORRECTIVE ACTION<br />TAKEN ON
                        </th>
                        <th rowSpan={2} style={{ border: '1px solid #000', padding: '4px', fontSize: '9px', textAlign: 'center', fontWeight: 'bold', width: '85px', verticalAlign: 'middle' }}>
                          CALIBRATED/<br />MONITORED<br />BY
                        </th>
                        <th rowSpan={2} style={{ border: '1px solid #000', padding: '4px', fontSize: '10px', textAlign: 'center', fontWeight: 'bold', width: '70px', verticalAlign: 'middle' }}>
                          VERIFIED<br />BY
                        </th>
                        <th rowSpan={2} style={{ border: '1px solid #000', padding: '4px', fontSize: '10px', textAlign: 'center', fontWeight: 'bold', width: '75px', verticalAlign: 'middle' }}>
                          REMARKS
                        </th>
                      </tr>
                      <tr>
                        <th style={{ border: '1px solid #000', padding: '4px', fontSize: '9px', textAlign: 'center', fontWeight: 'bold', width: '55px' }}>
                          FE<br /><span style={{ fontWeight: 'normal' }}>{groupEntries[0]?.sensitivity_fe || '1 mm'}</span>
                        </th>
                        <th style={{ border: '1px solid #000', padding: '4px', fontSize: '9px', textAlign: 'center', fontWeight: 'bold', width: '55px' }}>
                          NFE<br /><span style={{ fontWeight: 'normal' }}>{groupEntries[0]?.sensitivity_nfe || '1.2 mm'}</span>
                        </th>
                        <th style={{ border: '1px solid #000', padding: '4px', fontSize: '9px', textAlign: 'center', fontWeight: 'bold', width: '55px' }}>
                          SS<br /><span style={{ fontWeight: 'normal' }}>{groupEntries[0]?.sensitivity_ss || '1.7 mm'}</span>
                        </th>
                        <th style={{ border: '1px solid #000', padding: '4px', fontSize: '9px', textAlign: 'center', fontWeight: 'bold', width: '90px' }}>
                          ON METAL<br />DETECTOR
                        </th>
                        <th style={{ border: '1px solid #000', padding: '4px', fontSize: '9px', textAlign: 'center', fontWeight: 'bold', width: '90px' }}>
                          ON PRODUCT<br />PASSED
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPrintRows(groupEntries).map((entry, index) => (
                        <tr key={index}>
                          <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '10px', textAlign: 'center', height: '28px' }}>
                            {entry?.entry_date || ''}
                          </td>
                          <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '10px', textAlign: 'center' }}>
                            {entry?.entry_time ? to12Hour(entry.entry_time) : ''}
                          </td>
                          <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '10px', textAlign: 'center' }}>
                            {entry?.product_name || ''}
                          </td>
                          <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '10px', textAlign: 'center' }}>
                            {entry?.batch_lot_no || ''}
                          </td>
                          <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '12px', textAlign: 'center' }}>
                            {entry ? (entry.sensitivity_fe_checked ? '\u2713' : '') : ''}
                          </td>
                          <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '12px', textAlign: 'center' }}>
                            {entry ? (entry.sensitivity_nfe_checked ? '\u2713' : '') : ''}
                          </td>
                          <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '12px', textAlign: 'center' }}>
                            {entry ? (entry.sensitivity_ss_checked ? '\u2713' : '') : ''}
                          </td>
                          <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '10px', textAlign: 'center' }}>
                            {entry?.corrective_action_on_detector || ''}
                          </td>
                          <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '10px', textAlign: 'center' }}>
                            {entry?.corrective_action_on_product || ''}
                          </td>
                          <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '10px', textAlign: 'center' }}>
                            {entry?.calibrated_by || ''}
                          </td>
                          <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '10px', textAlign: 'center' }}>
                            {entry?.verified_by || ''}
                          </td>
                          <td style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '10px', textAlign: 'center' }}>
                            {entry?.remarks || ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Footer */}
                  <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', paddingLeft: '20px', paddingRight: '20px' }}>
                    <div>
                      <strong>Prepared By:</strong> FST
                    </div>
                    <div style={{ border: '2px solid #000', padding: '4px 16px', fontSize: '11px', fontWeight: 'bold', textAlign: 'center' }}>
                      CONTROLLED<br />COPY
                    </div>
                    <div>
                      <strong>Approved By:</strong> FSTL
                    </div>
                  </div>
                  {/* ===== DOCUMENT END ===== */}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          html, body {
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Hide ALL top-level elements */
          body > * {
            display: none !important;
          }
          /* Show the ancestor chain - use * instead of div to also match <main>, <aside>, etc. */
          body > *:has(.print-content) {
            display: block !important;
          }
          /* Reset ALL ancestor containers (div, main, section, etc.) to normal flow */
          *:has(.print-content) {
            display: block !important;
            position: static !important;
            overflow: visible !important;
            height: auto !important;
            width: 100% !important;
            min-height: 0 !important;
            max-height: none !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            background: none !important;
          }
          /* Hide siblings at every level (sidebar, header, page content, etc.) */
          *:has(.print-content) > *:not(:has(.print-content)):not(.print-content) {
            display: none !important;
          }
          .print-content {
            display: block !important;
            position: static !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          /* Force each identification group onto a separate page */
          .print-page {
            page-break-after: always;
            break-after: page;
          }
          .print-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: landscape;
            margin: 0;
          }
          .print-page {
            padding: 10mm;
          }
        }
      `}</style>
    </DashboardLayout>
  )
}
