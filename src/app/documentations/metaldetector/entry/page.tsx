'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { ArrowLeft, Check } from 'lucide-react'

interface MetalDetectorFormData {
  id?: string
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
    srNo: '(MineBeaIntec-4211011)',
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

  // Initialize form data with localStorage or default values
  const getInitialFormData = (): MetalDetectorFormData => {
    if (typeof window === 'undefined') return getDefaultFormData()
    
    const savedFormData = localStorage.getItem('metalDetectorFormData')
    if (savedFormData) {
      try {
        const parsed = JSON.parse(savedFormData)
        // Update date and time to current if it's a different day
        const currentDate = new Date().toISOString().split('T')[0]
        if (parsed.date !== currentDate) {
          parsed.date = currentDate
          parsed.time = new Date().toTimeString().slice(0, 5)
        }
        return parsed
      } catch (error) {
        console.error('Error parsing saved form data:', error)
      }
    }
    return getDefaultFormData()
  }

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
    sensitivityFEChecked: false,
    sensitivityNFEChecked: false,
    sensitivitySSChecked: false,
    correctiveActionOnDetector: '',
    correctiveActionOnProduct: '',
    calibratedBy: '',
    verifiedBy: '',
    remarks: ''
  })

  // Initialize records with localStorage or empty array
  const getInitialRecords = (): MetalDetectorFormData[] => {
    if (typeof window === 'undefined') return []
    
    const savedRecords = localStorage.getItem('metalDetectorRecords')
    if (savedRecords) {
      try {
        return JSON.parse(savedRecords)
      } catch (error) {
        console.error('Error parsing saved records:', error)
      }
    }
    return []
  }
  
  const [formData, setFormData] = useState<MetalDetectorFormData>(getInitialFormData)
  const [records, setRecords] = useState<MetalDetectorFormData[]>(getInitialRecords)

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('metalDetectorFormData', JSON.stringify(formData))
    }
  }, [formData])

  // Save records to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('metalDetectorRecords', JSON.stringify(records))
    }
  }, [records])

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

  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('')

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
      setSelectedWarehouse(selectedDetector.warehouse || '')
    } else {
      setSelectedWarehouse('')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Add current form data to records
    setRecords(prev => [...prev, { ...formData, id: Date.now().toString() }])
    
    // Reset form but keep current date/time and machine details
    setFormData(getDefaultFormData())
    setSelectedWarehouse('')
    
    console.log('Record added:', formData)
  }

  const handleSaveRecord = async () => {
    if (records.length === 0) {
      alert('Please add at least one entry before saving.')
      return
    }

    try {
      console.log('🚀 Starting save process...')
      
      // Generate batch ID in format MDYYYYMMDDHHMMSS
      const now = new Date()
      const baseId = `MD${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
      
      // Create summary record for md_records table
      const summaryRecord = {
        entry_date: records[0]?.date || new Date().toISOString().split('T')[0],
        entry_time: records[0]?.time || new Date().toTimeString().slice(0, 5),
        identification_no: records[0]?.identificationNo || '',
        location: records[0]?.location || '',
        customer_name: records[0]?.customerName || '',
        batch_lot_no: records[0]?.batchLotNo || '',
        calibrated_by: records[0]?.calibratedBy || '',
        verified_by: records[0]?.verifiedBy || '',
        status: records.every(r => r.sensitivityFEChecked && r.sensitivityNFEChecked && r.sensitivitySSChecked) ? 'passed' : 'needs_review',
        remarks: `Batch of ${records.length} entries`
      }

      const requestPayload = {
        baseId,
        summaryRecord,
        entries: records
      }

      console.log('📦 Request payload:', requestPayload)

      // Save to database via API
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
      const apiUrl = `${API_BASE}/metaldetector/`
      
      console.log('🌐 Making request to:', apiUrl)
      console.log('📄 Request headers:', {
        'Content-Type': 'application/json',
      })
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      })

      console.log('📥 Response status:', response.status)
      console.log('📥 Response statusText:', response.statusText)
      console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        let responseBody = ''
        
        try {
          responseBody = await response.text()
          console.log('📥 Error response body:', responseBody)
          
          // Try to parse as JSON for better error details
          const errorData = JSON.parse(responseBody)
          errorMessage = errorData.message || errorData.detail || errorMessage
        } catch (parseError) {
          console.log('📝 Raw error response (not JSON):', responseBody)
          if (responseBody) {
            errorMessage = `${errorMessage} - ${responseBody}`
          }
        }
        
        throw new Error(errorMessage)
      }

      const responseData = await response.json()
      console.log('✅ Success response:', responseData)

      alert('Records saved successfully!')
      // Clear all records and form data after successful save
      setRecords([])
      setFormData(getDefaultFormData())
      setSelectedWarehouse('')
      
      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('metalDetectorFormData')
        localStorage.removeItem('metalDetectorRecords')
      }
      
      // Redirect to main page
      router.push('/documentations/metaldetector')
      
    } catch (error) {
      console.error('💥 Error saving records:', error)
      
      let userMessage = 'Error saving records. Please try again.'
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        userMessage = 'Network error: Unable to connect to server. Please check if the backend is running.'
      } else if (error instanceof Error) {
        userMessage = `Save failed: ${error.message}`
      }
      
      alert(userMessage)
    }
  }

  const handleClearAllData = () => {
    if (confirm('Are you sure you want to clear all form data and records? This action cannot be undone.')) {
      setFormData(getDefaultFormData())
      setSelectedWarehouse('')
      setRecords([])
      
      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('metalDetectorFormData')
        localStorage.removeItem('metalDetectorRecords')
      }
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
          
          {(formData.customerName || formData.productName || formData.batchLotNo || records.length > 0) && (
            <button
              onClick={handleClearAllData}
              className="px-3 py-2 text-xs sm:text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 active:bg-red-100 transition-colors"
            >
              Clear All
            </button>
          )}
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
                Auto-saving
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
                  <option value="">Select Detector</option>
                  <optgroup label="A185">
                    {metalDetectorOptions.filter(opt => !opt.warehouse).map((option, index) => (
                      <option key={`main-${index}`} value={`${option.identificationNo}-${option.srNo}`}>
                        {option.identificationNo} · {option.srNo.replace(/[()]/g, '')}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="W202">
                    {metalDetectorOptions.filter(opt => opt.warehouse === 'W202').map((option, index) => (
                      <option key={`w202-${index}`} value={`${option.identificationNo}-${option.srNo}`}>
                        {option.identificationNo} · {option.srNo.replace(/[()]/g, '')}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Auto-filled info chips */}
              {formData.identificationNo && (
                <div className="flex flex-wrap gap-2">
                  {selectedWarehouse && (
                    <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                      {selectedWarehouse}
                    </span>
                  )}
                  {!selectedWarehouse && (
                    <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                      A185
                    </span>
                  )}
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
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={isAuthorized ? handleInputChange : undefined}
                  className={`w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isAuthorized ? 'bg-white' : 'bg-gray-50'}`}
                  readOnly={!isAuthorized}
                />
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
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors"
              >
                + Add Row
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
            </div>

            {/* Mobile card view */}
            <div className="sm:hidden divide-y divide-gray-100">
              {records.map((record, index) => (
                <div key={record.id || index} className="px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{record.identificationNo}</span>
                      <span className="text-xs text-gray-500">{record.time}</span>
                    </div>
                    <button
                      onClick={() => setRecords(prev => prev.filter((_, i) => i !== index))}
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
                        <td className="px-2 py-1.5 text-sm text-gray-900">{record.time}</td>
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
                            onClick={() => setRecords(prev => prev.filter((_, i) => i !== index))}
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

        {/* Save Record Button */}
        {records.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm sm:shadow-lg border border-gray-200 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  Ready to Save {records.length} Record{records.length > 1 ? 's' : ''}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  Save all entries as a batch
                </p>
              </div>
              <button
                onClick={handleSaveRecord}
                className="w-full sm:w-auto px-6 py-3 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-base"
              >
                Save All Records
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}