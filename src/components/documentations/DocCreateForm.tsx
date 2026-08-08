'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { docsApi } from '@/lib/api/documentations'

type DocFormComponent = React.ComponentType<{
  initialData?: Record<string, any>
  onSubmit?: (data: Record<string, any>) => Promise<void>
  isEdit?: boolean
}>

interface Props {
  /** Registry key passed to docsApi (the formType, not the route slug). */
  formType: string
  FormComponent: DocFormComponent
  /**
   * Record fields this create page will accept as query-string prefill, e.g.
   * `['employee_name', 'designation']` lets another page deep-link to
   * `?employee_name=…&designation=…` and land on a part-filled blank form.
   * Pass a module-level constant — a fresh array each render defeats memoing.
   */
  prefillFields?: readonly string[]
}

// Identity / bookkeeping fields belonging to the record being copied. They must
// not ride along into the new one — the duplicate gets its own id and timestamps.
const IDENTITY_FIELDS = ['id', 'created_at', 'updated_at', '_prev_id', '_next_id']

function stripIdentity(record: Record<string, any>): Record<string, any> {
  const copy = { ...record }
  IDENTITY_FIELDS.forEach((f) => delete copy[f])
  return copy
}

/**
 * Create page body for the documentation forms.
 *
 * Plain create is just the form. With `?duplicateFrom=<id>` it loads that
 * record first and hands it to the form as `initialData` — the same prop the
 * edit pages use, so no form needs its own duplicate support. Crucially it
 * passes no `onSubmit`, so the form falls back to `docsApi.create` and saves a
 * NEW record rather than updating the one it was copied from.
 */
function DocCreateFormInner({ formType, FormComponent, prefillFields }: Props) {
  const searchParams = useSearchParams()
  const duplicateFrom = searchParams.get('duplicateFrom')

  // Query-string prefill for a blank form. Duplicating wins if both are present.
  const prefill = useMemo(() => {
    if (!prefillFields?.length) return null
    const out: Record<string, string> = {}
    for (const field of prefillFields) {
      const value = searchParams.get(field)
      if (value) out[field] = value
    }
    return Object.keys(out).length ? out : null
  }, [searchParams, prefillFields])
  const [initialData, setInitialData] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(!!duplicateFrom)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    if (!duplicateFrom) return
    const id = Number(duplicateFrom)
    if (!Number.isFinite(id)) { setLoadError(true); setLoading(false); return }
    setLoading(true)
    setLoadError(false)
    docsApi.get(formType, id)
      .then((res) => setInitialData(stripIdentity(res.data)))
      .catch((e) => { console.error('Failed to load record to duplicate:', e); setLoadError(true) })
      .finally(() => setLoading(false))
  }, [duplicateFrom, formType])

  if (loading) {
    return (
      <div className="surface-card p-8 flex items-center justify-center gap-2 text-sm text-ink-500">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading record to duplicate…
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {duplicateFrom && loadError && (
        <div className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-2.5 text-sm text-danger-700">
          Couldn&apos;t load record #{duplicateFrom} to duplicate — starting from a blank form instead.
        </div>
      )}
      {duplicateFrom && initialData && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm text-ink-600">
          Duplicating record #{duplicateFrom} — adjust the fields as needed, then submit to save it as a new record.
        </div>
      )}
      {!duplicateFrom && prefill && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm text-ink-600">
          Prefilled from the training attendance sheet — check the details, complete the card, then submit to save it.
        </div>
      )}
      <FormComponent initialData={initialData ?? prefill ?? undefined} />
    </div>
  )
}

export default function DocCreateForm(props: Props) {
  // useSearchParams needs a Suspense boundary to keep the page prerenderable.
  return (
    <Suspense
      fallback={
        <div className="surface-card p-8 flex items-center justify-center gap-2 text-sm text-ink-500">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading…
        </div>
      }
    >
      <DocCreateFormInner {...props} />
    </Suspense>
  )
}
