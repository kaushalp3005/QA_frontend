/**
 * Mapping of staff name → signature image path (in /public/signatures/).
 * Used by the COA create form (dropdown options) and the print page (rendered image).
 */

/** Plant / warehouse codes a signatory can belong to. */
export type WarehouseScope = 'A185' | 'W202'

export interface SignatureOption {
  name: string
  signature: string | null   // null = free-text "Other", no preset signature
  role?: string
  /**
   * Plants where this signatory appears in the dropdown.
   * Omit = shown in both A185 and W202 (e.g. QC head, free-text "Other").
   */
  warehouses?: WarehouseScope[]
}

export const ANALYSED_BY_OPTIONS: SignatureOption[] = [
  { name: 'Pooja Mhalim',    signature: '/signatures/pooja-mhalim.png',    role: 'Quality Control Executive' },
  { name: 'Shraddha Jadhav', signature: '/signatures/shraddha-jadhav.png', role: 'Quality Control Executive' },
  { name: 'Other',           signature: null }, // user types custom name
]

export const VERIFIED_BY_OPTIONS: SignatureOption[] = [
  { name: 'Pooja Parkar', signature: '/signatures/pooja-parkar.png', role: 'Quality Manager' },
  { name: 'Other',        signature: null },
]

/**
 * QC documentation forms — "Checked By" preset list (operators / QC executives).
 * Pooja Mhalim / Shraddha Jadhav are W202 staff; Pankaj Gosavi /
 * Sarvesh Davande / Swapnil Mahajan are A185 staff. Each appears only in its own plant.
 */
export const CHECKED_BY_OPTIONS: SignatureOption[] = [
  { name: 'Pooja Mhalim',     signature: '/signatures/pooja-mhalim.png',    role: 'Quality Control Executive', warehouses: ['W202'] },
  { name: 'Shraddha Jadhav',  signature: '/signatures/shraddha-jadhav.png', role: 'Quality Control Executive', warehouses: ['W202'] },
  { name: 'Pankaj Gosavi',    signature: null,                              role: 'Quality Control Executive', warehouses: ['A185'] },
  { name: 'Sarvesh Davande',  signature: null,                              role: 'Quality Control Executive', warehouses: ['A185'] },
  { name: 'Swapnil Mahajan',  signature: null,                              role: 'Quality Control Executive', warehouses: ['A185'] },
  { name: 'Tejashri Jadhav',  signature: null,                              role: 'Quality Control Executive' },
  { name: 'Other',            signature: null },
]

/**
 * QC documentation forms — "Verified By" preset list (Quality Manager / Sr. Executives).
 * Pooja Parkar is QC head → shown in both plants. The rest are plant-specific.
 */
export const QC_VERIFIED_BY_OPTIONS: SignatureOption[] = [
  { name: 'Pooja Parkar',     signature: '/signatures/pooja-parkar.png',    role: 'Quality Manager' },
  { name: 'Shraddha Jadhav',  signature: '/signatures/shraddha-jadhav.png', role: 'Quality Control Executive', warehouses: ['W202'] },
  { name: 'Pooja Mhalim',     signature: '/signatures/pooja-mhalim.png',    role: 'Quality Control Executive', warehouses: ['W202'] },
  { name: 'Pankaj Gosavi',    signature: null,                              role: 'Quality Control Executive', warehouses: ['A185'] },
  { name: 'Sarvesh Davande',  signature: null,                              role: 'Quality Control Executive', warehouses: ['A185'] },
  { name: 'Swapnil Mahajan',  signature: null,                              role: 'Quality Control Executive', warehouses: ['A185'] },
  { name: 'Tejashri Jadhav',  signature: null,                              role: 'Quality Control Executive' },
  { name: 'Other',            signature: null },
]

/**
 * Filter a signatory list to those visible for the given plant.
 * Options without a `warehouses` field (e.g. QC head, "Other") show everywhere.
 */
export function filterSignaturesByWarehouse(
  options: SignatureOption[],
  warehouse: WarehouseScope,
): SignatureOption[] {
  return options.filter(o => !o.warehouses || o.warehouses.includes(warehouse))
}

export const COMPANY_STAMP = '/signatures/company-stamp.png'

/**
 * lowercase, drop any email domain, turn dots/underscores/commas into spaces,
 * collapse whitespace. This lets a stored username/email like
 * "pooja.parkar@candorfoods.in" resolve to the preset "Pooja Parkar".
 */
function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/@.*$/, ' ')        // drop email domain → "pooja.parkar"
    .replace(/[._,]/g, ' ')      // dots/underscores/commas → spaces
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Whether a free-typed `typed` name refers to the same person as a preset `preset`.
 * Handles abbreviations like "P.MHALIM" / "P PARKAR" → "Pooja Mhalim" / "Pooja Parkar":
 * the last name must match in full, and the first name must match exactly OR be a
 * single-letter initial of the other. Among the signatory staff every last name is
 * unique, so an initial + last name resolves unambiguously.
 */
function namesMatch(typed: string, preset: string): boolean {
  const t = normalizeName(typed).split(' ').filter(Boolean)
  const p = normalizeName(preset).split(' ').filter(Boolean)
  if (t.length === 0 || p.length === 0) return false
  const tLast = t[t.length - 1], pLast = p[p.length - 1]
  if (tLast !== pLast) return false
  const tFirst = t[0], pFirst = p[0]
  return (
    tFirst === pFirst ||
    (tFirst.length === 1 && pFirst.startsWith(tFirst)) ||
    (pFirst.length === 1 && tFirst.startsWith(pFirst))
  )
}

const ALL_SIGNATORIES = [
  ...ANALYSED_BY_OPTIONS,
  ...VERIFIED_BY_OPTIONS,
  ...CHECKED_BY_OPTIONS,
  ...QC_VERIFIED_BY_OPTIONS,
]

/** Look up signature path for a name (used on the print page) */
export function getSignaturePath(name: string): string | null {
  if (!name) return null
  // 1. Exact match (preserves prior behavior; "Other" → null signature)
  const exact = ALL_SIGNATORIES.find(o => o.name === name)
  if (exact) return exact.signature
  // 2. Tolerant match for abbreviated/free-typed names — only against staff
  //    that actually have a signature image, so we never false-match "Other".
  return ALL_SIGNATORIES.find(o => o.signature && namesMatch(name, o.name))?.signature ?? null
}

/**
 * Resolve a stored value (preset name, abbreviation, or email/username) to the
 * canonical signatory display name. Falls back to the original value when no
 * preset matches (e.g. a free-typed "Other" name). Used for print captions so
 * a username like "pooja.parkar@candorfoods.in" prints as "Pooja Parkar".
 */
export function resolveSignatoryName(value: string): string {
  if (!value) return value
  const exact = ALL_SIGNATORIES.find(o => o.name === value)
  if (exact) return exact.name
  const match = ALL_SIGNATORIES.find(o => o.signature && namesMatch(value, o.name))
  return match ? match.name : value
}

/** Look up role for a name across any option list */
export function getSignatureRole(name: string): string | null {
  const all = [
    ...ANALYSED_BY_OPTIONS,
    ...VERIFIED_BY_OPTIONS,
    ...CHECKED_BY_OPTIONS,
    ...QC_VERIFIED_BY_OPTIONS,
  ]
  return all.find(o => o.name === name)?.role ?? null
}
