/**
 * Supervisor / Head reports — read-only history listings and the consolidated
 * summary. Ported from ReportsApi.kt, ReportsDtos.kt, SummaryReportDtos.kt,
 * ReportsRepositoryImpl.kt and util/pdf/SummaryPdfModel.kt (the PDF content).
 *
 * `plant` null = both plants (the server narrows non-supervisor roles to their
 * own); `from`/`to` are YYYY-MM-DD, null = server default (last 30 days).
 */
import { mtFetch } from '../client'

type Range = { plant?: string | null; from?: string | null; to?: string | null }

// ── GET /reports/machines ────────────────────────────────────────────────

export interface MachineReadingRow {
  reading_date: string
  machine_id: string
  asset_name: string
  building?: string | null
  floor?: string | null
  operator_name?: string | null
  started_at?: number | null
  ended_at?: number | null
  status?: string | null
  source?: string | null
  daily_kwh?: number | null
}

export async function machinesReading({ plant, from, to }: Range = {}) {
  const r = await mtFetch<{ rows?: MachineReadingRow[] }>('/reports/machines', { query: { plant, from, to } })
  return r?.rows ?? []
}

// ── GET /reports/floor-readings ──────────────────────────────────────────

export interface FloorReadingReportRow {
  reading_date: string
  building: string
  floor: string
  meter_reading?: number | null
  daily_kwh?: number | null
}

export async function floorReadingsReport({ plant, from, to }: Range = {}) {
  const r = await mtFetch<{ rows?: FloorReadingReportRow[] }>('/reports/floor-readings', {
    query: { plant, from, to },
  })
  return r?.rows ?? []
}

// ── GET /reports/summary ─────────────────────────────────────────────────

export interface CountRow {
  label: string
  count: number
}

export interface SummaryReport {
  period_from: string
  period_to: string
  plants: string[]
  generated_at: number
  generated_by: string
  readings: {
    window_days: number
    total_entries: number
    sources: Array<{ source: string; table: string; entries: number; days_covered: number; days_missing: number }>
  }
  pm: {
    plans_active: number
    plans_inactive: number
    work_orders_total: number
    completed_in_period: number
    overdue_total: number
    by_status: CountRow[]
    overdue_top: Array<{
      work_order_id: string
      machine_id: string
      machine_name: string
      building?: string | null
      scheduled_date: string
      days_late: number
      status: string
    }>
  }
  breakdowns: {
    raised_in_period: number
    closed_in_period: number
    still_open: number
    avg_hours_to_resolve?: number | null
    avg_hours_to_qc?: number | null
    by_status: CountRow[]
    by_severity: CountRow[]
    open_rows: Array<{
      id: string
      machine_id: string
      machine_name: string
      building?: string | null
      severity: string
      status: string
      raised_by?: string | null
      raised_at: string
      days_open: number
      technician?: string | null
    }>
  }
  people: {
    total_users: number
    active_users: number
    people: Array<{
      user_id?: string | null
      name: string
      role: string
      runs: number
      run_hours: number
      run_kwh: number
      breakdowns_raised: number
      breakdowns_handled: number
      pm_closed: number
      qc_decisions: number
      readings_filed: number
      first_seen?: string | null
      last_seen?: string | null
    }>
  }
  assets: {
    total: number
    added_in_period: number
    before_tracking: number
    by_building: CountRow[]
    by_category: CountRow[]
    added_rows: Array<{
      asset_id: string
      asset_name: string
      building?: string | null
      category?: string | null
      added_on: string
    }>
  }
  notes: string[]
}

export function summaryReport({ plant, from, to }: Range = {}) {
  return mtFetch<SummaryReport>('/reports/summary', { query: { from, to, plant } })
}

// ── Print content (SummaryPdfModel) ──────────────────────────────────────

export interface PrintTable {
  caption: string
  headers: string[]
  /** Relative column widths */
  weights: number[]
  rows: string[][]
}

export interface PrintSection {
  title: string
  lines: string[]
  tables: PrintTable[]
}

export interface SummaryPrintContent {
  title: string
  subtitle: string
  kpis: Array<{ label: string; value: string }>
  sections: PrintSection[]
  notes: string[]
}

/** One decimal, always "." — a controlled document must not change with locale. */
const num = (v: number | null | undefined) => (v === null || v === undefined || Number.isNaN(v) ? '0.0' : v.toFixed(1))
const hours = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${num(v)} h`)
const s = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : String(v))

function activeRange(first?: string | null, last?: string | null): string {
  if (!first?.trim() && !last?.trim()) return '—'
  if (first === last) return first || last || '—'
  return `${first || '?'} – ${last || '?'}`
}

export function summaryPrintContent(r: SummaryReport): SummaryPrintContent {
  const rd = r.readings ?? { window_days: 0, total_entries: 0, sources: [] }
  const pm = r.pm
  const bd = r.breakdowns
  const pp = r.people
  const as = r.assets
  const countRows = (rows: CountRow[] | undefined) => (rows ?? []).map((c) => [c.label, String(c.count)])

  return {
    title: 'Maintenance Summary Report',
    subtitle: `${r.period_from} to ${r.period_to}  ·  ${(r.plants ?? []).join(' + ')}  ·  by ${r.generated_by}`,
    kpis: [
      { label: 'Readings logged', value: String(rd.total_entries ?? 0) },
      { label: 'PM completed', value: String(pm?.completed_in_period ?? 0) },
      { label: 'PM overdue', value: String(pm?.overdue_total ?? 0) },
      { label: 'Breakdowns open', value: String(bd?.still_open ?? 0) },
      { label: 'Active users', value: `${pp?.active_users ?? 0} of ${pp?.total_users ?? 0}` },
    ],
    sections: [
      {
        title: '1. Daily readings',
        lines: [`Window: ${rd.window_days ?? 0} days · ${rd.total_entries ?? 0} entries`],
        tables: [
          {
            caption: 'By source',
            headers: ['Source', 'Table', 'Entries', 'Days covered', 'Days missing'],
            weights: [2.2, 2.6, 1, 1.2, 1.2],
            rows: (rd.sources ?? []).map((x) => [
              x.source,
              x.table,
              String(x.entries),
              String(x.days_covered),
              String(x.days_missing),
            ]),
          },
        ],
      },
      {
        title: '2. Preventive maintenance',
        lines: [
          `Plans: ${pm?.plans_active ?? 0} active, ${pm?.plans_inactive ?? 0} inactive`,
          `Work orders: ${pm?.work_orders_total ?? 0} total · ${pm?.completed_in_period ?? 0} completed this period · ${pm?.overdue_total ?? 0} overdue`,
        ],
        tables: [
          { caption: 'By status', headers: ['Status', 'Count'], weights: [3, 1], rows: countRows(pm?.by_status) },
          {
            caption: 'Most overdue',
            headers: ['Work order', 'Machine', 'Plant', 'Scheduled', 'Days late', 'Status'],
            weights: [1.4, 2.4, 1, 1.3, 1, 1.4],
            rows: (pm?.overdue_top ?? []).map((x) => [
              x.work_order_id,
              `${x.machine_name} (${x.machine_id})`,
              s(x.building),
              x.scheduled_date,
              String(x.days_late),
              x.status,
            ]),
          },
        ],
      },
      {
        title: '3. Breakdowns',
        lines: [
          `Raised this period: ${bd?.raised_in_period ?? 0} · closed: ${bd?.closed_in_period ?? 0} · still open: ${bd?.still_open ?? 0}`,
          `Mean time to resolve: ${hours(bd?.avg_hours_to_resolve)} · to QC decision: ${hours(bd?.avg_hours_to_qc)}`,
        ],
        tables: [
          { caption: 'By status', headers: ['Status', 'Count'], weights: [3, 1], rows: countRows(bd?.by_status) },
          { caption: 'By severity', headers: ['Severity', 'Count'], weights: [3, 1], rows: countRows(bd?.by_severity) },
          {
            caption: 'Still open',
            headers: ['Machine', 'Plant', 'Severity', 'Raised by', 'Raised', 'Days open', 'Stage'],
            weights: [2.4, 1, 1.1, 1.5, 1.2, 1, 1.5],
            rows: (bd?.open_rows ?? []).map((x) => [
              `${x.machine_name} (${x.machine_id})`,
              s(x.building),
              x.severity,
              s(x.raised_by),
              x.raised_at,
              String(x.days_open),
              x.status,
            ]),
          },
        ],
      },
      {
        title: '4. App usage by person',
        lines: [`${pp?.active_users ?? 0} of ${pp?.total_users ?? 0} accounts active this period`],
        tables: [
          {
            caption: 'Activity',
            headers: ['Name', 'Role', 'Runs', 'Hours', 'kWh', 'BD raised', 'BD handled', 'PM closed', 'QC', 'Reads', 'Active'],
            weights: [2.2, 1.3, 0.8, 0.9, 1, 1, 1.1, 1.1, 0.7, 0.8, 2],
            rows: (pp?.people ?? []).map((x) => [
              x.name,
              x.role,
              String(x.runs),
              num(x.run_hours),
              num(x.run_kwh),
              String(x.breakdowns_raised),
              String(x.breakdowns_handled),
              String(x.pm_closed),
              String(x.qc_decisions),
              String(x.readings_filed),
              activeRange(x.first_seen, x.last_seen),
            ]),
          },
        ],
      },
      {
        title: '5. Asset register',
        lines: [
          `${as?.total ?? 0} assets · ${as?.added_in_period ?? 0} added this period · ${as?.before_tracking ?? 0} added before tracking began`,
        ],
        tables: [
          { caption: 'By plant', headers: ['Plant', 'Count'], weights: [3, 1], rows: countRows(as?.by_building) },
          { caption: 'By category', headers: ['Category', 'Count'], weights: [3, 1], rows: countRows(as?.by_category) },
          {
            caption: 'Added this period',
            headers: ['Asset', 'Name', 'Plant', 'Category', 'Added on'],
            weights: [1.3, 2.4, 1, 1.6, 1.2],
            rows: (as?.added_rows ?? []).map((x) => [x.asset_id, x.asset_name, s(x.building), s(x.category), x.added_on]),
          },
        ],
      },
    ],
    notes: r.notes ?? [],
  }
}
