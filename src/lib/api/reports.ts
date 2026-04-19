// frontend/src/lib/api/reports.ts

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || ''

export interface ReportRecord {
  form_type: string
  label: string
  record_id: number
  created_at: string | null
  created_by: string | null
}

export interface ReportsResponse {
  success: boolean
  range: 'today' | 'week' | 'month'
  since: string
  total: number
  counts_by_form: Record<string, number>
  records: ReportRecord[]
}

function getUserEmail(): string | null {
  if (typeof window === 'undefined') return null
  const direct = localStorage.getItem('user_email')
  if (direct) return direct
  const userStr = localStorage.getItem('user')
  if (!userStr) return null
  try {
    const u = JSON.parse(userStr) as { email?: string }
    return u.email ?? null
  } catch {
    return null
  }
}

export async function getDocumentationsReport(range: 'today' | 'week' | 'month'): Promise<ReportsResponse> {
  const email = getUserEmail()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(email && { 'X-User-Email': email }),
  }
  const res = await fetch(`${API_BASE}/api/reports/documentations?range=${range}`, { headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `Request failed: ${res.status}`)
  }
  return res.json()
}

export const REPORTS_ALLOWED_EMAILS = [
  'pooja.parkar@candorfoods.in',
  'ai2@candorfoods.in',
]

export function canAccessReports(): boolean {
  const email = getUserEmail()
  return !!email && REPORTS_ALLOWED_EMAILS.includes(email.toLowerCase())
}
