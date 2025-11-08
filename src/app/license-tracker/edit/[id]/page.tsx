'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Shield, ArrowLeft, Save, X } from 'lucide-react'
import { getLicenseById, updateLicense, type License, type LicenseUpdatePayload } from '@/lib/api/licenses'

export default function EditLicensePage() {
  const router = useRouter()
  const params = useParams()
  const licenseId = parseInt(params.id as string)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState<License | null>(null)

  // Load license data from API
  useEffect(() => {
    const loadLicense = async () => {
      try {
        const license = await getLicenseById(licenseId)
        setFormData(license)
      } catch (err: any) {
        console.error('Error loading license:', err)
        setError(err.message || 'Failed to load license data')
      } finally {
        setIsLoading(false)
      }
    }

    if (!isNaN(licenseId)) {
      loadLicense()
    } else {
      setError('Invalid license ID')
      setIsLoading(false)
    }
  }, [licenseId])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (formData) {
      setFormData(prev => prev ? ({
        ...prev,
        [name]: value
      }) : null)
    }
  }

  const handleSave = async () => {
    if (!formData) return

    try {
      setIsSaving(true)
      setError('')

      // Validation
      if (!formData.company_name || !formData.location || !formData.validity) {
        setError('Please fill in all required fields')
        setIsSaving(false)
        return
      }

      // Prepare update payload
      const payload: LicenseUpdatePayload = {
        company_name: formData.company_name,
        location: formData.location,
        validity: formData.validity,
        type: formData.type,
        status: formData.status,
        business_types: formData.business_types,
        issuing_authority: formData.issuing_authority || undefined,
        remind_me_in: formData.remind_me_in || undefined,
      }

      // Call API to update license
      await updateLicense(licenseId, payload)
      
      // Redirect back to main page
      router.push('/license-tracker')
    } catch (err: any) {
      console.error('Error saving license:', err)
      setError(err.message || 'Failed to save license. Please try again.')
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    router.push('/license-tracker')
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading license data...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error && !formData?.id) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-red-800 font-semibold text-lg mb-2">Error</h2>
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => router.push('/license-tracker')}
              className="mt-4 inline-flex items-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to License Tracker
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={handleCancel}
              className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to License Tracker
            </button>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Shield className="w-8 h-8 mr-3 text-blue-600" />
              Edit License
            </h1>
            <p className="text-gray-600 mt-1">
              Update license details and validity information
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="space-y-6">
            {/* License Number (Readonly) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                License Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="license_no"
                value={formData?.license_no || ''}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">License number cannot be changed</p>
            </div>

            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="company_name"
                value={formData?.company_name || ''}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location <span className="text-red-500">*</span>
              </label>
              <textarea
                name="location"
                value={formData?.location || ''}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                License Type <span className="text-red-500">*</span>
              </label>
              <select
                name="type"
                value={formData?.type || 'Central'}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="Central">Central</option>
                <option value="State">State</option>
              </select>
            </div>

            {/* Validity Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Validity Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="validity"
                value={formData?.validity ? (() => {
                  // Convert DD/MM/YYYY or DD-MM-YYYY to YYYY-MM-DD for date input
                  try {
                    let date = formData.validity
                    if (date.includes('/')) {
                      const [day, month, year] = date.split('/')
                      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
                    } else if (date.includes('-') && date.split('-')[0].length === 2) {
                      const [day, month, year] = date.split('-')
                      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
                    }
                    return date
                  } catch {
                    return ''
                  }
                })() : ''}
                onChange={(e) => {
                  // Convert YYYY-MM-DD to DD/MM/YYYY for storage
                  if (e.target.value) {
                    const [year, month, day] = e.target.value.split('-')
                    const formattedDate = `${day}/${month}/${year}`
                    handleInputChange({
                      target: { name: 'validity', value: formattedDate }
                    } as any)
                  }
                }}
                min={new Date().toISOString().split('T')[0]}
                className="w-64 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Select validity date from calendar (must be future date)</p>
            </div>

            {/* Issuing Authority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issuing Authority
              </label>
              <input
                type="text"
                name="issuing_authority"
                value={formData?.issuing_authority || ''}
                onChange={handleInputChange}
                placeholder="Enter issuing authority name"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Remind Me In */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remind Me In
              </label>
              <select
                name="remind_me_in"
                value={formData?.remind_me_in || ''}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">No Reminder</option>
                <option value="5 days">5 Days</option>
                <option value="15 days">15 Days</option>
                <option value="30 days">30 Days</option>
                <option value="45 days">45 Days</option>
                <option value="2 months">2 Months</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Set when to remind for license renewal</p>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData?.status || 'Active'}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Active">Active</option>
                <option value="Surrender">Surrender</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="inline-flex items-center px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
