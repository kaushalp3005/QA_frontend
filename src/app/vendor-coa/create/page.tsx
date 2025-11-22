'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, Image, X, ArrowLeft } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from 'react-hot-toast'

interface VendorCOAForm {
  vendorName: string
  lotBatchNumber: string
  itemName: string
  itemSubcategory: string
  itemType: string
  uploadedFile: File | null
}

export default function CreateVendorCOAPage() {
  const router = useRouter()
  const { canCreate, permissions } = usePermissions()
  const [formData, setFormData] = useState<VendorCOAForm>({
    vendorName: '',
    lotBatchNumber: '',
    itemName: '',
    itemSubcategory: '',
    itemType: '',
    uploadedFile: null
  })
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const currentDate = new Date().toLocaleDateString('en-GB')

  // Check permissions on mount
  useEffect(() => {
    if (Object.keys(permissions).length > 0 && !canCreate('vendor_coa')) {
      toast.error('You do not have permission to create vendor COA records')
      router.push('/vendor-coa')
    }
  }, [permissions, canCreate, router])

  // Show loading while permissions are being fetched
  if (Object.keys(permissions).length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-500">Loading permissions...</div>
        </div>
      </DashboardLayout>
    )
  }

  // Don't render form if no permission
  if (!canCreate('vendor_coa')) {
    return null
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileUpload = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    
    if (!validTypes.includes(file.type)) {
      alert('Please upload only images (JPG, PNG) or PDF files')
      return
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('File size should be less than 10MB')
      return
    }

    setFormData(prev => ({ ...prev, uploadedFile: file }))

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFilePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setFilePreview(null)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const removeFile = () => {
    setFormData(prev => ({ ...prev, uploadedFile: null }))
    setFilePreview(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.vendorName || !formData.lotBatchNumber || !formData.itemName || !formData.itemSubcategory || !formData.itemType) {
      alert('Please fill in all required fields')
      return
    }

    if (!formData.uploadedFile) {
      alert('Please upload a COA document')
      return
    }

    setIsSubmitting(true)

    try {
      // Debug: Log the form data before sending
      console.log('Form data before submission:', {
        itemType: formData.itemType,
        vendorName: formData.vendorName,
        itemName: formData.itemName
      })
      
      // Create FormData for API call
      const formDataToSend = new FormData()
      formDataToSend.append('vendor_name', formData.vendorName)
      formDataToSend.append('lot_batch_number', formData.lotBatchNumber)
      formDataToSend.append('item_name', formData.itemName)
      formDataToSend.append('item_subcategory', formData.itemSubcategory)
      formDataToSend.append('item_type', formData.itemType || '') // Ensure it's always sent
      formDataToSend.append('date', currentDate)
      formDataToSend.append('file', formData.uploadedFile)
      
      // Debug: Log what's being sent
      console.log('item_type being sent:', formData.itemType)

      // Call API to save vendor COA
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/vendor-coa/`, {
        method: 'POST',
        body: formDataToSend,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to save COA')
      }

      const result = await response.json()
      console.log('COA saved successfully:', result)

      alert('Vendor COA saved successfully!')
      
      // Reset form
      setFormData({
        vendorName: '',
        lotBatchNumber: '',
        itemName: '',
        itemSubcategory: '',
        itemType: '',
        uploadedFile: null
      })
      setFilePreview(null)

      // Redirect to list page after successful upload
      setTimeout(() => {
        router.push('/vendor-coa')
      }, 1000)

    } catch (error) {
      console.error('Error saving COA:', error)
      alert(error instanceof Error ? error.message : 'Failed to save COA. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 ">
        <div className="max-w-3xl mx-auto">
          {/* Back Button */}
          <button
            type="button"
            onClick={() => router.push('/vendor-coa')}
            className="flex items-center gap-2 mb-4 px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Back to COA Records</span>
          </button>

          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Upload Vendor COA</h1>
            <p className="text-sm text-gray-600 mt-2">Upload and save vendor Certificate of Analysis documents</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
            <div className="space-y-6">
              {/* Vendor Name */}
              <div>
                <label htmlFor="vendorName" className="block text-sm font-medium text-gray-700 mb-2">
                  Vendor Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="vendorName"
                  name="vendorName"
                  value={formData.vendorName}
                  onChange={handleInputChange}
                  placeholder="Enter vendor name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Lot/Batch Number */}
              <div>
                <label htmlFor="lotBatchNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Lot/Batch Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="lotBatchNumber"
                  name="lotBatchNumber"
                  value={formData.lotBatchNumber}
                  onChange={handleInputChange}
                  placeholder="Enter lot or batch number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Current Date (Read-only) */}
              <div>
                <label htmlFor="currentDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="text"
                  id="currentDate"
                  value={currentDate}
                  readOnly
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Current date (auto-filled)</p>
              </div>

              {/* Item Name */}
              <div>
                <label htmlFor="itemName" className="block text-sm font-medium text-gray-700 mb-2">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="itemName"
                  name="itemName"
                  value={formData.itemName}
                  onChange={handleInputChange}
                  placeholder="Enter item name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Item Subcategory */}
              <div>
                <label htmlFor="itemSubcategory" className="block text-sm font-medium text-gray-700 mb-2">
                  Item Subcategory <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="itemSubcategory"
                  name="itemSubcategory"
                  value={formData.itemSubcategory}
                  onChange={handleInputChange}
                  placeholder="Enter item subcategory"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Item Type Dropdown (RM/PM) */}
              <div>
                <label htmlFor="itemType" className="block text-sm font-medium text-gray-700 mb-2">
                  Item Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="itemType"
                  name="itemType"
                  value={formData.itemType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select Item Type</option>
                  <option value="RM">RM (Raw Material)</option>
                  <option value="PM">PM (Packaging Material)</option>
                </select>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload COA Document <span className="text-red-500">*</span>
                </label>
                
                {!formData.uploadedFile ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragging
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <span className="text-blue-600 hover:text-blue-700 font-medium">
                          Click to upload
                        </span>
                        <span className="text-gray-600"> or drag and drop</span>
                      </label>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,application/pdf"
                        onChange={handleFileInputChange}
                        className="sr-only"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Images (JPG, PNG) or PDF up to 10MB
                    </p>
                  </div>
                ) : (
                  <div className="border border-gray-300 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {formData.uploadedFile.type.startsWith('image/') ? (
                          <Image className="h-10 w-10 text-blue-600 flex-shrink-0" />
                        ) : (
                          <FileText className="h-10 w-10 text-red-600 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {formData.uploadedFile.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(formData.uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={removeFile}
                        className="ml-4 p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Image Preview */}
                    {filePreview && (
                      <div className="mt-4 rounded-lg overflow-hidden border border-gray-200">
                        <img
                          src={filePreview}
                          alt="Preview"
                          className="w-full h-auto max-h-64 object-contain bg-gray-50"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      vendorName: '',
                      lotBatchNumber: '',
                      itemName: '',
                      itemSubcategory: '',
                      itemType: '',
                      uploadedFile: null
                    })
                    setFilePreview(null)
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Saving...' : 'Save COA'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
}
