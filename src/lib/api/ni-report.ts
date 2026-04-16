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

// ── NI Records (Ingredient Master) ──────────────────

export interface NIRecord {
  id: number
  ingred_name: string
  vendor_name: string | null
  energy_kcal: number
  protein_g: number
  total_fat_g: number
  saturated_fat_g: number
  trans_fat_g: number
  carbohydrates_g: number
  total_sugars_g: number
  added_sugars_g: number
  sodium_mg: number
  dietary_fiber_g: number
  cholesterol_mg: number
  vitamin_a_mcg: number
  vitamin_c_mg: number
  vitamin_d_mcg: number
  calcium_mg: number
  iron_mg: number
  ni: Record<string, any> | null
  source_ref: string | null
  file_url: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface NIReport {
  id: number
  report_no: string
  report_date: string
  product_name: string
  serving_size_g: number
  ingredients: {
    ingred_name: string
    percentage: number
    ni_record_id: number | null
    flagged?: boolean
  }[]
  calculated_per_100g: Record<string, number>
  calculated_per_serving: Record<string, number>
  rda_percentages: Record<string, number | null>
  warehouse: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export const niRecordsApi = {
  list: (search?: string) => {
    const qs = search ? `?search=${encodeURIComponent(search)}` : ''
    return request<{ success: boolean; records: NIRecord[]; total: number }>(
      `${API_BASE}/api/ni-records${qs}`
    )
  },

  get: (id: number) =>
    request<{ success: boolean; data: NIRecord }>(
      `${API_BASE}/api/ni-records/${id}`
    ),

  create: (data: Partial<NIRecord>) =>
    request<{ success: boolean; data: NIRecord }>(
      `${API_BASE}/api/ni-records`,
      { method: 'POST', body: JSON.stringify(data) }
    ),

  upload: async (file: File, vendorName: string, ingredName?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('vendor_name', vendorName)
    if (ingredName) formData.append('ingred_name', ingredName)

    const email = getUserEmail()
    const headers: Record<string, string> = {}
    if (email) headers['X-User-Email'] = email

    const res = await fetch(`${API_BASE}/api/ni-records/upload`, {
      method: 'POST',
      headers,
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(err.detail || `Upload failed: ${res.status}`)
    }
    return res.json() as Promise<{ success: boolean; data: NIRecord; parsed_fields: string[] }>
  },

  uploadText: (textContent: string, vendorName: string, ingredName?: string) =>
    request<{ success: boolean; data: NIRecord; parsed_fields: string[] }>(
      `${API_BASE}/api/ni-records/upload-text`,
      {
        method: 'POST',
        body: JSON.stringify({
          text_content: textContent,
          vendor_name: vendorName,
          ingred_name: ingredName || undefined,
        }),
      }
    ),

  update: (id: number, data: Partial<NIRecord>) =>
    request<{ success: boolean; data: NIRecord }>(
      `${API_BASE}/api/ni-records/${id}`,
      { method: 'PUT', body: JSON.stringify(data) }
    ),

  delete: (id: number) =>
    request<{ success: boolean; message: string }>(
      `${API_BASE}/api/ni-records/${id}`,
      { method: 'DELETE' }
    ),
}

export const niReportsApi = {
  list: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
    ).toString()
    return request<{
      records: NIReport[]
      total: number
      page: number
      per_page: number
      total_pages: number
    }>(`${API_BASE}/api/ni-reports${qs ? `?${qs}` : ''}`)
  },

  get: (id: number) =>
    request<{ success: boolean; data: NIReport }>(
      `${API_BASE}/api/ni-reports/${id}`
    ),

  create: (data: {
    product_name: string
    serving_size_g: number
    ingredients: { ingred_name: string; percentage: number; ni_record_id?: number | null }[]
    warehouse?: string
    report_date?: string
  }) =>
    request<{ success: boolean; data: NIReport }>(
      `${API_BASE}/api/ni-reports`,
      { method: 'POST', body: JSON.stringify(data) }
    ),

  update: (id: number, data: any) =>
    request<{ success: boolean; data: NIReport }>(
      `${API_BASE}/api/ni-reports/${id}`,
      { method: 'PUT', body: JSON.stringify(data) }
    ),

  delete: (id: number) =>
    request<{ success: boolean; message: string }>(
      `${API_BASE}/api/ni-reports/${id}`,
      { method: 'DELETE' }
    ),

  getPdfUrl: (id: number) => `${API_BASE}/api/ni-reports/${id}/pdf`,
}
