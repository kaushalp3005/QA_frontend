// frontend/src/lib/api/training.ts
//
// Cross-form lookups for the Training module. The Employee Training Card uses
// these to pull an employee's sessions out of Training Attendance Sheets.

import { getStoredWarehouse } from '@/components/ui/WarehouseSelector'
import { getUserEmail } from '@/lib/warehouseAccess'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || ''

async function request<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const email = getUserEmail()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(email && { 'X-User-Email': email }),
    ...((options.headers as Record<string, string>) || {}),
  }
  const res = await fetch(url, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `Request failed: ${res.status}`)
  }
  return res.json()
}

/** One attendance-sheet session, already shaped as a training card row. */
export interface AttendanceSession {
  attendance_id: number
  doc_no: string
  warehouse: string | null
  // Card row fields
  date: string | null
  total_hours: number | null
  topics_covered: string
  trainer: string
  acknowledgement: string
  // Context for the picker
  attendee_name: string
  designation: string
  venue: string
  department: string
  evaluation_result: string
  effectiveness_result: string
  average_scoring: number | null
  training_status: string
}

export interface AttendanceLookupResult {
  success: boolean
  employee_name: string
  /** "partial" means no sheet spelled the name exactly — treat matches as suggestions. */
  match_type: 'exact' | 'partial'
  count: number
  sessions: AttendanceSession[]
}

/** An Employee Training Card that may belong to a given attendee. */
export interface CardMatch {
  card_id: number
  employee_name: string
  designation: string
  warehouse: string | null
  /** How many rows the card already holds — shown in the chooser. */
  row_count: number
  /** 0 designation agrees · 1 designation blank on a side · 2 designation differs */
  match_rank: 0 | 1 | 2
}

export interface CardForEmployeeResult {
  success: boolean
  employee_name: string
  designation: string
  warehouse: string | null
  /** Cards judged to be this person. Exactly one → open it directly. */
  matches: CardMatch[]
  /** Same name, different designation — offered in a chooser, never auto-opened. */
  others: CardMatch[]
}

export const trainingApi = {
  /** Sessions from Training Attendance Sheets that list this employee. */
  lookupAttendance: (employeeName: string, warehouse?: string | null) => {
    const params = new URLSearchParams({ employee_name: employeeName })
    const wh = warehouse === undefined ? getStoredWarehouse() : warehouse
    if (wh) params.set('warehouse', wh)
    return request<AttendanceLookupResult>(
      `${API_BASE}/api/training/attendance-lookup?${params}`
    )
  },

  /** Training cards that may belong to this attendee (see CardForEmployeeResult). */
  findCardForEmployee: (
    employeeName: string,
    designation?: string | null,
    warehouse?: string | null
  ) => {
    const params = new URLSearchParams({ employee_name: employeeName })
    if (designation) params.set('designation', designation)
    const wh = warehouse === undefined ? getStoredWarehouse() : warehouse
    if (wh) params.set('warehouse', wh)
    return request<CardForEmployeeResult>(
      `${API_BASE}/api/training/card-for-employee?${params}`
    )
  },

  /** One attendance session, already shaped as a single training card row. */
  attendanceRow: (attendanceId: number, employeeName: string) => {
    const params = new URLSearchParams({ employee_name: employeeName })
    return request<{ success: boolean; row: AttendanceSession }>(
      `${API_BASE}/api/training/attendance/${attendanceId}/row?${params}`
    )
  },

  /** Attendance sheets currently linked to a saved training card. */
  cardSources: (cardId: number) =>
    request<{
      success: boolean
      card_id: number
      sources: {
        attendance_id: number
        linked_at: string | null
        training_date: string | null
        conducted_by: string | null
        key_points_covered: string | null
      }[]
    }>(`${API_BASE}/api/training/card/${cardId}/sources`),
}
