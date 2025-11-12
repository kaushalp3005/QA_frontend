'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Save, Plus, X, Calendar, User, AlertTriangle, Search, Sparkles, Upload, Image as ImageIcon } from 'lucide-react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ItemCategoryDropdown from '@/components/ui/ItemCategoryDropdown'
import ItemSubcategoryDropdown from '@/components/ui/ItemSubcategoryDropdown'
import ItemDescriptionDropdown from '@/components/ui/ItemDescriptionDropdown'
import { useCompany } from '@/contexts/CompanyContext'
import { cn } from '@/lib/styles'
import { getComplaints, getComplaintById } from '@/lib/api/complaints'
import { createRCA, generateRCANumber } from '@/lib/api/rca'
import { generateRootCauseDescription } from '@/lib/api/openai'
import { uploadComplaintImages, validateImageFile, deleteComplaintImage } from '@/lib/api/s3Upload'
import { toast } from 'react-hot-toast'

// Cause Detail Options for 5 Why Method
const causeDetailOptions = {
  methods: [
    'Room facility temps. high/low',
    'Lack of policies and procedures',
    'Lack of work instructions',
    'Lack of Training',
    'Improper planning',
    'Other'
  ],
  material: [
    'Room facility temps. high/low',
    'Insufficient stock levels',
    'Poor quality materials',
    'Over aged / Expired materials',
    'Stock Rotation ( FIFO)',
    'Other'
  ],
  manpower: [
    'Room facility temps. high/low',
    'Lack of technical skills',
    'Attitude problems',
    'Lack of team spirit/ownership',
    'Lack of equipment knowledge',
    'Fatigue, stress, sickness',
    'Lack of communication/awareness',
    'Lack of relationship building',
    'Lack of org. objectives/goals',
    'Other'
  ],
  environment: [
    'Room facility temps. high/low',
    'High humidity conditions',
    'High dust conditions',
    'Smoke or haze pollution',
    'Heavy rains/ typhoons/hurricanes',
    'Fire/earthquake',
    'Other'
  ]
}

interface RCAFormData {
  // Basic Information
  rcaNumber: string
  complaintId: string
  dateOfReport: string
  dateInitiated: string
  initiatedBy: string
  itemCategory: string
  itemSubcategory: string
  itemDescription: string
  foodSafetyConcern: 'yes' | 'no'
  recallOfBatch: 'yes' | 'no'
  
  // Incident Details
  summaryOfIncident: string
  dateOfPacking: string
  dateOfComplaintReceive: string
  batchCode: string
  
  // Customer Information
  nameOfCustomer: 'good_life_reliance' | 'curate_reliance' | 'vedaka_amazon' | 'mamanourish' | 'rhine_valley' | 'healing_hands' | 'dr_batra' | 'dmart' | 'big_basket' | 'natures_basket' | 'other'
  nameOfCustomerOther: string
  phoneNoOfCustomer: string
  emailOfCustomer: string
  
  // Injury Information
  customerSustainInjury: 'yes' | 'no'
  descriptionOfInjury: string
  
  // Food Product Details
  productPreparedAtCandor: 'yes' | 'no'
  otherDetailsForInvestigation: string
  
  // Problem Definition
  problemCategory: 'quality' | 'safety' | 'process' | 'equipment' | 'environmental' | 'other'
  severity: 'low' | 'medium' | 'high' | 'critical'
  
  // Investigation Team
  teamLeader: string
  teamMembers: string[]
  
  // Problem Analysis
  immediateActions: string
  problemDescription: string
  whenDiscovered: string
  whereDiscovered: string
  whoDiscovered: string
  
  // Root Cause Analysis (5 Whys Method)
  problemStatement: string
  why1: string
  why1CauseCategory: string
  why1CauseDetails: string
  why1CauseDetailsOther: string
  why1StandardExists: string
  why1Applied: string
  why2: string
  why2CauseCategory: string
  why2CauseDetails: string
  why2CauseDetailsOther: string
  why2StandardExists: string
  why2Applied: string
  why3: string
  why3CauseCategory: string
  why3CauseDetails: string
  why3CauseDetailsOther: string
  why3StandardExists: string
  why3Applied: string
  why4: string
  why4CauseCategory: string
  why4CauseDetails: string
  why4CauseDetailsOther: string
  why4StandardExists: string
  why4Applied: string
  why5: string
  why5CauseCategory: string
  why5CauseDetails: string
  why5CauseDetailsOther: string
  why5StandardExists: string
  why5Applied: string
  
  // Summary and Corrective Actions
  source: string
  possibleCause: string
  rootCauseDescription: string
  
  // Action Plan
  actionPlan: Array<{
    srNo: number
    challenges: string
    actionPoints: string
    responsibility: string
    trafficLightStatus: 'completed' | 'on_schedule' | 'delayed'
    startDate: string
    completionDate: string
  }>
  
  // Approval
  preparedBy: string
  capaPreparedBy: string
  approvedBy: string
  dateApproved: string
  controlSamplePhotos: string[]
}

export default function CreateRCACAPAPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const complaintId = searchParams.get('complaintId')
  const { currentCompany } = useCompany()
  
  const [formData, setFormData] = useState<RCAFormData>({
    // Basic Information
    rcaNumber: `RCA-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
    complaintId: '',
    dateOfReport: new Date().toISOString().split('T')[0],
    dateInitiated: new Date().toISOString().split('T')[0],
    initiatedBy: '',
    itemCategory: '',
    itemSubcategory: '',
    itemDescription: '',
    foodSafetyConcern: 'no',
    recallOfBatch: 'no',
    
    // Incident Details
    summaryOfIncident: '',
    dateOfPacking: '',
    dateOfComplaintReceive: '',
    batchCode: '',
    
    // Customer Information
    nameOfCustomer: 'good_life_reliance',
    nameOfCustomerOther: '',
    phoneNoOfCustomer: '',
    emailOfCustomer: '',
    
    // Injury Information
    customerSustainInjury: 'no',
    descriptionOfInjury: '',
    
    // Food Product Details
    productPreparedAtCandor: 'no',
    otherDetailsForInvestigation: '',
    
    // Problem Definition
    problemCategory: 'quality',
    severity: 'medium',
    
    // Investigation Team
    teamLeader: '',
    teamMembers: [''],
    
    // Problem Analysis
    immediateActions: '',
    problemDescription: '',
    whenDiscovered: '',
    whereDiscovered: '',
    whoDiscovered: '',
    
    // Root Cause Analysis (5 Whys Method)
    problemStatement: '',
    why1: '',
    why1CauseCategory: '',
    why1CauseDetails: '',
    why1CauseDetailsOther: '',
    why1StandardExists: '',
    why1Applied: '',
    why2: '',
    why2CauseCategory: '',
    why2CauseDetails: '',
    why2CauseDetailsOther: '',
    why2StandardExists: '',
    why2Applied: '',
    why3: '',
    why3CauseCategory: '',
    why3CauseDetails: '',
    why3CauseDetailsOther: '',
    why3StandardExists: '',
    why3Applied: '',
    why4: '',
    why4CauseCategory: '',
    why4CauseDetails: '',
    why4CauseDetailsOther: '',
    why4StandardExists: '',
    why4Applied: '',
    why5: '',
    why5CauseCategory: '',
    why5CauseDetails: '',
    why5CauseDetailsOther: '',
    why5StandardExists: '',
    why5Applied: '',
    
    // Summary and Corrective Actions
    source: '',
    possibleCause: '',
    rootCauseDescription: '',
    
    // Action Plan
    actionPlan: [{
      srNo: 1,
      challenges: '',
      actionPoints: '',
      responsibility: '',
      trafficLightStatus: 'on_schedule',
      startDate: '',
      completionDate: ''
    }],
    
    // Approval
    preparedBy: 'Naimat Rizvi',
    capaPreparedBy: 'Naimat Rizvi',
    approvedBy: 'Pooja Parker',
    dateApproved: '',
    controlSamplePhotos: []
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isFetchingComplaint, setIsFetchingComplaint] = useState(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false)
  const [dropdownKey, setDropdownKey] = useState(0) // Force re-render dropdowns

  // Generate RCA Number on component mount
  useEffect(() => {
    const fetchRCANumber = async () => {
      try {
        const { rcaNumber } = await generateRCANumber(currentCompany)
        setFormData(prev => ({ ...prev, rcaNumber }))
      } catch (error) {
        console.error('Error generating RCA number:', error)
        toast.error('Failed to generate RCA number')
      }
    }
    
    fetchRCANumber()
  }, [currentCompany])

  // Function to generate root cause description using AI
  const generateAIRootCause = async () => {
    // Validate that all 5 whys are filled
    if (!formData.problemStatement?.trim()) {
      toast.error('Please enter the Problem Statement first')
      return
    }

    const whyFields = [formData.why1, formData.why2, formData.why3, formData.why4, formData.why5]
    const emptyWhys = whyFields.filter(why => !why?.trim())
    
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

      setFormData(prev => ({ ...prev, rootCauseDescription: rootCause }))
      toast.success('AI-generated root cause description added!')
    } catch (error) {
      console.error('Error generating AI root cause:', error)
      toast.error('Failed to generate AI summary. Please check your API key.')
    } finally {
      setIsGeneratingAI(false)
    }
  }

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

      console.log('Fetched complaints:', response.data)

      const complaintListItem = response.data.find(
        c => c.complaintId.toLowerCase() === formData.complaintId.toLowerCase()
      )

      if (!complaintListItem) {
        toast.error(`Complaint ${formData.complaintId} not found`)
        return
      }

      console.log('Found complaint in list:', complaintListItem)

      // Step 2: Fetch full complaint details using numeric ID
      const complaint = await getComplaintById(complaintListItem.id, currentCompany)
      
      console.log('Fetched full complaint details:', complaint)
      console.log('Item Category:', complaint.itemCategory)
      console.log('Item Subcategory:', complaint.itemSubcategory)
      console.log('Item Description:', complaint.itemDescription)

      // Backend returns uppercase values, so we keep them as-is
      // The dropdowns will match exactly
      const itemCategory = complaint.itemCategory || ''
      const itemSubcategory = complaint.itemSubcategory || ''
      const itemDescription = complaint.itemDescription || ''

      console.log('Setting form data with:', { itemCategory, itemSubcategory, itemDescription })

      // Auto-fill form with complaint details
      setFormData(prev => ({
        ...prev,
        itemCategory: itemCategory,
        itemSubcategory: itemSubcategory,
        itemDescription: itemDescription,
        dateOfPacking: complaint.manufacturingDate || '',
        dateOfComplaintReceive: complaint.receivedDate || '',
        batchCode: complaint.batchCode || '',
        nameOfCustomer: 'other',
        nameOfCustomerOther: complaint.customerName || '',
        summaryOfIncident: complaint.remarks || '',
        problemDescription: complaint.remarks || '',
      }))

      // Force re-render dropdowns to show new values
      setDropdownKey(prev => prev + 1)

      console.log('Dropdown key updated to:', dropdownKey + 1)
      
      toast.success('Complaint details loaded successfully!')
    } catch (error) {
      console.error('Error fetching complaint:', error)
      toast.error('Failed to fetch complaint details')
    } finally {
      setIsFetchingComplaint(false)
    }
  }

  // Fetch complaint data and auto-fill form when complaintId is provided
  useEffect(() => {
    if (complaintId) {
      const fetchComplaintData = async () => {
        try {
          // Fetch from API instead of localStorage
          const complaint = await getComplaintById(complaintId, currentCompany)
          
          if (complaint) {
            console.log('[RCA] Found complaint:', complaint)
            
            // Auto-fill form fields from complaint data
            setFormData(prev => ({
              ...prev,
              complaintId: complaint.complaintId,
              itemCategory: complaint.articles?.[0]?.itemCategory || '',
              itemSubcategory: complaint.articles?.[0]?.itemSubcategory || '',
              itemDescription: complaint.articles?.[0]?.itemDescription || '',
              dateOfComplaintReceive: complaint.receivedDate || '',
              batchCode: complaint.batchCode || '',
              nameOfCustomerOther: complaint.customerName || '',
              problemStatement: complaint.remarks || '',
              problemDescription: complaint.remarks || '',
            }))
          } else {
            console.log('[RCA] Complaint not found:', complaintId)
          }
        } catch (error) {
          console.error('[RCA] Error fetching complaint data:', error)
        }
      }
      
      fetchComplaintData()
    }
  }, [complaintId, currentCompany])

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
    
    // Basic validation
    const newErrors: Record<string, string> = {}
    
    if (!formData.rcaNumber) newErrors.rcaNumber = 'RCA Number is required'
    if (!formData.complaintId) newErrors.complaintId = 'Complaint ID is required'
    if (!formData.summaryOfIncident) newErrors.summaryOfIncident = 'Summary of Incident is required'
    if (!formData.nameOfCustomer) newErrors.nameOfCustomer = 'Customer Name is required'

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      setIsSaving(true)
      console.log('Form validation passed, submitting...', { currentCompany })
      try {
        // Prepare data for API
        const rcaData = {
          rcaNumber: formData.rcaNumber,
          complaintId: formData.complaintId,
          dateOfReport: formData.dateOfReport || undefined,
          itemCategory: formData.itemCategory || undefined,
          itemSubcategory: formData.itemSubcategory || undefined,
          itemDescription: formData.itemDescription || undefined,
          summaryOfIncident: formData.summaryOfIncident,
          dateOfPacking: formData.dateOfPacking || undefined,
          dateOfComplaintReceive: formData.dateOfComplaintReceive || undefined,
          batchCode: formData.batchCode || undefined,
          nameOfCustomer: formData.nameOfCustomer,
          nameOfCustomerOther: formData.nameOfCustomerOther || undefined,
          phoneNoOfCustomer: formData.phoneNoOfCustomer || undefined,
          emailOfCustomer: formData.emailOfCustomer || undefined,
          customerSustainInjury: formData.customerSustainInjury,
          descriptionOfInjury: formData.descriptionOfInjury || undefined,
          productPreparedAtCandor: formData.productPreparedAtCandor,
          otherDetailsForInvestigation: formData.otherDetailsForInvestigation || undefined,
          problemCategory: formData.problemCategory,
          severity: formData.severity,
          immediateActions: formData.immediateActions || undefined,
          problemDescription: formData.problemDescription || undefined,
          whenDiscovered: formData.whenDiscovered || undefined,
          whereDiscovered: formData.whereDiscovered || undefined,
          whoDiscovered: formData.whoDiscovered || undefined,
          problemStatement: formData.problemStatement || undefined,
          why1: formData.why1 || undefined,
          why1CauseCategory: formData.why1CauseCategory || undefined,
          why1CauseDetails: formData.why1CauseDetails || undefined,
          why1CauseDetailsOther: formData.why1CauseDetailsOther || undefined,
          why1StandardExists: formData.why1StandardExists || undefined,
          why1Applied: formData.why1Applied || undefined,
          why2: formData.why2 || undefined,
          why2CauseCategory: formData.why2CauseCategory || undefined,
          why2CauseDetails: formData.why2CauseDetails || undefined,
          why2CauseDetailsOther: formData.why2CauseDetailsOther || undefined,
          why2StandardExists: formData.why2StandardExists || undefined,
          why2Applied: formData.why2Applied || undefined,
          why3: formData.why3 || undefined,
          why3CauseCategory: formData.why3CauseCategory || undefined,
          why3CauseDetails: formData.why3CauseDetails || undefined,
          why3CauseDetailsOther: formData.why3CauseDetailsOther || undefined,
          why3StandardExists: formData.why3StandardExists || undefined,
          why3Applied: formData.why3Applied || undefined,
          why4: formData.why4 || undefined,
          why4CauseCategory: formData.why4CauseCategory || undefined,
          why4CauseDetails: formData.why4CauseDetails || undefined,
          why4CauseDetailsOther: formData.why4CauseDetailsOther || undefined,
          why4StandardExists: formData.why4StandardExists || undefined,
          why4Applied: formData.why4Applied || undefined,
          why5: formData.why5 || undefined,
          why5CauseCategory: formData.why5CauseCategory || undefined,
          why5CauseDetails: formData.why5CauseDetails || undefined,
          why5CauseDetailsOther: formData.why5CauseDetailsOther || undefined,
          why5StandardExists: formData.why5StandardExists || undefined,
          why5Applied: formData.why5Applied || undefined,
          source: formData.source || undefined,
          possibleCause: formData.possibleCause || undefined,
          rootCauseDescription: formData.rootCauseDescription || undefined,
          actionPlan: formData.actionPlan.filter(item => item.challenges || item.actionPoints),
          preparedBy: formData.preparedBy || undefined,
          capaPreparedBy: formData.capaPreparedBy || undefined,
          approvedBy: formData.approvedBy || undefined,
          dateApproved: formData.dateApproved || undefined,
          controlSamplePhotos: formData.controlSamplePhotos.length > 0 ? formData.controlSamplePhotos : undefined,
        }

        console.log('Calling createRCA API...', rcaData)
        const response = await createRCA(rcaData, currentCompany)
        console.log('RCA created successfully:', response)
        toast.success('RCA/CAPA created successfully!')
        router.push('/rca-capa')
      } catch (error: any) {
        console.error('Error creating RCA/CAPA:', error)
        toast.error(error.message || 'Failed to create RCA/CAPA')
      } finally {
        setIsSaving(false)
      }
    } else {
      console.log('Form validation failed:', newErrors)
      toast.error('Please fill in all required fields')
    }
  }



  const addTeamMember = () => {
    setFormData(prev => ({
      ...prev,
      teamMembers: [...prev.teamMembers, '']
    }))
  }

  const removeTeamMember = (index: number) => {
    if (formData.teamMembers.length > 1) {
      setFormData(prev => ({
        ...prev,
        teamMembers: prev.teamMembers.filter((_, i) => i !== index)
      }))
    }
  }

  const updateTeamMember = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.map((member, i) => i === index ? value : member)
    }))
  }

  const addActionPlanItem = () => {
    const newSrNo = formData.actionPlan.length + 1
    setFormData(prev => ({
      ...prev,
      actionPlan: [...prev.actionPlan, {
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
    if (formData.actionPlan.length > 1) {
      setFormData(prev => ({
        ...prev,
        actionPlan: prev.actionPlan.filter((_, i) => i !== index).map((item, i) => ({
          ...item,
          srNo: i + 1
        }))
      }))
    }
  }

  const updateActionPlanItem = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      actionPlan: prev.actionPlan.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
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
              <h1 className="text-2xl font-semibold text-gray-900">Create RCA/CAPA</h1>
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
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={formData.complaintId}
                      onChange={(e) => setFormData(prev => ({ ...prev, complaintId: e.target.value }))}
                      className={cn(
                        "flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                        errors.complaintId ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                      )}
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
                  {errors.complaintId && (
                    <p className="text-sm text-red-600">{errors.complaintId}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Severity Level
                  </label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData(prev => ({ ...prev, severity: e.target.value as any }))}
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
                    value={formData.dateOfReport}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateOfReport: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Item Category *
                  </label>
                  <ItemCategoryDropdown
                    key={`category-${dropdownKey}`}
                    value={formData.itemCategory}
                    onChange={(value) => setFormData(prev => ({ ...prev, itemCategory: value, itemSubcategory: '', itemDescription: '' }))}
                    company={currentCompany}
                    placeholder="Select item category"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Item Subcategory
                  </label>
                  <ItemSubcategoryDropdown
                    key={`subcategory-${dropdownKey}`}
                    value={formData.itemSubcategory}
                    onChange={(value) => setFormData(prev => ({ ...prev, itemSubcategory: value, itemDescription: '' }))}
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
                    key={`description-${dropdownKey}`}
                    value={formData.itemDescription}
                    onChange={(value) => setFormData(prev => ({ ...prev, itemDescription: value }))}
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
                    value={formData.foodSafetyConcern}
                    onChange={(e) => setFormData(prev => ({ ...prev, foodSafetyConcern: e.target.value as 'yes' | 'no' }))}
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
                    value={formData.recallOfBatch}
                    onChange={(e) => setFormData(prev => ({ ...prev, recallOfBatch: e.target.value as 'yes' | 'no' }))}
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
                    value={formData.summaryOfIncident}
                    onChange={(e) => setFormData(prev => ({ ...prev, summaryOfIncident: e.target.value }))}
                    rows={3}
                    className={cn(
                      "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                      errors.summaryOfIncident ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                    )}
                    placeholder="Describe the incident/complaint in detail..."
                  />
                  {errors.summaryOfIncident && <p className="text-sm text-red-600">{errors.summaryOfIncident}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Date of Packing
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfPacking}
                      onChange={(e) => setFormData(prev => ({ ...prev, dateOfPacking: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Date of Complaint Receive
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfComplaintReceive}
                      onChange={(e) => setFormData(prev => ({ ...prev, dateOfComplaintReceive: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Batch Code
                    </label>
                    <input
                      type="text"
                      value={formData.batchCode}
                      onChange={(e) => setFormData(prev => ({ ...prev, batchCode: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., HJ07"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Name of Customer *
                    </label>
                    <select
                      value={formData.nameOfCustomer}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        nameOfCustomer: e.target.value as any,
                        nameOfCustomerOther: e.target.value !== 'other' ? '' : prev.nameOfCustomerOther
                      }))}
                      className={cn(
                        "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                        errors.nameOfCustomer ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                      )}
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
                    {errors.nameOfCustomer && <p className="text-sm text-red-600">{errors.nameOfCustomer}</p>}

                    {/* Conditional Other Customer Name Input */}
                    {formData.nameOfCustomer === 'other' && (
                      <div className="mt-2">
                        <input
                          type="text"
                          value={formData.nameOfCustomerOther}
                          onChange={(e) => setFormData(prev => ({ ...prev, nameOfCustomerOther: e.target.value }))}
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
                      value={formData.phoneNoOfCustomer}
                      onChange={(e) => setFormData(prev => ({ ...prev, phoneNoOfCustomer: e.target.value }))}
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
                      value={formData.emailOfCustomer}
                      onChange={(e) => setFormData(prev => ({ ...prev, emailOfCustomer: e.target.value }))}
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
                      value={formData.customerSustainInjury}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerSustainInjury: e.target.value as 'yes' | 'no' }))}
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
                        value={formData.descriptionOfInjury}
                        onChange={(e) => setFormData(prev => ({ ...prev, descriptionOfInjury: e.target.value }))}
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
                    value={formData.productPreparedAtCandor}
                    onChange={(e) => setFormData(prev => ({ ...prev, productPreparedAtCandor: e.target.value as 'yes' | 'no' }))}
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
                    value={formData.otherDetailsForInvestigation}
                    onChange={(e) => setFormData(prev => ({ ...prev, otherDetailsForInvestigation: e.target.value }))}
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
                    value={formData.problemStatement}
                    onChange={(e) => setFormData(prev => ({ ...prev, problemStatement: e.target.value }))}
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
                        value={formData[`why${num}` as keyof RCAFormData] as string}
                        onChange={(e) => setFormData(prev => ({ ...prev, [`why${num}`]: e.target.value }))}
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
                          value={formData[`why${num}CauseCategory` as keyof RCAFormData] as string}
                          onChange={(e) => setFormData(prev => ({ ...prev, [`why${num}CauseCategory`]: e.target.value }))}
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
                          value={formData[`why${num}CauseDetails` as keyof RCAFormData] as string}
                          onChange={(e) => setFormData(prev => ({ ...prev, [`why${num}CauseDetails`]: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          disabled={!formData[`why${num}CauseCategory` as keyof RCAFormData]}
                        >
                          <option value="">
                            {formData[`why${num}CauseCategory` as keyof RCAFormData] 
                              ? 'Select cause detail' 
                              : 'First select a category'}
                          </option>
                          {formData[`why${num}CauseCategory` as keyof RCAFormData] && 
                           causeDetailOptions[formData[`why${num}CauseCategory` as keyof RCAFormData] as keyof typeof causeDetailOptions]?.map((detail) => (
                            <option key={detail} value={detail}>
                              {detail}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Show input field if "Other" is selected */}
                      {formData[`why${num}CauseDetails` as keyof RCAFormData] === 'Other' && (
                        <div className="space-y-2 md:col-span-2 lg:col-span-4">
                          <label className="block text-sm font-medium text-gray-700">
                            Specify Other Cause Details
                          </label>
                          <input
                            type="text"
                            value={formData[`why${num}CauseDetailsOther` as keyof RCAFormData] as string}
                            onChange={(e) => setFormData(prev => ({ ...prev, [`why${num}CauseDetailsOther`]: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Please specify the other cause details..."
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Standard Exists?
                        </label>
                        <select
                          value={formData[`why${num}StandardExists` as keyof RCAFormData] as string}
                          onChange={(e) => setFormData(prev => ({ ...prev, [`why${num}StandardExists`]: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Applied?
                        </label>
                        <select
                          value={formData[`why${num}Applied` as keyof RCAFormData] as string}
                          onChange={(e) => setFormData(prev => ({ ...prev, [`why${num}Applied`]: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary and Corrective Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="bg-green-50 px-6 py-4 border-b border-green-200">
              <h2 className="text-xl font-semibold text-green-900">5. Summary </h2>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Source *
                  </label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
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
                      )}
                    >
                      <Sparkles className={cn("h-4 w-4 mr-2", isGeneratingAI && "animate-spin")} />
                      {isGeneratingAI ? 'Generating...' : 'Generate with AI'}
                    </button>
                  </div>
                  <textarea
                    value={formData.rootCauseDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, rootCauseDescription: e.target.value }))}
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
                <h2 className="text-xl font-semibold text-blue-900">6. Corrective Actions</h2>
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
                {formData.actionPlan.map((item, index) => (
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
                          value={item.challenges}
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
                          value={item.actionPoints}
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
                          value={item.responsibility}
                          onChange={(e) => updateActionPlanItem(index, 'responsibility', e.target.value)}
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-vertical focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="Responsible person/department and contact details..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Status
                        </label>
                        <select
                          value={item.trafficLightStatus}
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
                          value={item.startDate}
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
                          value={item.completionDate}
                          onChange={(e) => updateActionPlanItem(index, 'completionDate', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {formData.actionPlan.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <Plus className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-lg font-medium">No action items added yet</p>
                    <p className="text-sm">Click "Add Action Item" to create your first action plan entry</p>
                  </div>
                )}
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
                {formData.actionPlan.map((item, index) => (
                  <div key={index} className="bg-purple-50 rounded-lg border border-purple-200 p-6 relative">
                    <div className="absolute top-4 right-4 flex items-center space-x-2">
                      <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                        Preventive Action #{item.srNo}
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
                          value={item.challenges}
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
                          value={item.actionPoints}
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
                          value={item.responsibility}
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
                          value={item.trafficLightStatus}
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
                          value={item.startDate}
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
                          value={item.completionDate}
                          onChange={(e) => updateActionPlanItem(index, 'completionDate', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {formData.actionPlan.length === 0 && (
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

          {/* Approval Section */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">8. Approval & Verification</h2>
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
                      onChange={(e) => setFormData(prev => ({ ...prev, preparedBy: e.target.value }))}
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
                      onChange={(e) => setFormData(prev => ({ ...prev, capaPreparedBy: e.target.value }))}
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
                      onChange={(e) => setFormData(prev => ({ ...prev, approvedBy: e.target.value }))}
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
                      onChange={(e) => setFormData(prev => ({ ...prev, dateApproved: e.target.value }))}
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

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <Link
              href="/rca-capa"
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className={cn(
                "inline-flex items-center px-4 py-2 text-white text-sm font-medium rounded-md transition-colors",
                isSaving 
                  ? "bg-gray-400 cursor-not-allowed" 
                  : "bg-blue-600 hover:bg-blue-700"
              )}
            >
              <Save className={cn("h-4 w-4 mr-2", isSaving && "animate-spin")} />
              {isSaving ? 'Creating...' : 'Create RCA/CAPA'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}