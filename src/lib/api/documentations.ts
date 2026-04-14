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

export const ADMIN_EMAIL = 'pooja.parkar@candorfoods.in'

export function isDocAdmin(): boolean {
  const email = getUserEmail()
  return !!email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
}
