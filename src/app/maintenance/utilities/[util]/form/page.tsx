'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { Button, Card, ErrorBanner, PageHeader } from '@/components/maintenance/ui'
import {
  ComputedField,
  DateField,
  LockedRateField,
  NumericField,
  PlantSelector,
  TextField,
} from '@/components/maintenance/utilities/fields'
import {
  buildUtilityBody,
  canSubmitUtility,
  computeUtility,
  decimalsFor,
  formatUtilityNumber,
  isRequiredAt,
  listUtility,
  parseNum,
  recordNumber,
  submitUtility,
  utilityFromSlug,
  utilityPrefill,
  type UtilityType,
} from '@/lib/maintenance/api/utilities'
import { isoDateIst } from '@/lib/maintenance/format'
import { MT } from '@/lib/maintenance/nav'

/** Parse the numeric inputs; blank or invalid → null. */
function numericFrom(type: UtilityType, inputs: Record<string, string>) {
  const out: Record<string, number | null> = {}
  for (const f of type.inputs) if (f.kind === 'NUMBER') out[f.key] = parseNum(inputs[f.key])
  return out
}

function UtilityForm({ slug }: { slug: string }) {
  const type = utilityFromSlug(slug)
  const router = useRouter()
  const search = useSearchParams()
  const editPlant = search.get('plant') || null
  const editDate = search.get('date') || null
  const isEditing = !!(editPlant && editDate)

  const [plant, setPlant] = useState(editPlant ?? 'A185')
  const [readingDate, setReadingDate] = useState(editDate ?? isoDateIst())
  const [inputs, setInputs] = useState<Record<string, string>>(() =>
    Object.fromEntries(type.inputs.map((f) => [f.key, f.default])),
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const prefillSeq = useRef(0)

  const numbers = useMemo(() => numericFrom(type, inputs), [type, inputs])
  const computed = useMemo(() => computeUtility(type, numbers), [type, numbers])
  // Required fields depend on the plant (W-202's DG has no kWh meter).
  const canSubmit = canSubmitUtility(type, plant, numbers)

  /** Previous closing → opening fields, supervisor price → rate field. Non-fatal. */
  async function loadPrefill(p: string, date: string) {
    const id = ++prefillSeq.current
    try {
      const r = await utilityPrefill(type.slug, p, date)
      if (id !== prefillSeq.current) return
      setInputs((cur) => {
        const next = { ...cur }
        for (const [key, value] of Object.entries(r.openings ?? {}))
          next[key] = value != null ? formatUtilityNumber(Number(value), decimalsFor(type, key)) : ''
        next[type.rateKey] = r.rate != null ? formatUtilityNumber(Number(r.rate), decimalsFor(type, type.rateKey)) : ''
        return next
      })
    } catch {
      // leave the field defaults in place
    }
  }

  useEffect(() => {
    if (isEditing) {
      // Refetch the plant's list and pick the day — there is no GET-one endpoint.
      listUtility(type.slug, editPlant)
        .then((rows) => {
          const rec = rows.find((r) => r.reading_date === editDate)
          if (!rec) return
          setInputs(
            Object.fromEntries(
              type.inputs.map((f) => [
                f.key,
                f.kind === 'NUMBER'
                  ? formatUtilityNumber(recordNumber(rec, f.key), f.decimals)
                  : rec[f.key] == null
                    ? ''
                    : String(rec[f.key]),
              ]),
            ),
          )
          if (rec.plant) setPlant(rec.plant)
          if (rec.reading_date) setReadingDate(rec.reading_date)
        })
        .catch((e) => setError(e?.message || 'Failed to load history'))
    } else {
      loadPrefill(plant, readingDate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function changePlant(p: string) {
    setPlant(p)
    // Never in edit mode — that would clobber the loaded record.
    if (!isEditing) loadPrefill(p, readingDate)
  }

  function changeDate(d: string) {
    setReadingDate(d)
    if (!isEditing) loadPrefill(plant, d)
  }

  async function submit() {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError(null)
    const texts = Object.fromEntries(type.inputs.filter((f) => f.kind === 'TEXT').map((f) => [f.key, inputs[f.key] ?? '']))
    try {
      await submitUtility(type.slug, buildUtilityBody(type, plant, readingDate, { ...numbers, ...computed }, texts))
      toast.success('Reading saved')
      router.replace(MT.utilityHistory(type.slug))
    } catch (e: any) {
      const msg = e?.message || 'Failed to save reading'
      setError(msg)
      toast.error(msg)
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={`${type.label} · ${isEditing ? 'Edit' : 'New'} reading`} back={MT.utilityHistory(type.slug)} />

      <Card className="mb-4 space-y-4 p-4">
        <PlantSelector value={plant} onChange={changePlant} />
        <DateField value={readingDate} onChange={changeDate} />
      </Card>

      <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-2">
        {type.inputs.map((f) => {
          const value = inputs[f.key] ?? ''
          const label = isRequiredAt(type, f, plant) ? f.label : `${f.label} (optional)`
          if (f.key === type.rateKey) return <LockedRateField key={f.key} label={f.label} value={value} />
          const set = (v: string) => setInputs((cur) => ({ ...cur, [f.key]: v }))
          return f.kind === 'NUMBER' ? (
            <NumericField key={f.key} label={label} value={value} onChange={set} />
          ) : (
            <TextField key={f.key} label={label} value={value} onChange={set} />
          )
        })}
      </Card>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Calculated</h2>
      <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-2">
        {type.computed.map((f) => (
          <ComputedField key={f.key} label={f.label} value={formatUtilityNumber(computed[f.key], f.decimals)} />
        ))}
      </Card>

      <ErrorBanner error={error} />
      <Button className="w-full" disabled={!canSubmit} loading={submitting} onClick={submit}>
        Submit
      </Button>
    </div>
  )
}

/** New / edit one day's utility reading (UtilityFormScreen). */
export default function UtilityFormPage({ params }: { params: { util: string } }) {
  const slug = decodeURIComponent(params.util)
  return (
    <Suspense fallback={null}>
      <UtilityForm key={slug} slug={slug} />
    </Suspense>
  )
}
