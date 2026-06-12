// X-Ray Detection API Service
//
// A saved record is a *batch* (one X-Ray sheet) that holds many hourly entries.
// The header (location / machine id / details) is fixed on the backend.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** One hourly X-Ray check row (input shape, no id). */
export interface XRayEntryInput {
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

export interface XRayEntry extends XRayEntryInput {
  id: number
  record_id: number
  created_at: string
  updated_at: string
}

/** Parent batch row as shown in the list (no entries).
 *  products/batch_nos/checked_by/verified_by are summarized from the sheet's rows. */
export interface XRayRecordSummary {
  id: number
  batch_id: string
  check_date: string
  location: string | null
  machine_id: string | null
  machine_details: string | null
  status: string | null
  entry_count: number
  products?: string | null
  batch_nos?: string | null
  checked_by?: string | null
  verified_by?: string | null
  created_at: string
  updated_at: string
}

/** A batch with all its entries. */
export interface XRayBatch extends XRayRecordSummary {
  entries: XRayEntry[]
}

export interface XRayBatchCreateInput {
  check_date?: string
  entries: XRayEntryInput[]
}

export interface XRayBatchUpdateInput {
  check_date?: string
  status?: string
  entries?: Partial<XRayEntryInput>[]
}

/** Create a whole X-Ray sheet (parent + all rows) in one submit. */
export async function createXRayBatch(data: XRayBatchCreateInput): Promise<XRayBatch> {
  const res = await fetch(`${API_BASE_URL}/xray/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.detail || 'Failed to create X-Ray record')
  }
  return res.json()
}

/** List all batches (newest first), without entries. */
export async function getXRayRecords(): Promise<XRayRecordSummary[]> {
  const res = await fetch(`${API_BASE_URL}/xray/`, { headers: { ...authHeaders() } })
  if (!res.ok) throw new Error('Failed to fetch X-Ray records')
  const data = await res.json()
  return data.records || []
}

/** Get one batch with all its entries. */
export async function getXRayRecord(id: string | number): Promise<XRayBatch> {
  const res = await fetch(`${API_BASE_URL}/xray/${id}`, { headers: { ...authHeaders() } })
  if (!res.ok) throw new Error('Failed to fetch X-Ray record')
  return res.json()
}

/** Update a batch (record-level fields and/or the full entry list). */
export async function updateXRayBatch(id: string | number, data: XRayBatchUpdateInput): Promise<XRayBatch> {
  const res = await fetch(`${API_BASE_URL}/xray/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.detail || 'Failed to update X-Ray record')
  }
  return res.json()
}

/** Delete a whole batch and its entries. */
export async function deleteXRayRecord(id: string | number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/xray/${id}`, { method: 'DELETE', headers: { ...authHeaders() } })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.detail || 'Failed to delete X-Ray record')
  }
}

/** Delete a single row from a batch. */
export async function deleteXRayEntry(entryId: string | number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/xray/entry/${entryId}`, { method: 'DELETE', headers: { ...authHeaders() } })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.detail || 'Failed to delete entry')
  }
}

/** Fixed header for the single X-Ray machine (display only). */
export const XRAY_HEADER = {
  machineDetails: 'X-RAY',
  machineId: '61154479393',
  location: 'SECOND FLOOR FG AREA',
  ccp: 'CCP-2',
  documentNo: 'CFPLA.C2.F.20',
}
