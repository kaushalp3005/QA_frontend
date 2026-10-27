/**
 * IT technician assets — the Electrical and IT/Communication slices of the asset
 * register (/mt-machines). Ported from domain/model/ItAssetCategory.kt and the
 * presentation/it/ ViewModels. The endpoints themselves live in ./assets.ts.
 */
import type { MtRole } from '../client'
import { listMachines, type MtMachine } from './assets'

export type ItAssetCategory = 'ELECTRICAL' | 'IT_COMMUNICATION'

/** The enum NAME travels in the URL — "IT/Communication" has a slash. */
export const IT_ASSET_CATEGORIES: Record<ItAssetCategory, { label: string; backendValue: string }> = {
  ELECTRICAL: { label: 'Electrical Assets', backendValue: 'Electric Asset' },
  IT_COMMUNICATION: { label: 'IT / Communication', backendValue: 'IT/Communication' },
}

export const IT_CATEGORY_ORDER: ItAssetCategory[] = ['ELECTRICAL', 'IT_COMMUNICATION']

/** Parse a route argument; unknown / absent falls back to the first category. */
export function itCategoryOf(name: string | null | undefined): ItAssetCategory {
  const n = (name ?? '').trim()
  return (IT_CATEGORY_ORDER as string[]).includes(n) ? (n as ItAssetCategory) : 'ELECTRICAL'
}

/** Trim + case-insensitive, so a casing variant already in the register still shows. */
export const itCategoryMatches = (c: ItAssetCategory, m: Pick<MtMachine, 'category'>) =>
  (m.category ?? '').trim().toLowerCase() === IT_ASSET_CATEGORIES[c].backendValue.toLowerCase()

/** Buildings offered when adding an asset (AddMachineSheet.buildingOptions). */
export const IT_BUILDING_OPTIONS = ['W202', 'A185']

/** Who may edit the register for these categories — mirrors the backend allow-list. */
export const canEditItAsset = (role: MtRole | null | undefined) =>
  role === 'IT_TECHNICIAN' || role === 'SUPERVISOR' || role === 'HEAD' || role === 'ADMIN'

/** There is no GET /mt-machines/{id}: the Android repository finds the row in the
 *  full list, and so do we. Null when the id isn't in the register. */
export async function getAssetById(assetId: string): Promise<MtMachine | null> {
  const rows = await listMachines()
  return rows.find((m) => m.asset_id === assetId) ?? null
}
