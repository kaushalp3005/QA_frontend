/**
 * Spare parts — machine → its parts → quantity on hand, add / edit / delete,
 * use / restock, per-part history, and the warehouse-scoped picker used when
 * a technician closes a PM or a breakdown.
 *
 * Ported from: data/remote/api/SparePartsApi.kt, data/remote/dto/SparePartDtos.kt,
 * data/repository/SparePartsRepositoryImpl.kt, domain/model/spareparts/{SparePart,SparePartPick}.kt.
 *
 * Everything is open to any signed-in user except DELETE, which the backend
 * gates to SUPERVISOR / ADMIN.
 */
import { mtFetch } from '../client'

// ── Wire types ───────────────────────────────────────────────────────────

export interface SparePartDto {
  id: number
  part_name: string
  unit?: string | null
  quantity: number
  min_quantity: number
  low_stock: boolean
}

/** One machine group. asset_id is null for "Other"-path / legacy rows. */
export interface SparePartsMachineDto {
  machine_name: string
  asset_id?: string | null
  asset_name?: string | null
  /** "W202" | "A185" */
  warehouse?: string | null
  parts: SparePartDto[]
}

export interface SparePartPickDto {
  part_id: number
  part_name: string
  unit?: string | null
  quantity: number
  min_quantity: number
  low_stock: boolean
  machine_name?: string | null
  asset_id?: string | null
  warehouse?: string | null
  /** fitted to the asset the picker was opened for */
  for_this_machine: boolean
}

export interface SparePartPickerDto {
  warehouses: string[]
  items: SparePartPickDto[]
}

/** Exactly one of asset_id / machine_name; warehouse only on the machine_name path. */
export interface SparePartCreateDto {
  asset_id?: string | null
  machine_name?: string | null
  warehouse?: string | null
  part_name: string
  unit?: string | null
  quantity: number
  min_quantity: number
}

export type SparePartUpdateDto = Omit<SparePartCreateDto, 'quantity'>

export interface SparePartActionDto {
  quantity: number
  /** WorkType wire string; null for restock (server logs "Restock") */
  work_type?: string | null
  note?: string | null
}

export interface SparePartLogEntryDto {
  id: number
  /** readable work type, verbatim ("Breakdown", "Restock", "Not specified"…) */
  action: string
  /** IN | OUT */
  direction: string
  quantity: number
  note?: string | null
  performed_by_name?: string | null
  /** ISO 8601 */
  performed_at?: string | null
}

// ── Endpoints ────────────────────────────────────────────────────────────

/** All warehouses, grouped by machine. */
export async function listSpareParts(): Promise<SparePartsMachineDto[]> {
  const r = await mtFetch<{ machines?: SparePartsMachineDto[] }>('/spare-parts')
  return (r?.machines ?? []).map((m) => ({ ...m, parts: m.parts ?? [] }))
}

/** Caller's own warehouse only, with parts fitted to `assetId` flagged. */
export async function getSparePartPicker(assetId?: string | null): Promise<SparePartPickerDto> {
  const r = await mtFetch<Partial<SparePartPickerDto>>('/spare-parts/picker', { query: { asset_id: assetId } })
  return { warehouses: r?.warehouses ?? [], items: r?.items ?? [] }
}

export function createSparePart(body: SparePartCreateDto) {
  return mtFetch<SparePartDto>('/spare-parts', { method: 'POST', body })
}

export function updateSparePart(id: number, body: SparePartUpdateDto) {
  return mtFetch<SparePartDto>(`/spare-parts/${id}`, { method: 'PUT', body })
}

/** 204, SUPERVISOR / ADMIN only. */
export function deleteSparePart(id: number) {
  return mtFetch<void>(`/spare-parts/${id}`, { method: 'DELETE' })
}

export function logSparePartUse(id: number, body: SparePartActionDto) {
  return mtFetch<SparePartDto>(`/spare-parts/${id}/use`, { method: 'POST', body })
}

export function restockSparePart(id: number, quantity: number, note?: string | null) {
  return mtFetch<SparePartDto>(`/spare-parts/${id}/restock`, {
    method: 'POST',
    body: { quantity, work_type: null, note: note ?? null },
  })
}

export async function sparePartHistory(id: number): Promise<SparePartLogEntryDto[]> {
  const r = await mtFetch<{ entries?: SparePartLogEntryDto[] }>(`/spare-parts/${id}/history`)
  return r?.entries ?? []
}

// ── Domain helpers (SparePart.kt / SparePartPick.kt) ─────────────────────

/** The three OUT reasons a technician can pick; the wire string doubles as the label. */
export const WORK_TYPES = ['Breakdown', 'PM Maintenance', 'Replacement / Wear & Tear'] as const
export type WorkType = (typeof WORK_TYPES)[number]

/** A work order may carry at most this many spare lines (schemas.MAX_WO_SPARES). */
export const MAX_WO_SPARES = 10

/** Groups are keyed on (warehouse, asset or name), matching the server. */
export const machineKey = (m: SparePartsMachineDto) => `${m.warehouse ?? ''}|${m.asset_id ?? m.machine_name}`

export function machineDisplayName(m: SparePartsMachineDto): string {
  const name = m.asset_name ?? m.machine_name ?? ''
  return name.trim() ? name : 'General / Unassigned'
}

export const lowStockCount = (m: SparePartsMachineDto) => m.parts.filter((p) => p.low_stock).length

/** 'W202' → 'W-202'; unknown values pass through. */
export function warehouseLabel(code: string | null | undefined): string {
  if (code === 'W202') return 'W-202'
  if (code === 'A185') return 'A-185'
  return code ?? ''
}

export const WAREHOUSE_OPTIONS = [
  { value: 'W202', label: 'W-202' },
  { value: 'A185', label: 'A-185' },
]

/** Search over part and machine name — "mixer" finds the mixer's parts. */
export function pickMatches(p: SparePartPickDto, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return p.part_name.toLowerCase().includes(q) || (p.machine_name ?? '').toLowerCase().includes(q)
}

export const signedQuantity = (e: SparePartLogEntryDto) => (e.direction === 'IN' ? `+${e.quantity}` : `-${e.quantity}`)
