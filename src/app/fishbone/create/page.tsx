'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Plus, Trash2, Eye, Target, Search, Upload, X, Image as ImageIcon } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useCompany } from '@/contexts/CompanyContext'
import { getComplaints, getComplaintById } from '@/lib/api/complaints'
import { createFishbone, transformFishboneDataToPayload, type ActionPlanItem } from '@/lib/api/fishbone'
import { uploadComplaintImages, validateImageFile, deleteComplaintImage } from '@/lib/api/s3Upload'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/styles'

interface FishboneCategory {
  id: string
  name: string
  causes: string[]
}

const initialCategories: FishboneCategory[] = [
  { id: 'people', name: 'People', causes: [''] },
  { id: 'process', name: 'Process', causes: [''] },
  { id: 'equipment', name: 'Equipment/Machine', causes: [''] },
  { id: 'materials', name: 'Materials', causes: [''] },
  { id: 'environment', name: 'Environment', causes: [''] },
  { id: 'management', name: 'Management/Methods', causes: [''] }
]

const customerOptions = [
  'Walmart',
  'Costco',
  'Target',
  'Kroger',
  'Safeway',
  'Whole Foods Market',
  'Trader Joe\'s',
  'Amazon Fresh',
  'Local Retailers',
  'Food Service Companies',
  'Other'
]

export default function CreateFishbonePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const complaintIdParam = searchParams.get('complaintId')
  const { currentCompany } = useCompany()
  
  const [formData, setFormData] = useState({
    complaintId: complaintIdParam || '',
    itemCategory: '',
    itemSubcategory: '',
    itemDescription: '',
    problemStatement: '',
    customerName: '',
    otherCustomerName: '',
    issueDescription: '',
    dateOccurred: '',
    impactLevel: 'medium',
    createdBy: '',
    analysisDate: new Date().toISOString().split('T')[0],
    foodSafetyConcern: 'no',
    recallOfBatch: 'no',
    preparedBy: 'Naimat Rizvi',
    capaPreparedBy: 'Naimat Rizvi',
    approvedBy: 'Pooja Parker',
    dateApproved: '',
    controlSamplePhotos: [] as string[]
  })

  const [categories, setCategories] = useState<FishboneCategory[]>(initialCategories)
  const [actionPlan, setActionPlan] = useState<ActionPlanItem[]>([
    { id: 1, action: '', responsible: '', deadline: '', status: 'pending' }
  ])
  const [isFetchingComplaint, setIsFetchingComplaint] = useState(false)
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Function to fetch complaint details by complaint ID
  const fetchComplaintDetails = async () => {
    if (!formData.complaintId || !formData.complaintId.trim()) {
      toast.error('Please enter a complaint ID')
      return
    }

    setIsFetchingComplaint(true)
    try {
      // Step 1: Fetch complaints list and find the numeric ID
      const response = await getComplaints({
        company: currentCompany,
        page: 1,
        limit: 100
      })

      const complaintListItem = response.data.find(
        c => c.complaintId.toLowerCase() === formData.complaintId.toLowerCase()
      )

      if (!complaintListItem) {
        toast.error(`Complaint ${formData.complaintId} not found`)
        return
      }

      // Step 2: Fetch full complaint details using numeric ID
      const complaint = await getComplaintById(complaintListItem.id, currentCompany)

      // Auto-fill form with complaint details
      setFormData(prev => ({
        ...prev,
        itemCategory: complaint.itemCategory || '',
        itemSubcategory: complaint.itemSubcategory || '',
        itemDescription: complaint.itemDescription || '',
        problemStatement: complaint.remarks || '',
        customerName: 'Other',
        otherCustomerName: complaint.customerName || '',
        issueDescription: complaint.remarks || '',
        dateOccurred: complaint.receivedDate || '',
      }))

      toast.success('Complaint details loaded successfully!')
    } catch (error) {
      console.error('Error fetching complaint:', error)
      toast.error('Failed to fetch complaint details')
    } finally {
      setIsFetchingComplaint(false)
    }
  }

  // Fetch complaint data and auto-fill form when complaintId is provided from URL
  useEffect(() => {
    if (complaintIdParam) {
      setFormData(prev => ({ ...prev, complaintId: complaintIdParam }))
      // Auto-fetch if complaint ID is provided via URL
      setTimeout(() => fetchComplaintDetails(), 100)
    }
  }, [complaintIdParam])

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleCauseChange = (categoryId: string, causeIndex: number, value: string) => {
    setCategories(prev => prev.map(cat => 
      cat.id === categoryId 
        ? { 
            ...cat, 
            causes: cat.causes.map((cause, idx) => 
              idx === causeIndex ? value : cause
            )
          }
        : cat
    ))
  }

  const addCause = (categoryId: string) => {
    setCategories(prev => prev.map(cat => 
      cat.id === categoryId 
        ? { ...cat, causes: [...cat.causes, ''] }
        : cat
    ))
  }

  const removeCause = (categoryId: string, causeIndex: number) => {
    setCategories(prev => prev.map(cat => 
      cat.id === categoryId 
        ? { 
            ...cat, 
            causes: cat.causes.filter((_, idx) => idx !== causeIndex)
          }
        : cat
    ))
  }

  const addActionItem = () => {
    const newId = Math.max(...actionPlan.map(item => item.id)) + 1
    setActionPlan(prev => [...prev, { 
      id: newId, 
      action: '', 
      responsible: '', 
      deadline: '', 
      status: 'pending' 
    }])
  }

  const removeActionItem = (id: number) => {
    setActionPlan(prev => prev.filter(item => item.id !== id))
  }

  const updateActionItem = (id: number, field: string, value: string) => {
    setActionPlan(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Validate files
    const validFiles: File[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const error = validateImageFile(file)
      if (error) {
        toast.error(error)
        continue
      }
      validFiles.push(file)
    }

    if (validFiles.length === 0) return

    setIsUploadingPhotos(true)
    try {
      const urls = await uploadComplaintImages(validFiles, currentCompany)
      setFormData(prev => ({
        ...prev,
        controlSamplePhotos: [...prev.controlSamplePhotos, ...urls]
      }))
      toast.success(`${urls.length} photo(s) uploaded successfully`)
      // Reset input
      e.target.value = ''
    } catch (error) {
      console.error('Photo upload error:', error)
      toast.error('Failed to upload photos')
    } finally {
      setIsUploadingPhotos(false)
    }
  }

  const removePhoto = async (index: number) => {
    const url = formData.controlSamplePhotos[index]
    try {
      // Delete from S3
      await deleteComplaintImage(url)
      
      // Remove from form state
      setFormData(prev => ({
        ...prev,
        controlSamplePhotos: prev.controlSamplePhotos.filter((_, i) => i !== index)
      }))
      toast.success('Photo removed from S3')
    } catch (error) {
      console.error('Failed to delete photo:', error)
      toast.error('Failed to delete photo from S3')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!formData.complaintId.trim()) {
      toast.error('Please enter a Complaint ID')
      return
    }
    if (!formData.problemStatement.trim()) {
      toast.error('Please enter a Problem Statement')
      return
    }
    if (!formData.issueDescription.trim()) {
      toast.error('Please enter an Issue Description')
      return
    }

    setIsSubmitting(true)
    
    try {
      // Transform form data to API payload
      const payload = transformFishboneDataToPayload(formData, categories, actionPlan)
      
      // Create fishbone analysis
      const result = await createFishbone(payload, currentCompany)
      
      toast.success(`Fishbone Analysis ${result.fishbone_number} created successfully!`)
      
      // Redirect to fishbone list page
      router.push('/fishbone')
      
    } catch (error: any) {
      console.error('Failed to create fishbone analysis:', error)
      toast.error(error.message || 'Failed to create fishbone analysis')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getImpactColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'border-green-200 bg-green-50'
      case 'medium':
        return 'border-yellow-200 bg-yellow-50'
      case 'high':
        return 'border-red-200 bg-red-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/fishbone"
              className="inline-flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to FishBone Analyses Records
            </Link>
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Save as Draft
            </button>
            <button
              type="submit"
              form="fishbone-form"
              disabled={isSubmitting}
              className={cn(
                "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700",
                isSubmitting && "opacity-50 cursor-not-allowed"
              )}
            >
              <Save className="h-4 w-4 mr-2 inline" />
              {isSubmitting ? 'Saving...' : 'Save Analysis'}
            </button>
          </div>
        </div>

        <form id="fishbone-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Target className="h-5 w-5 mr-2 text-blue-600" />
              Basic Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Related Complaint ID *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    required
                    value={formData.complaintId}
                    onChange={(e) => handleFormChange('complaintId', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., CCNFS-2025-10-001"
                  />
                  <button
                    type="button"
                    onClick={fetchComplaintDetails}
                    disabled={isFetchingComplaint}
                    className={cn(
                      "inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white",
                      isFetchingComplaint
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    )}
                  >
                    <Search className="w-4 h-4 mr-1" />
                    {isFetchingComplaint ? 'Fetching...' : 'Fetch'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Analysis Date
                </label>
                <input
                  type="date"
                  value={formData.analysisDate}
                  onChange={(e) => handleFormChange('analysisDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item Category
                </label>
                <input
                  type="text"
                  value={formData.itemCategory}
                  onChange={(e) => handleFormChange('itemCategory', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  placeholder="Will be auto-filled from complaint"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item Subcategory
                </label>
                <input
                  type="text"
                  value={formData.itemSubcategory}
                  onChange={(e) => handleFormChange('itemSubcategory', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  placeholder="Will be auto-filled from complaint"
                  readOnly
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item Description
                </label>
                <input
                  type="text"
                  value={formData.itemDescription}
                  onChange={(e) => handleFormChange('itemDescription', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  placeholder="Will be auto-filled from complaint"
                  readOnly
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Problem Statement *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.problemStatement}
                  onChange={(e) => handleFormChange('problemStatement', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Clearly describe the problem or effect that needs root cause analysis..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name
                </label>
                <select
                  value={formData.customerName}
                  onChange={(e) => handleFormChange('customerName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Customer</option>
                  {customerOptions.map((customer) => (
                    <option key={customer} value={customer}>
                      {customer}
                    </option>
                  ))}
                </select>
              </div>

              {formData.customerName === 'Other' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Other Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.otherCustomerName}
                    onChange={(e) => handleFormChange('otherCustomerName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter customer name"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Food Safety Concern
                </label>
                <select
                  value={formData.foodSafetyConcern}
                  onChange={(e) => handleFormChange('foodSafetyConcern', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recall of the Batch
                </label>
                <select
                  value={formData.recallOfBatch}
                  onChange={(e) => handleFormChange('recallOfBatch', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Occurred
                </label>
                <input
                  type="date"
                  value={formData.dateOccurred}
                  onChange={(e) => handleFormChange('dateOccurred', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Impact Level
                </label>
                <select
                  value={formData.impactLevel}
                  onChange={(e) => handleFormChange('impactLevel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">Low Impact</option>
                  <option value="medium">Medium Impact</option>
                  <option value="high">High Impact</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Created By *
                </label>
                <input
                  type="text"
                  required
                  value={formData.createdBy}
                  onChange={(e) => handleFormChange('createdBy', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your name"
                />
              </div>
            </div>
          </div>

          {/* FishBone Diagram - Cause Categories */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <Eye className="h-5 w-5 mr-2 text-blue-600" />
                FishBone Diagram - Root Cause Analysis
              </h2>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${getImpactColor(formData.impactLevel)}`}>
                {formData.impactLevel.charAt(0).toUpperCase() + formData.impactLevel.slice(1)} Impact
              </div>
            </div>

            {/* Problem Statement Display */}
            <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Problem/Effect:</h3>
              <p className="text-blue-800">
                {formData.problemStatement || 'No problem statement defined yet...'}
              </p>
            </div>

            {/* Cause Categories Grid - 2 columns x 3 rows */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {categories.map((category) => (
                <div key={category.id} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3 text-center bg-gray-50 py-2 rounded">
                    {category.name}
                  </h3>
                  
                  <div className="space-y-3">
                    {category.causes.map((cause, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-start justify-between">
                          <span className="text-xs text-gray-500 font-medium">Cause {index + 1}</span>
                          {category.causes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeCause(category.id, index)}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Remove cause"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        <textarea
                          value={cause}
                          onChange={(e) => handleCauseChange(category.id, index, e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-y min-h-[60px]"
                          placeholder="Enter potential cause and describe it in detail..."
                          rows={2}
                        />
                      </div>
                    ))}
                    
                    <button
                      type="button"
                      onClick={() => addCause(category.id)}
                      className="w-full mt-3 px-3 py-2 text-sm text-blue-600 border border-blue-300 border-dashed rounded hover:bg-blue-50 flex items-center justify-center transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Cause
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Plan */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Target className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Action Plan</h2>
                    <p className="text-sm text-gray-600">Define corrective actions to address root causes</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addActionItem}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Action Item
                </button>
              </div>
            </div>

            <div className="p-6">
              {actionPlan.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No actions defined</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by adding your first corrective action.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {actionPlan.map((item, index) => (
                    <div key={item.id} className="bg-gray-50 border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold text-blue-600">{index + 1}</span>
                          </div>
                          <h3 className="text-base font-medium text-gray-900">Action Item #{index + 1}</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeActionItem(item.id)}
                          className="inline-flex items-center p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove action item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <span className="flex items-center">
                              📋 Corrective Action Description *
                            </span>
                          </label>
                          <textarea
                            rows={3}
                            value={item.action}
                            onChange={(e) => updateActionItem(item.id, 'action', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y shadow-sm"
                            placeholder="Describe the specific corrective action to be implemented..."
                          />
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              <span className="flex items-center">
                                👤 Responsible Person *
                              </span>
                            </label>
                            <input
                              type="text"
                              value={item.responsible}
                              onChange={(e) => updateActionItem(item.id, 'responsible', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                              placeholder="Enter person's name or role"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              <span className="flex items-center">
                                📅 Target Completion Date
                              </span>
                            </label>
                            <input
                              type="date"
                              value={item.deadline}
                              onChange={(e) => updateActionItem(item.id, 'deadline', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                              min={new Date().toISOString().split('T')[0]}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Preventive Actions */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900"> Preventive Actions</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Complaint Register
                    </label>
                    <input
                      type="text"
                      value={formData.preparedBy}
                      onChange={(e) => handleFormChange('preparedBy', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      CAPA Prepared By
                    </label>
                    <input
                      type="text"
                      value={formData.capaPreparedBy}
                      onChange={(e) => handleFormChange('capaPreparedBy', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Verified By
                    </label>
                    <input
                      type="text"
                      value={formData.approvedBy}
                      onChange={(e) => handleFormChange('approvedBy', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Date Approved
                    </label>
                    <input
                      type="date"
                      value={formData.dateApproved}
                      onChange={(e) => handleFormChange('dateApproved', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Upload Control Sample Photos */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Upload Control Sample Photos
                      </label>
                      <p className="text-xs text-gray-500">Upload photos of control samples (Max 10MB per image)</p>
                    </div>
                    <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors cursor-pointer shadow-sm">
                      <Upload className="h-4 w-4 mr-2" />
                      {isUploadingPhotos ? 'Uploading...' : 'Upload Photos'}
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        onChange={handlePhotoUpload}
                        disabled={isUploadingPhotos}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Display uploaded photos */}
                  {formData.controlSamplePhotos.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {formData.controlSamplePhotos.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Control sample ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-300"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove photo"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <div className="absolute bottom-2 left-2 px-2 py-1 bg-black bg-opacity-60 text-white text-xs rounded">
                            Photo {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {formData.controlSamplePhotos.length === 0 && (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">No photos uploaded yet</p>
                      <p className="text-xs text-gray-500">Click "Upload Photos" to add control sample images</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}