'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { ChevronDown, ChevronRight, Download, RefreshCw } from 'lucide-react'
import clsx from 'clsx'
import { Button, Card, ErrorBanner, Input, LoadingBlock, PageHeader } from '@/components/maintenance/ui'
import { downloadSheet } from '@/components/maintenance/utilities/csv'
import { floorReadingsSheet } from '@/components/maintenance/utilities/sheets'
import { listMachines } from '@/lib/maintenance/api/assets'
import {
  acReadingPoints,
  fetchFloorSystemReadings,
  floorReadingsReport,
  isMeterlessFloor,
  submitFloorReadings,
  W202_PLANT,
  type AcReadingPoint,
} from '@/lib/maintenance/api/readings'
import { parseNum } from '@/lib/maintenance/api/utilities'
import { canonicalPlant, isoDateIst } from '@/lib/maintenance/format'
import { MT } from '@/lib/maintenance/nav'

const TITLE = 'Electric consumption'
/** At or below this many AC rows the group opens on load */
const AC_AUTO_EXPAND_MAX = 3
/** A download reaches back a month of rounds */
const EXPORT_DAYS = 30
const DAY_MS = 86_400_000

/** A round records YESTERDAY (IST) — today isn't over yet. */
const previousReadingDate = () => isoDateIst(Date.now() - DAY_MS)

/** "90.0" → "90", "88.3" → "88.3" */
const formatReading = (v: number) => String(v)

/** Digits and a single decimal point, so the input always parses. */
function sanitizeNumeric(raw: string): string {
  const filtered = raw.replace(/[^0-9.]/g, '')
  const dot = filtered.indexOf('.')
  return dot === -1 ? filtered : filtered.slice(0, dot + 1) + filtered.slice(dot + 1).replace(/\./g, '')
}

interface FloorRow {
  floor: string
  systemReading: number
  input: string
}

interface AcRow {
  point: AcReadingPoint
  input: string
  saved: number | null
}

const acInvalid = (r: AcRow) => r.input.trim() !== '' && parseNum(r.input) === null

type Phase = 'idle' | 'loading' | 'loaded' | 'submitting'

/**
 * Electric Consumption (DailyReadingScreen + DailyReadingSection): fetch the
 * system kWh per floor for yesterday, type the actual meter readings, submit
 * them all at once. At W-202 the indoor AC units ride the same round.
 */
export default function ElectricConsumptionPage() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [building, setBuilding] = useState('')
  const [readingDate, setReadingDate] = useState('')
  const [rows, setRows] = useState<FloorRow[]>([])
  const [acRows, setAcRows] = useState<AcRow[]>([])
  const [acExpanded, setAcExpanded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  const filledFloors = rows.filter((r) => parseNum(r.input) !== null)
  const filledAc = acRows.filter((r) => r.input.trim() !== '')
  const filledCount = filledFloors.length + filledAc.length
  // Idle floors may stay blank — only filled rows are sent.
  const canSubmit = phase === 'loaded' && !acRows.some(acInvalid) && filledCount > 0

  /** AC units come from the asset register, their saved values from the report.
   *  Best-effort: a failure costs the AC group, never the floor form. */
  async function loadAcRows(bld: string, date: string) {
    if (canonicalPlant(bld) !== W202_PLANT) {
      setAcRows([])
      return
    }
    const points = await listMachines()
      .then((m) => acReadingPoints(m, bld))
      .catch(() => [] as AcReadingPoint[])
    if (points.length === 0) {
      setAcRows([])
      return
    }
    const saved = new Map<string, number | null>()
    await floorReadingsReport(bld, date, date)
      .then((report) => report.forEach((r) => saved.set(r.floor, r.meter_reading ?? null)))
      .catch(() => undefined)
    const next = points.map((p) => {
      const prior = saved.get(p.floorKey) ?? null
      return { point: p, input: prior != null ? formatReading(prior) : '', saved: prior }
    })
    setAcRows(next)
    setAcExpanded(next.length <= AC_AUTO_EXPAND_MAX)
  }

  async function fetchSystemReading() {
    if (phase === 'loading') return
    setPhase('loading')
    setError(null)
    try {
      // building omitted: the backend resolves the plant from the token.
      const r = await fetchFloorSystemReadings(previousReadingDate(), null)
      setBuilding(r.building)
      setReadingDate(r.reading_date)
      setRows(
        (r.floors ?? [])
          .filter((f) => !isMeterlessFloor(f.floor))
          .map((f) => ({
            floor: f.floor,
            systemReading: f.system_reading ?? 0,
            input: f.meter_reading != null ? formatReading(f.meter_reading) : '',
          })),
      )
      setPhase('loaded')
      await loadAcRows(r.building, r.reading_date)
    } catch (e: any) {
      const msg = e?.message || 'Failed to load system readings'
      setPhase('idle')
      setError(msg)
      toast.error(msg)
    }
  }

  async function submit() {
    if (!canSubmit) return
    // Floors and ACs share the table; an AC is keyed by its prefixed floor key.
    const body = [
      ...filledFloors.map((r) => ({ floor: r.floor, meter_reading: parseNum(r.input)! })),
      ...filledAc
        .filter((r) => parseNum(r.input) !== null)
        .map((r) => ({ floor: r.point.floorKey, meter_reading: parseNum(r.input)! })),
    ]
    setPhase('submitting')
    setError(null)
    try {
      // Echo the exact date on screen — never let the backend pick its own default.
      const r = await submitFloorReadings({ reading_date: readingDate, building, rows: body })
      setPhase('loaded')
      toast.success(`Saved ${r.saved} floor${r.saved === 1 ? '' : 's'}`)
      await loadAcRows(building, readingDate)
    } catch (e: any) {
      const msg = e?.message || 'Failed to submit readings'
      setPhase('loaded')
      setError(msg)
      toast.error(msg)
    }
  }

  async function download() {
    if (downloading) return
    setDownloading(true)
    try {
      const to = readingDate || previousReadingDate()
      const from = isoDateIst(new Date(`${to}T00:00:00+05:30`).getTime() - EXPORT_DAYS * DAY_MS)
      const report = await floorReadingsReport(building || null, from, to)
      toast(downloadSheet(floorReadingsSheet(TITLE, report, null), TITLE))
    } catch (e: any) {
      toast.error(e?.message || 'Download failed')
    } finally {
      setDownloading(false)
    }
  }

  const header = <PageHeader title="Electric Consumption" subtitle="Floor meter readings vs system kWh" back={MT.dailyReading} />

  if (phase === 'idle')
    return (
      <>
        {header}
        <Card className="flex flex-col items-center gap-4 px-6 py-12 text-center">
          <p className="max-w-md text-sm text-zinc-500 dark:text-zinc-400">
            Pull the system-computed kWh for each floor, then enter the actual meter readings.
          </p>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button onClick={fetchSystemReading}>Fetch system reading</Button>
        </Card>
      </>
    )

  if (phase === 'loading')
    return (
      <>
        {header}
        <LoadingBlock />
      </>
    )

  return (
    <>
      {header}
      <div className="mb-4">
        <p className="font-semibold text-zinc-900 dark:text-zinc-50">
          {building} · {readingDate}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Enter the actual reading for each floor with a meter. Idle floors can stay blank.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={fetchSystemReading}>
            Refresh system reading
          </Button>
          <Button variant="secondary" size="sm" icon={Download} loading={downloading} onClick={download}>
            {downloading ? 'Preparing…' : 'Download Excel'}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <Card key={row.floor} className="p-3">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{row.floor}</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                System: {formatReading(row.systemReading)} kWh
              </span>
              <Input
                inputMode="decimal"
                placeholder="Meter reading"
                aria-label={`Meter reading for ${row.floor}`}
                className="!w-44"
                value={row.input}
                onChange={(e) => {
                  const v = sanitizeNumeric(e.target.value)
                  setRows((rs) => rs.map((r) => (r.floor === row.floor ? { ...r, input: v } : r)))
                  setError(null)
                }}
              />
            </div>
          </Card>
        ))}

        {acRows.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setAcExpanded((x) => !x)}
              className="flex w-full items-center justify-between py-3 text-left"
            >
              <span className="flex items-center gap-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {acExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                AC reading ({acRows.length})
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {filledAc.length === 0 ? 'none filled' : `${filledAc.length} filled`}
              </span>
            </button>
            {acExpanded &&
              acRows.map((row) => (
                <Card key={row.point.assetId} className="p-3">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{row.point.name}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {row.point.assetId} · {row.point.subLocation}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    {/* Nothing computes kWh per AC, so show what's stored for this date. */}
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {row.saved != null ? `Saved: ${formatReading(row.saved)}` : 'Not read yet'}
                    </span>
                    <Input
                      inputMode="decimal"
                      placeholder="Reading"
                      aria-label={`Reading for ${row.point.name}`}
                      className={clsx('!w-44', acInvalid(row) && 'border-red-500')}
                      value={row.input}
                      onChange={(e) => {
                        const v = sanitizeNumeric(e.target.value)
                        setAcRows((rs) => rs.map((r) => (r.point.assetId === row.point.assetId ? { ...r, input: v } : r)))
                        setError(null)
                      }}
                    />
                  </div>
                </Card>
              ))}
          </>
        )}
      </div>

      <div className="sticky bottom-0 -mx-4 mt-4 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 sm:mx-0 sm:rounded-xl sm:border">
        <ErrorBanner error={error} />
        <Button className="w-full" disabled={!canSubmit} loading={phase === 'submitting'} onClick={submit}>
          {filledCount === 0 ? 'Submit' : `Submit ${filledCount} reading${filledCount === 1 ? '' : 's'}`}
        </Button>
      </div>
    </>
  )
}
