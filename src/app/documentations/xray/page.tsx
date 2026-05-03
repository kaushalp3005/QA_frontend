'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { ArrowLeft, Plus, Calendar, Package, Check, Eye, Loader2, Trash2, Printer, Pencil, X, AlertCircle } from 'lucide-react'
import { getXRayRecords, deleteXRayRecord, updateXRayRecord } from '@/lib/api/xray'
import type { XRayRecord } from '@/lib/api/xray'
import Time12Picker from '@/components/Time12Picker'

type EditForm = {
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
}

const AUTHORIZED_EMAIL = 'pooja.parkar@candorfoods.in'

export default function XRayDetectionPage() {
  const router = useRouter()
  const [records, setRecords] = useState<XRayRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [editRecord, setEditRecord] = useState<XRayRecord | null>(null)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
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

  const openEdit = (record: XRayRecord) => {
    setEditRecord(record)
    setEditForm({
      date: record.date,
      time: record.time,
      product_name: record.product_name,
      batch_no: record.batch_no,
      ss316: record.ss316,
      ceramic: record.ceramic,
      soda_lime_glass: record.soda_lime_glass,
      action_on_xray: record.action_on_xray,
      action_on_product_passed: record.action_on_product_passed,
      calibrated_monitored_by: record.calibrated_monitored_by,
      verified_by: record.verified_by,
      remarks: record.remarks,
    })
    setEditError(null)
  }

  const closeEdit = () => {
    setEditRecord(null)
    setEditForm(null)
    setEditError(null)
  }

  const handleEditSave = async () => {
    if (!editRecord || !editForm) return
    setSaving(true)
    setEditError(null)
    try {
      await updateXRayRecord(editRecord.id.toString(), editForm)
      await fetchRecords()
      closeEdit()
    } catch (err: any) {
      setEditError(err.message || 'Failed to update record')
    } finally {
      setSaving(false)
    }
  }

  const setF = (field: keyof EditForm, value: string | boolean) => {
    setEditForm((prev) => prev ? { ...prev, [field]: value } : prev)
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const todayRecords = records.filter(r => r.date === todayStr)
  const lastRecord = records.length > 0 ? records[0] : null

  const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
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
            <h3 className="text-2xl font-bold text-white">X-Ray Detection Monitoring</h3>
            <p className="text-green-100 mt-1">CCP Calibration, Monitoring and Verification Records</p>
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
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-gray-900">Recent X-Ray Detection Records</h3>
                <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                  {records.length} Records
                </span>
              </div>
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
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {isAuthorized && (
                              <button
                                onClick={() => openEdit(record)}
                                className="flex items-center gap-1 px-2 py-1 text-green-700 bg-green-50 hover:bg-green-100 rounded transition-colors text-xs"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </button>
                            )}
                            <button
                              onClick={() => router.push(`/documentations/xray/print?id=${record.id}`)}
                              className="flex items-center gap-1 px-2 py-1 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors text-xs"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              Print
                            </button>
                            <button
                              onClick={() => router.push(`/documentations/xray/${record.id}`)}
                              className="flex items-center gap-1 px-2 py-1 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors text-xs"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </button>
                            {isAuthorized && (
                              <button
                                onClick={() => handleDeleteRecord(record.id)}
                                className="flex items-center gap-1 px-2 py-1 text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors text-xs"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
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
              <p className="mt-1 text-sm text-gray-500">Get started by adding your first X-Ray detection calibration record.</p>
              <div className="mt-6">
                <button
                  onClick={handleAddEntry}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Entry
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── EDIT MODAL ── */}
      {editRecord && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Edit X-Ray Record</h2>
              <button onClick={closeEdit} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {editError && (
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{editError}</p>
                </div>
              )}

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" className={inputCls} value={editForm.date} onChange={e => setF('date', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <Time12Picker value={editForm.time} onChange={(v) => setF('time', v)} />
                </div>
              </div>

              {/* Product & Batch */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                  <input type="text" className={inputCls} value={editForm.product_name} onChange={e => setF('product_name', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch No</label>
                  <input type="text" className={inputCls} value={editForm.batch_no} onChange={e => setF('batch_no', e.target.value)} />
                </div>
              </div>

              {/* Sensitivities */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sensitivities</label>
                <div className="flex gap-4">
                  {([['ss316', 'SS 316'], ['ceramic', 'Ceramic'], ['soda_lime_glass', 'Soda Lime Glass']] as const).map(([field, label]) => (
                    <label key={field} className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editForm[field] as boolean}
                        onChange={e => setF(field, e.target.checked)}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Corrective Actions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action on X-Ray</label>
                  <input type="text" className={inputCls} value={editForm.action_on_xray} onChange={e => setF('action_on_xray', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action on Product Passed</label>
                  <input type="text" className={inputCls} value={editForm.action_on_product_passed} onChange={e => setF('action_on_product_passed', e.target.value)} />
                </div>
              </div>

              {/* Sign-offs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Calibrated / Monitored By</label>
                  <input type="text" className={inputCls} value={editForm.calibrated_monitored_by} onChange={e => setF('calibrated_monitored_by', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Verified By</label>
                  <input type="text" className={inputCls} value={editForm.verified_by} onChange={e => setF('verified_by', e.target.value)} />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea className={inputCls} rows={2} value={editForm.remarks} onChange={e => setF('remarks', e.target.value)} style={{ resize: 'vertical' }} />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={closeEdit}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
