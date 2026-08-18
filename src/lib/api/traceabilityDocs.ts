// frontend/src/lib/api/traceabilityDocs.ts
//
// Documents Review Checklist photos, shared by the Traceability Report
// (CFPLA.C3.F.30) and the Mock Recall (CFPLA.C3.F.31) — the two formats review
// the same document set for the same batch.
//
// Record CRUD reuses the generic documentations endpoints via the
// `traceability` / `mock-recall` DOC_REGISTRY entries, and the URLs below are
// stored inside the existing `documents_review` jsonb rather than a column of
// their own. Only the upload needs bespoke transport, because these land in
// s3://complaint-module-images/Traceability records/ rather than the complaints
// prefix. Mirrored in qc/routers/traceability_docs.py.

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || ''

/** Mirrors ALLOWED_EXTENSIONS / MAX_BYTES on the server. Checked here first so
 *  a bad pick fails instantly instead of after the upload round-trip. */
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024

/** Error message if the file is unacceptable, null if it is fine. */
export function validateReviewImage(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return 'Only JPEG, PNG or WebP images are allowed'
  if (file.size > MAX_BYTES) return 'Image must be smaller than 10MB'
  return null
}

/**
 * Upload one checklist photo and return its public S3 URL.
 *
 * `batch` and `document` only shape the S3 object name, so the flat folder can
 * be browsed in the S3 console. Both are optional: a photo can be attached
 * before the batch number has been typed.
 */
export async function uploadReviewImage(
  file: File,
  opts: { batch?: string; document?: string } = {},
): Promise<string> {
  const invalid = validateReviewImage(file)
  if (invalid) throw new Error(invalid)

  const body = new FormData()
  body.append('file', file)

  const qs = new URLSearchParams()
  if (opts.batch) qs.set('batch', opts.batch)
  if (opts.document) qs.set('document', opts.document)
  const query = qs.toString()

  const token = localStorage.getItem('access_token')
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
    throw new Error(err.detail || 'Failed to upload image')
  }
  const data = await res.json()
  if (!data?.url) throw new Error('Upload succeeded but returned no URL')
  return data.url as string
}

/** Remove a checklist photo from S3. Best-effort: callers drop the thumbnail
 *  either way, since an orphaned object is less harmful than a stuck form. */
export async function deleteReviewImage(url: string): Promise<void> {
  const token = localStorage.getItem('access_token')
  await fetch(`${API_BASE}/api/traceability/review-image?url=${encodeURIComponent(url)}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).catch(() => undefined)
}
