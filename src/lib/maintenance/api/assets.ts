/**
 * Asset register — mt_asset_list, served at /mt-machines. Shared by most
 * screens (machine list, spare parts, PM plans, IT assets, transfers…).
 * Ported from MtMachineApi / MtMachineDto / domain/model/MtMachine.kt.
 *
 * asset_id ("A185-0001", "W202-0005") is the one machine identity every
 * energy / breakdown / kWh call keys on.
 */
import { mtFetch } from '../client'

export interface MtMachine {
  asset_id: string
  /** "W202" | "A185" */
  building: string
  asset_name: string
  /** Free-text backend category, e.g. "Production Equipment", "Electric Asset" */
  category: string
  sub_location: string
  /** Raw text such as "120Watt", "2.2 kW", "1.5 HP" */
  power_load?: string | null
  rated_kw?: number | null
  quantity?: number | null
  condition?: string | null
  assigned_to?: string | null
  model_no?: string | null
  serial_no?: string | null
  remarks?: string | null
  /** A supervisor schedule owns this machine — operator Start/Stop is off */
  schedule_locked?: boolean
}

/** Editable columns for POST / PUT. rated_kw is recomputed server-side. */
export type MtMachineWrite = Omit<MtMachine, 'asset_id' | 'rated_kw' | 'schedule_locked'>

export function listMachines(filters: { building?: string; sub_location?: string; category?: string } = {}) {
  return mtFetch<MtMachine[]>('/mt-machines', { query: filters })
}

/** Append a new asset; the backend assigns asset_id. */
export function addMachine(body: MtMachineWrite) {
  return mtFetch<MtMachine>('/mt-machines', { method: 'POST', body: { asset_id: '', ...body } })
}

export function updateMachine(assetId: string, body: MtMachineWrite) {
  return mtFetch<MtMachine>(`/mt-machines/${encodeURIComponent(assetId)}`, { method: 'PUT', body })
}

// ── Derived facts (domain/model/MtMachine.kt) ────────────────────────────

export type MachineSection = 'PRODUCTION' | 'OTHERS'

export const machineSection = (m: Pick<MtMachine, 'category'>): MachineSection =>
  m.category?.trim().toLowerCase() === 'production equipment' ? 'PRODUCTION' : 'OTHERS'

const NON_RUNNABLE = new Set(
  [
    'Electric Asset',
    'Housekeeping',
    'Utility',
    'IT/Communication',
    'Power Distribution',
    'Infrastructure',
    'Fire & Safety',
    'Utility/Infrastructure',
  ].map((c) => c.toLowerCase()),
)

/** A run can start only on real machinery with a known power draw. */
export const isRunnable = (m: MtMachine) =>
  !!m.power_load?.trim() && !NON_RUNNABLE.has(m.category?.trim().toLowerCase())

const OPERATOR_HIDDEN = new Set(
  [
    'Electric Asset',
    'Lab Equipment',
    'Utility/Infrastructure',
    'Housekeeping',
    'Furniture/Storage',
    'Infrastructure',
    'IT/Communication',
  ].map((c) => c.toLowerCase()),
)

/** Non-production support assets an operator never sees. */
export const isHiddenFromOperator = (m: MtMachine) => OPERATOR_HIDDEN.has(m.category?.trim().toLowerCase())

export const CONDITION_SHUT_DOWN = 'Shut Down'

export const isShutDown = (m: Pick<MtMachine, 'condition'>) =>
  m.condition?.trim().toLowerCase() === CONDITION_SHUT_DOWN.toLowerCase()

/** Best-effort kW from free-text power_load; null when the unit is unknown. */
export function parsePowerKw(raw: string | null | undefined): number | null {
  if (!raw?.trim()) return null
  const text = raw.trim().toLowerCase()
  const n = text.match(/\d+(?:\.\d+)?/)
  if (!n) return null
  const v = Number(n[0])
  if (text.includes('kw')) return v
  if (text.includes('hp')) return v * 0.7457
  if (text.includes('watt') || text.endsWith('w')) return v / 1000
  return null
}

/** Backend rated_kw, else parsed power_load */
export const ratedKw = (m: MtMachine) => m.rated_kw ?? parsePowerKw(m.power_load)

// ── User roster (GET /users) ─────────────────────────────────────────────

export interface UserRosterEntry {
  id: string
  name: string
  role: string
  plant_id: string
}

/** mt_users directory, optionally filtered by role (e.g. "technician"). */
export function listUsers(role?: string) {
  return mtFetch<UserRosterEntry[]>('/users', { query: { role } })
}
