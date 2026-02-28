'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ComplaintCreateForm from '@/components/complaint/ComplaintCreateForm'
import { ArrowLeft, Loader2, CheckCircle } from 'lucide-react'
import { getComplaintById, updateComplaint, type ComplaintResponse } from '@/lib/api/complaints'
import { toast } from 'react-hot-toast'
import { useCompany } from '@/contexts/CompanyContext'
import { usePermissions } from '@/hooks/usePermissions'

export default function EditComplaintPage() {
  const params = useParams()
  const router = useRouter()
  const { currentCompany } = useCompany()
  const { canEdit, permissions } = usePermissions()
  const complaintId = params.id as string

  const [complaint, setComplaint] = useState<ComplaintResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [updatedComplaintId, setUpdatedComplaintId] = useState<string | null>(null)

  useEffect(() => {
    // Wait for permissions to load
    if (Object.keys(permissions).length === 0) {
      return
    }

    // Check permission
    if (!canEdit('complaints')) {
      toast.error('You do not have permission to edit complaints')
      router.push('/complaints')
      return
    }

    if (complaintId) {
      // Load complaint data from API
      const loadComplaint = async () => {
        try {
          const existingComplaint = await getComplaintById(complaintId, currentCompany)
          console.log('Loaded complaint:', existingComplaint)
          console.log('Customer name:', existingComplaint.customerName)
          console.log('Proof Images:', existingComplaint.proofImages)
          setComplaint(existingComplaint)
        } catch (error) {
          console.error('Error loading complaint:', error)
          toast.error('Failed to load complaint')
          router.push('/complaints')
        } finally {
          setIsLoading(false)
        }
      }
      
      loadComplaint()
    }
  }, [complaintId, router, currentCompany, permissions])

  // Function to refresh complaint data (called after image deletion)
  const handleImageDeleted = async (): Promise<string[]> => {
    console.log('🔄 Refreshing complaint data after image deletion...')
    try {
      // Add a small delay to ensure backend transaction is fully committed
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const updatedComplaint = await getComplaintById(complaintId, currentCompany)
      console.log('✅ Complaint data refreshed:', updatedComplaint)
      console.log('✅ New proofImages:', updatedComplaint.proofImages)
      setComplaint(updatedComplaint)
      return Array.isArray(updatedComplaint.proofImages) ? updatedComplaint.proofImages : []
    } catch (error) {
      console.error('❌ Error refreshing complaint:', error)
      toast.error('Failed to refresh complaint data')
      return []
    }
  }

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

  // Don't render if no permission
  if (!canEdit('complaints')) {
    return null
  }

  const handleSubmit = async (data: any) => {
    console.log('💾 COMPLAINT SAVE STARTED')
    console.log('  Form data received:', data)
    setIsSaving(true)
    
    try {
      if (!complaint) {
        toast.error('Complaint data not loaded')
        return
      }
      console.log('  Existing complaint:', complaint)

      // Prepare complaint data for API
      const complaintData = {
        id: complaint.id,
        complaintId: complaint.complaintId,
        company: currentCompany,
        customerName: data.customerName === 'other' ? data.customerNameOther : data.customerName,
        customerEmail: data.customerEmail || complaint.customerEmail || '',
        customerAddress: data.customerAddress || complaint.customerAddress || '',
        receivedDate: data.complaintReceiveDate,
        manufacturingDate: data.manufacturingDate || data.complaintReceiveDate,
        itemCategory: data.articles?.[0]?.category || complaint.itemCategory,
        itemSubcategory: data.articles?.[0]?.subcategory || complaint.itemSubcategory,
        itemDescription: data.articles?.[0]?.itemDescription || complaint.itemDescription,
        batchCode: data.batchCode || complaint.batchCode,
        quantityRejected: data.quantityRejected || complaint.quantityRejected,
        quantityApproved: data.quantityApproved || complaint.quantityApproved,
        uom: data.articles?.[0]?.uom || complaint.uom,
        complaintNature: data.complaintCategory || complaint.complaintNature,
        complaintCategory: data.complaintCategory || complaint.complaintCategory || '',
        complaintSubcategory: data.complaintSubcategory || complaint.complaintSubcategory || '',
        otherComplaintNature: data.complaintSubcategory || '',
        problemStatement: data.problemStatement || complaint.problemStatement || '',
        qaAssessment: data.qaAssessment || complaint.qaAssessment,
        justifiedStatus: data.justifiedStatus || complaint.justifiedStatus,
        communicationMethod: data.communicationMethod || complaint.communicationMethod || '',
        measuresToResolve: data.measuresToResolve || complaint.measuresToResolve,
        remarks: data.remarks || '',
        // Remove duplicate images before sending to backend
        proofImages: (data.proofImages ? [...new Set(data.proofImages)] : (complaint.proofImages ? [...new Set(complaint.proofImages)] : [])) as string[],
        articles: (data.articles || []).map((article: any, index: number) => ({
          id: complaint.articles[index]?.id,
          itemCategory: article.category,
          itemSubcategory: article.subcategory,
          itemDescription: article.itemDescription,
          quantity: article.quantity || 0,
          uom: article.uom || 'pieces',
          defectDescription: article.defectDescription || ''
        })),
        updatedBy: 'qa_user_1' // TODO: Get from auth context
      }

      console.log('🔍 Submitting complaint update with proofImages:', complaintData.proofImages)
      console.log('🔍 Total images being sent:', complaintData.proofImages?.length)
      console.log('🔍 Original count from form:', data.proofImages?.length)
      console.log('🔍 Full complaint data being sent:', complaintData)

      // Update complaint using API
      console.log('📤 Calling API to update complaint...')
      const updatedComplaint = await updateComplaint(complaint.id, complaintData)
      console.log('✅ API response received:', updatedComplaint)
      setUpdatedComplaintId(updatedComplaint.complaintId)
      toast.success(`Complaint ${updatedComplaint.complaintId} updated successfully!`)
      
      // Redirect after a short delay
      setTimeout(() => router.push('/complaints'), 1500)
      
    } catch (error) {
      console.error('Error updating complaint:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update complaint. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleBack = () => {
    router.push('/complaints')
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            <p className="mt-2 text-gray-600">Loading complaint...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!complaint) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">Complaint Not Found</h2>
          <p className="mt-2 text-gray-600">The complaint you're looking for doesn't exist.</p>
          <button
            onClick={handleBack}
            className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Complaints
          </button>
        </div>
      </DashboardLayout>
    )
  }

  // Create initial data for the form from the loaded complaint
  // Map complaintNature to form fields
  const mapComplaintNatureToCategory = (nature: string): 'food_safety' | 'non_food_safety' => {
    const natureLower = nature.toLowerCase().replace(/_/g, ' ')
    if (natureLower.includes('food safety')) return 'food_safety'
    if (natureLower.includes('food quality')) return 'food_safety' // map quality to food_safety
    if (natureLower.includes('packaging')) return 'non_food_safety'
    return 'food_safety' // default
  }

  const initialData = complaint ? {
    customerName: complaint.customerName,
    customerNameOther: '',
    customerEmail: complaint.customerEmail || '',
    customerAddress: complaint.customerAddress || '',
    complaintCategory: complaint.complaintCategory
      ? complaint.complaintCategory as 'food_safety' | 'non_food_safety'
      : mapComplaintNatureToCategory(complaint.complaintNature || 'FOOD_SAFETY'),
    complaintSubcategory: complaint.complaintSubcategory || complaint.otherComplaintNature || '',
    complaintReceiveDate: complaint.receivedDate,
    problemStatement: complaint.problemStatement || complaint.remarks || '',
    measuresToResolve: (complaint.measuresToResolve || 'rca_capa') as 'rtv' | 'rca_capa' | 'fishbone' | 'replacement' | 'refund' | 'other',
    remarks: complaint.remarks || '',
    communicationMethod: (complaint.communicationMethod || 'email') as 'email' | 'whatsapp' | 'phone' | 'other',
    proofImages: complaint.proofImages || [],
    articles: (complaint.articles && Array.isArray(complaint.articles) && complaint.articles.length > 0)
      ? complaint.articles.map(article => ({
          category: article.itemCategory || '',
          subcategory: article.itemSubcategory || '',
          itemDescription: article.itemDescription || '',
          quantity: article.quantity || 1,
          uom: article.uom || 'PIECES',
          defectDescription: article.defectDescription || ''
        }))
      : [{
          category: complaint.itemCategory || '',
          subcategory: complaint.itemSubcategory || '',
          itemDescription: complaint.itemDescription || '',
          quantity: complaint.quantityRejected || 1,
          uom: complaint.uom || 'PIECES',
          defectDescription: ''
        }]
  } : undefined

  console.log('Initial data for form:', initialData)
  console.log('Customer name being passed:', initialData?.customerName)
  console.log('Proof images being passed:', initialData?.proofImages)

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Complaint</h1>
              <p className="text-sm text-gray-600">Complaint ID: {complaint.complaintId}</p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {updatedComplaintId && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  Complaint Updated Successfully!
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Complaint {updatedComplaintId} has been updated and you will be redirected shortly.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Shared Form Component */}
        <ComplaintCreateForm
          onSubmit={handleSubmit}
          isLoading={isSaving}
          initialData={initialData}
          isEditing={true}
          onImageDeleted={handleImageDeleted}
        />
      </div>
    </DashboardLayout>
  )
}