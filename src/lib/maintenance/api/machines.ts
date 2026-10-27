/**
 * Machines area — production runs (energy), live status overlays, operator
 * breakdown flag and the supervisor's electric-asset schedules.
 *
 * Ported from EnergyApi.kt + EnergyDtos.kt, AssetScheduleApi.kt +
 * AssetScheduleDtos.kt + domain/model/ElectricAssetSchedule.kt, BreakdownApi.kt
 * (raiseFlag, listOpen) + BreakdownDtos.kt, and the repositories that call them
 * (EnergyRepositoryImpl, AssetScheduleRepositoryImpl, BreakdownRepositoryImpl).
 *
 * The Android app keeps runs and flags in Room and syncs later; the web calls
 * the backend directly, so live status always comes from /energy/runs/active
 * and /breakdowns/open.
 */
import { mtFetch } from '../client'
import type { MtMachine, MtMachineWrite } from './assets'

// ── Energy: production runs ──────────────────────────────────────────────

/** GET /energy/runs/active — a run started and not yet stopped, any operator/device. */
export interface ActiveRunDto {
  asset_id: string
  run_id?: string | null
  operator_id?: string | null
  operator_name?: string | null
  /** epoch ms */
  started_at: number
  building?: string | null
}

export function listActiveRuns() {
  return mtFetch<ActiveRunDto[]>('/energy/runs/active')
}

export interface RunStartRequestDto {
  machine_id: string
  client_run_id: string
  started_at: number
  scheduled_end_at: number
}

export interface RunStartResponseDto {
  run_id: string
  client_run_id: string
  started_at: number
  scheduled_end_at: number
}

export interface RunStopResponseDto {
  run_id: string
  ended_at: number
  computed_kwh: number
}

/** Fixed scheduled length the app sends on Start (MachineDetailViewModel.DEFAULT_RUN_HOURS). */
export const DEFAULT_RUN_HOURS = 8

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

/** POST /energy/runs/start. The backend answers 409 when a supervisor schedule owns the asset. */
export function startRun(machineId: string, runHours = DEFAULT_RUN_HOURS) {
  const now = Date.now()
  const body: RunStartRequestDto = {
    machine_id: machineId,
    // Idempotency key — the Android app uses its local Room row id here.
    client_run_id: uuid(),
    started_at: now,
    scheduled_end_at: now + runHours * 3_600_000,
  }
  return mtFetch<RunStartResponseDto>('/energy/runs/start', { method: 'POST', body })
}

/** POST /energy/runs/{run_id}/stop — kWh is computed server-side. */
export function stopRun(runId: string, endedAt = Date.now()) {
  return mtFetch<RunStopResponseDto>(`/energy/runs/${encodeURIComponent(runId)}/stop`, {
    method: 'POST',
    body: { ended_at: endedAt },
  })
}

export interface DailyRunDto {
  id: string
  started_at: number
  ended_at: number | null
  duration_hours: number
  kwh: number
}

export interface DailyHistoryDto {
  /** YYYY-MM-DD */
  date: string
  total_run_hours: number
  total_kwh: number
  estimated_cost: number
  runs: DailyRunDto[]
}

/** GET /energy/machines/{id}/history?from&to (epoch ms) — per-day rollups with their runs. */
export function getMachineHistory(machineId: string, from: number, to: number) {
  return mtFetch<DailyHistoryDto[]>(`/energy/machines/${encodeURIComponent(machineId)}/history`, {
    query: { from, to },
  })
}

/** Power factor the backend uses: kWh = rated kW × hours × 0.99 (util/Constants.POWER_FACTOR). */
export const POWER_FACTOR = 0.99

// ── Breakdowns (open list + operator flag) ───────────────────────────────

export type Severity = 'CRITICAL' | 'MAJOR' | 'MINOR'
export const SEVERITIES: Severity[] = ['CRITICAL', 'MAJOR', 'MINOR']

export const SEVERITY_LABEL: Record<string, string> = {
  CRITICAL: 'Critical',
  MAJOR: 'Major',
  MINOR: 'Minor',
}

export const BREAKDOWN_STATUS_LABEL: Record<string, string> = {
  OPEN: 'Open',
  ACKNOWLEDGED: 'Acknowledged',
  PENDING_QC: 'Pending QC',
  CLOSED: 'Closed',
  REOPENED: 'Reopened',
}

/** GET /breakdowns/open — mt_breakdown_records not yet closed. */
export interface OpenBreakdownDto {
  id: string
  asset_id: string
  asset_name?: string
  reported_by?: string | null
  reporter_name?: string | null
  severity?: string | null
  description?: string
  status: string
  reported_at?: number | null
  acknowledged_by?: string | null
  acknowledged_by_name?: string | null
  acknowledged_at?: number | null
  building?: string | null
  qc_reject_reason?: string | null
  qc_status?: string | null
}

/** plant_id accepts W202 / A185 / both (the app always asks for both). */
export function listOpenBreakdowns(plantId = 'both') {
  return mtFetch<OpenBreakdownDto[]>('/breakdowns/open', { query: { plant_id: plantId } })
}

/** Unresolved = anything not CLOSED / QC-approved (BreakdownFlagDao.observeActiveFlagMachineIds). */
export const isUnresolved = (b: Pick<OpenBreakdownDto, 'status'>) => {
  const s = (b.status ?? '').toUpperCase()
  return s !== 'CLOSED' && s !== 'QC_APPROVED'
}

export interface BreakdownFlagResponseDto {
  id: string
  sync_status: string
}

/**
 * POST /breakdowns/flag — multipart/form-data, NOT JSON. The before-photo is an
 * optional file part "before_photo" (image/jpeg or image/png, ≤ 10 MB) that the
 * backend uploads to S3.
 */
export function raiseBreakdownFlag(input: {
  machine_id: string
  operator_id: string
  severity: Severity
  description: string
  raised_at?: number
  before_photo?: File | null
}) {
  const fd = new FormData()
  fd.append('machine_id', input.machine_id)
  fd.append('operator_id', input.operator_id)
  fd.append('severity', input.severity)
  fd.append('description', input.description)
  fd.append('raised_at', String(input.raised_at ?? Date.now()))
  if (input.before_photo) fd.append('before_photo', input.before_photo, input.before_photo.name)
  return mtFetch<BreakdownFlagResponseDto>('/breakdowns/flag', { method: 'POST', body: fd })
}

// ── Live machine status (MachineListViewModel) ───────────────────────────

export type MachineLiveStatus = 'RUNNING' | 'BREAKDOWN' | 'UNDER_QC' | 'IDLE'

export const LIVE_STATUS_META: Record<MachineLiveStatus, { label: string; order: number }> = {
  RUNNING: { label: 'Running', order: 0 },
  BREAKDOWN: { label: 'Breakdown', order: 1 },
  UNDER_QC: { label: 'Under QC', order: 2 },
  IDLE: { label: 'Idle', order: 3 },
}

/** Priority: a running asset is RUNNING; a PENDING_QC breakdown is UNDER_QC (not BREAKDOWN). */
export function liveStatusOf(
  assetId: string,
  runs: Map<string, ActiveRunDto>,
  underQc: Set<string>,
  underBreakdown: Set<string>,
): MachineLiveStatus {
  if (runs.has(assetId)) return 'RUNNING'
  if (underQc.has(assetId)) return 'UNDER_QC'
  if (underBreakdown.has(assetId)) return 'BREAKDOWN'
  return 'IDLE'
}

export function breakdownSets(open: OpenBreakdownDto[]) {
  const underBreakdown = new Set<string>()
  const underQc = new Set<string>()
  for (const b of open) {
    if (!isUnresolved(b)) continue
    underBreakdown.add(b.asset_id)
    if ((b.status ?? '').toUpperCase() === 'PENDING_QC') underQc.add(b.asset_id)
  }
  return { underBreakdown, underQc }
}

// ── Asset schedules (Schedule Electric Assets) ───────────────────────────

/** One daily window. Minute-of-day, IST. */
export interface AssetScheduleIntervalDto {
  start_min: number
  end_min: number
  start_label?: string | null
  end_label?: string | null
}

/** GET /asset-schedules row — a schedulable mt_asset_list asset + its schedule. */
export interface AssetScheduleDto {
  asset_id: string
  asset_name?: string
  category?: string
  building?: string
  sub_location?: string
  power_load?: string | null
  rated_kw?: number | null
  condition?: string | null
  start_min?: number | null
  end_min?: number | null
  /** Absent on a backend that predates split shifts — start_min/end_min is then the one window */
  intervals?: AssetScheduleIntervalDto[] | null
  active?: boolean
  hours?: number
  est_daily_kwh?: number | null
  /** ["MON","TUE",…]; null/absent = every day */
  days?: string[] | null
  is_24h?: boolean
  updated_by?: string | null
  updated_at?: string | null
}

/** PUT /asset-schedules/{id} body. start/end are the derived first-start / last-end summary. */
export interface AssetScheduleUpsertDto {
  start_min: number
  end_min: number
  intervals: Array<{ start_min: number; end_min: number }>
  active: boolean
  days: string[]
  is_24h: boolean
}

export function listAssetSchedules(plantId = 'both') {
  return mtFetch<AssetScheduleDto[]>('/asset-schedules', { query: { plant_id: plantId } })
}

/** SUPERVISOR only — the backend returns 403 otherwise. */
export function upsertAssetSchedule(machineId: string, body: AssetScheduleUpsertDto) {
  return mtFetch<AssetScheduleDto>(`/asset-schedules/${encodeURIComponent(machineId)}`, { method: 'PUT', body })
}

/** SUPERVISOR only. Already-recorded days are kept. */
export function clearAssetSchedule(machineId: string) {
  return mtFetch<AssetScheduleDto>(`/asset-schedules/${encodeURIComponent(machineId)}`, { method: 'DELETE' })
}

export const MINUTES_IN_DAY = 24 * 60

export interface ScheduleInterval {
  startMin: number
  endMin: number
}

export const intervalHours = (i: ScheduleInterval) => Math.max(0, i.endMin - i.startMin) / 60
export const intervalValid = (i: ScheduleInterval) =>
  i.startMin >= 0 && i.startMin < i.endMin && i.endMin <= MINUTES_IN_DAY
export const intervalsOverlap = (a: ScheduleInterval, b: ScheduleInterval) =>
  a.startMin < b.endMin && b.startMin < a.endMin

/** Sorted, valid windows; falls back to the legacy start/end pair (AssetScheduleDto.toIntervals). */
export function scheduleIntervals(dto: AssetScheduleDto): ScheduleInterval[] {
  const listed = (dto.intervals ?? [])
    .map((i) => ({ startMin: i.start_min, endMin: i.end_min }))
    .filter(intervalValid)
    .sort((a, b) => a.startMin - b.startMin)
  if (listed.length) return listed
  if (dto.start_min == null || dto.end_min == null) return []
  const legacy = { startMin: dto.start_min, endMin: dto.end_min }
  return intervalValid(legacy) ? [legacy] : []
}

/** Sunday-first so index = 0=Sunday … 6=Saturday. */
export const SCHEDULE_DAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

/** ["MON","WED"] → [1,3]; null/empty/unknown-only → every day (legacy rows). */
export function codesToDays(codes: string[] | null | undefined): number[] {
  if (!codes?.length) return [...ALL_DAYS]
  const days = Array.from(
    new Set(codes.map((c) => SCHEDULE_DAY_CODES.indexOf(c.trim().toUpperCase())).filter((i) => i >= 0)),
  ).sort()
  return days.length ? days : [...ALL_DAYS]
}

export const daysToCodes = (days: number[]) => SCHEDULE_DAY_CODES.filter((_, i) => days.includes(i))

/** Minute-of-day → "10:00 AM" (validation messages). */
export function minLabel(min: number): string {
  const h24 = Math.floor(min / 60) % 24
  const m = min % 60
  const h12 = h24 % 12
  return `${h12 === 0 ? 12 : h12}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`
}

/** Minute-of-day → "10:00" (list card). */
export const fmtMin = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

// ── Asset register helpers ───────────────────────────────────────────────


/** The editable columns of an asset, for a PUT that changes only some of them. */
export function assetToWrite(m: MtMachine): MtMachineWrite {
  return {
    building: m.building,
    asset_name: m.asset_name,
    category: m.category,
    sub_location: m.sub_location,
    power_load: m.power_load ?? null,
    quantity: m.quantity ?? null,
    condition: m.condition ?? null,
    assigned_to: m.assigned_to ?? null,
    model_no: m.model_no ?? null,
    serial_no: m.serial_no ?? null,
    remarks: m.remarks ?? null,
  }
}

/** "2.2 kW" (NumberFormatter.formatKw) */
export const fmtKw = (kw: number, digits = 1) => `${kw.toFixed(digits)} kW`
/** "1.23 kWh" (NumberFormatter.formatKwh) */
export const fmtKwh = (kwh: number) => `${kwh.toFixed(2)} kWh`
