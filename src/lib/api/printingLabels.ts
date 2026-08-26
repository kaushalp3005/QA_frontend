// frontend/src/lib/api/printingLabels.ts
//
// Batch Coding Register (see DOC_META below) — the Printing Label register.
//
// Record CRUD reuses the generic documentations endpoints via the
// `printing-labels` DOC_REGISTRY entry, so there is no bespoke CRUD client here.
// Only the label-sample image needs its own transport, because it lands in
// s3://complaint-module-images/printing_labels/ rather than the complaints prefix.

import { docsApi, isDocAdminFor } from '@/lib/api/documentations'
import { isSuperAdmin } from '@/lib/constants/modules'
import { getUserEmail } from '@/lib/warehouseAccess'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || ''

/** DOC_REGISTRY slug — must match qc/config/doc_registry.py. */
export const FORM_TYPE = 'printing-labels'

/** qc_module_permissions.module_code governing this register. The route and
 *  labels say "Printing Label", but the permission code stayed `section_1` from
 *  when the section was created — renaming it would mean migrating every
 *  granted row, so both names coexist. Mirrored in qc/routers/printing_labels.py. */
export const MODULE_CODE = 'section_1'

/**
 * May the signed-in account delete register entries?
 *
 * Mirrors the server rule in printing_labels.py::_may_delete — a documentation
 * admin (full, or scoped to this record's plant), or anyone holding can_delete
 * on the module. Pass the record's warehouse so a scoped admin is judged
 * against the right plant.
 *
 * Returns false during SSR (no localStorage); every caller renders after a
 * client-side fetch, so nothing flips between server and client HTML.
 */
export function canDeleteEntries(warehouse?: string | null): boolean {
  if (typeof window === 'undefined') return false
  if (isDocAdminFor(warehouse)) return true
  if (isSuperAdmin(getUserEmail())) return true
  try {
    const perms = JSON.parse(localStorage.getItem('permissions') || '{}')
    return Boolean(perms?.[MODULE_CODE]?.delete)
  } catch {
    return false
  }
}

/** Controlled-document metadata for the register. Single source of truth: the
 *  printed header/footer and every page subtitle read from here, so a document
 *  revision is a one-place edit. `doc_no` is mirrored in
 *  qc/config/doc_registry.py — keep the two in step. */
export const DOC_META = {
  format: 'Batch Coding Register',
  docNo: 'CFPL.C6.F.47',
  issueDate: '04/08/2021',
  issueNo: '03',
  revisionDate: '11/07/2026',
  revisionNo: '02',
  preparedBy: 'FST',
  approvedBy: 'FSTL',
} as const

/** The register's Parameter column, in the order printed on the form.
 *  Kept as a flat list so a form revision is a one-line change here and needs
 *  no migration — `parameters` is jsonb. */
export const PRINTING_LABEL_PARAMETERS = [
  'Product Name',
  'Customer Name',
  'Batch No',
  'Net Weight',
  'MRP',
  'USP',
  'Packing Date',
  'Expiry Date/ Use By',
  'EAN Number',
  'Regulatory Compliance',
  'WO Number',
  'Machine Number',
  'PM Qty Issued',
  'PM Qty Printed',
] as const

/** Who may sign the register's "Approved By" column. Free text is still allowed
 *  through the "Other" option — the column is varchar, not an enum, so a new
 *  approver never blocks an entry. */
export const APPROVED_BY_OPTIONS = [
  'Harsh',
  'Roshan',
  'Mayuresh',
  'Amarjeet',
  'Tejashree',
  'Pooja Parkar',
  'Pragati Vishe',
  'Abhishek Rane',
  'Arbaaj',
  'Soham',
] as const

/** A185 signs its own register — the list above is W202 staff. */
export const APPROVED_BY_OPTIONS_A185 = [
  'Sarvesh',
  'Swapnil',
  'Dhanashree',
] as const

/** Who may sign "Printed By" at A185. W202 has no agreed list, so the field
 *  stays free text there. */
export const PRINTED_BY_OPTIONS_A185 = [
  'Suraj Bhillare',
  'Raju Paikrao',
  'Shubham Mhatre',
  'Sachin Thorat',
  'Varsha Desai',
] as const

/** Approver pick-list for a plant. Anything other than A185 — including an
 *  entry saved before the column existed — gets the original list. */
export function approvedByOptions(warehouse?: string | null): readonly string[] {
  return warehouse === 'A185' ? APPROVED_BY_OPTIONS_A185 : APPROVED_BY_OPTIONS
}

/** Printer pick-list for a plant. Empty means "no list" — render free text. */
export function printedByOptions(warehouse?: string | null): readonly string[] {
  return warehouse === 'A185' ? PRINTED_BY_OPTIONS_A185 : []
}

/** Sentinel for the free-text choice; never stored, only a UI state. */
export const APPROVED_BY_OTHER = 'Other'

export interface ParameterRow {
  parameter: string
  details: string
  /** Operator ticked this parameter as applying to the entry. Unticked rows are
   *  still stored (so re-ticking restores what was typed) but are not shown as
   *  recorded values. */
  checked: boolean
}

/** 'draft' while the entry is still being filled in ("Submit Partially"),
 *  'submitted' once filed. Rows predating the column read as submitted. */
export type EntryStatus = 'draft' | 'submitted'

export function isDraft(record: { status?: string | null }): boolean {
  return (record.status ?? 'submitted') === 'draft'
}

export interface PrintingLabelRecord {
  id: number
  entry_date: string | null
  parameters: ParameterRow[]
  actual_label_url: string | null
  printed_by: string | null
  printed_on: string | null
  approved_by: string | null
  status: EntryStatus | null
  warehouse: string | null
  created_by: string | null
  created_at: string
  _prev_id?: number | null
  _next_id?: number | null
}

export type PrintingLabelPayload = Omit<
  PrintingLabelRecord,
  'id' | 'created_by' | 'created_at' | 'warehouse' | '_prev_id' | '_next_id'
> & { warehouse?: string | null }

/** A blank parameter block — every parameter present, details empty, so the
 *  stored array always has the same shape and order as the paper form. */
export function emptyParameters(): ParameterRow[] {
  return PRINTING_LABEL_PARAMETERS.map(
    (parameter) => ({ parameter, details: '', checked: false } as ParameterRow),
  )
}

/** Reconcile a stored block against the current parameter list: keeps entered
 *  values, adds parameters introduced by a form revision, and preserves any
 *  retired parameter that still holds data rather than silently dropping it. */
export function normalizeParameters(stored: ParameterRow[] | null | undefined): ParameterRow[] {
  const byName = new Map((stored ?? []).map((r) => [r.parameter, r]))
  const rows: ParameterRow[] = PRINTING_LABEL_PARAMETERS.map((parameter) => {
    const prev = byName.get(parameter)
    return {
      parameter,
      details: prev?.details ?? '',
      // Rows saved before the checkbox existed carry no `checked`. Treating a
      // filled value as ticked keeps those entries displaying as recorded
      // instead of silently blanking them.
      checked: prev?.checked ?? Boolean(prev?.details),
    }
  })
  const known = new Set<string>(PRINTING_LABEL_PARAMETERS)
  for (const row of stored ?? []) {
    if (!known.has(row.parameter) && row.details) {
      rows.push({ ...row, checked: row.checked ?? true })
    }
  }
  return rows
}

/** Only the parameters the operator ticked — what counts as recorded. */
export function checkedParameters(record: PrintingLabelRecord): ParameterRow[] {
  return normalizeParameters(record.parameters).filter((r) => r.checked)
}

/** Convenience lookup for list/table columns (e.g. show Batch No per row).
 *  Returns nothing for an unticked parameter, so the list never shows a value
 *  the operator did not record. */
export function detailOf(record: PrintingLabelRecord, parameter: string): string {
  const row = normalizeParameters(record.parameters).find((r) => r.parameter === parameter)
  return row?.checked ? row.details : ''
}

// The generic docs endpoints are schema-less by design — they reflect whatever
// columns the table has and hand back plain dicts. These wrappers are the one
// place that asserts the doc_printing_labels row shape, so the pages downstream
// get real types instead of Record<string, any>.
export const printingLabelsApi = {
  list: async (params: Record<string, any> = {}) => {
    // `warehouse: null` switches off docsApi's default plant filter. This
    // register is one book for the printing team, not one per plant: entries
    // are still stamped with a warehouse (scoped admins need it to delete), but
    // filtering the listing by the browser's active plant hides every entry
    // whenever that plant is not the one the entry was written under — which is
    // the default on any browser that has never picked a plant.
    const res = await docsApi.list(FORM_TYPE, { warehouse: null, ...params })
    return { ...res, records: (res.records ?? []) as unknown as PrintingLabelRecord[] }
  },

  get: async (id: number) => {
    const res = await docsApi.get(FORM_TYPE, id)
    return { ...res, data: res.data as unknown as PrintingLabelRecord }
  },

  create: async (data: PrintingLabelPayload) => {
    const res = await docsApi.create(FORM_TYPE, data)
    return { ...res, data: res.data as unknown as PrintingLabelRecord }
  },

  update: async (id: number, data: PrintingLabelPayload) => {
    const res = await docsApi.update(FORM_TYPE, id, data)
    return { ...res, data: res.data as unknown as PrintingLabelRecord }
  },

  /** Delete an entry (and its S3 label sample).
   *
   *  Not docsApi.delete: the generic route only ever allows a documentation
   *  admin, so the Printing account would get a 403. This endpoint honours the
   *  module's can_delete grant instead, and authorises off the bearer token
   *  rather than a client-supplied email header. */
  remove: async (id: number) => {
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE}/api/printing-labels/entries/${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(err.detail || 'Failed to delete entry')
    }
    return res.json() as Promise<{ success: boolean; message: string }>
  },

  /** Every entry recorded on one date, oldest first — one page of the register.
   *  Served by a dedicated endpoint because the generic /api/docs listing only
   *  filters by warehouse. */
  byDate: async (date: string, warehouse?: string | null, includeDrafts = false) => {
    const qs = new URLSearchParams({ date })
    if (warehouse) qs.set('warehouse', warehouse)
    if (includeDrafts) qs.set('include_drafts', 'true')
    // Token required: the server derives the caller's pinned plant from it and
    // overrides `warehouse` accordingly.
    const token = localStorage.getItem('access_token')
    const res = await fetch(`${API_BASE}/api/printing-labels/by-date?${qs}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(err.detail || 'Failed to load entries for this date')
    }
    const data = await res.json()
    return (data.records ?? []) as PrintingLabelRecord[]
  },
}

// ── Label sample image (S3) ───────────────────────────────────────────────────

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024

/** Client-side check so an oversized or wrong-typed file never leaves the
 *  browser. The backend enforces the same rules independently. */
export function validateLabelImage(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return 'Only JPG, PNG or WebP images are allowed'
  if (file.size > MAX_BYTES) return 'Image must be smaller than 10MB'
  return null
}

/** Upload a label sample; resolves to its public S3 URL. */
export async function uploadLabelImage(file: File): Promise<string> {
  const invalid = validateLabelImage(file)
  if (invalid) throw new Error(invalid)

  const body = new FormData()
  body.append('file', file)

  const token = localStorage.getItem('access_token')
  const res = await fetch(`${API_BASE}/api/printing-labels/upload-label`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Failed to upload label sample')
  }
  const data = await res.json()
  if (!data?.url) throw new Error('Upload succeeded but returned no URL')
  return data.url as string
}

/** Remove a label sample from S3. Best-effort: callers treat failure as
 *  non-fatal, since an orphaned object is less harmful than a blocked edit. */
export async function deleteLabelImage(url: string): Promise<void> {
  const token = localStorage.getItem('access_token')
  await fetch(`${API_BASE}/api/printing-labels/label?url=${encodeURIComponent(url)}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
}
