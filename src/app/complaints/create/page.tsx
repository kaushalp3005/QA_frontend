'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ComplaintCreateForm from '@/components/complaint/ComplaintCreateForm'
import { createComplaint } from '@/lib/api/complaints'
import { useCompany } from '@/contexts/CompanyContext'
import { usePermissions } from '@/hooks/usePermissions'
import { CheckCircle } from 'lucide-react'



interface ComplaintFormData {
  customerName: string
  customerPhone?: string
  customerEmail?: string
  customerCompany?: string
  customerAddress?: string
  complaintTitle: string
  complaintDescription: string
  complaintType: 'product_defect' | 'service_issue' | 'billing' | 'delivery' | 'other'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  communicationMethod: 'email' | 'phone' | 'whatsapp' | 'in_person' | 'other'
  hasVoiceRecording: boolean
  hasEmailAttachment: boolean
  articles: Array<{
    name: string
    quantity: number
    price: number
    defectDescription?: string
  }>
  estimatedLoss?: number
  resolutionExpected?: string
  additionalNotes?: string
}

export default function CreateComplaintPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [createdComplaintId, setCreatedComplaintId] = useState<string | null>(null)
  const router = useRouter()
  const { currentCompany } = useCompany()
  const { canCreate, permissions } = usePermissions()

  // Redirect if user doesn't have create permission
  useEffect(() => {
    // Wait for permissions to load
    if (Object.keys(permissions).length > 0 && !canCreate('complaints')) {
      toast.error('You do not have permission to create complaints')
      router.push('/complaints')
    }
  }, [permissions, router])

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
  if (!canCreate('complaints')) {
    return null
  }

  const handleSubmit = async (data: any) => {
    setIsLoading(true)
    
    try {
      // Prepare complaint data for API
      const complaintData = {
        company: currentCompany,
        customerName: data.customerName === 'other' ? data.customerNameOther : data.customerName,
        customerEmail: data.customerEmail || '',
        customerAddress: data.customerAddress || '',
        receivedDate: data.complaintReceiveDate,
        manufacturingDate: data.manufacturingDate || data.complaintReceiveDate,
        itemCategory: data.articles?.[0]?.category || '',
        itemSubcategory: data.articles?.[0]?.subcategory || '',
        itemDescription: data.articles?.[0]?.itemDescription || '',
        batchCode: data.batchCode || '',
        quantityRejected: data.quantityRejected || 0,
        quantityApproved: data.quantityApproved || 0,
        uom: data.articles?.[0]?.uom || 'pieces',
        // Map complaintCategory to the format expected by backend
        // 'food_safety' -> 'Food Safety' (generates CCFS prefix)
        // 'non_food_safety' -> 'Non Food Safety' (generates CCNFS prefix)
        complaintNature: data.complaintCategory === 'food_safety'
          ? 'Food Safety'
          : data.complaintCategory === 'non_food_safety'
          ? 'Non Food Safety'
          : 'Non Food Safety', // Default to Non Food Safety
        complaintCategory: data.complaintCategory || '',
        complaintSubcategory: data.complaintSubcategory || '',
        otherComplaintNature: data.complaintSubcategory || '',
        problemStatement: data.problemStatement || '',
        qaAssessment: data.qaAssessment || 'Pending',
        justifiedStatus: data.justifiedStatus || 'Under Review',
        communicationMethod: data.communicationMethod || '',
        measuresToResolve: data.measuresToResolve || null,
        remarks: data.remarks || '',
        proofImages: data.proofImages || [],
        articles: (data.articles || []).map((article: any) => ({
          itemCategory: article.category,
          itemSubcategory: article.subcategory,
          itemDescription: article.itemDescription,
          quantity: article.quantity || 0,
          uom: article.uom || 'pieces',
          defectDescription: article.defectDescription || ''
        })),
        createdBy: 'qa_user_1' // TODO: Get from auth context
      }

      // Create complaint using API
      const complaint = await createComplaint(complaintData)
      setCreatedComplaintId(complaint.complaintId)
      
      toast.success(`Complaint ${complaint.complaintId} created successfully!`)
      
      // Don't redirect immediately, let user see the ID
      // setTimeout(() => router.push('/dashboard'), 3000)
      
    } catch (error) {
      console.error('Error creating complaint:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create complaint. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }



  const handleCreateAnother = () => {
    setCreatedComplaintId(null)
    // Reset form or refresh page
    window.location.reload()
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-3xl font-bold text-gray-900">Create New Complaint</h1>
          <p className="mt-2 text-sm text-gray-600">
            Fill in the complaint details. All required fields are marked with an asterisk (*). 
            The complaint ID will be generated based on your selected complaint category.
          </p>
        </div>

        {/* Success Message with Complaint ID */}
        {createdComplaintId && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-400 mr-3" />
              <div className="flex-1">
                <h3 className="text-lg font-medium text-green-900">
                  Complaint Created Successfully!
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-green-700 mb-2">
                    Your complaint ID is: 
                  </p>
                  <div className="bg-white border border-green-300 rounded-md px-4 py-2">
                    <span className="font-mono text-xl font-bold text-green-900">
                      {createdComplaintId}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-sm text-green-600">
                  Please save this ID for future reference. You can use it to track your complaint status.
                </p>
              </div>
            </div>
            <div className="mt-4 flex space-x-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700"
              >
                View Dashboard
              </button>
              <button
                onClick={handleCreateAnother}
                className="bg-white text-green-600 border border-green-300 px-4 py-2 rounded-md text-sm font-medium hover:bg-green-50"
              >
                Create Another Complaint
              </button>
            </div>
          </div> 
        )}

        {/* Form - Only show if no complaint has been created yet */}
        {!createdComplaintId && (
          <ComplaintCreateForm 
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        )}
      </div>
    </DashboardLayout>
  )
}