/**
 * CSV download — the web stand-in for util/excel/SpreadsheetExporter + Xlsx.
 * Same file naming (`<Title>_<YYYY-MM-DD>`) and the same refusal to write a
 * sheet with no rows.
 */
import { isoDateIst } from '@/lib/maintenance/format'

export type CsvCell = string | number | null | undefined

export interface Sheet {
  name: string
  headers: string[]
  rows: CsvCell[][]
}

/** Xlsx.fileName: letters, digits and '-' kept, everything else collapsed to '_'. */
export function csvFileName(title: string, stamp = isoDateIst()): string {
  const safe =
    title
      .replace(/[^A-Za-z0-9-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '') || 'export'
  return `${safe}_${stamp}.csv`
}

const cell = (v: CsvCell): string => {
  if (v === null || v === undefined) return ''
  const s = String(v)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Writes the sheet and returns a short status line (shown as a toast). */
export function downloadSheet(sheet: Sheet, title = sheet.name): string {
  if (sheet.rows.length === 0) return 'Nothing to download yet'
  const body = [sheet.headers, ...sheet.rows].map((r) => r.map(cell).join(',')).join('\r\n')
  // BOM so Excel opens ₹ / · / ³ as UTF-8
  const blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = csvFileName(title)
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'Downloaded'
}
