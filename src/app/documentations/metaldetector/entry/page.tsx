'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { ArrowLeft, Check, Loader2, X } from 'lucide-react'
import WarehouseSelector, { getStoredWarehouse, WarehouseCode } from '@/components/ui/WarehouseSelector'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

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
  if (!time24) {
    const now = new Date()
    const h = now.getHours()
    return { hour: h === 0 ? 12 : h > 12 ? h - 12 : h, minute: now.getMinutes(), period: h >= 12 ? 'PM' : 'AM' }
  }
  const [h, m] = time24.split(':').map(Number)
  return { hour: h === 0 ? 12 : h > 12 ? h - 12 : h, minute: m, period: h >= 12 ? 'PM' : 'AM' }
}

interface MetalDetectorFormData {
  id?: string
  dbEntryId?: number
  machineDetails: string
  location: string
  identificationNo: string
  date: string
  time: string
  customerName: string
  productName: string
  batchLotNo: string
  sensitivityFE: string
  sensitivityNFE: string
  sensitivitySS: string
  sensitivityFEChecked: boolean
  sensitivityNFEChecked: boolean
  sensitivitySSChecked: boolean
  correctiveActionOnDetector: string
  correctiveActionOnProduct: string
  calibratedBy: string
  verifiedBy: string
  remarks: string
}

interface MetalDetectorOption {
  identificationNo: string
  srNo: string
  location: string
  sensitivityFE: string
  sensitivityNFE: string
  sensitivitySS: string
  mode: string
  warehouse?: string
}

const AUTHORIZED_EMAIL = 'pooja.parkar@candorfoods.in'

const metalDetectorOptions: MetalDetectorOption[] = [
  {
    identificationNo: 'CCP 1',
    srNo: '(MineBeaIntec-42110011)',
    location: 'PFS Machine(FG Storage)',
    sensitivityFE: 'Fe-1.5 mm',
    sensitivityNFE: 'NFe-2 mm',
    sensitivitySS: 'SS-2.5 mm',
    mode: 'Online'
  },
  {
    identificationNo: 'CCP 1A',
    srNo: '(MineBeaIntec-38470963)',
    location: 'FSS Machine(FG Storage)',
    sensitivityFE: 'Fe-1.5 mm',
    sensitivityNFE: 'NFe-2 mm',
    sensitivitySS: 'SS-2.5 mm',
    mode: 'Online'
  },
  {
    identificationNo: 'CCP 1B',
    srNo: '(Technofour-ARM 1386/18)',
    location: 'FSS Machine(FG Storage)',
    sensitivityFE: 'Fe-1.5 mm',
    sensitivityNFE: 'NFe-2 mm',
    sensitivitySS: 'SS-2.5 mm',
    mode: 'Online'
  },
  {
    identificationNo: 'CCP 1C',
    srNo: '(Technofour-ARM 1517/18)',
    location: 'Outer seeds section',
    sensitivityFE: 'Fe-1.0mm',
    sensitivityNFE: 'NFe-1.5mm',
    sensitivitySS: 'SS-2mm',
    mode: 'Offline'
  },
  {
    identificationNo: 'CCP 1D',
    srNo: '(Das-2021081027-AMD)',
    location: 'Inner seeds section',
    sensitivityFE: 'Fe-1.0mm',
    sensitivityNFE: 'NFe-1.2mm',
    sensitivitySS: 'SS-1.7mm',
    mode: 'Offline'
  },
  {
    identificationNo: 'CCP 1E',
    srNo: '(Das-2025082322)',
    location: 'Packing area',
    sensitivityFE: 'Fe-2.0 mm',
    sensitivityNFE: 'NFe-2.5 mm',
    sensitivitySS: 'SS-3 mm',
    mode: 'Offline'
  },
  {
    identificationNo: 'CCP-1',
    srNo: '(Technofour-ARM 831-17)',
    location: 'Upper Basement',
    sensitivityFE: 'Fe-2mm',
    sensitivityNFE: 'NFe-2.5mm',
    sensitivitySS: 'SS-3mm',
    mode: 'Offline',
    warehouse: 'W202'
  },
  {
    identificationNo: 'CCP-1A',
    srNo: '(Das-20211121140)',
    location: 'First floor',
    sensitivityFE: 'Fe-1.0mm',
    sensitivityNFE: 'NFe-1.2mm',
    sensitivitySS: 'SS-1.7mm',
    mode: 'Offline',
    warehouse: 'W202'
  },
  {
    identificationNo: 'CCP-1B',
    srNo: '(Technofour-ARM 769-17)',
    location: 'FFS machine',
    sensitivityFE: 'Fe-1.5mm',
    sensitivityNFE: 'NFe-2mm',
    sensitivitySS: 'SS-2.5mm',
    mode: 'Online',
    warehouse: 'W202'
  },
  {
    identificationNo: 'CCP-1C',
    srNo: '(Technofour-ARM 2134-20)',
    location: 'first floor mezzanine',
    sensitivityFE: 'Fe-1.5mm',
    sensitivityNFE: 'NFe-2mm',
    sensitivitySS: 'SS-2.5mm',
    mode: 'Offline',
    warehouse: 'W202'
  }
]

export default function MetalDetectorEntryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const resumeRecordId = searchParams.get('resumeRecordId')
  const warehouseParam = searchParams.get('warehouse') as WarehouseCode | null

  // Check if current user is authorized to edit time
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

  const getDefaultFormData = (): MetalDetectorFormData => ({
    machineDetails: 'Metal Detector',
    location: '',
    identificationNo: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    customerName: '',
    productName: '',
    batchLotNo: '',
    sensitivityFE: '',
    sensitivityNFE: '',
    sensitivitySS: '',
    sensitivityFEChecked: true,
    sensitivityNFEChecked: true,
    sensitivitySSChecked: true,
    correctiveActionOnDetector: 'NO',
    correctiveActionOnProduct: 'NO',
    calibratedBy: '',
    verifiedBy: 'Pooja Parkar',
    remarks: ''
  })

  const [formData, setFormData] = useState<MetalDetectorFormData>(getDefaultFormData)
  const [records, setRecords] = useState<MetalDetectorFormData[]>([])
  const [currentRecordId, setCurrentRecordId] = useState<number | null>(null)
  const [batchId, setBatchId] = useState<string>('')
  const [isSavingEntry, setIsSavingEntry] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseCode>('A185')

  // Sync with global warehouse selector (from documentations/training navbars)
  // When resuming a draft, prefer the warehouse from URL params to avoid mismatch
  useEffect(() => {
    const initialWarehouse = warehouseParam || getStoredWarehouse()
    setSelectedWarehouse(initialWarehouse)
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.warehouse) {
        setSelectedWarehouse(detail.warehouse)
        // Clear current detector selection since the available list just changed
        setFormData(prev => ({
          ...prev,
          identificationNo: '',
          location: '',
          sensitivityFE: '',
          sensitivityNFE: '',
          sensitivitySS: '',
        }))
      }
    }
    window.addEventListener('warehouseChanged', handler)
    return () => window.removeEventListener('warehouseChanged', handler)
  }, [warehouseParam])

  // Derived list of detector options for the currently active warehouse
  const filteredDetectorOptions = metalDetectorOptions.filter(opt =>
    selectedWarehouse === 'W202' ? opt.warehouse === 'W202' : !opt.warehouse
  )

  // Resume a pending record if resumeRecordId is provided
  // Use warehouseParam directly to avoid stale selectedWarehouse state
  useEffect(() => {
    if (resumeRecordId) {
      const recordId = parseInt(resumeRecordId)
      setCurrentRecordId(recordId)
      const wh = warehouseParam || getStoredWarehouse()
      // Fetch existing entries for this record
      fetchExistingEntries(recordId, wh)
    }
  }, [resumeRecordId, warehouseParam])

  const fetchExistingEntries = async (recordId: number, warehouseOverride?: string) => {
    const wh = warehouseOverride || selectedWarehouse
    try {
      const response = await fetch(`${API_BASE}/metaldetector/${recordId}?warehouse=${wh}`)
      if (!response.ok) return

      const data = await response.json()
      setBatchId(data.batch_id)

      // Convert DB entries to local format for display
      const existingRecords: MetalDetectorFormData[] = data.entries.map((entry: any) => ({
        id: `db-${entry.id}`,
        dbEntryId: entry.id,
        machineDetails: entry.machine_details || 'Metal Detector',
        location: entry.location || '',
        identificationNo: entry.identification_no || '',
        date: entry.entry_date || '',
        time: entry.entry_time || '',
        customerName: entry.customer_name || '',
        productName: entry.product_name || '',
        batchLotNo: entry.batch_lot_no || '',
        sensitivityFE: entry.sensitivity_fe || '',
        sensitivityNFE: entry.sensitivity_nfe || '',
        sensitivitySS: entry.sensitivity_ss || '',
        sensitivityFEChecked: entry.sensitivity_fe_checked || false,
        sensitivityNFEChecked: entry.sensitivity_nfe_checked || false,
        sensitivitySSChecked: entry.sensitivity_ss_checked || false,
        correctiveActionOnDetector: entry.corrective_action_on_detector || '',
        correctiveActionOnProduct: entry.corrective_action_on_product || '',
        calibratedBy: entry.calibrated_by || '',
        verifiedBy: entry.verified_by || '',
        remarks: entry.remarks || ''
      }))

      setRecords(existingRecords)
    } catch (error) {
      console.error('Error fetching existing entries:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleIdentificationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value
    const selectedDetector = metalDetectorOptions.find(option =>
      `${option.identificationNo}-${option.srNo}` === selectedId
    )

    if (selectedDetector) {
      setFormData(prev => ({
        ...prev,
        identificationNo: selectedDetector.identificationNo,
        location: selectedDetector.location,
        sensitivityFE: selectedDetector.sensitivityFE,
        sensitivityNFE: selectedDetector.sensitivityNFE,
        sensitivitySS: selectedDetector.sensitivitySS
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingEntry(true)

    try {
      const response = await fetch(`${API_BASE}/metaldetector/entry?warehouse=${selectedWarehouse}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_id: currentRecordId,
          entry: formData
        })
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || `Failed to save entry: ${response.statusText}`)
      }

      const result = await response.json()

      // Set the record_id for subsequent entries
      if (!currentRecordId) {
        setCurrentRecordId(result.record_id)
        setBatchId(result.batch_id)
      }

      // Add to local display list with DB entry ID
      setRecords(prev => [...prev, {
        ...formData,
        id: `db-${result.entry_id}`,
        dbEntryId: result.entry_id
      }])

      // Reset form but keep current date/time
      setFormData(getDefaultFormData())

    } catch (error: any) {
      console.error('Error saving entry:', error)
      alert(error.message || 'Failed to save entry. Please try again.')
    } finally {
      setIsSavingEntry(false)
    }
  }

  const handleDeleteEntry = async (index: number) => {
    const record = records[index]

    if (record.dbEntryId) {
      try {
        const response = await fetch(`${API_BASE}/metaldetector/entry/${record.dbEntryId}?warehouse=${selectedWarehouse}`, {
          method: 'DELETE'
        })
        if (!response.ok) {
          alert('Failed to delete entry from database')
          return
        }
      } catch (error) {
        console.error('Error deleting entry:', error)
        alert('Failed to delete entry')
        return
      }
    }

    setRecords(prev => prev.filter((_, i) => i !== index))
  }

  const handleFinalizeRecord = async () => {
    if (!currentRecordId || records.length === 0) {
      alert('No entries to save.')
      return
    }

    setIsFinalizing(true)

    try {
      const response = await fetch(`${API_BASE}/metaldetector/${currentRecordId}/finalize?warehouse=${selectedWarehouse}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || 'Failed to finalize record')
      }

      alert('Records saved successfully!')

      // Clear local state
      setRecords([])
      setFormData(getDefaultFormData())
      setCurrentRecordId(null)
      setBatchId('')

      // Redirect to main page
      router.push('/documentations/metaldetector')

    } catch (error: any) {
      console.error('Error finalizing record:', error)
      alert(error.message || 'Failed to save records. Please try again.')
    } finally {
      setIsFinalizing(false)
    }
  }

  const handleClearAllData = () => {
    if (confirm('Are you sure you want to clear all form data and records? This action cannot be undone.')) {
      setFormData(getDefaultFormData())
      setRecords([])
      setCurrentRecordId(null)
      setBatchId('')
    }
  }

  const handleCancelPendingRecord = async () => {
    if (!currentRecordId) return

    setIsCancelling(true)
    try {
      const response = await fetch(`${API_BASE}/metaldetector/${currentRecordId}/cancel?warehouse=${selectedWarehouse}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || 'Failed to cancel record')
      }

      // Clear local state and redirect
      setRecords([])
      setFormData(getDefaultFormData())
      setCurrentRecordId(null)
      setBatchId('')
      setShowCancelConfirm(false)
      router.push('/documentations/metaldetector')
    } catch (error: any) {
      console.error('Error cancelling record:', error)
      alert(error.message || 'Failed to cancel record. Please try again.')
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-3 sm:space-y-6 pb-6">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => router.push('/documentations/metaldetector')}
            className="flex items-center text-gray-600 hover:text-gray-900 active:text-gray-900 transition-colors py-2"
          >
            <ArrowLeft className="h-5 w-5 mr-1.5 flex-shrink-0" />
            <span className="text-sm sm:text-base">Back</span>
          </button>

          <div className="flex items-center gap-2">
            <WarehouseSelector />
            {currentRecordId && (
              <>
                <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                  Pending · {batchId}
                </span>
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  disabled={records.length > 0}
                  title={records.length > 0 ? 'Delete all entries first to cancel' : 'Cancel this pending record'}
                  className={`px-2.5 py-1 text-xs font-medium rounded-full flex items-center gap-1 transition-colors ${
                    records.length > 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-red-100 text-red-700 hover:bg-red-200 active:bg-red-300'
                  }`}
                >
                  <X className="w-3 h-3" />
                  Cancel
                </button>
              </>
            )}
            {(formData.customerName || formData.productName || formData.batchLotNo || records.length > 0) && (
              <button
                onClick={handleClearAllData}
                className="px-3 py-2 text-xs sm:text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 active:bg-red-100 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm sm:shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-6 py-3 sm:py-4">
            <h3 className="text-base sm:text-xl font-bold text-white leading-tight">
              CCP Calibration & Verification Record
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-1 gap-1">
              <p className="text-xs sm:text-sm text-blue-100">
                {selectedWarehouse === 'W202' ? 'CFPLA.C2.F.24' : 'CFPLB.C2.F.18'} | Every Hour
              </p>
              <div className="flex items-center text-xs text-blue-100">
                <div className="w-1.5 h-1.5 bg-green-300 rounded-full mr-1.5 animate-pulse"></div>
                Each entry saves to database instantly
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-3 sm:px-5 py-3 sm:py-4 space-y-4">
            {/* Detector Selection */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Identification No <span className="text-red-500">*</span>
                </label>
                <select
                  name="identificationNo"
                  value={formData.identificationNo ? `${formData.identificationNo}-${metalDetectorOptions.find(opt => opt.identificationNo === formData.identificationNo)?.srNo || ''}` : ''}
                  onChange={handleIdentificationChange}
                  className="w-full px-3 py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  required
                >
                  <option value="">Select Detector ({selectedWarehouse})</option>
                  {filteredDetectorOptions.map((option, index) => (
                    <option key={`${selectedWarehouse}-${index}`} value={`${option.identificationNo}-${option.srNo}`}>
                      {option.identificationNo} · {option.srNo.replace(/[()]/g, '')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto-filled info chips */}
              {formData.identificationNo && (
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${
                      selectedWarehouse === 'W202' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {selectedWarehouse}
                  </span>
                  {formData.location && (
                    <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                      📍 {formData.location}
                    </span>
                  )}
                  <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                    {formData.machineDetails}
                  </span>
                </div>
              )}
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={isAuthorized ? handleInputChange : undefined}
                  className={`w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isAuthorized ? 'bg-white' : 'bg-gray-50'}`}
                  readOnly={!isAuthorized}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Time <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-1.5 items-center">
                  <select
                    value={parse12Hour(formData.time).hour}
                    onChange={isAuthorized ? (e) => {
                      const { minute, period } = parse12Hour(formData.time)
                      setFormData(prev => ({ ...prev, time: to24Hour(Number(e.target.value), minute, period) }))
                    } : undefined}
                    disabled={!isAuthorized}
                    className={`w-[70px] px-2 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isAuthorized ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <span className="text-gray-500 font-bold">:</span>
                  <select
                    value={parse12Hour(formData.time).minute}
                    onChange={isAuthorized ? (e) => {
                      const { hour, period } = parse12Hour(formData.time)
                      setFormData(prev => ({ ...prev, time: to24Hour(hour, Number(e.target.value), period) }))
                    } : undefined}
                    disabled={!isAuthorized}
                    className={`w-[70px] px-2 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isAuthorized ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    {Array.from({ length: 60 }, (_, i) => i).map(m => (
                      <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                    ))}
                  </select>
                  <select
                    value={parse12Hour(formData.time).period}
                    onChange={isAuthorized ? (e) => {
                      const { hour, minute } = parse12Hour(formData.time)
                      setFormData(prev => ({ ...prev, time: to24Hour(hour, minute, e.target.value) }))
                    } : undefined}
                    disabled={!isAuthorized}
                    className={`w-[65px] px-2 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isAuthorized ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Customer, Product, Batch */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Customer name"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="productName"
                    value={formData.productName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Product name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Batch/Lot No. <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="batchLotNo"
                    value={formData.batchLotNo}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Batch/lot number"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Sensitivities */}
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 -mx-1">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Sensitivities</h4>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">FE</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      name="sensitivityFE"
                      value={formData.sensitivityFE}
                      className="w-full min-w-0 px-2 py-2 text-sm border border-gray-300 rounded-lg bg-white"
                      placeholder="Auto"
                      readOnly
                    />
                    <label className="relative flex-shrink-0 cursor-pointer">
                      <input
                        type="checkbox"
                        name="sensitivityFEChecked"
                        checked={formData.sensitivityFEChecked}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <div className={`w-9 h-9 border-2 rounded-lg flex items-center justify-center transition-all ${
                        formData.sensitivityFEChecked
                          ? 'bg-green-500 border-green-500 shadow-sm'
                          : 'bg-white border-gray-300 active:border-gray-400'
                      }`}>
                        {formData.sensitivityFEChecked && (
                          <Check className="w-5 h-5 text-white" />
                        )}
                      </div>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">NFE</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      name="sensitivityNFE"
                      value={formData.sensitivityNFE}
                      className="w-full min-w-0 px-2 py-2 text-sm border border-gray-300 rounded-lg bg-white"
                      placeholder="Auto"
                      readOnly
                    />
                    <label className="relative flex-shrink-0 cursor-pointer">
                      <input
                        type="checkbox"
                        name="sensitivityNFEChecked"
                        checked={formData.sensitivityNFEChecked}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <div className={`w-9 h-9 border-2 rounded-lg flex items-center justify-center transition-all ${
                        formData.sensitivityNFEChecked
                          ? 'bg-green-500 border-green-500 shadow-sm'
                          : 'bg-white border-gray-300 active:border-gray-400'
                      }`}>
                        {formData.sensitivityNFEChecked && (
                          <Check className="w-5 h-5 text-white" />
                        )}
                      </div>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">SS</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      name="sensitivitySS"
                      value={formData.sensitivitySS}
                      className="w-full min-w-0 px-2 py-2 text-sm border border-gray-300 rounded-lg bg-white"
                      placeholder="Auto"
                      readOnly
                    />
                    <label className="relative flex-shrink-0 cursor-pointer">
                      <input
                        type="checkbox"
                        name="sensitivitySSChecked"
                        checked={formData.sensitivitySSChecked}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <div className={`w-9 h-9 border-2 rounded-lg flex items-center justify-center transition-all ${
                        formData.sensitivitySSChecked
                          ? 'bg-green-500 border-green-500 shadow-sm'
                          : 'bg-white border-gray-300 active:border-gray-400'
                      }`}>
                        {formData.sensitivitySSChecked && (
                          <Check className="w-5 h-5 text-white" />
                        )}
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Corrective Actions */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Corrective Action (if not working)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    On Metal Detector
                  </label>
                  <textarea
                    name="correctiveActionOnDetector"
                    value={formData.correctiveActionOnDetector}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Action on detector"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    On Product Passed
                  </label>
                  <textarea
                    name="correctiveActionOnProduct"
                    value={formData.correctiveActionOnProduct}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Action on product"
                  />
                </div>
              </div>
            </div>

            {/* Calibrated & Verified */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Calibrated By <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="calibratedBy"
                  value={formData.calibratedBy}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Name"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Verified By <span className="text-red-500">*</span>
                </label>
                <select
                  name="verifiedBy"
                  value={formData.verifiedBy}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none"
                  required
                >
                  <option value="">Select verifier</option>
                  <option value="Pooja Parkar">Pooja Parkar</option>
                  <option value="Shraddha Jadhav">Shraddha Jadhav</option>
                  <option value="Pooja Mhalim">Pooja Mhalim</option>
                  <option value="Nikita Jarag">Nikita Jarag</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Remarks
              </label>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Additional remarks"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => router.push('/documentations/metaldetector')}
                className="flex-1 sm:flex-none px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingEntry}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSavingEntry && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSavingEntry ? 'Saving...' : '+ Add Row'}
              </button>
            </div>
          </form>
        </div>

        {records.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm sm:shadow-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                Entries ({records.length})
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
                Saved in DB
              </span>
            </div>

            {/* Mobile card view */}
            <div className="sm:hidden divide-y divide-gray-100">
              {records.map((record, index) => (
                <div key={record.id || index} className="px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{record.identificationNo}</span>
                      <span className="text-xs text-gray-500">{to12Hour(record.time)}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteEntry(index)}
                      className="text-xs text-red-500 active:text-red-700 px-2 py-1"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="text-sm text-gray-700">
                    {record.customerName} &middot; {record.productName}
                  </div>
                  <div className="text-xs text-gray-500">Batch: {record.batchLotNo}</div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs ${record.sensitivityFEChecked ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      FE: {record.sensitivityFE} {record.sensitivityFEChecked && <Check className="w-3 h-3" />}
                    </span>
                    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs ${record.sensitivityNFEChecked ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      NFE: {record.sensitivityNFE} {record.sensitivityNFEChecked && <Check className="w-3 h-3" />}
                    </span>
                    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs ${record.sensitivitySSChecked ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      SS: {record.sensitivitySS} {record.sensitivitySSChecked && <Check className="w-3 h-3" />}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    By: {record.calibratedBy} &middot; Verified: {record.verifiedBy}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table view */}
            <div className="hidden sm:block px-4 py-2">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                      <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID No.</th>
                      <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch/Lot</th>
                      <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sensitivities</th>
                      <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Calibrated</th>
                      <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified</th>
                      <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {records.map((record, index) => (
                      <tr key={record.id || index} className="hover:bg-gray-50">
                        <td className="px-2 py-1.5 text-sm text-gray-900">{to12Hour(record.time)}</td>
                        <td className="px-2 py-1.5 text-sm font-medium text-gray-900">{record.identificationNo}</td>
                        <td className="px-2 py-1.5 text-sm text-gray-900">{record.customerName}</td>
                        <td className="px-2 py-1.5 text-sm text-gray-900">{record.productName}</td>
                        <td className="px-2 py-1.5 text-sm text-gray-900">{record.batchLotNo}</td>
                        <td className="px-2 py-1.5 text-sm text-gray-900">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1">
                              <span>FE: {record.sensitivityFE}</span>
                              {record.sensitivityFEChecked && <Check className="w-3 h-3 text-green-500" />}
                            </div>
                            <div className="flex items-center gap-1">
                              <span>NFE: {record.sensitivityNFE}</span>
                              {record.sensitivityNFEChecked && <Check className="w-3 h-3 text-green-500" />}
                            </div>
                            <div className="flex items-center gap-1">
                              <span>SS: {record.sensitivitySS}</span>
                              {record.sensitivitySSChecked && <Check className="w-3 h-3 text-green-500" />}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-sm text-gray-900">{record.calibratedBy}</td>
                        <td className="px-2 py-1.5 text-sm text-gray-900">{record.verifiedBy}</td>
                        <td className="px-2 py-1.5 text-sm">
                          <button
                            onClick={() => handleDeleteEntry(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Save Data Button */}
        {records.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm sm:shadow-lg border border-gray-200 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  Ready to Save {records.length} Record{records.length > 1 ? 's' : ''}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  All entries are saved in DB. Click to finalize and mark as complete.
                </p>
              </div>
              <button
                onClick={handleFinalizeRecord}
                disabled={isFinalizing}
                className="w-full sm:w-auto px-6 py-3 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isFinalizing && <Loader2 className="w-4 h-4 animate-spin" />}
                {isFinalizing ? 'Saving...' : 'Save Data'}
              </button>
            </div>
          </div>
        )}
        {/* Cancel Confirmation Modal */}
        {showCancelConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-gray-900">Cancel Pending Record?</h3>
                <p className="text-sm text-gray-600">
                  This will permanently delete the pending record <span className="font-semibold text-orange-700">{batchId}</span>. This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={isCancelling}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  Go Back
                </button>
                <button
                  onClick={handleCancelPendingRecord}
                  disabled={isCancelling}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCancelling && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isCancelling ? 'Cancelling...' : 'Yes, Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
