'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Plus, Edit, Clock, AlertCircle, Video, X, Trash2, Eye, FileText } from 'lucide-react'
import Link from 'next/link'
import { getComplaints, uploadSampleVideo, deleteSampleVideo, deleteComplaint, type ComplaintResponse } from '@/lib/api/complaints'
import { formatDateShort } from '@/lib/date-utils'
import { useCompany } from '@/contexts/CompanyContext'
import { usePermissions } from '@/hooks/usePermissions'
import PageHeader from '@/components/ui/PageHeader'
import { Spinner, Skeleton } from '@/components/ui/Loader'

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-warning-50 text-warning-700'
    case 'open':
      return 'bg-danger-50 text-danger-700'
    case 'in_progress':
      return 'bg-warning-50 text-warning-700'
    case 'resolved':
      return 'bg-success-50 text-success-700'
    case 'closed':
      return 'bg-cream-200 text-ink-500'
    default:
      return 'bg-cream-200 text-ink-500'
  }
}




export default function ComplaintsPage() {
  const router = useRouter()
  const { currentCompany } = useCompany()
  const { canCreate, canEdit, canDelete, canView } = usePermissions()
  const [complaints, setComplaints] = useState<ComplaintResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [uploadingVideo, setUploadingVideo] = useState<string | null>(null)
  const [videoModalOpen, setVideoModalOpen] = useState(false)
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null)
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  useEffect(() => {
    // Load complaints from API
    const loadComplaints = async () => {
      try {
        const response = await getComplaints({
          company: currentCompany,
          page,
          limit
        })
        setComplaints(response.data)
        setTotalPages(response.meta.totalPages)
        setTotal(response.meta.total)
      } catch (error) {
        console.error('Error loading complaints:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadComplaints()
  }, [currentCompany, page])

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
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Complaints"
          subtitle="Manage and track all customer complaints"
          icon={FileText}
          actions={
            canCreate('complaints') ? (
              <button
                onClick={handleCreateComplaint}
                className="btn-primary inline-flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Complaint
              </button>
            ) : null
          }
        />

        {/* Complaints Table */}
        <div className="surface-card overflow-hidden animate-fade-in-up">
          {isLoading ? (
            <div className="p-5 space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : complaints.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="bg-cream-200 w-14 h-14 rounded-full mx-auto flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-ink-400" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-ink-500">No complaints found</h3>
              <p className="mt-1 text-xs text-ink-400">
                Get started by creating a new complaint.
              </p>
              {canCreate('complaints') && (
                <div className="mt-5">
                  <button
                    onClick={handleCreateComplaint}
                    className="btn-primary inline-flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create your first complaint
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-cream-300">
                <thead className="bg-cream-100">
                  <tr>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Complaint ID
                    </th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Customer
                    </th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Title
                    </th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Receive Date
                    </th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Sample Video
                    </th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-cream-300">
                  {complaints.map((complaint) => (
                    <tr key={complaint.id} className="hover:bg-cream-100/50 transition-colors">
                      <td className="px-5 py-3 text-sm font-semibold text-ink-600 whitespace-nowrap">
                        {complaint.complaintId}
                      </td>
                      <td className="px-5 py-3 text-sm text-ink-600 whitespace-nowrap">
                        {complaint.customerName}
                      </td>
                      <td className="px-5 py-3 text-sm text-ink-600 max-w-xs truncate">
                        {complaint.remarks || complaint.itemDescription}
                      </td>
                      <td className="px-5 py-3 text-sm text-ink-600 whitespace-nowrap">
                        {formatDateShort(complaint.receivedDate)}
                      </td>
                      <td className="px-5 py-3 text-sm whitespace-nowrap">
                        {complaint.sampleVideo ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleViewVideo(complaint.complaintId, complaint.sampleVideo!)}
                              className="inline-flex items-center text-xs font-medium text-ink-500 hover:text-brand-500 transition-colors px-2 py-1 rounded-md hover:bg-cream-100"
                              title="View Video"
                            >
                              <Video className="w-4 h-4 mr-1" />
                              View
                            </button>
                            <button
                              onClick={() => handleRemoveVideo(complaint.complaintId)}
                              className="text-ink-400 hover:text-brand-500 transition-colors p-1.5 rounded-md hover:bg-cream-100"
                              title="Remove Video"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="relative inline-block">
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
                              className={`inline-flex items-center px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                                uploadingVideo === complaint.complaintId
                                  ? 'bg-cream-200 text-ink-400 cursor-not-allowed'
                                  : 'bg-cream-100 text-ink-500 hover:bg-cream-200 hover:text-ink-600 cursor-pointer'
                              }`}
                            >
                              {uploadingVideo === complaint.complaintId ? (
                                <>
                                  <Spinner size={12} className="mr-1" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <Video className="w-3 h-3 mr-1" />
                                  Upload
                                </>
                              )}
                            </label>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {canView('complaints') && (
                            <Link
                              href={`/complaints/${complaint.id}`}
                              className="text-ink-400 hover:text-brand-500 transition-colors p-1.5 rounded-md hover:bg-cream-100"
                              title="View Complaint"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                          )}
                          {(canEdit('complaints') || canDelete('complaints')) && (
                            <button
                              onClick={() => handleEditComplaint(complaint.id.toString())}
                              className="text-ink-400 hover:text-brand-500 transition-colors p-1.5 rounded-md hover:bg-cream-100"
                              title="Edit Complaint"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {complaint.measuresToResolve === 'rca_capa' && canCreate('rca') && (
                            <button
                              onClick={() => handleRcaCapa(complaint.complaintId)}
                              className="inline-flex items-center px-2 py-1 text-[11px] font-semibold rounded-md bg-success-50 text-success-700 hover:bg-success-100 transition-colors"
                              title="Create RCA/CAPA"
                            >
                              <Clock className="w-3 h-3 mr-1" />
                              RCA/CAPA
                            </button>
                          )}

                          {complaint.measuresToResolve === 'fishbone' && canCreate('fishbone') && (
                            <button
                              onClick={() => handleFishbone(complaint.complaintId)}
                              className="inline-flex items-center px-2 py-1 text-[11px] font-semibold rounded-md bg-brand-50 text-brand-500 hover:bg-brand-100 transition-colors"
                              title="Create Fishbone"
                            >
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Fishbone
                            </button>
                          )}

                          {canDelete('complaints') && (
                            <button
                              onClick={() => handleDeleteComplaint(complaint.id, complaint.complaintId)}
                              className="text-ink-400 hover:text-brand-500 transition-colors p-1.5 rounded-md hover:bg-cream-100"
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

          {/* Pagination */}
          {!isLoading && complaints.length > 0 && (
            <div className="px-5 py-4 border-t border-cream-300 flex items-center justify-between flex-wrap gap-3">
              <div className="text-xs text-ink-400">
                Showing <span className="font-semibold text-ink-600 tabular-nums">{((page - 1) * limit) + 1}</span> to <span className="font-semibold text-ink-600 tabular-nums">{Math.min(page * limit, total)}</span> of <span className="font-semibold text-ink-600 tabular-nums">{total}</span> complaints
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="btn-outline px-3 py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-ink-600 disabled:hover:border-cream-300"
                >
                  Previous
                </button>
                <span className="inline-flex items-center justify-center min-w-[2rem] px-3 py-1.5 text-xs font-semibold rounded-md bg-brand-500 text-white tabular-nums">
                  {page}
                </span>
                <span className="text-xs text-ink-400">of <span className="tabular-nums">{totalPages}</span></span>
                <button
                  onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  className="btn-outline px-3 py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-ink-600 disabled:hover:border-cream-300"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Video Modal */}
        {videoModalOpen && selectedVideoUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-600/70 backdrop-blur-sm animate-fade-in p-4">
            <div className="surface-card max-w-4xl w-full animate-scale-in overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-cream-300">
                <h3 className="text-base font-semibold text-ink-600">
                  Sample Video{selectedComplaintId ? ` - ${selectedComplaintId}` : ''}
                </h3>
                <button
                  onClick={closeVideoModal}
                  className="text-ink-400 hover:text-brand-500 transition-colors p-1.5 rounded-md hover:bg-cream-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5">
                <video
                  controls
                  className="w-full rounded-xl"
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
