// frontend/src/config/deepCleaningAreas.ts
//
// Row seeds for the Housekeeping Deep Cleaning record, per plant.
//
// The two plants run different controlled formats, so the schedule rows differ:
//   A185 → CFPLB.C4.F.57  (11 rows, plus an "Area" header field)
//   W202 → CFPLA.C4.F.55  (14 rows, no Area field)
// Mirrors the per-plant seeding that @/config/glassBrittleAreas does for the
// Glass & Brittle register.

import type { WarehouseCode } from '@/lib/warehouseAccess'

export interface DeepCleanSeed {
  /** Serial number as printed on the paper format — NOT the array index. */
  sr: number
  area: string
  method: string
  /** W = Weekly, M = Monthly, FD = Twice in a month, D = Daily. */
  freq: string
}

/** Frequency legend printed above the table on the A185 format. */
export const DEEP_CLEAN_FREQ_LEGEND = 'W: Weekly;  M: Monthly;  FD: Twice in a month'

export const DEEP_CLEAN_FREQ_LABELS: Record<string, string> = {
  W: 'Weekly',
  M: 'Monthly',
  FD: 'Twice in a month',
  D: 'Daily',
}

/**
 * A185 — CFPLB.C4.F.57.
 * Sr. numbers are transcribed exactly from the controlled format, which skips 9
 * (…7, 8, 10, 11, 12). Kept as printed so a filed printout matches the paper.
 */
export const A185_DEEP_CLEAN_ITEMS: DeepCleanSeed[] = [
  { sr: 1,  area: 'Window',                         method: 'Dry  cleaning',        freq: 'FD' },
  { sr: 2,  area: 'Side walls',                     method: 'Dry  cleaning',        freq: 'W'  },
  { sr: 3,  area: 'Lockers',                        method: 'Dry cleaning',         freq: 'M'  },
  { sr: 4,  area: 'Plant Overhead cleaning',        method: 'Dry Cleaning',         freq: 'M'  },
  { sr: 5,  area: 'Pipelines',                      method: 'CIP',                  freq: 'M'  },
  { sr: 6,  area: 'Storage Racks',                  method: 'Dry  cleaning',        freq: 'FD' },
  { sr: 7,  area: 'Air Curtains/Strip Curtains',    method: 'Dry  &  Wet Cleaning', freq: 'W'  },
  { sr: 8,  area: 'Cobwebs',                        method: 'Dry cleaning',         freq: 'W'  },
  { sr: 10, area: 'Basin Area',                     method: 'Wet cleaning',         freq: 'FD' },
  { sr: 11, area: 'water cooler',                   method: 'wet cleaning',         freq: 'W'  },
  { sr: 12, area: 'Waste bins and pallets washing', method: 'Wet cleaning',         freq: 'W'  },
]

/** W202 — CFPLA.C4.F.55. The list this form has always used. */
export const W202_DEEP_CLEAN_ITEMS: DeepCleanSeed[] = [
  { sr: 1,  area: 'Window',         method: 'Dry cleaning',         freq: 'FD' },
  { sr: 2,  area: 'Side walls',     method: 'Dry cleaning',         freq: 'W'  },
  { sr: 3,  area: 'Lockers',        method: 'Dry cleaning',         freq: 'M'  },
  { sr: 4,  area: 'Plant Overhead', method: 'Dry Cleaning',         freq: 'M'  },
  { sr: 5,  area: 'Ceiling',        method: 'Dry Cleaning',         freq: 'M'  },
  { sr: 6,  area: 'Pallets',        method: 'Dry cleaning/Wash',    freq: 'W'  },
  { sr: 7,  area: 'Under machines', method: 'Dry cleaning/Vacuum',  freq: 'W'  },
  { sr: 8,  area: 'Cooling area',   method: 'Dry/Wet cleaning',     freq: 'W'  },
  { sr: 9,  area: 'Dock area',      method: 'Dry cleaning',         freq: 'W'  },
  { sr: 10, area: 'Drains',         method: 'Wet cleaning',         freq: 'W'  },
  { sr: 11, area: 'Trolleys',       method: 'Dry/Wet cleaning',     freq: 'W'  },
  { sr: 12, area: 'Racks',          method: 'Dry cleaning',         freq: 'W'  },
  { sr: 13, area: 'Weighing area',  method: 'Dry cleaning',         freq: 'D'  },
  { sr: 14, area: 'Light Fixtures', method: 'Dry/Vacuum cleaning',  freq: 'W'  },
]

/** True when this plant's format carries the "Area:" header field. */
export const hasAreaField = (warehouse: string) => warehouse === 'A185'

export function deepCleanItemsFor(warehouse: WarehouseCode | string): DeepCleanSeed[] {
  return warehouse === 'A185' ? A185_DEEP_CLEAN_ITEMS : W202_DEEP_CLEAN_ITEMS
}

/** Document number printed on this plant's format. */
export const deepCleanDocNo = (warehouse: string) =>
  warehouse === 'A185' ? 'CFPLB.C4.F.57' : 'CFPLA.C4.F.55'
