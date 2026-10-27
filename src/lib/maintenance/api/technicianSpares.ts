/**
 * Spares a technician consumes while closing a PM or a breakdown.
 * Ported from SparePartsApi.picker / SparePartPickerResponseDto,
 * domain/model/spareparts/SparePartPick.kt and the logSpare rules in
 * BreakdownRepositoryImpl + PmWorkOrderRepositoryImpl.
 *
 * The picker is warehouse-scoped by the server. Picks stay in the browser until
 * the job is submitted — submitting is what decrements mt_spareparts.
 */
import { mtFetch } from '../client'

/** The server rejects an eleventh spare line on one job. */
export const MAX_WO_SPARES = 10

/** GET /spare-parts/picker item (SparePartPickerItemDto) */
export interface SparePartPick {
  part_id: number
  part_name: string
  unit?: string | null
  quantity: number
  min_quantity?: number
  low_stock?: boolean
  machine_name?: string | null
  asset_id?: string | null
  warehouse?: string | null
  /** Fitted to the machine being worked on — listed first */
  for_this_machine?: boolean
}

export interface SparePartPickerResponse {
  warehouses: string[]
  items: SparePartPick[]
}

/** One spare line as both submit payloads carry it (PmSpareDto wire shape). */
export interface SpareLine {
  id: string
  /** mt_spareparts row; null only on lines logged before the picker shipped */
  part_id: number | null
  spare_name: string
  machine_name?: string | null
  quantity_used: number
  unit: string
  notes?: string | null
  /** epoch ms */
  logged_at: number
  logged_by: string
  /** Server's word on whether stock already moved; echoed back on resubmit */
  deducted?: boolean
}

export async function sparePicker(assetId?: string | null): Promise<SparePartPickerResponse> {
  const r = await mtFetch<SparePartPickerResponse>('/spare-parts/picker', { query: { asset_id: assetId ?? undefined } })
  const items = [...(r?.items ?? [])].sort(
    (a, b) =>
      Number(!a.for_this_machine) - Number(!b.for_this_machine) ||
      (a.machine_name ?? '').toLowerCase().localeCompare((b.machine_name ?? '').toLowerCase()) ||
      a.part_name.toLowerCase().localeCompare(b.part_name.toLowerCase()),
  )
  return { warehouses: r?.warehouses ?? [], items }
}

export const warehouseLabel = (warehouses: string[]) => warehouses.join(' / ') || 'your warehouse'

/** Search box matches the part and the machine it belongs to. */
export function pickMatches(p: SparePartPick, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return p.part_name.toLowerCase().includes(q) || (p.machine_name ?? '').toLowerCase().includes(q)
}

const newId = () =>
  `spare-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)}`

/**
 * Add a pick to a job's lines. A part already on the list adds to its line
 * instead of becoming a second row; otherwise the 10-line cap applies.
 * Returns the new list, or an error message.
 */
export function addSpareLine(
  lines: SpareLine[],
  pick: SparePartPick,
  quantity: number,
  notes: string | null,
  userId: string,
  limitMessage: string,
): { lines: SpareLine[] } | { error: string } {
  const dup = lines.find((l) => l.part_id === pick.part_id)
  if (dup) {
    return {
      lines: lines.map((l) =>
        l === dup ? { ...l, quantity_used: l.quantity_used + quantity, notes: notes ?? l.notes ?? null } : l,
      ),
    }
  }
  if (lines.length >= MAX_WO_SPARES) return { error: limitMessage }
  return {
    lines: [
      ...lines,
      {
        id: newId(),
        part_id: pick.part_id,
        spare_name: pick.part_name.trim(),
        machine_name: pick.machine_name ?? null,
        quantity_used: quantity,
        unit: (pick.unit ?? '').trim(),
        notes,
        logged_at: Date.now(),
        logged_by: userId,
      },
    ],
  }
}
