// frontend/src/lib/api/documentations.ts

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || ''

function getUserEmail(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('user_email')
}

async function request<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const email = getUserEmail()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(email && { 'X-User-Email': email }),
    ...(options.headers as Record<string, string> || {}),
  }
  const res = await fetch(url, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `Request failed: ${res.status}`)
  }
  return res.json()
}

export const docsApi = {
  create: (formType: string, data: Record<string, any>) =>
    request<{ success: boolean; data: Record<string, any> }>(
      `${API_BASE}/api/docs/${formType}`,
      { method: 'POST', body: JSON.stringify(data) }
    ),

  list: (formType: string, params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
    ).toString()
    return request<{
      success: boolean
      records: Record<string, any>[]
      total: number
      page: number
      per_page: number
      total_pages: number
      form_type: string
      label: string
    }>(`${API_BASE}/api/docs/${formType}${qs ? `?${qs}` : ''}`)
  },

  get: (formType: string, id: number) =>
    request<{ success: boolean; data: Record<string, any> }>(
      `${API_BASE}/api/docs/${formType}/${id}`
    ),

  update: (formType: string, id: number, data: Record<string, any>) =>
    request<{ success: boolean; data: Record<string, any> }>(
      `${API_BASE}/api/docs/${formType}/${id}`,
      { method: 'PUT', body: JSON.stringify(data) }
    ),

  delete: (formType: string, id: number) =>
    request<{ success: boolean; message: string }>(
      `${API_BASE}/api/docs/${formType}/${id}`,
      { method: 'DELETE' }
    ),
}

// ── Customer Tolerance ────────────────────────────────────────────────────────

export interface ToleranceParam {
  tolerance: string
  method?: string
}

export interface CustomerToleranceRecord {
  id: number
  customer_name: string
  sample_name: string
  organoleptic_sensory: Record<string, ToleranceParam | string>
  physical: Record<string, ToleranceParam | string>
  chemical: Record<string, ToleranceParam | string>
  remarks: string
}

export const customerToleranceApi = {
  /** Fetch by customer_name (optionally narrow by sample_name) */
  get: (customerName: string, sampleName?: string) => {
    const qs = new URLSearchParams({ customer_name: customerName })
    if (sampleName) qs.set('sample_name', sampleName)
    return request<{ success: boolean; data: CustomerToleranceRecord | null }>(
      `${API_BASE}/api/customer-tolerance?${qs}`
    )
  },

  list: () =>
    request<{ success: boolean; data: CustomerToleranceRecord[] }>(
      `${API_BASE}/api/customer-tolerance`
    ),

  create: (data: Partial<CustomerToleranceRecord>) =>
    request<CustomerToleranceRecord>(
      `${API_BASE}/api/customer-tolerance`,
      { method: 'POST', body: JSON.stringify(data) }
    ),

  update: (id: number, data: Partial<CustomerToleranceRecord>) =>
    request<{ success: boolean; data: CustomerToleranceRecord }>(
      `${API_BASE}/api/customer-tolerance/${id}`,
      { method: 'PUT', body: JSON.stringify(data) }
    ),

  remove: (id: number) =>
    request<{ success: boolean; message: string }>(
      `${API_BASE}/api/customer-tolerance/${id}`,
      { method: 'DELETE' }
    ),
}

// ── FG COA ────────────────────────────────────────────────────────────────────

export interface FgCoaParamRow {
  key: string
  label: string
  result: string
  tolerance: string
  method: string
  included: boolean
}

export interface FgCoaPayload {
  ipqc_no?: string | null
  coa_no: string
  coa_dated: string                  // YYYY-MM-DD
  sample_type: string
  sampling_date?: string | null
  sample_name: string
  customer_name: string
  batch_no?: string | null
  physical_category?: string | null
  batch_qty?: string | null
  ingredient_name?: string | null
  country_of_origin?: string | null
  packing_date?: string | null
  expiry_date?: string | null
  shelf_life?: string | null
  storage_condition?: string | null
  packaging_type?: string | null
  asin_code?: string | null
  allergen_declaration?: string | null
  sensory: FgCoaParamRow[]
  physical: FgCoaParamRow[]
  chemical: FgCoaParamRow[]
  verdict?: string | null
  remarks?: string | null
  analysed_by?: string | null
  verified_by?: string | null
  created_by?: string | null
}

export interface FgCoaRecord extends FgCoaPayload {
  id: number
  created_at: string
  updated_at: string
}

export const fgCoaApi = {
  create: (data: FgCoaPayload) =>
    request<{ success: boolean; data: FgCoaRecord }>(
      `${API_BASE}/api/fg-coa`,
      { method: 'POST', body: JSON.stringify(data) }
    ),

  list: (params: { search?: string; customer_name?: string; page?: number; page_size?: number } = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)]))
    ).toString()
    return request<{ success: boolean; records: FgCoaRecord[]; total: number; page: number; page_size: number }>(
      `${API_BASE}/api/fg-coa${qs ? `?${qs}` : ''}`
    )
  },

  get: (id: number) =>
    request<{ success: boolean; data: FgCoaRecord }>(
      `${API_BASE}/api/fg-coa/${id}`
    ),

  update: (id: number, data: FgCoaPayload) =>
    request<{ success: boolean; data: FgCoaRecord }>(
      `${API_BASE}/api/fg-coa/${id}`,
      { method: 'PUT', body: JSON.stringify(data) }
    ),

  remove: (id: number) =>
    request<{ success: boolean; message: string }>(
      `${API_BASE}/api/fg-coa/${id}`,
      { method: 'DELETE' }
    ),
}

export const ADMIN_EMAIL = 'pooja.parkar@candorfoods.in'

export function isDocAdmin(): boolean {
  const email = getUserEmail()
  return !!email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
}
