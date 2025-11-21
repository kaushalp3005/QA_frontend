'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Plus, Edit, Clock, AlertCircle, Video, X, Trash2 } from 'lucide-react'
import { getComplaints, uploadSampleVideo, deleteSampleVideo, deleteComplaint, type ComplaintResponse } from '@/lib/api/complaints'
import { formatDateTime } from '@/lib/date-utils'
import { useCompany } from '@/contexts/CompanyContext'
import { usePermissions } from '@/hooks/usePermissions'

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





export default function ComplaintsPage() {
  const router = useRouter()
  const { currentCompany } = useCompany()
  const { canCreate, canEdit, canDelete } = usePermissions()
  const [complaints, setComplaints] = useState<ComplaintResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [uploadingVideo, setUploadingVideo] = useState<string | null>(null)
  const [videoModalOpen, setVideoModalOpen] = useState(false)
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null)
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null)

  useEffect(() => {
    // Load complaints from API
    const loadComplaints = async () => {
      try {
        const response = await getComplaints({
          company: currentCompany,
          page: 1,
          limit: 100
        })
        setComplaints(response.data)
      } catch (error) {
        console.error('Error loading complaints:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadComplaints()
  }, [currentCompany])

  const handleVideoUpload = async (complaintId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check if it's a video file
    if (!file.type.startsWith('video/')) {
      alert('Please select a video file')
      return
    }

    setUploadingVideo(complaintId)

    try {
      const result = await uploadSampleVideo(file, complaintId, currentCompany)
      
      // Update complaint in state with new video URL
      setComplaints(prev => prev.map(c => 
        c.complaintId === complaintId 
          ? { ...c, sampleVideo: result.path }
          : c
      ))
      
      alert('Sample video uploaded successfully!')
    } catch (error) {
      console.error('Error uploading video:', error)
      alert(error instanceof Error ? error.message : 'Failed to upload video. Please try again.')
    } finally {
      setUploadingVideo(null)
    }
  }

  const handleViewVideo = (complaintId: string, videoUrl: string) => {
    setSelectedComplaintId(complaintId)
    setSelectedVideoUrl(videoUrl)
    setVideoModalOpen(true)
  }

  const closeVideoModal = () => {
    setVideoModalOpen(false)
    setSelectedComplaintId(null)
    setSelectedVideoUrl(null)
  }

  const handleRemoveVideo = async (complaintId: string) => {
    if (!confirm('Are you sure you want to remove this video?')) {
      return
    }

    try {
      await deleteSampleVideo(complaintId, currentCompany)
      
      // Update complaint in state to remove video URL
      setComplaints(prev => prev.map(c => 
        c.complaintId === complaintId 
          ? { ...c, sampleVideo: null }
          : c
      ))
      
      alert('Video removed successfully!')
    } catch (error) {
      console.error('Error removing video:', error)
      alert('Failed to remove video. Please try again.')
    }
  }

  const handleCreateComplaint = () => {
    router.push('/complaints/create')
  }

  const handleEditComplaint = (complaintId: string) => {
    // Navigate to edit page for the specific complaint
    router.push(`/complaints/edit/${complaintId}`)
  }

  const handleRcaCapa = (complaintId: string) => {
    // Navigate to RCA/CAPA creation page with complaint ID
    router.push(`/rca-capa/create?complaintId=${complaintId}`)
  }

  const handleFishbone = (complaintId: string) => {
    // Navigate to Fishbone Analysis creation page with complaint ID
    router.push(`/fishbone/create?complaintId=${complaintId}`)
  }

  const handleDeleteComplaint = async (id: number, complaintId: string) => {
    if (!confirm(`Are you sure you want to delete complaint ${complaintId}? This action cannot be undone.`)) {
      return
    }

    try {
      await deleteComplaint(id, currentCompany)
      
      // Remove from state
      setComplaints(prev => prev.filter(c => c.id !== id))
      
      alert('Complaint deleted successfully!')
    } catch (error) {
      console.error('Error deleting complaint:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete complaint. Please try again.')
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Complaints</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage and track all customer complaints
            </p>
          </div>
          
          {/* Create Complaint Button - Only show if user can create */}
          {canCreate('complaints') && (
            <button
              onClick={handleCreateComplaint}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Complaint
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Complaints</p>
                <p className="text-2xl font-bold text-gray-900">2</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-gray-900">1</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-8 w-8 text-green-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">1</p>
              </div>
            </div>
          </div>
        </div>

        {/* Complaints Table */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Complaints</h3>
          </div>
          
          {isLoading ? (
            <div className="px-6 py-8 text-center">
              <div className="text-gray-500">Loading complaints...</div>
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Complaint ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sample Video
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {complaints.map((complaint) => (
                  <tr key={complaint.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {complaint.complaintId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {complaint.customerName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {complaint.remarks || complaint.itemDescription}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(complaint.justifiedStatus.toLowerCase())}`}>
                        {complaint.justifiedStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(complaint.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {complaint.sampleVideo ? (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleViewVideo(complaint.complaintId, complaint.sampleVideo!)}
                            className="inline-flex items-center text-blue-600 hover:text-blue-900"
                          >
                            <Video className="w-4 h-4 mr-1" />
                            View
                          </button>
                          <button
                            onClick={() => handleRemoveVideo(complaint.complaintId)}
                            className="inline-flex items-center text-red-600 hover:text-red-900"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <input
                            type="file"
                            accept="video/*"
                            onChange={(e) => handleVideoUpload(complaint.complaintId, e)}
                            disabled={uploadingVideo === complaint.complaintId}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                            id={`video-upload-${complaint.complaintId}`}
                          />
                          <label
                            htmlFor={`video-upload-${complaint.complaintId}`}
                            className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-md ${
                              uploadingVideo === complaint.complaintId
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
                            }`}
                          >
                            <Video className="w-3 h-3 mr-1" />
                            {uploadingVideo === complaint.complaintId ? 'Uploading...' : 'Upload'}
                          </label>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {/* Edit Button - Only show if user can edit */}
                        {(canEdit('complaints') || canDelete('complaints')) && (
                          <button
                            onClick={() => handleEditComplaint(complaint.id.toString())}
                            className="inline-flex items-center text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </button>
                        )}
                        
                        {/* RCA/CAPA Button - Only show if measuresToResolve is 'rca_capa' and user can create RCA */}
                        {complaint.measuresToResolve === 'rca_capa' && canCreate('rca') && (
                          <button
                            onClick={() => handleRcaCapa(complaint.complaintId)}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            <Clock className="w-3 h-3 mr-1" />
                            RCA/CAPA
                          </button>
                        )}
                        
                        {/* Fishbone Button - Only show if measuresToResolve is 'fishbone' and user can create fishbone */}
                        {complaint.measuresToResolve === 'fishbone' && canCreate('fishbone') && (
                          <button
                            onClick={() => handleFishbone(complaint.complaintId)}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Fishbone
                          </button>
                        )}
                        
                        {/* Delete Button - Only show if user can delete */}
                        {canDelete('complaints') && (
                          <button
                            onClick={() => handleDeleteComplaint(complaint.id, complaint.complaintId)}
                            className="inline-flex items-center text-red-600 hover:text-red-900"
                            title="Delete Complaint"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
          
          {complaints.length === 0 && !isLoading && (
            <div className="px-6 py-8 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-sm font-medium text-gray-900">No complaints found</h3>
              <p className="mt-2 text-sm text-gray-500">
                Get started by creating a new complaint.
              </p>
              <div className="mt-6">
                <button
                  onClick={handleCreateComplaint}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create your first complaint
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Video Modal */}
        {videoModalOpen && selectedVideoUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">
                  Sample Video{selectedComplaintId ? ` - ${selectedComplaintId}` : ''}
                </h3>
                <button
                  onClick={closeVideoModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-4">
                <video
                  controls
                  className="w-full rounded-lg"
                  src={selectedVideoUrl}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}