'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Plus, Trash2, Eye, Target, Upload, X, ImageIcon } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useCompany } from '@/contexts/CompanyContext'
import { getFishboneById, updateFishbone, transformFishboneDataToPayload, type ActionPlanItem } from '@/lib/api/fishbone'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/styles'
import { uploadComplaintImages, validateImageFile, deleteComplaintImage } from '@/lib/api/s3Upload'

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

export default function EditFishbonePage() {
  const params = useParams()
  const router = useRouter()
  const fishboneId = params.id as string
  const { currentCompany } = useCompany()
  
  const [formData, setFormData] = useState({
    complaintId: '',
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
    preparedBy: 'Naimat Rizvi',
    capaPrearedBy: 'Naimat Rizvi',
    approvedBy: 'Pooja Parker',
    dateApproved: ''
  })

  const [categories, setCategories] = useState<FishboneCategory[]>(initialCategories)
  const [actionPlan, setActionPlan] = useState<ActionPlanItem[]>([
    { id: 1, action: '', responsible: '', deadline: '', status: 'pending' }
  ])
  const [preventiveActionPlan, setPreventiveActionPlan] = useState<ActionPlanItem[]>([
    { id: 1, action: '', responsible: '', deadline: '', status: 'pending' }
  ])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fishboneNumber, setFishboneNumber] = useState('')
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false)
  const [controlSamplePhotos, setControlSamplePhotos] = useState<string[]>([])

  // Fetch fishbone data
  useEffect(() => {
    const fetchFishbone = async () => {
      if (!fishboneId || !currentCompany) {
        console.log('Missing fishboneId or currentCompany', { fishboneId, currentCompany })
        return
      }

      setIsLoading(true)
      console.log('Fetching fishbone:', { fishboneId, currentCompany })
      
      try {
        const data = await getFishboneById(parseInt(fishboneId), currentCompany)
        console.log('Fishbone data loaded:', data)
        
        // Populate form data
        setFormData({
          complaintId: data.complaint_id || '',
          itemCategory: data.item_category || '',
          itemSubcategory: data.item_subcategory || '',
          itemDescription: data.item_description || '',
          problemStatement: data.problem_statement || '',
          customerName: data.customer_name || '',
          otherCustomerName: data.other_customer_name || '',
          issueDescription: data.issue_description || '',
          dateOccurred: data.date_occurred || '',
          impactLevel: data.impact_level || 'medium',
          createdBy: data.created_by || '',
          analysisDate: data.analysis_date || new Date().toISOString().split('T')[0],
          preparedBy: (data as any).prepared_by || 'Naimat Rizvi',
          capaPrearedBy: (data as any).capa_prepared_by || 'Naimat Rizvi',
          approvedBy: (data as any).approved_by || 'Pooja Parker',
          dateApproved: (data as any).date_approved || ''
        })

        // Load control sample photos if available
        if ((data as any).control_sample_photos) {
          const photos = typeof (data as any).control_sample_photos === 'string' 
            ? JSON.parse((data as any).control_sample_photos) 
            : (data as any).control_sample_photos
          setControlSamplePhotos(Array.isArray(photos) ? photos : [])
        }

        setFishboneNumber(data.fishbone_number || '')

        // Populate categories with causes
        const updatedCategories = initialCategories.map(cat => {
          let causes: string[] = []
          
          switch(cat.id) {
            case 'people':
              causes = data.people_causes || ['']
              break
            case 'process':
              causes = data.process_causes || ['']
              break
            case 'equipment':
              causes = data.equipment_causes || ['']
              break
            case 'materials':
              causes = data.materials_causes || ['']
              break
            case 'environment':
              causes = data.environment_causes || ['']
              break
            case 'management':
              causes = data.management_causes || ['']
              break
          }
          
          return {
            ...cat,
            causes: causes.length > 0 ? causes : ['']
          }
        })
        setCategories(updatedCategories)

        // Populate action plan
        if (data.action_plan && data.action_plan.length > 0) {
          setActionPlan(data.action_plan.map((item: any, idx: number) => ({
            id: idx + 1,
            action: item.action || '',
            responsible: item.responsible || '',
            deadline: item.deadline || '',
            status: item.status || 'pending'
          })))
        }

        // Populate preventive action plan
        if ((data as any).preventive_action_plan && (data as any).preventive_action_plan.length > 0) {
          setPreventiveActionPlan((data as any).preventive_action_plan.map((item: any, idx: number) => ({
            id: idx + 1,
            action: item.action || '',
            responsible: item.responsible || '',
            deadline: item.deadline || '',
            status: item.status || 'pending'
          })))
        }

      } catch (error: any) {
        console.error('Failed to fetch fishbone:', error)
        console.error('Error details:', {
          message: error.message,
          fishboneId,
          currentCompany,
          stack: error.stack
        })
        toast.error(error.message || 'Failed to load fishbone analysis')
        router.push('/fishbone')
      } finally {
        setIsLoading(false)
      }
    }

    fetchFishbone()
  }, [fishboneId, currentCompany, router])

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Photo upload handlers
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    try {
      setIsUploadingPhotos(true)

      // Validate each file
      for (let i = 0; i < files.length; i++) {
        const error = validateImageFile(files[i])
        if (error) {
          toast.error(error)
          return
        }
      }

      // Upload to S3
      const uploadedUrls = await uploadComplaintImages(Array.from(files), currentCompany)
      
      // Add to photos list
      setControlSamplePhotos(prev => [...prev, ...uploadedUrls])
      toast.success(`${uploadedUrls.length} photo(s) uploaded successfully`)
    } catch (error) {
      console.error('Photo upload error:', error)
      toast.error('Failed to upload photos')
    } finally {
      setIsUploadingPhotos(false)
      // Reset input
      event.target.value = ''
    }
  }

  const removePhoto = async (index: number) => {
    const photoUrl = controlSamplePhotos[index]
    
    try {
      // Delete from S3
      const deleted = await deleteComplaintImage(photoUrl)
      
      if (deleted) {
        // Remove from state
        setControlSamplePhotos(prev => prev.filter((_, i) => i !== index))
        toast.success('Photo removed successfully')
      } else {
        toast.error('Failed to delete photo from storage')
      }
    } catch (error) {
      console.error('Error removing photo:', error)
      toast.error('Failed to remove photo')
    }
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

  // Preventive Action Plan handlers
  const addPreventiveActionItem = () => {
    const newId = Math.max(...preventiveActionPlan.map(item => item.id)) + 1
    setPreventiveActionPlan(prev => [...prev, { 
      id: newId, 
      action: '', 
      responsible: '', 
      deadline: '', 
      status: 'pending' 
    }])
  }

  const removePreventiveActionItem = (id: number) => {
    setPreventiveActionPlan(prev => prev.filter(item => item.id !== id))
  }

  const updatePreventiveActionItem = (id: number, field: string, value: string) => {
    setPreventiveActionPlan(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ))
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

    setIsSubmitting(true)
    
    try {
      // Transform form data to API payload
      const payload = transformFishboneDataToPayload(formData, categories, actionPlan, preventiveActionPlan)
      
      // Add control sample photos and capa_prepared_by
      const finalPayload = {
        ...payload,
        control_sample_photos: controlSamplePhotos,
        capa_prepared_by: formData.capaPrearedBy
      }
      
      console.log('Updating fishbone with payload:', finalPayload)
      
      // Update fishbone analysis
      await updateFishbone(parseInt(fishboneId), finalPayload, currentCompany)
      
      toast.success(`Fishbone Analysis ${fishboneNumber} updated successfully!`)
      
      // Redirect to fishbone list page
      router.push('/fishbone')
      
    } catch (error: any) {
      console.error('Failed to update fishbone analysis:', error)
      toast.error(error.message || 'Failed to update fishbone analysis')
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

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-sm text-gray-500">Loading fishbone analysis...</p>
          </div>
        </div>
      </DashboardLayout>
    )
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
            {fishboneNumber && (
              <span className="text-sm text-gray-500">
                Editing: <span className="font-semibold text-gray-900">{fishboneNumber}</span>
              </span>
            )}
          </div>
          <div className="flex space-x-3">
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
              {isSubmitting ? 'Updating...' : 'Update Analysis'}
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
                <input
                  type="text"
                  required
                  value={formData.complaintId}
                  onChange={(e) => handleFormChange('complaintId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., CCNFS-2025-10-001"
                />
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter item category"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter item subcategory"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter item description"
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
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              <span className="flex items-center">
                                ✅ Status
                              </span>
                            </label>
                            <select
                              value={item.status}
                              onChange={(e) => updateActionItem(item.id, 'status', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                            >
                              <option value="pending">Pending</option>
                              <option value="in-progress">In Progress</option>
                              <option value="completed">Completed</option>
                            </select>
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
            <div className="bg-purple-50 px-6 py-4 border-b border-purple-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-purple-900">Preventive Actions</h2>
                <button
                  type="button"
                  onClick={addPreventiveActionItem}
                  className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Preventive Action
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {preventiveActionPlan.map((item) => (
                  <div key={item.id} className="bg-purple-50 rounded-lg border border-purple-200 p-6 relative">
                    <div className="absolute top-4 right-4 flex items-center space-x-2">
                      <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                        Preventive Action #{item.id}
                      </div>
                      {preventiveActionPlan.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePreventiveActionItem(item.id)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <span className="flex items-center">
                            📋 Action Description
                          </span>
                        </label>
                        <textarea
                          value={item.action}
                          onChange={(e) => updatePreventiveActionItem(item.id, 'action', e.target.value)}
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm"
                          placeholder="Describe the preventive action to be taken..."
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <span className="flex items-center">
                            👤 Responsible Person
                          </span>
                        </label>
                        <input
                          type="text"
                          value={item.responsible}
                          onChange={(e) => updatePreventiveActionItem(item.id, 'responsible', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm"
                          placeholder="Enter person's name or role"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <span className="flex items-center">
                            📅 Target Date
                          </span>
                        </label>
                        <input
                          type="date"
                          value={item.deadline}
                          onChange={(e) => updatePreventiveActionItem(item.id, 'deadline', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm"
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {preventiveActionPlan.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <Plus className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-lg font-medium">No preventive actions added yet</p>
                    <p className="text-sm">Click "Add Preventive Action" to create preventive measures</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Approval & Verification Section */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Approval & Verification</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Complaint Register
                  </label>
                  <input
                    type="text"
                    value={formData.preparedBy || 'Naimat Rizvi'}
                    onChange={(e) => handleFormChange('preparedBy', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CAPA Prepared By
                  </label>
                  <input
                    type="text"
                    value={formData.capaPrearedBy || 'Naimat Rizvi'}
                    onChange={(e) => handleFormChange('capaPrearedBy', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Verified By
                  </label>
                  <input
                    type="text"
                    value={formData.approvedBy || 'Pooja Parker'}
                    onChange={(e) => handleFormChange('approvedBy', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Approved
                  </label>
                  <input
                    type="date"
                    value={formData.dateApproved || ''}
                    onChange={(e) => handleFormChange('dateApproved', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Control Sample Photos Upload */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Control Sample Photos
                  </label>
                  <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <Upload className="w-4 h-4 mr-2" />
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

                {/* Photos Grid */}
                {controlSamplePhotos.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {controlSamplePhotos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={photo}
                          alt={`Control Sample ${index + 1}`}
                          className="w-full h-40 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                          title="Remove photo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                          Photo {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">No photos uploaded yet</p>
                    <p className="text-xs text-gray-400">Upload control sample photos (max 10MB each)</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}

