/**
 * Daily Utility Consumption — diesel | gas | electricity | water, plus the
 * supervisor-set per-plant rates.
 *
 * Ported from: data/remote/api/UtilitiesApi.kt, data/repository/UtilitiesRepositoryImpl.kt,
 * domain/model/utilities/{UtilityType,UtilityRecord,UtilityPrefill,UtilityRates,UtilityValidation}.kt,
 * domain/usecase/utilities/UtilityMath.kt, presentation/utilities/UtilityFormat.kt.
 *
 * Bodies are free-form snake_case objects: each utility has its own columns,
 * so the field schema below decides which keys go on the wire.
 */
import { mtFetch } from '../client'
import { canonicalPlant } from '../format'

// ── Field schema (UtilityType.kt) ────────────────────────────────────────

export type UtilitySlug = 'diesel' | 'gas' | 'electricity' | 'water'
export type FieldKind = 'NUMBER' | 'TEXT'

export interface UtilityField {
  key: string
  label: string
  kind: FieldKind
  /** Pre-filled text in a new form */
  default: string
  /** Rounding for display AND for the value sent (money 2, quantities 3) */
  decimals: number
  /** Gates Submit; text fields and production_units are optional */
  required: boolean
}

const num = (key: string, label: string, o: Partial<UtilityField> = {}): UtilityField => ({
  key,
  label,
  kind: 'NUMBER',
  default: '',
  decimals: 3,
  required: true,
  ...o,
})
const text = (key: string, label: string): UtilityField => ({
  key,
  label,
  kind: 'TEXT',
  default: '',
  decimals: 3,
  required: false,
})

export interface UtilityType {
  slug: UtilitySlug
  label: string
  inputs: UtilityField[]
  computed: UtilityField[]
  /** [closingKey, openingKey] — Submit requires closing ≥ opening */
  pairs: Array<[string, string]>
  /** Computed keys surfaced on the history list */
  headline: string[]
  /** Input key holding the supervisor-managed price (read-only in the form) */
  rateKey: string
}

export const UTILITY_TYPES: Record<UtilitySlug, UtilityType> = {
  diesel: {
    slug: 'diesel',
    label: 'Diesel',
    inputs: [
      num('initial_kwh_reading', 'Initial kWh reading'),
      num('final_kwh_reading', 'Final kWh reading'),
      num('start_dg_run_hour', 'Start DG run hour'),
      num('stop_dg_run_hour', 'Stop DG run hour'),
      num('diesel_l_per_hour', 'Diesel L/hour', { default: '37.5' }),
      num('diesel_rate', 'Diesel rate (₹/L)', { default: '95', decimals: 2 }),
      num('diesel_received_l', 'Diesel received (L)', { required: false }),
      text('remark', 'Remark'),
    ],
    computed: [
      num('total_consumption', 'Total consumption'),
      num('total_run_hour', 'Total run hour'),
      num('total_diesel_l', 'Total diesel (L)'),
      num('total_fuel_cost', 'Total fuel cost (₹)', { decimals: 2 }),
    ],
    pairs: [
      ['final_kwh_reading', 'initial_kwh_reading'],
      ['stop_dg_run_hour', 'start_dg_run_hour'],
    ],
    headline: ['total_fuel_cost', 'total_diesel_l'],
    rateKey: 'diesel_rate',
  },
  gas: {
    slug: 'gas',
    label: 'Gas',
    inputs: [
      num('gas_meter_opening', 'Gas meter opening'),
      num('gas_meter_closing', 'Gas meter closing'),
      num('gas_conversion_factor', 'Conversion factor', { default: '1.44' }),
      num('gas_rate', 'Gas rate (₹/m³)', { decimals: 2 }),
      num('production_units', 'Production units', { required: false }),
      text('remark', 'Remark'),
    ],
    computed: [
      num('gas_consumed_m3', 'Gas consumed (m³)'),
      num('daily_gas_cost', 'Daily gas cost (₹)', { decimals: 2 }),
      num('cost_per_unit', 'Cost / unit (₹)', { decimals: 2 }),
    ],
    pairs: [['gas_meter_closing', 'gas_meter_opening']],
    headline: ['daily_gas_cost', 'cost_per_unit'],
    rateKey: 'gas_rate',
  },
  electricity: {
    slug: 'electricity',
    label: 'Electricity',
    inputs: [
      text('department', 'Department'),
      num('energy_meter_opening_kwh', 'Opening kWh'),
      num('energy_meter_closing_kwh', 'Closing kWh'),
      num('energy_meter_opening_kvah', 'Opening kVAh'),
      num('energy_meter_closing_kvah', 'Closing kVAh'),
      num('ct_multiplier', 'CT multiplier', { default: '4' }),
      num('electricity_rate', 'Rate (₹/kWh)', { decimals: 2 }),
      num('production_units', 'Production units', { required: false }),
      text('remark', 'Remark'),
    ],
    computed: [
      num('electricity_consumed_kwh', 'Consumed kWh'),
      num('electricity_consumed_kvah', 'Consumed kVAh'),
      num('daily_electricity_cost', 'Daily cost (₹)', { decimals: 2 }),
      num('cost_per_unit', 'Cost / unit (₹)', { decimals: 2 }),
    ],
    pairs: [
      ['energy_meter_closing_kwh', 'energy_meter_opening_kwh'],
      ['energy_meter_closing_kvah', 'energy_meter_opening_kvah'],
    ],
    headline: ['daily_electricity_cost', 'cost_per_unit'],
    rateKey: 'electricity_rate',
  },
  water: {
    slug: 'water',
    label: 'Water',
    inputs: [
      num('water_meter_opening', 'Water meter opening'),
      num('water_meter_closing', 'Water meter closing'),
      num('water_rate', 'Water rate (₹/m³)', { decimals: 2 }),
      num('production_units', 'Production units', { required: false }),
      text('remark', 'Remark'),
    ],
    computed: [
      num('water_consumed', 'Water consumed'),
      num('daily_water_cost', 'Daily water cost (₹)', { decimals: 2 }),
      num('cost_per_unit', 'Cost / unit (₹)', { decimals: 2 }),
    ],
    pairs: [['water_meter_closing', 'water_meter_opening']],
    headline: ['daily_water_cost', 'cost_per_unit'],
    rateKey: 'water_rate',
  },
}

/** Unknown slug → Diesel, as UtilityType.fromSlug(..) ?: DIESEL does. */
export const utilityFromSlug = (slug: string | null | undefined): UtilityType =>
  UTILITY_TYPES[(slug ?? '') as UtilitySlug] ?? UTILITY_TYPES.diesel

const allFields = (t: UtilityType) => [...t.inputs, ...t.computed]
export const decimalsFor = (t: UtilityType, key: string) => allFields(t).find((f) => f.key === key)?.decimals ?? 3
export const labelFor = (t: UtilityType, key: string) => allFields(t).find((f) => f.key === key)?.label ?? key

/** The two plants every utility form/filter offers (UtilityComponents.PLANTS). */
export const PLANTS = ['A185', 'W202'] as const

// ── Number helpers (UtilityMath.roundTo / UtilityFormat) ─────────────────

/** Half-up rounding on the decimal string (1.2345 → 1.235), like BigDecimal.valueOf. */
export function roundTo(v: number, decimals: number): number {
  const abs = Math.abs(v)
  let r = Number(`${Math.round(Number(`${abs}e${decimals}`))}e-${decimals}`)
  if (!Number.isFinite(r)) r = Math.round(abs * 10 ** decimals) / 10 ** decimals
  return v < 0 ? -r : r
}

/** Rounded, trailing zeros trimmed, plain notation. null → '' */
export function formatUtilityNumber(v: number | null | undefined, decimals: number): string {
  if (v === null || v === undefined || Number.isNaN(v)) return ''
  let s = roundTo(v, decimals).toFixed(decimals)
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '')
  return s === '-0' ? '0' : s
}

/** Blank / unparseable → null (Kotlin toDoubleOrNull) */
export function parseNum(raw: string | null | undefined): number | null {
  const s = (raw ?? '').trim()
  if (!/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(s)) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

// ── Derivation (computeUtility) ──────────────────────────────────────────

type Nums = Record<string, number | null | undefined>

const sub = (a?: number | null, b?: number | null) => (a != null && b != null ? a - b : null)
const mul = (a?: number | null, b?: number | null) => (a != null && b != null ? a * b : null)
/** cost ÷ units only when units > 0 — never 0 or ∞ */
const costPerUnit = (cost: number | null, units?: number | null) =>
  cost != null && units != null && units > 0 ? cost / units : null

/** Computed fields from (possibly partial) inputs; missing operands → null. Unrounded. */
export function computeUtility(t: UtilityType, v: Nums): Record<string, number | null> {
  switch (t.slug) {
    case 'diesel': {
      const totalRunHour = sub(v.stop_dg_run_hour, v.start_dg_run_hour)
      const totalDieselL = mul(v.diesel_l_per_hour, totalRunHour)
      return {
        total_consumption: sub(v.final_kwh_reading, v.initial_kwh_reading),
        total_run_hour: totalRunHour,
        total_diesel_l: totalDieselL,
        total_fuel_cost: mul(totalDieselL, v.diesel_rate),
      }
    }
    case 'gas': {
      const consumed = mul(sub(v.gas_meter_closing, v.gas_meter_opening), v.gas_conversion_factor)
      const daily = mul(consumed, v.gas_rate)
      return { gas_consumed_m3: consumed, daily_gas_cost: daily, cost_per_unit: costPerUnit(daily, v.production_units) }
    }
    case 'electricity': {
      const kwh = mul(sub(v.energy_meter_closing_kwh, v.energy_meter_opening_kwh), v.ct_multiplier)
      const daily = mul(kwh, v.electricity_rate)
      return {
        electricity_consumed_kwh: kwh,
        electricity_consumed_kvah: sub(v.energy_meter_closing_kvah, v.energy_meter_opening_kvah),
        daily_electricity_cost: daily,
        cost_per_unit: costPerUnit(daily, v.production_units),
      }
    }
    case 'water': {
      const consumed = sub(v.water_meter_closing, v.water_meter_opening)
      const daily = mul(consumed, v.water_rate)
      return { water_consumed: consumed, daily_water_cost: daily, cost_per_unit: costPerUnit(daily, v.production_units) }
    }
  }
}

// ── Validation (UtilityValidation.kt) ────────────────────────────────────

/** W-202's DG set has no kWh meter, so those readings can't be required there. */
const OPTIONAL_KEYS_BY_PLANT: Record<string, Partial<Record<UtilitySlug, string[]>>> = {
  W202: { diesel: ['initial_kwh_reading', 'final_kwh_reading'] },
}

export const optionalKeysAt = (t: UtilityType, plant: string): string[] =>
  OPTIONAL_KEYS_BY_PLANT[canonicalPlant(plant)]?.[t.slug] ?? []

export const isRequiredAt = (t: UtilityType, f: UtilityField, plant: string) =>
  f.required && !optionalKeysAt(t, plant).includes(f.key)

/** Every field required at `plant` present, every meter pair closing ≥ opening. A
 *  pair may be wholly blank only where the plant doesn't meter it. */
export function canSubmitUtility(t: UtilityType, plant: string, n: Nums): boolean {
  const optional = optionalKeysAt(t, plant)
  const requiredOk = t.inputs
    .filter((f) => f.kind === 'NUMBER' && f.required && !optional.includes(f.key))
    .every((f) => n[f.key] != null)
  const pairsOk = t.pairs.every(([closing, opening]) => {
    const c = n[closing]
    const o = n[opening]
    if (c != null && o != null) return c >= o
    if (c == null && o == null) return optional.includes(closing) && optional.includes(opening)
    return false
  })
  return requiredOk && pairsOk
}

// ── Wire types ───────────────────────────────────────────────────────────

/** One stored row: plant, reading_date, id + that utility's own columns. */
export interface UtilityRecordDto {
  id?: number | null
  plant: string
  /** YYYY-MM-DD */
  reading_date: string
  [column: string]: string | number | null | undefined
}

export interface UtilityPrefillDto {
  /** opening key → previous closing (null when there is no earlier row) */
  openings?: Record<string, number | null> | null
  rate?: number | null
  source_date?: string | null
}

export const UTILITY_RATE_KEYS = ['diesel_rate', 'gas_rate', 'water_rate', 'electricity_rate'] as const
export type UtilityRateKey = (typeof UTILITY_RATE_KEYS)[number]

export const UTILITY_RATE_LABELS: Record<UtilityRateKey, string> = {
  diesel_rate: 'Diesel rate (₹/L)',
  gas_rate: 'Gas rate (₹/m³)',
  water_rate: 'Water rate (₹/m³)',
  electricity_rate: 'Electricity rate (₹/kWh)',
}

export interface UtilityRatesDto {
  plant: string
  diesel_rate?: number | null
  gas_rate?: number | null
  water_rate?: number | null
  electricity_rate?: number | null
  set_by?: string | null
  /** ISO timestamp */
  set_at?: string | null
}

// ── Endpoints ────────────────────────────────────────────────────────────

/** History, newest first. plant = "A185" | "W202" | undefined (all). */
export function listUtility(util: UtilitySlug, plant?: string | null) {
  return mtFetch<UtilityRecordDto[]>(`/utilities/${util}`, { query: { plant } })
}

/** Upsert one day (backend keys on plant + reading_date). Returns the stored row. */
export function submitUtility(util: UtilitySlug, body: UtilityRecordDto) {
  return mtFetch<UtilityRecordDto>(`/utilities/${util}`, { method: 'POST', body })
}

/** Openings (previous closing, survives skipped days) + current rate for a new form. */
export function utilityPrefill(util: UtilitySlug, plant: string, date?: string) {
  return mtFetch<UtilityPrefillDto>(`/utilities/${util}/prefill`, { query: { plant, date } })
}

/** Current prices — the backend returns one row per plant; the first is used. */
export async function getUtilityRates(plant: string): Promise<UtilityRatesDto> {
  const rows = await mtFetch<UtilityRatesDto[]>('/utilities/rates', { query: { plant } })
  return rows?.[0] ?? { plant }
}

/** Partial update (SUPERVISOR/HEAD/ADMIN; 403 otherwise): only non-null rates are sent. */
export function setUtilityRates(plant: string, rates: Partial<Record<UtilityRateKey, number | null>>) {
  const body: Record<string, string | number> = { plant }
  for (const [k, v] of Object.entries(rates)) if (v !== null && v !== undefined) body[k] = v
  return mtFetch<UtilityRatesDto>('/utilities/rates', { method: 'PUT', body })
}

// ── Body building (UtilitiesRepositoryImpl.toBody) ───────────────────────

/** Numbers rounded to each field's decimals, absent numbers / blank text as null. */
export function buildUtilityBody(
  t: UtilityType,
  plant: string,
  readingDate: string,
  numbers: Nums,
  texts: Record<string, string>,
): UtilityRecordDto {
  const body: UtilityRecordDto = { plant, reading_date: readingDate }
  for (const f of allFields(t)) {
    if (f.kind === 'NUMBER') {
      const v = numbers[f.key]
      body[f.key] = v == null ? null : roundTo(v, f.decimals)
    } else {
      const s = (texts[f.key] ?? '').trim()
      body[f.key] = s ? s : null
    }
  }
  return body
}

/** Numeric value of a stored column (the backend may send NUMERIC as a string). */
export function recordNumber(r: UtilityRecordDto, key: string): number | null {
  const v = r[key]
  if (typeof v === 'number') return v
  if (typeof v === 'string') return parseNum(v)
  return null
}
