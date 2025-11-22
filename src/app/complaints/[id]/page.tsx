'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Edit, 
  Calendar, 
  User, 
  Package, 
  AlertCircle,
  FileText,
  Clock,
  CheckCircle,
  Loader2,
  Video,
  Image as ImageIcon
} from 'lucide-react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { formatDateShort, formatDateTime } from '@/lib/date-utils'
import { useCompany } from '@/contexts/CompanyContext'
import { usePermissions } from '@/hooks/usePermissions'
import { getComplaintById, type ComplaintResponse } from '@/lib/api/complaints'
import { isAuthenticated } from '@/lib/api/auth'
import { toast } from 'react-hot-toast'

export default function ComplaintViewPage() {
  const params = useParams()
  const router = useRouter()
  const { currentCompany } = useCompany()
  const { canView, canEdit, permissions } = usePermissions()
  const [complaint, setComplaint] = useState<ComplaintResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [videoModalOpen, setVideoModalOpen] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const complaintId = params.id as string

  // Check authentication first
  useEffect(() => {
    if (!isAuthenticated()) {
      // Store the current path for redirect after login
      const returnUrl = `/complaints/${complaintId}`
      router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`)
      return
    }
    setCheckingAuth(false)
  }, [complaintId, router])

  useEffect(() => {
    if (!checkingAuth && complaintId && currentCompany) {
      fetchComplaintData()
    }
  }, [checkingAuth, complaintId, currentCompany])

  // Check if user has view permission
  useEffect(() => {
    if (!checkingAuth && Object.keys(permissions).length > 0 && !canView('complaints')) {
      toast.error('You do not have permission to view complaints')
      router.push('/complaints')
    }
  }, [checkingAuth, permissions, canView, router])

  const fetchComplaintData = async () => {
    try {
      setLoading(true)
      const data = await getComplaintById(complaintId, currentCompany)
      setComplaint(data)
    } catch (error) {
      console.error('Error fetching complaint:', error)
      toast.error('Failed to load complaint')
      router.push('/complaints')
    } finally {
      setLoading(false)
    }
  }

  // Show loading while checking authentication
  if (checkingAuth || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  if (!complaint) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Complaint not found</h3>
          <div className="mt-6">
            <Link
              href="/complaints"
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to List
            </Link>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-blue-100 text-blue-800'
      case 'open':
        return 'bg-red-100 text-red-800'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800'
      case 'resolved':
        return 'bg-green-100 text-green-800'
      case 'closed':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getJustifiedBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'justified':
        return 'bg-green-100 text-green-800'
      case 'not_justified':
        return 'bg-red-100 text-red-800'
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/complaints"
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{complaint.complaintId}</h1>
              <p className="text-sm text-gray-600 mt-1">Complaint Details</p>
            </div>
          </div>
          {canEdit('complaints') && (
            <Link
              href={`/complaints/edit/${complaintId}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          )}
        </div>

        {/* Main Content */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Complaint Information</h2>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(complaint.justifiedStatus || 'pending')}`}>
                  {complaint.justifiedStatus || 'Pending'}
                </span>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getJustifiedBadge(complaint.justifiedStatus || 'under_review')}`}>
                  {complaint.justifiedStatus === 'justified' ? 'Justified' : 
                   complaint.justifiedStatus === 'not_justified' ? 'Not Justified' : 
                   'Under Review'}
                </span>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 space-y-6">
            {/* Customer Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                <User className="h-4 w-4 mr-2" />
                Customer Information
              </h3>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Customer Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{complaint.customerName}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Company</dt>
                  <dd className="mt-1 text-sm text-gray-900">{complaint.company}</dd>
                </div>
              </dl>
            </div>

            {/* Dates */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Dates
              </h3>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Received Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDateShort(complaint.receivedDate)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Manufacturing Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDateShort(complaint.manufacturingDate)}</dd>
                </div>
              </dl>
            </div>

            {/* Item Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                <Package className="h-4 w-4 mr-2" />
                Item Information
              </h3>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Category</dt>
                  <dd className="mt-1 text-sm text-gray-900">{complaint.itemCategory}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Subcategory</dt>
                  <dd className="mt-1 text-sm text-gray-900">{complaint.itemSubcategory}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Description</dt>
                  <dd className="mt-1 text-sm text-gray-900">{complaint.itemDescription}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Batch Code</dt>
                  <dd className="mt-1 text-sm text-gray-900">{complaint.batchCode}</dd>
                </div>
              </dl>
            </div>

            {/* Quantities */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3">Quantities</h3>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Quantity Rejected</dt>
                  <dd className="mt-1 text-sm text-gray-900">{complaint.quantityRejected} {complaint.uom}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Quantity Approved</dt>
                  <dd className="mt-1 text-sm text-gray-900">{complaint.quantityApproved} {complaint.uom}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Unit of Measure</dt>
                  <dd className="mt-1 text-sm text-gray-900">{complaint.uom}</dd>
                </div>
              </dl>
            </div>

            {/* Complaint Details */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Complaint Details
              </h3>
              <dl className="grid grid-cols-1 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Complaint Nature</dt>
                  <dd className="mt-1 text-sm text-gray-900">{complaint.complaintNature}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">QA Assessment</dt>
                  <dd className="mt-1 text-sm text-gray-900">{complaint.qaAssessment}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Remarks</dt>
                  <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{complaint.remarks || 'No remarks'}</dd>
                </div>
                {complaint.measuresToResolve && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Measures to Resolve</dt>
                    <dd className="mt-1 text-sm text-gray-900">{complaint.measuresToResolve}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Articles */}
            {complaint.articles && complaint.articles.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Articles</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Subcategory</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">UOM</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {complaint.articles.map((article, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900">{article.itemCategory}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{article.itemSubcategory}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{article.itemDescription}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{article.quantity}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{article.uom}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Proof Images */}
            {complaint.proofImages && complaint.proofImages.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Proof Images
                </h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {complaint.proofImages.map((imageUrl, index) => (
                    <div key={index} className="relative">
                      <img
                        src={imageUrl}
                        alt={`Proof image ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-75"
                        onClick={() => window.open(imageUrl, '_blank')}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sample Video */}
            {complaint.sampleVideo && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                  <Video className="h-4 w-4 mr-2" />
                  Sample Video
                </h3>
                <button
                  onClick={() => setVideoModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Video className="h-4 w-4 mr-2" />
                  View Video
                </button>
              </div>
            )}

            {/* Metadata */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Metadata
              </h3>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created By</dt>
                  <dd className="mt-1 text-sm text-gray-900">{complaint.createdBy || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created At</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDateTime(complaint.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Updated At</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDateTime(complaint.updatedAt)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Video Modal */}
      {videoModalOpen && complaint.sampleVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Sample Video</h3>
              <button
                onClick={() => setVideoModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <AlertCircle className="h-6 w-6" />
              </button>
            </div>
            <div className="p-4">
              <video
                src={complaint.sampleVideo}
                controls
                className="w-full h-auto"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

