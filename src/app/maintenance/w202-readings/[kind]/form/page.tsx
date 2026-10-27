'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { Button, ErrorBanner, PageHeader } from '@/components/maintenance/ui'
import { ComputedField, DateField, NumericField, SectionCard, TextField } from '@/components/maintenance/utilities/fields'
import {
  listW202Readings,
  submitW202Reading,
  w202KindFromSlug,
  w202Prefill,
  W202_DEFAULT_POWER_FACTOR,
  W202_KINDS,
  W202_PLANT,
  type W202Kind,
  type W202ReadingDto,
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
const invalid = (i: string, f: string) => {
  const a = parseNum(i)
  const b = parseNum(f)
  return a != null && b != null && b < a
}

interface Fields {
  initialKwh: string
  finalKwh: string
  initialKvah: string
  finalKvah: string
  remark: string
}

const BLANK: Fields = { initialKwh: '', finalKwh: '', initialKvah: '', finalKvah: '', remark: '' }
const DEFAULT_PF = formatUtilityNumber(W202_DEFAULT_POWER_FACTOR, 2)

function W202Form({ kind }: { kind: W202Kind }) {
  const meta = W202_KINDS[kind]
  const router = useRouter()
  const search = useSearchParams()
  const [readingDate, setReadingDate] = useState(search.get('date') || isoDateIst())
  const [f, setF] = useState<Fields>(BLANK)
  /** Main only — Solar's is derived */
  const [powerFactor, setPowerFactor] = useState(meta.powerFactorEditable ? DEFAULT_PF : '')
  const [sourceDate, setSourceDate] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const seq = useRef(0)

  const kwh = diff(f.initialKwh, f.finalKwh)
  const kvah = diff(f.initialKvah, f.finalKvah)
  // Solar PF preview = KWH ÷ KVAH, dash rather than divide by zero
  const solarPf = kwh != null && kvah != null && kvah !== 0 ? kwh / kvah : null
  const kwhError = invalid(f.initialKwh, f.finalKwh)
  const kvahError = invalid(f.initialKvah, f.finalKvah)
  const anyFilled = [f.initialKwh, f.finalKwh, f.initialKvah, f.finalKvah].some((v) => v.trim())
  const canSubmit = anyFilled && !kwhError && !kvahError

  function applyRow(row: W202ReadingDto) {
    setF({
      initialKwh: fmt(row.initial_kwh),
      finalKwh: fmt(row.final_kwh),
      initialKvah: fmt(row.initial_kvah),
      finalKvah: fmt(row.final_kvah),
      remark: row.remark ?? '',
    })
    if (meta.powerFactorEditable && row.power_factor != null) setPowerFactor(formatUtilityNumber(row.power_factor, 2))
    setIsEditing(true)
  }

  async function loadDay(date: string) {
    const id = ++seq.current
    let editing = false
    try {
      const p = await w202Prefill(kind, date)
      if (id !== seq.current) return
      editing = !!p.already_saved
      setSourceDate(p.source_date ?? null)
      setIsEditing(editing)
      // Carried forward for Main; blank for Solar and on the very first day.
      setF({ ...BLANK, initialKwh: fmt(p.openings?.initial_kwh), initialKvah: fmt(p.openings?.initial_kvah) })
      setPowerFactor(meta.powerFactorEditable ? formatUtilityNumber(p.power_factor ?? W202_DEFAULT_POWER_FACTOR, 2) : '')
    } catch {
      // non-fatal: leave blanks, the technician types them
    }
    if (!editing) return
    try {
      const rows = await listW202Readings(kind, date, date)
      if (id === seq.current && rows[0]) applyRow(rows[0])
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
      await submitW202Reading({
        kind,
        plant: W202_PLANT,
        reading_date: readingDate,
        initial_kwh: parseNum(f.initialKwh),
        final_kwh: parseNum(f.finalKwh),
        initial_kvah: parseNum(f.initialKvah),
        final_kvah: parseNum(f.finalKvah),
        // Blank falls back to the standing value; Solar's PF is never sent.
        ...(meta.powerFactorEditable ? { power_factor: parseNum(powerFactor) ?? W202_DEFAULT_POWER_FACTOR } : {}),
        remark: f.remark.trim() || null,
      })
      toast.success(isEditing ? 'Reading updated' : 'Reading saved')
      router.replace(MT.w202Readings(kind))
    } catch (e: any) {
      // The 400 text is the only explanation for e.g. a carried opening above the Final.
      const msg = e?.message || 'Failed to save reading'
      setError(msg)
      toast.error(msg)
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={meta.title} subtitle={isEditing ? 'Edit reading' : 'New reading'} back={MT.w202Readings(kind)} />
      <div className="space-y-4">
        <div>
          <DateField value={readingDate} onChange={changeDate} />
          {sourceDate && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Openings carried from {sourceDate} — change them only if the meter was replaced.
            </p>
          )}
        </div>

        <SectionCard title="Active Energy (KWH)" error={kwhError}>
          <NumericField label="KWH Initial" value={f.initialKwh} onChange={set('initialKwh')} invalid={kwhError} />
          <NumericField label="KWH Final" value={f.finalKwh} onChange={set('finalKwh')} invalid={kwhError} />
          <ComputedField label="KWH Consumption" value={formatUtilityNumber(kwh, 3)} />
        </SectionCard>

        <SectionCard title="Apparent Energy (KVAH)" error={kvahError}>
          <NumericField label="KVAH Initial" value={f.initialKvah} onChange={set('initialKvah')} invalid={kvahError} />
          <NumericField label="KVAH Final" value={f.finalKvah} onChange={set('finalKvah')} invalid={kvahError} />
          <ComputedField label="KVAH Consumption" value={formatUtilityNumber(kvah, 3)} />
        </SectionCard>

        <SectionCard title="Power Factor">
          {meta.powerFactorEditable ? (
            <div className="sm:col-span-2">
              <NumericField label="Power Factor" value={powerFactor} onChange={setPowerFactor} />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Defaults to {DEFAULT_PF} — change it if the meter reads otherwise.
              </p>
            </div>
          ) : (
            <div className="sm:col-span-2">
              <ComputedField label="Power Factor" value={formatUtilityNumber(solarPf, 3)} />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">KWH consumption ÷ KVAH consumption.</p>
            </div>
          )}
        </SectionCard>

        <TextField label="Remark (optional)" value={f.remark} onChange={set('remark')} />

        <ErrorBanner error={error} />
        <Button className="w-full" disabled={!canSubmit} loading={submitting} onClick={submit}>
          {submitting ? 'Saving…' : isEditing ? 'Update reading' : 'Save reading'}
        </Button>
      </div>
    </div>
  )
}

/** W-202 daily meter form for Main or Solar (W202ReadingFormScreen). */
export default function W202FormPage({ params }: { params: { kind: string } }) {
  const kind = w202KindFromSlug(decodeURIComponent(params.kind))
  return (
    <Suspense fallback={null}>
      <W202Form key={kind} kind={kind} />
    </Suspense>
  )
}
