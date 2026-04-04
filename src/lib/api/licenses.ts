const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

export interface License {
  id: number
  company_name: string
  location: string
  license_no: string
  validity: string
  type: string
  status: string
  business_types?: string[]
  issuing_authority?: string
  remind_me_in?: string
  // Reminder tracking fields
  last_reminder_sent?: string
  reminder_ignored?: boolean
  reminder_ignored_at?: string
  reminders_sent_count?: number
  final_reminder_days?: any
  // Timestamps
  created_at: string
  updated_at: string
}

export interface LicenseListResponse {
  licenses: License[]
  total: number
  page: number
  limit: number
}

export interface LicenseStats {
  total: number
  active: number
  expired: number
  expiring_soon: number
}

export interface LicenseFilters {
  company_name?: string
  status?: string
  page?: number
  limit?: number
}

export async function getLicenses(filters?: LicenseFilters): Promise<LicenseListResponse> {
  console.log('🔍 getLicenses called with filters:', filters)
  const params = new URLSearchParams()
  
  if (filters?.company_name) params.append('company_name', filters.company_name)
  if (filters?.status) params.append('status', filters.status)
  if (filters?.page) params.append('page', filters.page.toString())
  if (filters?.limit) params.append('limit', filters.limit.toString())
  
  const url = `${API_BASE_URL}/licenses?${params.toString()}`
  console.log('📡 Fetching from URL:', url)
  
  const response = await fetch(url)
  console.log('📥 Response status:', response.status, response.statusText)
  
  if (!response.ok) {
    console.error('❌ Response not OK:', response.status)
    throw new Error('Failed to fetch licenses')
  }
  
  const data = await response.json()
  console.log('✅ Received data:', data)
  console.log('📋 Data.licenses:', data.licenses)
  console.log('📏 Data.licenses length:', data.licenses?.length)
  console.log('🔑 Data keys:', Object.keys(data))
  return data
}

export async function getLicenseStats(company_name?: string): Promise<LicenseStats> {
  console.log('📊 getLicenseStats called with company:', company_name)
  const params = new URLSearchParams()
  if (company_name) params.append('company_name', company_name)
  
  const url = `${API_BASE_URL}/licenses/stats?${params.toString()}`
  console.log('📡 Fetching stats from URL:', url)
  
  const response = await fetch(url)
  console.log('📥 Stats response status:', response.status, response.statusText)
  
  if (!response.ok) {
    console.error('❌ Stats response not OK:', response.status)
    throw new Error('Failed to fetch license stats')
  }
  
  const data = await response.json()
  console.log('✅ Received stats:', data)
  return data
}

export async function getLicenseById(id: number): Promise<License> {
  const response = await fetch(`${API_BASE_URL}/licenses/${id}`)
  
  if (!response.ok) {
    throw new Error('Failed to fetch license')
  }
  
  return response.json()
}

export async function createLicense(data: Omit<License, 'id' | 'created_at' | 'updated_at'>): Promise<License> {
  const response = await fetch(`${API_BASE_URL}/licenses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    throw new Error('Failed to create license')
  }
  
  return response.json()
}

export async function updateLicense(
  id: number,
  data: Partial<Omit<License, 'id' | 'created_at' | 'updated_at'>>
): Promise<License> {
  const token = localStorage.getItem('access_token')
  console.log('🔧 updateLicense API called:', { id, data })
  
  const response = await fetch(`${API_BASE_URL}/licenses/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
  
  console.log('📡 Response status:', response.status)
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    console.error('❌ Update failed:', errorData)
    throw new Error(errorData?.detail || 'Failed to update license')
  }
  
  const result = await response.json()
  console.log('✅ Update successful:', result)
  return result
}

export async function deleteLicense(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/licenses/${id}`, {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    throw new Error('Failed to delete license')
  }
}
