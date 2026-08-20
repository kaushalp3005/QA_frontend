// frontend/src/lib/api/traceabilityDocs.ts
//
// Documents Review Checklist attachments, shared by the Traceability Report
// (CFPLA.C3.F.30) and the Mock Recall (CFPLA.C3.F.31) — the two formats review
// the same document set for the same batch.
//
// An attachment is either a photo of the document or the document itself as a
// PDF. Record CRUD reuses the generic documentations endpoints via the
// `traceability` / `mock-recall` DOC_REGISTRY entries, and the URLs below are
// stored inside the existing `documents_review` jsonb rather than a column of
// their own. Only the upload needs bespoke transport, because these land in
// s3://complaint-module-images/Traceability records/ rather than the complaints
// prefix. Mirrored in qc/routers/traceability_docs.py.

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || ''

/** Mirrors ALLOWED_EXTENSIONS / MAX_*_BYTES on the server. Checked here first so
 *  a bad pick fails instantly instead of after the upload round-trip. */
const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']
const PDF_TYPE = 'application/pdf'

/** Two caps, matching the server: a photo of a document is a phone snap, but
 *  the document's own PDF is often a multi-page scan well past 10MB. */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_PDF_BYTES = 25 * 1024 * 1024

/** The file input's `accept`, so the picker offers both kinds in one dialog. */
export const REVIEW_FILE_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf'

/** True when this URL points at a PDF rather than an image. The stored URLs
 *  keep their uploaded extension, and S3 appends only a timestamp before it,
 *  so the extension survives — but a query string can follow it. */
export function isPdfUrl(url: string): boolean {
  return /\.pdf(?:[?#]|$)/i.test(url)
}

/** The filename to show for an attachment, decoded out of its S3 key. */
export function fileNameFromUrl(url: string): string {
  try {
    const path = decodeURIComponent(url.split(/[?#]/)[0])
    return path.slice(path.lastIndexOf('/') + 1) || 'attachment'
  } catch {
    return 'attachment'
  }
}

/** True when the picked file is a PDF. Some Android pickers hand back an empty
 *  `type`, so the extension is the fallback — the server validates on extension
 *  either way, and disagreeing with it would reject files it would accept. */
function isPdfFile(file: File): boolean {
  return file.type === PDF_TYPE || (!file.type && /\.pdf$/i.test(file.name))
}

function isImageFile(file: File): boolean {
  if (IMAGE_TYPES.includes(file.type)) return true
  return !file.type && IMAGE_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
}

/** Error message if the file is unacceptable, null if it is fine. */
export function validateReviewFile(file: File): string | null {
  if (isPdfFile(file)) {
    if (file.size > MAX_PDF_BYTES) return 'PDF must be smaller than 25MB'
    return null
  }
  if (!isImageFile(file)) return 'Only JPEG, PNG, WebP images or PDF files are allowed'
  if (file.size > MAX_IMAGE_BYTES) return 'Image must be smaller than 10MB'
  return null
}

/**
 * Upload one checklist attachment and return its public S3 URL.
 *
 * `batch` and `document` only shape the S3 object name, so the flat folder can
 * be browsed in the S3 console. Both are optional: a file can be attached
 * before the batch number has been typed.
 */
export async function uploadReviewFile(
  file: File,
  opts: { batch?: string; document?: string } = {},
): Promise<string> {
  const invalid = validateReviewFile(file)
  if (invalid) throw new Error(invalid)

  const body = new FormData()
  body.append('file', file)

  const qs = new URLSearchParams()
  if (opts.batch) qs.set('batch', opts.batch)
  if (opts.document) qs.set('document', opts.document)
  const query = qs.toString()

  const token = localStorage.getItem('access_token')
  // The route path still says "image" although PDFs go through it too — it is
  // the deployed URL, and renaming it would break browsers on the old bundle.
  const res = await fetch(
    `${API_BASE}/api/traceability/upload-review-image${query ? `?${query}` : ''}`,
    {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Failed to upload file')
  }
  const data = await res.json()
  if (!data?.url) throw new Error('Upload succeeded but returned no URL')
  return data.url as string
}

/** Remove a checklist attachment from S3. Best-effort: callers drop the
 *  thumbnail either way, since an orphaned object is less harmful than a stuck
 *  form. */
export async function deleteReviewFile(url: string): Promise<void> {
  const token = localStorage.getItem('access_token')
  await fetch(`${API_BASE}/api/traceability/review-image?url=${encodeURIComponent(url)}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).catch(() => undefined)
}
