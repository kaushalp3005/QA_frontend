'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { Button, ErrorBanner, PageHeader } from '@/components/maintenance/ui'
import { ComputedField, DateField, NumericField, SectionCard, TextField } from '@/components/maintenance/utilities/fields'
import {
  A185_PLANT,
  a185Prefill,
  listA185Readings,
  submitA185Reading,
  type A185ReadingDto,
} from '@/lib/maintenance/api/readings'
import { formatUtilityNumber, parseNum } from '@/lib/maintenance/api/utilities'
import { isoDateIst } from '@/lib/maintenance/format'
import { MT } from '@/lib/maintenance/nav'

const fmt = (v: number | null | undefined) => (v == null ? '' : formatUtilityNumber(Number(v), 3))

const diff = (i: string, f: string) => {
  const a = parseNum(i)
  const b = parseNum(f)
  return a != null && b != null ? b - a : null
}
/** Invalid only when both sides are present and Final < Initial */
const invalid = (i: string, f: string) => {
  const a = parseNum(i)
  const b = parseNum(f)
  return a != null && b != null && b < a
}

interface Fields {
  htInitial: string
  htFinal: string
  coldInitial: string
  coldFinal: string
  uvInitial: string
  uvFinal: string
  remark: string
}

const BLANK: Fields = { htInitial: '', htFinal: '', coldInitial: '', coldFinal: '', uvInitial: '', uvFinal: '', remark: '' }

const fromRow = (r: A185ReadingDto): Fields => ({
  htInitial: fmt(r.ht_initial),
  htFinal: fmt(r.ht_final),
  coldInitial: fmt(r.cold_initial),
  coldFinal: fmt(r.cold_final),
  uvInitial: fmt(r.uv_initial),
  uvFinal: fmt(r.uv_final),
  remark: r.remark ?? '',
})

function A185Form() {
  const router = useRouter()
  const search = useSearchParams()
  const [readingDate, setReadingDate] = useState(search.get('date') || isoDateIst())
  const [f, setF] = useState<Fields>(BLANK)
  const [pf, setPf] = useState(0.99)
  const [sourceDate, setSourceDate] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const seq = useRef(0)

  const htError = invalid(f.htInitial, f.htFinal)
  const coldError = invalid(f.coldInitial, f.coldFinal)
  const uvError = invalid(f.uvInitial, f.uvFinal)
  const anyFilled = [f.htInitial, f.htFinal, f.coldInitial, f.coldFinal, f.uvInitial, f.uvFinal].some((v) => v.trim())
  const canSubmit = anyFilled && !htError && !coldError && !uvError

  /** Prefill gives the PF + carried Initials; an already-saved day then loads its row. */
  async function loadDay(date: string) {
    const id = ++seq.current
    let editing = false
    try {
      const p = await a185Prefill(date)
      if (id !== seq.current) return
      editing = !!p.already_saved
      setPf(p.ht_power_factor ?? 0.99)
      setSourceDate(p.source_date ?? null)
      setIsEditing(editing)
      setF({
        ...BLANK,
        htInitial: fmt(p.openings?.ht_initial),
        coldInitial: fmt(p.openings?.cold_initial),
        uvInitial: fmt(p.openings?.uv_initial),
      })
    } catch {
      // non-fatal: leave blanks, the technician types them
    }
    if (!editing) return
    try {
      const rows = await listA185Readings(date, date)
      if (id !== seq.current || !rows[0]) return
      setF(fromRow(rows[0]))
      if (rows[0].ht_power_factor != null) setPf(rows[0].ht_power_factor)
      setIsEditing(true)
    } catch {
      // keep the prefill
    }
  }

  useEffect(() => {
    loadDay(readingDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function changeDate(d: string) {
    setReadingDate(d)
    loadDay(d)
  }

  const set = (k: keyof Fields) => (v: string) => setF((cur) => ({ ...cur, [k]: v }))

  async function submit() {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      // All six meters every save (null when blank) — consumptions and PF are the server's.
      await submitA185Reading({
        plant: A185_PLANT,
        reading_date: readingDate,
        ht_initial: parseNum(f.htInitial),
        ht_final: parseNum(f.htFinal),
        cold_initial: parseNum(f.coldInitial),
        cold_final: parseNum(f.coldFinal),
        uv_initial: parseNum(f.uvInitial),
        uv_final: parseNum(f.uvFinal),
        remark: f.remark.trim() || null,
      })
      toast.success(isEditing ? 'Readings updated' : 'Readings saved')
      router.replace(MT.a185Readings)
    } catch (e: any) {
      const msg = e?.message || 'Failed to save readings'
      setError(msg)
      toast.error(msg)
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="HT / Cold Room / UV" subtitle={isEditing ? 'Edit reading' : 'New reading'} back={MT.a185Readings} />
      <div className="space-y-4">
        <div>
          <DateField value={readingDate} onChange={changeDate} />
          {sourceDate && <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Openings carried from {sourceDate}</p>}
        </div>

        <SectionCard title="HT Panel" error={htError}>
          <NumericField label="KWH Initial" value={f.htInitial} onChange={set('htInitial')} invalid={htError} />
          <NumericField label="KWH Final" value={f.htFinal} onChange={set('htFinal')} invalid={htError} />
          <ComputedField label="PF (fixed)" value={formatUtilityNumber(pf, 2)} />
          <ComputedField label="KWH Consumption" value={formatUtilityNumber(diff(f.htInitial, f.htFinal), 3)} />
        </SectionCard>

        <SectionCard title="Cold Room" error={coldError}>
          <NumericField label="Initial Reading" value={f.coldInitial} onChange={set('coldInitial')} invalid={coldError} />
          <NumericField label="Final Reading" value={f.coldFinal} onChange={set('coldFinal')} invalid={coldError} />
          <ComputedField label="Cold Consumption" value={formatUtilityNumber(diff(f.coldInitial, f.coldFinal), 3)} />
        </SectionCard>

        <SectionCard title="UV" error={uvError}>
          <NumericField label="Initial Reading" value={f.uvInitial} onChange={set('uvInitial')} invalid={uvError} />
          <NumericField label="Final Reading" value={f.uvFinal} onChange={set('uvFinal')} invalid={uvError} />
          <ComputedField label="UV Consumption" value={formatUtilityNumber(diff(f.uvInitial, f.uvFinal), 3)} />
        </SectionCard>

        <TextField label="Remark (optional)" value={f.remark} onChange={set('remark')} />

        <ErrorBanner error={error} />
        <Button className="w-full" disabled={!canSubmit} loading={submitting} onClick={submit}>
          {submitting ? 'Saving…' : isEditing ? 'Update readings' : 'Save readings'}
        </Button>
      </div>
    </div>
  )
}

/** A-185 daily form — HT Panel, Cold Room and UV on one date (A185ReadingFormScreen). */
export default function A185FormPage() {
  return (
    <Suspense fallback={null}>
      <A185Form />
    </Suspense>
  )
}
