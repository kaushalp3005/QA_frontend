const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

export interface PMInwardRow {
  company: 'CFPL' | 'CDPL' | string
  grn_number: string | null
  transaction_no: string | null
  entry_date: string | null
  challan_number: string | null
  invoice_number: string | null
  vendor_supplier_name: string | null
  vehicle_number: string | null
  items: string
  total_quantity: number
}

export interface PMInwardListResponse {
  records: PMInwardRow[]
  total: number
}

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function listPMInwards(company?: 'CFPL' | 'CDPL'): Promise<PMInwardListResponse> {
  const qs = company ? `?company=${company}` : ''
  const res = await fetch(`${API_BASE_URL}/pm-inspection/inwards${qs}`, {
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `Failed to fetch PM inwards: ${res.status}`)
  }
  return res.json()
}

export interface PMInspectionRecord {
  id: number
  company: string
  transaction_no: string
  grn_number: string | null
  sr_no: string | null
  received_date: string | null
  inspection_date: string | null
  material_description: string | null
  challan_no: string | null
  invoice_no: string | null
  supplier_name: string | null
  vehicle_no: string | null
  coa_received: string | null
  quantity: string | null
  visual_verification: Record<string, { observation: string; status: string }>
  inspection_parameters: Record<string, { observation: string; status: string }>
  remarks: string | null
  done_by: string | null
  verified_by: string | null
  created_at: string
  updated_at: string
}

export async function createPMInspection(payload: any): Promise<PMInspectionRecord> {
  const res = await fetch(`${API_BASE_URL}/pm-inspection/inspections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(typeof err.detail === 'string' ? err.detail : `Failed to save inspection: ${res.status}`)
  }
  return res.json()
}

export async function listPMInspections(params?: {
  company?: string
  transaction_no?: string
  limit?: number
}): Promise<PMInspectionRecord[]> {
  const qs = new URLSearchParams()
  if (params?.company) qs.set('company', params.company)
  if (params?.transaction_no) qs.set('transaction_no', params.transaction_no)
  if (params?.limit) qs.set('limit', String(params.limit))
  const q = qs.toString()
  const res = await fetch(
    `${API_BASE_URL}/pm-inspection/inspections${q ? '?' + q : ''}`,
    { headers: authHeaders() },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `Failed to fetch inspection records: ${res.status}`)
  }
  return res.json()
}

export async function getPMInspection(id: number | string): Promise<PMInspectionRecord> {
  const res = await fetch(`${API_BASE_URL}/pm-inspection/inspections/${id}`, {
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `Failed to fetch inspection: ${res.status}`)
  }
  return res.json()
}

export async function updatePMInspection(
  id: number | string,
  payload: any,
): Promise<PMInspectionRecord> {
  const res = await fetch(`${API_BASE_URL}/pm-inspection/inspections/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(typeof err.detail === 'string' ? err.detail : `Failed to update inspection: ${res.status}`)
  }
  return res.json()
}

export async function deletePMInspection(id: number | string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/pm-inspection/inspections/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(typeof err.detail === 'string' ? err.detail : `Failed to delete inspection: ${res.status}`)
  }
}
