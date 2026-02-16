'use client'

import { useState } from 'react'
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
}

const metalDetectorOptions: MetalDetectorOption[] = [
  {
    identificationNo: 'CCP 1A',
    srNo: '(Das-2025082321)',
    location: 'Inward section - Raw materials',
    sensitivityFE: 'Fe-1.0 mm',
    sensitivityNFE: 'NFe-1.2 mm',
    sensitivitySS: 'SS-1.7 mm',
    mode: 'Offline'
  },
  {
    identificationNo: 'CCP 1B',
    srNo: '(Das-2025082320)',
    location: 'Roasted product section',
    sensitivityFE: 'Fe-1.0mm',
    sensitivityNFE: 'NFe-1.2mm',
    sensitivitySS: 'SS-1.7mm',
    mode: 'Offline'
  },
  {
    identificationNo: 'CCP 1C',
    srNo: '(Das-2025082319)',
    location: 'Oil section',
    sensitivityFE: 'Fe-1.0mm',
    sensitivityNFE: 'NFe-1.2mm',
    sensitivitySS: 'SS-1.7mm',
    mode: 'Offline'
  },
  {
    identificationNo: 'CCP 1D',
    srNo: '(Das-2025082324)',
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
  }
]

export default function MetalDetectorPage() {
  const router = useRouter()
  
  const [formData, setFormData] = useState<MetalDetectorFormData>({
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

  const [records, setRecords] = useState<MetalDetectorFormData[]>([])

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Add current form data to records
    setRecords(prev => [...prev, { ...formData, id: Date.now().toString() }])
    
    // Reset form but keep current date/time and machine details
    setFormData({
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
    
    console.log('Record added:', formData)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Documentations
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">
              CCP Calibration, Monitoring and Verification Record (Metal Detector)
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Document No: CFPLA.C2.F.24a | Frequency: Start - Mid - End (Every Hour)
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white px-4 py-2">
            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="max-w-xs">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Machine Details
                  </label>
                  <input
                    type="text"
                    name="machineDetails"
                    value={formData.machineDetails}
                    className="w-full px-2 py-1.5 text-base border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50"
                    readOnly
                  />
                </div>
                <div className="max-w-xs">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    className="w-full px-2 py-1.5 text-base border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50"
                    placeholder="Auto-selected"
                    readOnly
                  />
                </div>
                <div className="max-w-sm">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Identification No <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="identificationNo"
                    value={formData.identificationNo ? `${formData.identificationNo}-${metalDetectorOptions.find(opt => opt.identificationNo === formData.identificationNo)?.srNo || ''}` : ''}
                    onChange={handleIdentificationChange}
                    className="w-full px-2 py-1.5 text-base border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Detector</option>
                    {metalDetectorOptions.map((option, index) => (
                      <option key={index} value={`${option.identificationNo}-${option.srNo}`}>
                        {option.identificationNo} - {option.srNo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="max-w-xs">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    className="w-full px-2 py-1.5 text-base border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50"
                    readOnly
                  />
                </div>
                <div className="max-w-xs">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    name="time"
                    value={formData.time}
                    className="w-full px-2 py-1.5 text-base border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50"
                    readOnly
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="max-w-xs">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleInputChange}
                    className="w-full px-2 py-1.5 text-base border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Customer name"
                    required
                  />
                </div>
                <div className="max-w-xs">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="productName"
                    value={formData.productName}
                    onChange={handleInputChange}
                    className="w-full px-2 py-1.5 text-base border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Product name"
                    required
                  />
                </div>
                <div className="max-w-xs">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Batch/Lot No. <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="batchLotNo"
                    value={formData.batchLotNo}
                    onChange={handleInputChange}
                    className="w-full px-2 py-1.5 text-base border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Batch/lot number"
                    required
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-2">
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Sensitivities</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="max-w-xs">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      FE <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        name="sensitivityFE"
                        value={formData.sensitivityFE}
                        className="flex-1 px-2 py-1.5 text-base border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50"
                        placeholder="Auto-populated"
                        readOnly
                      />
                      <label className="relative flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="sensitivityFEChecked"
                          checked={formData.sensitivityFEChecked}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        <div className={`w-8 h-8 border-2 rounded flex items-center justify-center transition-colors ${
                          formData.sensitivityFEChecked 
                            ? 'bg-green-500 border-green-500' 
                            : 'bg-white border-gray-300 hover:border-gray-400'
                        }`}>
                          {formData.sensitivityFEChecked && (
                            <Check className="w-4 h-4 text-white" />
                          )}
                        </div>
                      </label>
                    </div>
                  </div>
                  <div className="max-w-xs">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      NFE <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        name="sensitivityNFE"
                        value={formData.sensitivityNFE}
                        className="flex-1 px-2 py-1.5 text-base border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50"
                        placeholder="Auto-populated"
                        readOnly
                      />
                      <label className="relative flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="sensitivityNFEChecked"
                          checked={formData.sensitivityNFEChecked}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        <div className={`w-8 h-8 border-2 rounded flex items-center justify-center transition-colors ${
                          formData.sensitivityNFEChecked 
                            ? 'bg-green-500 border-green-500' 
                            : 'bg-white border-gray-300 hover:border-gray-400'
                        }`}>
                          {formData.sensitivityNFEChecked && (
                            <Check className="w-4 h-4 text-white" />
                          )}
                        </div>
                      </label>
                    </div>
                  </div>
                  <div className="max-w-xs">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SS <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        name="sensitivitySS"
                        value={formData.sensitivitySS}
                        className="flex-1 px-2 py-1.5 text-base border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50"
                        placeholder="Auto-populated"
                        readOnly
                      />
                      <label className="relative flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="sensitivitySSChecked"
                          checked={formData.sensitivitySSChecked}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        <div className={`w-8 h-8 border-2 rounded flex items-center justify-center transition-colors ${
                          formData.sensitivitySSChecked 
                            ? 'bg-green-500 border-green-500' 
                            : 'bg-white border-gray-300 hover:border-gray-400'
                        }`}>
                          {formData.sensitivitySSChecked && (
                            <Check className="w-4 h-4 text-white" />
                          )}
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-2">
                <h4 className="text-sm font-semibold text-gray-900 mb-1">
                  If Metal Detector is Not Working, Corrective Action Taken On:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="max-w-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      On Metal Detector
                    </label>
                    <textarea
                      name="correctiveActionOnDetector"
                      value={formData.correctiveActionOnDetector}
                      onChange={handleInputChange}
                      rows={1}
                      className="w-full px-2 py-1.5 text-base border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Corrective action on detector"
                    />
                  </div>
                  <div className="max-w-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      On Product Passed
                    </label>
                    <textarea
                      name="correctiveActionOnProduct"
                      value={formData.correctiveActionOnProduct}
                      onChange={handleInputChange}
                      rows={1}
                      className="w-full px-2 py-1.5 text-base border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Corrective action on product"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="max-w-xs">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Calibrated/Monitored By <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="calibratedBy"
                    value={formData.calibratedBy}
                    onChange={handleInputChange}
                    className="w-full px-2 py-1.5 text-base border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Name"
                    required
                  />
                </div>
                <div className="max-w-xs">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Verified By <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="verifiedBy"
                    value={formData.verifiedBy}
                    onChange={handleInputChange}
                    className="w-full px-2 py-1.5 text-base border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
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

              <div className="max-w-lg">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remarks
                </label>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  rows={1}
                  className="w-full px-2 py-1.5 text-base border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Additional remarks"
                />
              </div>
            </div>

            <div className="mt-2 flex justify-end space-x-2 border-t border-gray-200 pt-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 border border-transparent rounded shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                Add Row
              </button>
            </div>
          </form>
        </div>

        {records.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="bg-white px-4 py-2 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">
                Metal Detector Records ({records.length})
              </h3>
            </div>
            <div className="px-4 py-2">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-1 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Time</th>
                      <th className="px-2 py-1 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">ID No.</th>
                      <th className="px-2 py-1 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-2 py-1 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-2 py-1 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Batch/Lot</th>
                      <th className="px-2 py-1 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Sensitivities</th>
                      <th className="px-2 py-1 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Calibrated By</th>
                      <th className="px-2 py-1 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Verified By</th>
                      <th className="px-2 py-1 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {records.map((record, index) => (
                      <tr key={record.id || index} className="hover:bg-gray-50">
                        <td className="px-2 py-1 text-sm text-gray-900">{record.time}</td>
                        <td className="px-2 py-1 text-sm text-gray-900">{record.identificationNo}</td>
                        <td className="px-2 py-1 text-sm text-gray-900">{record.customerName}</td>
                        <td className="px-2 py-1 text-sm text-gray-900">{record.productName}</td>
                        <td className="px-2 py-1 text-sm text-gray-900">{record.batchLotNo}</td>
                        <td className="px-2 py-1 text-sm text-gray-900">
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
                        <td className="px-2 py-1 text-sm text-gray-900">{record.calibratedBy}</td>
                        <td className="px-2 py-1 text-sm text-gray-900">{record.verifiedBy}</td>
                        <td className="px-2 py-1 text-sm text-gray-900">
                          <button
                            onClick={() => {
                              setRecords(prev => prev.filter((_, i) => i !== index))
                            }}
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
      </div>
    </DashboardLayout>
  )
}