/**
 * Batch Detection — check a photographed pack label against the SKU master.
 *
 * Backed by /api/batch-detection on the QC backend
 * (qc/routers/batch_detection.py): the server reads the photo with AWS Textract
 * and runs the label rules. The SKU (qc_label_orders) gives net weight, MRP,
 * USP and shelf life; the packing date is entered for the run, and the expiry
 * and batch code are worked out from it. Nothing is stored on either side — no upload to S3,
 * no record saved, nothing kept in browser storage.
 *
 * Same origin as NEXT_PUBLIC_API_BASE_URL, so FetchInterceptor attaches the
 * token and handles the 401 refresh; nothing auth-related happens here.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
const PREFIX = '/api/batch-detection'

export const MODULE_CODE = 'batch_detection'

export type CheckResult = 'pass' | 'fail' | 'unclear'
export type LabelStatus = 'PASS' | 'FAIL' | 'UNCLEAR'

/** Textract BoundingBox: fractions (0–1) of the photo's width and height. */
export interface LabelBox {
  Left: number
  Top: number
  Width: number
  Height: number
}

export interface LabelCheck {
  field: string
  label: string
  result: CheckResult
  found: string | null
  expected: string | null
  fix: string | null
  box: LabelBox | null
}

export interface VerifyResult {
  status: LabelStatus
  checks: LabelCheck[]
}

/** One row of the SKU master (qc_label_orders). */
export interface LabelSku {
  id: number
  customer: string
  brand: string
  product_name: string
  name_on_pack: string | null
  customer_sku_code: string | null
  grammage_g: string | null
  shelf_life_days: number | null
  ean_code: string | null
  code_type: string | null
  mrp: string | null // "200.00"; null = not in the master, cannot be checked
  usp_per_g: string | null
  /** Brand's batch prefix ('CFT-', '' for none); null = not known, only the
   *  date code is checked. */
  batch_prefix: string | null
}

/** Shelf life the label profile falls back to when the SKU has none. */
export const DEFAULT_SHELF_LIFE_DAYS = 270

export class BatchDetectionError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'BatchDetectionError'
    this.status = status
  }
}

function buildUrl(path: string, params: Record<string, unknown> = {}): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.append(key, String(value))
  })
  const qs = search.toString()
  return `${API_BASE_URL}${PREFIX}${path}${qs ? `?${qs}` : ''}`
}

/** FastAPI puts the reason in `detail` (a string here); the QC permission gate
 *  sends `detail: {message}` instead. */
function errorText(body: any): string {
  if (typeof body?.detail === 'string') return body.detail
  if (typeof body?.detail?.message === 'string') return body.detail.message
  if (typeof body?.message === 'string') return body.message
  return ''
}

async function send<T>(url: string, init: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, init)
  } catch {
    throw new BatchDetectionError('Could not reach the server.', 0)
  }
  if (!response.ok) {
    let detail = ''
    try {
      detail = errorText(await response.json())
    } catch {
      /* non-JSON error body (e.g. a gateway error page) */
    }
    if (response.status === 401) throw new BatchDetectionError('Your session has expired.', 401)
    if (response.status === 403) throw new BatchDetectionError(detail || 'You do not have access to Batch Detection.', 403)
    if (response.status === 413) throw new BatchDetectionError('The photo is too large. Retake it.', 413)
    if (response.status === 504) throw new BatchDetectionError('Checking took too long. Try again.', 504)
    throw new BatchDetectionError(detail || `Request failed (${response.status}).`, response.status)
  }
  return (await response.json()) as T
}

export const batchDetectionApi = {
  /** Active SKUs. `search` is split into words; every word must appear somewhere in
   *  the product name, name on pack, SKU code, EAN, brand or customer, any order. */
  async listSkus(company: string, search?: string): Promise<LabelSku[]> {
    const res = await send<{ skus: LabelSku[] }>(
      buildUrl('/skus', { company, search: search?.trim() || undefined, limit: 50 }),
      { method: 'GET' },
    )
    return res.skus
  },

  /** Send one label photo; the server keeps it in memory for this request only. */
  verify(
    company: string,
    skuId: number,
    packingDate: string, // YYYY-MM-DD
    photo: Blob,
    filename = 'label.jpg',
  ): Promise<VerifyResult> {
    const form = new FormData()
    form.append('image', photo, filename)
    form.append('skuId', String(skuId))
    form.append('packingDate', packingDate)
    // No Content-Type header: the browser sets multipart/form-data with its boundary.
    return send<VerifyResult>(buildUrl('/verify', { company }), { method: 'POST', body: form })
  },
}

/** 2026-11-24 → 24-11-2026, the format printed on the label. */
export function formatLabelDate(iso: string | null): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return d && m && y ? `${d}-${m}-${y}` : iso
}

/** Today in the browser's time zone as YYYY-MM-DD (the plant's local day). */
export function todayIso(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December']

/**
 * Batch date code, same rule as the backend (qc/config/label_profiles.py):
 * <year letter><month letter><DD>. Year A = 2017 … I = 2025, J = 2026;
 * month A = January … K = November, L = December. 2026-11-24 → JK24.
 */
export function batchCode(isoDate: string): { code: string; meaning: string } | null {
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d || y < 2017 || y > 2042) return null
  const yl = String.fromCharCode(65 + y - 2017)
  const ml = String.fromCharCode(65 + m - 1)
  const dd = String(d).padStart(2, '0')
  return { code: `${yl}${ml}${dd}`, meaning: `${yl} = ${y}, ${ml} = ${MONTHS[m - 1]}, ${dd} = day` }
}

/** The batch the label must carry, e.g. CFT-JK24; "…JK24" when the prefix is unknown. */
export function expectedBatch(prefix: string | null, isoDate: string): string | null {
  const bc = batchCode(isoDate)
  return bc ? `${prefix ?? '…'}${bc.code}` : null
}

/** packing date + shelf life days, as YYYY-MM-DD. */
export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + days))
  return t.toISOString().slice(0, 10)
}
