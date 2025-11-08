// License Tracker API functions

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface License {
  id: number
  company_name: string
  location: string
  license_no: string
  validity: string
  type: 'Central' | 'State'
  status?: 'Active' | 'Surrender'
  business_types: string[]
  issuing_authority?: string
  remind_me_in?: string
  created_at: string
  updated_at: string
}

export interface LicenseListResponse {
  total: number
  licenses: License[]
}

export interface LicenseStats {
  total_licenses: number
  central_licenses: number
  state_licenses: number
  active_licenses: number
  surrendered_licenses: number
}

export interface LicenseCreatePayload {
  company_name: string
  location: string
  license_no: string
  validity: string
  type: 'Central' | 'State'
  status?: 'Active' | 'Surrender'
  business_types?: string[]
  issuing_authority?: string
  remind_me_in?: string
}

export interface LicenseUpdatePayload {
  company_name?: string
  location?: string
  validity?: string
  type?: 'Central' | 'State'
  status?: 'Active' | 'Surrender'
  business_types?: string[]
  issuing_authority?: string
  remind_me_in?: string
}

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

// Get auth headers
const getAuthHeaders = () => {
  const token = getAuthToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  }
}

/**
 * Get all licenses with optional filters
 */
export async function getLicenses(params?: {
  search?: string
  type?: string
  status?: string
  skip?: number
  limit?: number
}): Promise<LicenseListResponse> {
  const queryParams = new URLSearchParams()
  if (params?.search) queryParams.append('search', params.search)
  if (params?.type) queryParams.append('type', params.type)
  if (params?.status) queryParams.append('status', params.status)
  if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString())
  if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString())

  const url = `${API_BASE_URL}/api/licenses${queryParams.toString() ? '?' + queryParams.toString() : ''}`
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to fetch licenses' }))
    throw new Error(error.detail || 'Failed to fetch licenses')
  }

  return response.json()
}

/**
 * Get license statistics
 */
export async function getLicenseStats(): Promise<LicenseStats> {
  const response = await fetch(`${API_BASE_URL}/api/licenses/stats`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to fetch statistics' }))
    throw new Error(error.detail || 'Failed to fetch statistics')
  }

  return response.json()
}

/**
 * Get a single license by ID
 */
export async function getLicenseById(id: number): Promise<License> {
  const response = await fetch(`${API_BASE_URL}/api/licenses/${id}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'License not found' }))
    throw new Error(error.detail || 'License not found')
  }

  return response.json()
}

/**
 * Create a new license
 */
export async function createLicense(payload: LicenseCreatePayload): Promise<License> {
  const response = await fetch(`${API_BASE_URL}/api/licenses`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to create license' }))
    throw new Error(error.detail || 'Failed to create license')
  }

  return response.json()
}

/**
 * Update a license
 */
export async function updateLicense(id: number, payload: LicenseUpdatePayload): Promise<License> {
  const response = await fetch(`${API_BASE_URL}/api/licenses/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to update license' }))
    throw new Error(JSON.stringify(error.detail || error))
  }

  return response.json()
}

/**
 * Delete a license
 */
export async function deleteLicense(id: number): Promise<{ message: string; id: number }> {
  const response = await fetch(`${API_BASE_URL}/api/licenses/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to delete license' }))
    throw new Error(error.detail || 'Failed to delete license')
  }

  return response.json()
}
