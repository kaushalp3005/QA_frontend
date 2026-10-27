/**
 * Spare parts stock export (util/excel/SparePartsSheet.kt) — one row per part,
 * exactly the filtered rows on screen.
 */
import { warehouseLabel, type SparePartDto } from '@/lib/maintenance/api/spareparts'
import type { Sheet } from '@/components/maintenance/utilities/csv'

/** A part plus the machine it sits under — a search hit and an export row. */
export interface SparePartRow {
  part: SparePartDto
  machineName: string
  warehouse?: string | null
  assetId?: string | null
}

export function sparePartsSheet(rows: SparePartRow[], title = 'Spare parts'): Sheet {
  return {
    name: title,
    headers: ['Warehouse', 'Machine', 'Asset ID', 'Part', 'Unit', 'Quantity', 'Min quantity', 'Low stock'],
    rows: rows.map((r) => [
      warehouseLabel(r.warehouse),
      r.machineName,
      r.assetId ?? '',
      r.part.part_name,
      r.part.unit ?? '',
      r.part.quantity,
      r.part.min_quantity,
      r.part.low_stock ? 'LOW' : '',
    ]),
  }
}
