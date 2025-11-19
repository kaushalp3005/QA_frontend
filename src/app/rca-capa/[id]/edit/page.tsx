'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, Loader2, Plus, X, Upload, ImageIcon, Calendar, User, AlertTriangle, Search, Sparkles } from 'lucide-react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ItemSubcategoryDropdown from '@/components/ui/ItemSubcategoryDropdown'
import ItemDescriptionDropdown from '@/components/ui/ItemDescriptionDropdown'
import { useCompany } from '@/contexts/CompanyContext'
import { getRCAById, updateRCA, RCAData } from '@/lib/api/rca'
import { generateRootCauseDescription } from '@/lib/api/openai'
import { toast } from 'react-hot-toast'
import { uploadComplaintImages, validateImageFile, deleteComplaintImage } from '@/lib/api/s3Upload'
import { cn } from '@/lib/styles'

// Cause Detail Options for 5 Whys
const causeDetailOptions: Record<string, string[]> = {
  methods: ['Room facility temps. high/low', 'Lack of policies and procedures', 'Lack of work instructions', 'Lack of Training', 'Improper planning', 'Other'],
  material: ['Room facility temps. high/low', 'Insufficient stock levels', 'Poor quality materials', 'Over aged / Expired materials', 'Stock Rotation ( FIFO)', 'Other'],
  manpower: ['Room facility temps. high/low', 'Lack of technical skills', 'Attitude problems', 'Lack of team spirit/ownership', 'Lack of equipment knowledge', 'Fatigue, stress, sickness', 'Lack of communication/awareness', 'Lack of relationship building', 'Lack of org. objectives/goals', 'Other'],
  environment: ['Room facility temps. high/low', 'High humidity conditions', 'High dust conditions', 'Smoke or haze pollution', 'Heavy rains/ typhoons/hurricanes', 'Fire/earthquake', 'Other']
}

export default function RCAEditPage() {
  const params = useParams()
  const router = useRouter()
  const { currentCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<any>({})
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false)
  const [controlSamplePhotos, setControlSamplePhotos] = useState<string[]>([])
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)

  const rcaId = params.id as string

  useEffect(() => {
    if (rcaId) {
      fetchRCAData()
    }
  }, [rcaId, currentCompany])

  const fetchRCAData = async () => {
    try {
      setLoading(true)
      const data: any = await getRCAById(parseInt(rcaId), currentCompany)
      console.log('RCA Data for Edit:', data)
      
      // Convert snake_case to camelCase for form
      const formattedData = {
        rcaNumber: data.rca_number,
        complaintId: data.complaint_id,
        dateOfReport: data.date_of_report,
        itemCategory: data.item_category,
        itemSubcategory: data.item_subcategory,
        itemDescription: data.item_description,
        summaryOfIncident: data.summary_of_incident,
        dateOfPacking: data.date_of_packing,
        batchCode: data.batch_code,
        nameOfCustomer: data.name_of_customer,
        nameOfCustomerOther: data.name_of_customer_other,
        phoneNoOfCustomer: data.phone_no_of_customer,
        emailOfCustomer: data.email_of_customer,
        customerSustainInjury: data.customer_sustain_injury,
        descriptionOfInjury: data.description_of_injury,
        productPreparedAtCandor: data.product_prepared_at_candor,
        otherDetailsForInvestigation: data.other_details_for_investigation,
        problemCategory: data.problem_category,
        severity: data.severity,
        immediateActions: data.immediate_actions,
        problemDescription: data.problem_description,
        whenDiscovered: data.when_discovered,
        whereDiscovered: data.where_discovered,
        whoDiscovered: data.who_discovered,
        problemStatement: data.problem_statement,
        why1: data.why1,
        why1CauseCategory: data.why1_cause_category,
        why1CauseDetails: data.why1_cause_details,
        why1CauseDetailsOther: data.why1_cause_details_other,
        why1StandardExists: data.why1_standard_exists,
        why1Applied: data.why1_applied,
        why2: data.why2,
        why2CauseCategory: data.why2_cause_category,
        why2CauseDetails: data.why2_cause_details,
        why2CauseDetailsOther: data.why2_cause_details_other,
        why2StandardExists: data.why2_standard_exists,
        why2Applied: data.why2_applied,
        why3: data.why3,
        why3CauseCategory: data.why3_cause_category,
        why3CauseDetails: data.why3_cause_details,
        why3CauseDetailsOther: data.why3_cause_details_other,
        why3StandardExists: data.why3_standard_exists,
        why3Applied: data.why3_applied,
        why4: data.why4,
        why4CauseCategory: data.why4_cause_category,
        why4CauseDetails: data.why4_cause_details,
        why4CauseDetailsOther: data.why4_cause_details_other,
        why4StandardExists: data.why4_standard_exists,
        why4Applied: data.why4_applied,
        why5: data.why5,
        why5CauseCategory: data.why5_cause_category,
        why5CauseDetails: data.why5_cause_details,
        why5CauseDetailsOther: data.why5_cause_details_other,
        why5StandardExists: data.why5_standard_exists,
        why5Applied: data.why5_applied,
        source: data.source,
        possibleCause: data.possible_cause,
        rootCauseDescription: data.root_cause_description,
        actionPlan: data.action_plan ? (typeof data.action_plan === 'string' ? JSON.parse(data.action_plan) : data.action_plan) : [],
        preparedBy: data.prepared_by || 'Naimat Rizvi',
        capaPrearedBy: data.capa_prepared_by || 'Naimat Rizvi',
        approvedBy: data.approved_by || 'Pooja Parker',
        dateApproved: data.date_approved,
      }
      
      // Load control sample photos if available
      console.log('Raw control_sample_photos from API:', data.control_sample_photos)
      console.log('Type:', typeof data.control_sample_photos)
      
      if (data.control_sample_photos) {
        const photos = typeof data.control_sample_photos === 'string' 
          ? JSON.parse(data.control_sample_photos) 
          : data.control_sample_photos
        console.log('Parsed photos:', photos)
        setControlSamplePhotos(Array.isArray(photos) ? photos : [])
      } else {
        console.log('No control_sample_photos found in response')
      }
      
      setFormData(formattedData)
    } catch (error) {
      console.error('Error fetching RCA:', error)
      toast.error('Failed to load RCA/CAPA record')
      router.push('/rca-capa')
    } finally {
      setLoading(false)
    }
  }

  // Function to generate root cause description using AI
  const generateAIRootCause = async () => {
    // Validate that all 5 whys are filled
    if (!formData.problemStatement?.trim()) {
      toast.error('Please enter the Problem Statement first')
      return
    }

    const whyFields = [formData.why1, formData.why2, formData.why3, formData.why4, formData.why5]
    const emptyWhys = whyFields.filter((why: string) => !why?.trim())
    
    if (emptyWhys.length > 0) {
      toast.error('Please fill all 5 Whys before generating AI summary')
      return
    }

    setIsGeneratingAI(true)
    try {
      const rootCause = await generateRootCauseDescription({
        problemStatement: formData.problemStatement,
        why1: formData.why1,
        why2: formData.why2,
        why3: formData.why3,
        why4: formData.why4,
        why5: formData.why5,
        why1CauseCategory: formData.why1CauseCategory,
        why2CauseCategory: formData.why2CauseCategory,
        why3CauseCategory: formData.why3CauseCategory,
        why4CauseCategory: formData.why4CauseCategory,
        why5CauseCategory: formData.why5CauseCategory,
      })

      setFormData((prev: any) => ({ ...prev, rootCauseDescription: rootCause }))
      toast.success('AI-generated root cause description added!')
    } catch (error) {
      console.error('Error generating AI root cause:', error)
      toast.error('Failed to generate AI summary. Please check your API key.')
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setSubmitting(true)
      
      // Validation
      if (!formData.rcaNumber || !formData.complaintId) {
        toast.error('RCA Number and Complaint ID are required')
        return
      }

      console.log('Updating RCA:', formData)
      console.log('Control Sample Photos:', controlSamplePhotos)
      
      // Include control sample photos in the update
      const updateData = {
        ...formData,
        controlSamplePhotos: controlSamplePhotos.length > 0 ? controlSamplePhotos : undefined
      }
      
      console.log('Final Update Data:', updateData)
      
      await updateRCA(parseInt(rcaId), updateData as RCAData, currentCompany)
      toast.success('RCA/CAPA updated successfully!')
      router.push(`/rca-capa/${rcaId}`)
    } catch (error: any) {
      console.error('Error updating RCA:', error)
      toast.error(error.message || 'Failed to update RCA/CAPA')
    } finally {
      setSubmitting(false)
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
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

  // Action Plan functions
  const addActionPlanItem = () => {
    const newSrNo = (formData.actionPlan?.length || 0) + 1
    setFormData((prev: any) => ({
      ...prev,
      actionPlan: [...(prev.actionPlan || []), {
        srNo: newSrNo,
        challenges: '',
        actionPoints: '',
        responsibility: '',
        trafficLightStatus: 'on_schedule',
        startDate: '',
        completionDate: ''
      }]
    }))
  }

  const removeActionPlanItem = (index: number) => {
    if (formData.actionPlan && formData.actionPlan.length > 1) {
      setFormData((prev: any) => ({
        ...prev,
        actionPlan: prev.actionPlan.filter((_: any, i: number) => i !== index).map((item: any, i: number) => ({
          ...item,
          srNo: i + 1
        }))
      }))
    }
  }

  const updateActionPlanItem = (index: number, field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      actionPlan: prev.actionPlan.map((item: any, i: number) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link 
              href="/rca-capa"
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Edit RCA/CAPA</h1>
              <p className="text-gray-600 mt-1">Root Cause Analysis & Corrective Action Preventive Action</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">1. Basic Information</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Related Complaint ID *
                  </label>
                  <input
                    type="text"
                    value={formData.complaintId || ''}
                    onChange={(e) => handleChange('complaintId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., CCNFS-2025-10-001"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Severity Level
                  </label>
                  <select
                    value={formData.severity || 'medium'}
                    onChange={(e) => handleChange('severity', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Date of Report *
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfReport || ''}
                    onChange={(e) => handleChange('dateOfReport', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Item Category *
                  </label>
                  <ItemCategoryDropdown
                    value={formData.itemCategory || ''}
                    onChange={(value) => {
                      handleChange('itemCategory', value)
                      handleChange('itemSubcategory', '')
                      handleChange('itemDescription', '')
                    }}
                    company={currentCompany}
                    placeholder="Select item category"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Item Subcategory
                  </label>
                  <ItemSubcategoryDropdown
                    value={formData.itemSubcategory || ''}
                    onChange={(value) => {
                      handleChange('itemSubcategory', value)
                      handleChange('itemDescription', '')
                    }}
                    company={currentCompany}
                    category={formData.itemCategory}
                    placeholder="Select item subcategory"
                    disabled={!formData.itemCategory}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Item Description
                  </label>
                  <ItemDescriptionDropdown
                    value={formData.itemDescription || ''}
                    onChange={(value) => handleChange('itemDescription', value)}
                    company={currentCompany}
                    category={formData.itemCategory}
                    subcategory={formData.itemSubcategory}
                    placeholder="Select item description"
                    disabled={!formData.itemSubcategory}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Food Safety Concern
                  </label>
                  <select
                    value={formData.foodSafetyConcern || 'no'}
                    onChange={(e) => handleChange('foodSafetyConcern', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Recall of the Batch
                  </label>
                  <select
                    value={formData.recallOfBatch || 'no'}
                    onChange={(e) => handleChange('recallOfBatch', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Incident & Customer Details */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="bg-red-50 px-6 py-4 border-b border-red-200">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h2 className="text-xl font-semibold text-red-900">2. Incident & Customer Details</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Summary Of Incident (What Happened)/Nature of Complaint *
                  </label>
                  <textarea
                    value={formData.summaryOfIncident || ''}
                    onChange={(e) => handleChange('summaryOfIncident', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe the incident/complaint in detail..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Date of Packing
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfPacking || ''}
                      onChange={(e) => handleChange('dateOfPacking', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Date of Complaint Receive
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfComplaintReceive || ''}
                      onChange={(e) => handleChange('dateOfComplaintReceive', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Batch Code
                    </label>
                    <input
                      type="text"
                      value={formData.batchCode || ''}
                      onChange={(e) => handleChange('batchCode', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., HJ07"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Name of Customer *
                    </label>
                    <select
                      value={formData.nameOfCustomer || ''}
                      onChange={(e) => {
                        handleChange('nameOfCustomer', e.target.value)
                        if (e.target.value !== 'other') {
                          handleChange('nameOfCustomerOther', '')
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="good_life_reliance">Good Life- Reliance</option>
                      <option value="curate_reliance">Curate- Reliance</option>
                      <option value="vedaka_amazon">Vedaka- Amazon</option>
                      <option value="mamanourish">Mamanourish</option>
                      <option value="rhine_valley">Rhine valley</option>
                      <option value="healing_hands">Healing hands</option>
                      <option value="dr_batra">Dr Batra</option>
                      <option value="dmart">Dmart</option>
                      <option value="big_basket">Big Basket</option>
                      <option value="natures_basket">Nature's Basket</option>
                      <option value="other">Other</option>
                    </select>

                    {/* Conditional Other Customer Name Input */}
                    {formData.nameOfCustomer === 'other' && (
                      <div className="mt-2">
                        <input
                          type="text"
                          value={formData.nameOfCustomerOther || ''}
                          onChange={(e) => handleChange('nameOfCustomerOther', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter customer name"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Phone no of Customer
                    </label>
                    <input
                      type="tel"
                      value={formData.phoneNoOfCustomer || ''}
                      onChange={(e) => handleChange('phoneNoOfCustomer', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Phone number"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      e-mail id of Customer/Retailer
                    </label>
                    <input
                      type="email"
                      value={formData.emailOfCustomer || ''}
                      onChange={(e) => handleChange('emailOfCustomer', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="customer@email.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Did the Customer sustain any injury?
                    </label>
                    <select
                      value={formData.customerSustainInjury || 'no'}
                      onChange={(e) => handleChange('customerSustainInjury', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="no">NO</option>
                      <option value="yes">YES</option>
                    </select>
                  </div>

                  {formData.customerSustainInjury === 'yes' && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Description of the Injury if any
                      </label>
                      <textarea
                        value={formData.descriptionOfInjury || ''}
                        onChange={(e) => handleChange('descriptionOfInjury', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Describe the injury..."
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Food Product Details */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="bg-yellow-50 px-6 py-4 border-b border-yellow-200">
              <h2 className="text-xl font-semibold text-yellow-900">3. Food Product Details</h2>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Was the product prepared at the Candor Foods?
                  </label>
                  <select
                    value={formData.productPreparedAtCandor || 'no'}
                    onChange={(e) => handleChange('productPreparedAtCandor', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="no">NO</option>
                    <option value="yes">YES</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Any other details that would help the investigation
                  </label>
                  <textarea
                    value={formData.otherDetailsForInvestigation || ''}
                    onChange={(e) => handleChange('otherDetailsForInvestigation', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Provide any additional details that may help with the investigation..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Root Cause Analysis (5 Whys) */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="bg-purple-50 px-6 py-4 border-b border-purple-200">
              <h2 className="text-xl font-semibold text-purple-900">4. Root Cause Analysis (5 Whys Method)</h2>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {/* Single Problem Statement */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="block text-sm font-semibold text-blue-800 mb-3">
                    Problem Statement (for entire 5 Whys analysis)
                  </label>
                  <textarea
                    value={formData.problemStatement || ''}
                    onChange={(e) => handleChange('problemStatement', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-blue-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    placeholder="Define the core problem that will be analyzed through the 5 Whys methodology..."
                  />
                </div>

                {/* 5 Whys Analysis */}
                {[1, 2, 3, 4, 5].map((num) => (
                  <div key={num} className="border border-gray-200 rounded-lg p-4 space-y-4">
                    <h3 className="font-medium text-gray-900 text-lg">Why #{num}</h3>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Why #{num}: Why did this happen?
                      </label>
                      <textarea
                        value={formData[`why${num}`] || ''}
                        onChange={(e) => handleChange(`why${num}`, e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={`Answer to why #${num}...`}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Cause Category
                        </label>
                        <select
                          value={formData[`why${num}CauseCategory`] || ''}
                          onChange={(e) => handleChange(`why${num}CauseCategory`, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select category</option>
                          <option value="methods">Methods</option>
                          <option value="material">Material</option>
                          <option value="manpower">Manpower</option>
                          <option value="environment">Environment</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Cause Details
                        </label>
                        <select
                          value={formData[`why${num}CauseDetails`] || ''}
                          onChange={(e) => handleChange(`why${num}CauseDetails`, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          disabled={!formData[`why${num}CauseCategory`]}
                        >
                          <option value="">Select details</option>
                          {formData[`why${num}CauseCategory`] && 
                            causeDetailOptions[formData[`why${num}CauseCategory`]]?.map((option: string) => (
                              <option key={option} value={option}>{option}</option>
                            ))
                          }
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Standard Exists?
                        </label>
                        <select
                          value={formData[`why${num}StandardExists`] || ''}
                          onChange={(e) => handleChange(`why${num}StandardExists`, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Was it Applied?
                        </label>
                        <select
                          value={formData[`why${num}Applied`] || ''}
                          onChange={(e) => handleChange(`why${num}Applied`, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>
                    </div>

                    {/* Conditional Other Input */}
                    {formData[`why${num}CauseDetails`] === 'Other' && (
                      <div className="space-y-2 mt-4">
                        <label className="block text-sm font-medium text-gray-700">
                          Other Cause Details (Please Specify)
                        </label>
                        <input
                          type="text"
                          value={formData[`why${num}CauseDetailsOther`] || ''}
                          onChange={(e) => handleChange(`why${num}CauseDetailsOther`, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Specify other cause details..."
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 5: Root Cause Summary */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="bg-green-50 px-6 py-4 border-b border-green-200">
              <h2 className="text-xl font-semibold text-green-900">5. Root Cause Summary</h2>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Source *
                  </label>
                  <select
                    value={formData.source || ''}
                    onChange={(e) => handleChange('source', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select source category</option>
                    <option value="Material">Material</option>
                    <option value="Method">Method</option>
                    <option value="Machine">Machine</option>
                    <option value="Personnel">Personnel</option>
                    <option value="Measurements">Measurements</option>
                    <option value="Environment">Environment</option>
                  </select>
                </div>
                

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Root Cause Description resulting from the "5 Whys" analysis
                    </label>
                    <button
                      type="button"
                      onClick={generateAIRootCause}
                      disabled={isGeneratingAI}
                      className={cn(
                        "inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
                        isGeneratingAI
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-md hover:shadow-lg"
    )} >
                      <Sparkles className={cn("h-4 w-4 mr-2", isGeneratingAI && "animate-spin")} />
                      {isGeneratingAI ? 'Generating...' : 'Generate with AI'}
                    </button>
                  </div>
                  <textarea
                    value={formData.rootCauseDescription || ''}
                    onChange={(e) => handleChange('rootCauseDescription', e.target.value)}
                    rows={4}
 className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Provide the final root cause description based on the comprehensive 5 Whys analysis conducted above, or click 'Generate with AI' to auto-generate..."
                  />
                </div>
              </div>
            </div>
          </div>

        {/* Action Plan */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="bg-blue-50 px-6 py-4 border-b border-blue-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-blue-900">Corrective Actions</h2>
              <button
                type="button"
                onClick={addActionPlanItem}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Action Item
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {(!formData.actionPlan || formData.actionPlan.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  No action items added yet. Click "Add Action Item" to get started.
                </div>
              )}
              {formData.actionPlan && formData.actionPlan.map((item: any, index: number) => (
                <div key={index} className="bg-gray-50 rounded-lg border border-gray-200 p-6 relative">
                  <div className="absolute top-4 right-4 flex items-center space-x-2">
                    <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      Action Item #{item.srNo}
                    </div>
                    {formData.actionPlan.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeActionPlanItem(index)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Challenges / GAPS
                      </label>
                      <textarea
                        value={item.challenges || ''}
                        onChange={(e) => updateActionPlanItem(index, 'challenges', e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-vertical focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="Describe the specific challenges, gaps, or issues that need to be addressed..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Corrective actions
                      </label>
                      <textarea
                        value={item.actionPoints || ''}
                        onChange={(e) => updateActionPlanItem(index, 'actionPoints', e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-vertical focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="Detail the specific actions and improvements to be implemented..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Responsibility
                      </label>
                      <textarea
                        value={item.responsibility || ''}
                        onChange={(e) => updateActionPlanItem(index, 'responsibility', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-vertical focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="Responsible person/department..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Status
                      </label>
                      <select
                        value={item.trafficLightStatus || 'on_schedule'}
                        onChange={(e) => updateActionPlanItem(index, 'trafficLightStatus', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        <option value="completed">🟢 Completed</option>
                        <option value="on_schedule">🟡 On Schedule</option>
                        <option value="delayed">🔴 Delayed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={item.startDate || ''}
                        onChange={(e) => updateActionPlanItem(index, 'startDate', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Completion Date
                      </label>
                      <input
                        type="date"
                        value={item.completionDate || ''}
                        onChange={(e) => updateActionPlanItem(index, 'completionDate', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        

        {/* Preventive Actions */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="bg-purple-50 px-6 py-4 border-b border-purple-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-purple-900">7. Preventive Actions</h2>
              <button
                type="button"
                onClick={addActionPlanItem}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Preventive Action
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {formData.actionPlan && formData.actionPlan.map((item, index) => (
                <div key={index} className="bg-purple-50 rounded-lg border border-purple-200 p-6 relative">
                  <div className="absolute top-4 right-4 flex items-center space-x-2">
                    <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                      Preventive Action #{item.srNo || index + 1}
                    </div>
                    {formData.actionPlan.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeActionPlanItem(index)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Future Challenges / Risk Areas
                      </label>
                      <textarea
                        value={item.challenges || ''}
                        onChange={(e) => updateActionPlanItem(index, 'challenges', e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-vertical focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                        placeholder="Identify potential future risks, challenges, or areas where similar issues might occur..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Preventive actions
                      </label>
                      <textarea
                        value={item.actionPoints || ''}
                        onChange={(e) => updateActionPlanItem(index, 'actionPoints', e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-vertical focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                        placeholder="Detail the preventive measures to avoid recurrence of similar issues..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Responsibility
                      </label>
                      <textarea
                        value={item.responsibility || ''}
                        onChange={(e) => updateActionPlanItem(index, 'responsibility', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-vertical focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                        placeholder="Responsible person/department and contact details..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Status
                      </label>
                      <select
                        value={item.trafficLightStatus || 'on_schedule'}
                        onChange={(e) => updateActionPlanItem(index, 'trafficLightStatus', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                      >
                        <option value="completed">🟢 Completed</option>
                        <option value="on_schedule">🟡 On Schedule</option>
                        <option value="delayed">🔴 Delayed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={item.startDate || ''}
                        onChange={(e) => updateActionPlanItem(index, 'startDate', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Completion Date
                      </label>
                      <input
                        type="date"
                        value={item.completionDate || ''}
                        onChange={(e) => updateActionPlanItem(index, 'completionDate', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {(!formData.actionPlan || formData.actionPlan.length === 0) && (
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
            <h2 className="text-xl font-semibold text-gray-900">8. Approval & Verification</h2>
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
                  onChange={(e) => handleChange('preparedBy', e.target.value)}
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
                  onChange={(e) => handleChange('capaPrearedBy', e.target.value)}
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
                  onChange={(e) => handleChange('approvedBy', e.target.value)}
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
                  onChange={(e) => handleChange('dateApproved', e.target.value)}
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

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pb-6">
          <Link
            href={`/rca-capa/${rcaId}`}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
    </DashboardLayout>
  )
}
