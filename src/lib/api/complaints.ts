/**
 * Complaints API Service
 * Handles all API calls for complaints management
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
const COMPLAINTS_BASE_URL = API_BASE_URL

export interface ComplaintFormData {
  company: string
  customerName: string
  receivedDate: string
  manufacturingDate: string
  itemCategory: string
  itemSubcategory: string
  itemDescription: string
  batchCode: string
  quantityRejected: number
  quantityApproved: number
  uom: string
  complaintNature: string
  otherComplaintNature?: string
  qaAssessment: string
  justifiedStatus: string
  remarks: string
  proofImages: string[]
  articles: Array<{
    itemCategory: string
    itemSubcategory: string
    itemDescription: string
    quantity: number
    uom: string
  }>
  createdBy?: string
  updatedBy?: string
}

export interface ComplaintResponse {
  id: number
  complaintId: string
  company: string
  customerName: string
  receivedDate: string
  manufacturingDate: string
  itemCategory: string
  itemSubcategory: string
  itemDescription: string
  batchCode: string
  quantityRejected: number
  quantityApproved: number
  uom: string
  complaintNature: string
  qaAssessment: string
  justifiedStatus: string
  measuresToResolve?: string
  remarks: string
  proofImages: string[]
  articles: Array<{
    id?: number
    itemCategory: string
    itemSubcategory: string
    itemDescription: string
    quantity: number
    uom: string
  }>
  createdBy: string
  createdAt: string
  updatedAt: string
  sampleVideo: string | null
}

export interface ComplaintListResponse {
  success: boolean
  data: ComplaintResponse[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface ComplaintStatsResponse {
  success: boolean
  data: {
    total: number
    byStatus: {
      open: number | null
      in_progress: number | null
      resolved: number | null
      closed: number | null
    }
    byJustification: {
      justified: number
      not_justified: number
      under_review: number
    }
    totalLoss: number | null
    avgResponseTime: number | null
    topCustomers: Array<{
      name: string
      count: number
    }>
  }
}

/**
 * Create a new complaint
 */
export async function createComplaint(data: ComplaintFormData): Promise<ComplaintResponse> {
  const response = await fetch(`${COMPLAINTS_BASE_URL}/complaints`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.message || 'Failed to create complaint')
  }

  return result.data
}

/**
 * Get list of complaints with filters
 */
export async function getComplaints(params: {
  company: string
  status?: string
  customerName?: string
  fromDate?: string
  toDate?: string
  page?: number
  limit?: number
}): Promise<ComplaintListResponse> {
  const queryParams = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value.toString())
    }
  })

  const response = await fetch(`${COMPLAINTS_BASE_URL}/complaints?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.message || 'Failed to fetch complaints')
  }

  return result
}

/**
 * Get complaint by ID
 */
export async function getComplaintById(id: string | number, company: string): Promise<ComplaintResponse> {
  const token = localStorage.getItem('access_token')
  const response = await fetch(`${COMPLAINTS_BASE_URL}/complaints/${id}?company=${company}&_t=${Date.now()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    cache: 'no-store'
  })

  const result = await response.json()

  if (!response.ok || !result) {
    throw new Error('Failed to fetch complaint details')
  }

  return result
}

/**
 * Get complaint by complaint_id (string format like CCNFS-2025-11-002)
 */
export async function getComplaintByComplaintId(complaintId: string, company: string): Promise<ComplaintResponse> {
  const response = await fetch(`${COMPLAINTS_BASE_URL}/complaints/by-complaint-id/${complaintId}?company=${company}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const result = await response.json()

  if (!response.ok || !result) {
    throw new Error('Failed to fetch complaint details')
  }

  return result
}

/**
 * Update complaint
 */
export async function updateComplaint(
  id: string | number,
  data: Partial<ComplaintFormData> & { id: number; complaintId: string }
): Promise<ComplaintResponse> {
  console.log('📤 API - updateComplaint called:', {
    id,
    complaintId: data.complaintId,
    complaintNature: data.complaintNature,
    company: data.company,
    fullData: data
  })
  
  const response = await fetch(`${COMPLAINTS_BASE_URL}/complaints/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  console.log('📥 API - updateComplaint response status:', response.status, response.statusText)

  if (!response.ok) {
    const error = await response.json()
    console.error('❌ API - Update complaint error:', error)
    throw new Error(error.detail || error.message || 'Failed to update complaint')
  }

  const result = await response.json()
  console.log('✅ API - updateComplaint result:', {
    complaintId: result.complaintId,
    complaintNature: result.complaintNature,
    id: result.id
  })
  return result
}

/**
 * Delete complaint
 */
export async function deleteComplaint(id: string | number, company: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${COMPLAINTS_BASE_URL}/complaints/${id}?company=${company}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.message || 'Failed to delete complaint')
  }

  return result
}

/**
 * Upload sample video
 */
export async function uploadSampleVideo(
  file: File,
  complaintId: string,
  company: string
): Promise<{ path: string; fileName: string }> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('complaintId', complaintId)
  formData.append('company', company)

  const response = await fetch(`${COMPLAINTS_BASE_URL}/sample-video`, {
    method: 'POST',
    body: formData,
  })

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.message || 'Failed to upload video')
  }

  return result.data
}

/**
 * Delete sample video
 */
export async function deleteSampleVideo(
  complaintId: string,
  company: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(
    `${COMPLAINTS_BASE_URL}/sample-video?complaintId=${complaintId}&company=${company}`,
    {
      method: 'DELETE',
    }
  )

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.message || 'Failed to delete video')
  }

  return result
}

/**
 * Get complaint statistics
 */
export async function getComplaintStats(params: {
  company: string
  month?: string // YYYY-MM format
}): Promise<ComplaintStatsResponse> {
  const queryParams = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, value.toString())
    }
  })

  const response = await fetch(`${COMPLAINTS_BASE_URL}/complaints/stats?${queryParams.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.message || 'Failed to fetch complaint stats')
  }

  return result
}
