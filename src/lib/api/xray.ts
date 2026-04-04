// X-Ray Detection API Service

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

export interface XRayDataPayload {
  date: string
  time: string
  product_name: string
  batch_no: string
  ss316: boolean
  ceramic: boolean
  soda_lime_glass: boolean
  action_on_xray: string
  action_on_product_passed: string
  calibrated_monitored_by: string
  verified_by: string
  remarks: string
}

export interface XRayRecord extends XRayDataPayload {
  id: number
  created_at: string
  updated_at: string
}

/**
 * Create a new X-Ray detection record
 */
export async function createXRayRecord(data: XRayDataPayload): Promise<XRayRecord> {
  const token = localStorage.getItem('access_token')

  const response = await fetch(`${API_BASE_URL}/xray/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to create X-Ray record')
  }

  return response.json()
}

/**
 * Get all X-Ray detection records
 */
export async function getXRayRecords(): Promise<XRayRecord[]> {
  const token = localStorage.getItem('access_token')

  const response = await fetch(`${API_BASE_URL}/xray/`, {
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch X-Ray records')
  }

  const data = await response.json()
  return data.records || []
}

/**
 * Get X-Ray record by ID
 */
export async function getXRayRecord(id: string): Promise<XRayRecord> {
  const token = localStorage.getItem('access_token')

  const response = await fetch(`${API_BASE_URL}/xray/${id}`, {
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch X-Ray record')
  }

  return response.json()
}

/**
 * Update an X-Ray detection record
 */
export async function updateXRayRecord(
  id: string,
  data: Partial<XRayDataPayload>
): Promise<XRayRecord> {
  const token = localStorage.getItem('access_token')

  const response = await fetch(`${API_BASE_URL}/xray/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to update X-Ray record')
  }

  return response.json()
}

/**
 * Delete an X-Ray detection record
 */
export async function deleteXRayRecord(id: string): Promise<void> {
  const token = localStorage.getItem('access_token')

  const response = await fetch(`${API_BASE_URL}/xray/${id}`, {
    method: 'DELETE',
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to delete X-Ray record')
  }
}

/**
 * Get X-Ray records by date
 */
export async function getXRayRecordsByDate(date: string): Promise<XRayRecord[]> {
  const token = localStorage.getItem('access_token')

  const response = await fetch(`${API_BASE_URL}/xray/date/${date}`, {
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch X-Ray records for date')
  }

  const data = await response.json()
  return data.records || []
}
