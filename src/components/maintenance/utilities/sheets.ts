/**
 * Daily Reading exports — util/excel/ReadingSheets.kt. Every sheet leads with
 * the date and ends with the remark so several line up when pasted together.
 */
import { recordNumber, type UtilityRecordDto, type UtilityType } from '@/lib/maintenance/api/utilities'
import {
  AC_FLOOR_PREFIX,
  isAcFloorKey,
  type A185ReadingDto,
  type FloorReadingReportRowDto,
  type W202ReadingDto,
} from '@/lib/maintenance/api/readings'
import type { Sheet } from './csv'

/** "qty_litres" / "qtyLitres" → "Qty litres" (sentence case, like the hand-written headers) */
export function humanise(key: string): string {
  const spaced = key
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, (_, a: string, b: string) => `${a} ${b.toLowerCase()}`)
    .trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

/** Diesel / Gas / Water / Electricity — every numeric then every text column of the
 *  utility's schema, sorted by key (what the parsed records carry on Android). */
export function utilitySheet(title: string, type: UtilityType, records: UtilityRecordDto[]): Sheet {
  const fields = [...type.inputs, ...type.computed]
  const nk = Array.from(new Set(fields.filter((f) => f.kind === 'NUMBER').map((f) => f.key))).sort()
  const tk = Array.from(new Set(fields.filter((f) => f.kind === 'TEXT').map((f) => f.key))).sort()
  return {
    name: title,
    headers: ['Date', 'Plant', ...nk.map(humanise), ...tk.map(humanise)],
    rows: records.map((r) => [
      r.reading_date,
      r.plant,
      ...nk.map((k) => recordNumber(r, k)),
      ...tk.map((k) => (r[k] == null ? '' : String(r[k]))),
    ]),
  }
}

/** Main meter / Solar */
export function w202Sheet(title: string, records: W202ReadingDto[]): Sheet {
  return {
    name: title,
    headers: [
      'Date',
      'Plant',
      'kWh initial',
      'kWh final',
      'kWh consumption',
      'kVAh initial',
      'kVAh final',
      'kVAh consumption',
      'Power factor',
      'Remark',
    ],
    rows: records.map((r) => [
      r.reading_date,
      r.plant,
      r.initial_kwh,
      r.final_kwh,
      r.kwh_consumption,
      r.initial_kvah,
      r.final_kvah,
      r.kvah_consumption,
      r.power_factor,
      r.remark,
    ]),
  }
}

/** HT Panel / Cold Room / UV — three meters on one row per day */
export function a185Sheet(title: string, records: A185ReadingDto[]): Sheet {
  return {
    name: title,
    headers: [
      'Date',
      'Plant',
      'HT initial',
      'HT final',
      'HT consumption',
      'HT power factor',
      'Cold initial',
      'Cold final',
      'Cold consumption',
      'UV initial',
      'UV final',
      'UV consumption',
      'Remark',
    ],
    rows: records.map((r) => [
      r.reading_date,
      r.plant,
      r.ht_initial,
      r.ht_final,
      r.ht_consumption,
      r.ht_power_factor,
      r.cold_initial,
      r.cold_final,
      r.cold_consumption,
      r.uv_initial,
      r.uv_final,
      r.uv_consumption,
      r.remark,
    ]),
  }
}

/** Floor meter readings, actual vs system. acOnly null = floors and AC units together. */
export function floorReadingsSheet(title: string, rows: FloorReadingReportRowDto[], acOnly: boolean | null): Sheet {
  const wanted = acOnly === null ? rows : rows.filter((r) => isAcFloorKey(r.floor) === acOnly)
  return {
    name: title,
    headers: [
      'Date',
      'Building',
      acOnly === true ? 'AC unit' : acOnly === false ? 'Floor' : 'Floor / AC unit',
      'Meter reading (actual)',
      'System (kWh)',
      'Difference',
    ],
    rows: [...wanted]
      .sort((a, b) =>
        a.reading_date === b.reading_date ? (a.floor < b.floor ? -1 : a.floor > b.floor ? 1 : 0) : a.reading_date < b.reading_date ? 1 : -1,
      )
      .map((r) => [
        r.reading_date,
        r.building,
        acOnly === true && r.floor.startsWith(AC_FLOOR_PREFIX) ? r.floor.slice(AC_FLOOR_PREFIX.length) : r.floor,
        r.meter_reading,
        r.daily_kwh,
        r.meter_reading != null && r.daily_kwh != null ? r.meter_reading - r.daily_kwh : null,
      ]),
  }
}
