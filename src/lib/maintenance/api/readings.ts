/**
 * Plant meter readings: A-185 HT Panel / Cold Room / UV, W-202 Main & Solar
 * meters, and the legacy floor-wise "Electric Consumption" round (with
 * W-202's indoor AC units riding the same table).
 *
 * Ported from: data/remote/api/{A185ReadingsApi,W202ReadingsApi,FloorReadingApi,ReportsApi}.kt,
 * data/remote/dto/{FloorReadingDtos,ReportsDtos}.kt, data/repository/{A185Readings,W202Readings,
 * FloorReading}RepositoryImpl.kt, domain/model/a185/A185Reading.kt,
 * domain/model/w202/{W202MeterReading,AcReading}.kt, domain/model/FloorReading.kt.
 *
 * Consumptions (and Solar's power factor, A-185's HT PF) are computed in the
 * database — never sent, only displayed.
 */
import { mtFetch } from '../client'
import { canonicalPlant } from '../format'
import type { MtMachine } from './assets'

export const A185_PLANT = 'A185'
export const W202_PLANT = 'W202'

// ── A-185: HT / Cold Room / UV (one row per plant + date) ────────────────

export interface A185ReadingDto {
  id?: number | null
  plant: string
  /** YYYY-MM-DD */
  reading_date: string
  ht_initial?: number | null
  ht_final?: number | null
  /** server-set, fixed 0.99 */
  ht_power_factor?: number | null
  ht_consumption?: number | null
  cold_initial?: number | null
  cold_final?: number | null
  cold_consumption?: number | null
  uv_initial?: number | null
  uv_final?: number | null
  uv_consumption?: number | null
  remark?: string | null
}

/** What the form sends: all six meters every save (null when blank) + remark. */
export interface A185ReadingWrite {
  plant: string
  reading_date: string
  ht_initial: number | null
  ht_final: number | null
  cold_initial: number | null
  cold_final: number | null
  uv_initial: number | null
  uv_final: number | null
  remark: string | null
}

export interface A185PrefillDto {
  reading_date?: string
  source_date?: string | null
  ht_power_factor?: number | null
  openings?: { ht_initial?: number | null; cold_initial?: number | null; uv_initial?: number | null } | null
  /** this date already has a (possibly partial) saved row */
  already_saved?: boolean
}

/** Newest first; from/to inclusive YYYY-MM-DD. */
export function listA185Readings(from?: string, to?: string) {
  return mtFetch<A185ReadingDto[]>('/a185-readings', { query: { plant: A185_PLANT, from, to } })
}

export function submitA185Reading(body: A185ReadingWrite) {
  return mtFetch<A185ReadingDto>('/a185-readings', { method: 'POST', body })
}

/** Initials carried from the previous reading day's Finals + the fixed PF. */
export function a185Prefill(date: string) {
  return mtFetch<A185PrefillDto>('/a185-readings/prefill', { query: { plant: A185_PLANT, date } })
}

/** HEAD only — 403 for any other role, 404 if the date has no row. */
export function deleteA185Reading(date: string) {
  return mtFetch<unknown>(`/a185-readings/${encodeURIComponent(date)}`, {
    method: 'DELETE',
    query: { plant: A185_PLANT },
  })
}

// ── W-202: Main meter / Solar (one row per plant + date + kind) ──────────

export type W202Kind = 'main' | 'solar'

export const W202_KINDS: Record<W202Kind, { title: string; powerFactorEditable: boolean; carriesForward: boolean }> = {
  // Main's PF is entered (0.98 standing value); its openings carry forward.
  main: { title: 'Main Meter Reading', powerFactorEditable: true, carriesForward: true },
  // Solar's PF is KWH ÷ KVAH, derived server-side; openings are typed each day.
  solar: { title: 'Solar Energy Reading', powerFactorEditable: false, carriesForward: false },
}

/** Unknown slug → main, as W202MeterKind.fromSlug does. */
export const w202KindFromSlug = (slug: string | null | undefined): W202Kind => (slug === 'solar' ? 'solar' : 'main')

export const W202_DEFAULT_POWER_FACTOR = 0.98

export interface W202ReadingDto {
  id?: number | null
  kind?: W202Kind | null
  plant: string
  reading_date: string
  initial_kwh?: number | null
  final_kwh?: number | null
  kwh_consumption?: number | null
  initial_kvah?: number | null
  final_kvah?: number | null
  kvah_consumption?: number | null
  /** entered for main; server-derived for solar */
  power_factor?: number | null
  remark?: string | null
}

export interface W202ReadingWrite {
  kind: W202Kind
  plant: string
  reading_date: string
  initial_kwh: number | null
  final_kwh: number | null
  initial_kvah: number | null
  final_kvah: number | null
  /** main only — omitted for solar */
  power_factor?: number | null
  remark: string | null
}

export interface W202PrefillDto {
  reading_date?: string
  source_date?: string | null
  openings?: { initial_kwh?: number | null; initial_kvah?: number | null } | null
  /** main's standing 0.98; null for solar */
  power_factor?: number | null
  already_saved?: boolean
}

export function listW202Readings(kind: W202Kind, from?: string, to?: string) {
  return mtFetch<W202ReadingDto[]>('/w202-readings', { query: { kind, plant: W202_PLANT, from, to } })
}

export function submitW202Reading(body: W202ReadingWrite) {
  return mtFetch<W202ReadingDto>('/w202-readings', { method: 'POST', body })
}

export function w202Prefill(kind: W202Kind, date: string) {
  return mtFetch<W202PrefillDto>('/w202-readings/prefill', { query: { kind, plant: W202_PLANT, date } })
}

/** HEAD only — 403 otherwise, 404 if no such date. */
export function deleteW202Reading(kind: W202Kind, date: string) {
  return mtFetch<unknown>(`/w202-readings/${encodeURIComponent(date)}`, {
    method: 'DELETE',
    query: { kind, plant: W202_PLANT },
  })
}

// ── Floor readings ("Electric Consumption") ──────────────────────────────

export interface FloorSystemReadingDto {
  floor: string
  /** read-only, system-computed kWh */
  system_reading: number
  /** prior saved actual reading, or null */
  meter_reading?: number | null
}

export interface FloorReadingsResponseDto {
  building: string
  reading_date: string
  floors: FloorSystemReadingDto[]
}

export interface FloorReadingsSubmitDto {
  /** Always echo the fetched date — the backend's own default may differ */
  reading_date: string
  /** Echo the fetched building; all-plant roles need it */
  building: string
  rows: Array<{ floor: string; meter_reading: number }>
}

export interface FloorReadingsSubmitResponseDto {
  building: string
  reading_date: string
  saved: number
}

/** System kWh per floor (+ saved meter readings). building null = from the JWT. */
export function fetchFloorSystemReadings(date?: string, building?: string | null) {
  return mtFetch<FloorReadingsResponseDto>('/floor-readings/system', { query: { date, building } })
}

/** Upserts on building + floor + date; re-submitting overwrites the day. */
export function submitFloorReadings(body: FloorReadingsSubmitDto) {
  return mtFetch<FloorReadingsSubmitResponseDto>('/floor-readings', { method: 'POST', body })
}

export interface FloorReadingReportRowDto {
  reading_date: string
  building: string
  floor: string
  meter_reading?: number | null
  daily_kwh?: number | null
}

/** GET /reports/floor-readings — plant null = both (server narrows for non-supervisors). */
export async function floorReadingsReport(plant?: string | null, from?: string, to?: string) {
  const r = await mtFetch<{ rows?: FloorReadingReportRowDto[] }>('/reports/floor-readings', {
    query: { plant, from, to },
  })
  return r?.rows ?? []
}

/** Canteen, gates and the lab have no meter — hidden from the round. */
const METERLESS_FLOORS = new Set(['canteen', 'backsidegate', 'entrygate', 'lab', 'laboratory', 'labfloor'])

export const isMeterlessFloor = (name: string) => METERLESS_FLOORS.has(name.toLowerCase().replace(/[^a-z0-9]/g, ''))

// ── AC units (W-202) — same table, floor = "AC · <name>" ─────────────────

export const AC_FLOOR_PREFIX = 'AC · '
export const acFloorKey = (name: string) => AC_FLOOR_PREFIX + name.trim()
export const isAcFloorKey = (floor: string) => floor.trimStart().startsWith(AC_FLOOR_PREFIX.trim())

/** Only the indoor unit is read; the whole name must match ("A/C Indoor", "AC Indoor"). */
const AC_INDOOR_NAME = /^\s*a\s*\/?\s*c\s+indoor\s*$/i
export const isIndoorAcAsset = (name: string) => AC_INDOOR_NAME.test(name)

export interface AcReadingPoint {
  assetId: string
  name: string
  subLocation: string
  floorKey: string
}

/** The building's indoor AC units, ordered floor then name (acReadingPoints). */
export function acReadingPoints(machines: MtMachine[], building: string): AcReadingPoint[] {
  const want = canonicalPlant(building)
  const seen = new Set<string>()
  return machines
    .filter((m) => canonicalPlant(m.building) === want)
    .filter((m) => !!m.asset_name?.trim() && isIndoorAcAsset(m.asset_name))
    .map((m) => ({
      assetId: m.asset_id,
      name: m.asset_name.trim(),
      subLocation: m.sub_location ?? '',
      floorKey: acFloorKey(m.asset_name),
    }))
    .filter((p) => (seen.has(p.floorKey) ? false : (seen.add(p.floorKey), true)))
    .sort(
      (a, b) =>
        a.subLocation.toLowerCase().localeCompare(b.subLocation.toLowerCase()) ||
        a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
    )
}
