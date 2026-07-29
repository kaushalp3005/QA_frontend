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
 * Production floor staff — "Checked By (Production Incharge)" on the
 * Pre-Production Inspection Checklist. None have a signature image yet, so
 * their name prints as plain text; "Other" reveals a free-text input.
 */
// Production Incharge "Checked By" list for the Pre-Production Inspection form.
// The names below are W202 staff; A185 has its own two incharges. Each name is
// plant-scoped so the dropdown only shows that plant's people ("Other" shows on both).
export const PRODUCTION_INCHARGE_OPTIONS: SignatureOption[] = [
  { name: 'Roshan',     signature: null, role: 'Production Incharge', warehouses: ['W202'] },
  { name: 'Harsh',      signature: null, role: 'Production Incharge', warehouses: ['W202'] },
  { name: 'Vidya',      signature: null, role: 'Production Incharge', warehouses: ['W202'] },
  { name: 'Abhishek',   signature: null, role: 'Production Incharge', warehouses: ['W202'] },
  { name: 'Shakira',    signature: null, role: 'Production Incharge', warehouses: ['W202'] },
  { name: 'Soham',      signature: null, role: 'Production Incharge', warehouses: ['W202'] },
  { name: 'Shabana A.', signature: null, role: 'Production Incharge', warehouses: ['W202'] },
  { name: 'Shabana S.', signature: null, role: 'Production Incharge', warehouses: ['W202'] },
  { name: 'Namrata N.', signature: null, role: 'Production Incharge', warehouses: ['W202'] },
  { name: 'Madhuri',    signature: null, role: 'Production Incharge', warehouses: ['W202'] },
  { name: 'Santosh',    signature: null, role: 'Production Incharge', warehouses: ['W202'] },
  { name: 'Rajkumar Kamble', signature: null, role: 'Production Incharge', warehouses: ['A185'] },
  { name: 'Satish Ingole',   signature: null, role: 'Production Incharge', warehouses: ['A185'] },
  { name: 'Other',      signature: null },
]

/**
 * QC documentation forms — "Checked By" preset list (operators / QC executives).
 * Pooja Mhalim / Shraddha Jadhav are W202 staff; Pankaj Gosavi / Sarvesh Davande /
 * Swapnil Mahajan / Prajakta / Dhanashree are A185 staff. Each appears only in its own plant.
 */
export const CHECKED_BY_OPTIONS: SignatureOption[] = [
  { name: 'Pooja Parkar',     signature: '/signatures/pooja-parkar.png',    role: 'Quality Manager' }, // QC head → all documents, both plants
  { name: 'Pooja Mhalim',     signature: '/signatures/pooja-mhalim.png',    role: 'Quality Control Executive', warehouses: ['W202'] },
  { name: 'Shraddha Jadhav',  signature: '/signatures/shraddha-jadhav.png', role: 'Quality Control Executive', warehouses: ['W202'] },
  { name: 'Pankaj Gosavi',    signature: null,                              role: 'Quality Control Executive', warehouses: ['A185'] },
  { name: 'Sarvesh Davande',  signature: '/signatures/sarvesh-davande.png', role: 'Quality Control Executive', warehouses: ['A185'] },
  { name: 'Swapnil Mahajan',  signature: '/signatures/swapnil-mahajan.png', role: 'Quality Control Executive', warehouses: ['A185'] },
  { name: 'Prajakta',         signature: '/signatures/prajakta.png',        role: 'Quality Control Executive', warehouses: ['A185'] },
  { name: 'Dhanashree',       signature: '/signatures/dhanashree.png',      role: 'Quality Control Executive', warehouses: ['A185'] },
  { name: 'Tejashri Jadhav',  signature: '/signatures/tejashri-jadhav.png', role: 'Quality Control Executive' },
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
  { name: 'Sarvesh Davande',  signature: '/signatures/sarvesh-davande.png', role: 'Quality Control Executive', warehouses: ['A185'] },
  { name: 'Swapnil Mahajan',  signature: '/signatures/swapnil-mahajan.png', role: 'Quality Control Executive', warehouses: ['A185'] },
  { name: 'Prajakta',         signature: '/signatures/prajakta.png',        role: 'Quality Control Executive', warehouses: ['A185'] },
  { name: 'Dhanashree',       signature: '/signatures/dhanashree.png',      role: 'Quality Control Executive', warehouses: ['A185'] },
  { name: 'Tejashri Jadhav',  signature: '/signatures/tejashri-jadhav.png', role: 'Quality Control Executive' },
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

/** Damerau-Levenshtein edit distance (adjacent transposition counts as 1 edit,
 *  not 2) — small strings only, used for typo-tolerant name matching below. */
function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length
  const d: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) d[i][0] = i
  for (let j = 0; j <= n; j++) d[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost,
      )
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
      }
    }
  }
  return d[m][n]
}

/**
 * Whether a signatory signs at `warehouse`. The plant metadata lives on the QC
 * documentation lists; someone absent from both, or listed there without a
 * `warehouses` field (e.g. the QC head), counts as signing at every plant.
 */
function signatoryWorksAt(name: string, warehouse: WarehouseScope): boolean {
  const entries = [...CHECKED_BY_OPTIONS, ...QC_VERIFIED_BY_OPTIONS].filter(o => o.name === name)
  if (entries.length === 0) return true
  return entries.some(o => !o.warehouses || o.warehouses.includes(warehouse))
}

/**
 * Fallback for a bare first name typed with no last name at all — e.g.
 * "SARVESH", or "DHANAHSREE" (a transposed-letter typo for "Dhanashree").
 * Real print data is full of exactly this: operators type just a first name,
 * sometimes with a slip. Resolves when exactly one signatory's first name is
 * the closest match. When several tie (e.g. "POOJA" — Pooja Parkar and Pooja
 * Mhalim), the plant the sheet belongs to breaks the tie if it leaves exactly
 * one candidate: Pooja Mhalim is W202-only, so "POOJA" on an A185 sheet can
 * only be Pooja Parkar. A tie the plant can't settle stays unresolved and
 * prints as plain text, rather than risking the wrong person's signature.
 */
function matchBareFirstName(typed: string, warehouse?: WarehouseScope): SignatureOption | null {
  const t = normalizeName(typed)
  if (!t || t.includes(' ')) return null
  const bySignatoryName = new Map<string, SignatureOption>()
  for (const o of ALL_SIGNATORIES) {
    if (o.signature && !bySignatoryName.has(o.name)) bySignatoryName.set(o.name, o)
  }
  let bestDist = Infinity
  let bestMatches: SignatureOption[] = []
  for (const o of bySignatoryName.values()) {
    const first = normalizeName(o.name).split(' ')[0]
    const dist = editDistance(t, first)
    if (dist > 2) continue
    if (dist < bestDist) { bestDist = dist; bestMatches = [o] }
    else if (dist === bestDist) bestMatches.push(o)
  }
  if (bestMatches.length === 1) return bestMatches[0]
  if (bestMatches.length > 1 && warehouse) {
    const inPlant = bestMatches.filter(o => signatoryWorksAt(o.name, warehouse))
    if (inPlant.length === 1) return inPlant[0]
  }
  return null
}

/**
 * Look up signature path for a name (used on the print page).
 * `warehouse` is the plant the record belongs to — optional, and used only to
 * break a first-name tie the name itself can't resolve (see matchBareFirstName).
 */
export function getSignaturePath(name: string, warehouse?: WarehouseScope): string | null {
  if (!name) return null
  // 1. Exact match (preserves prior behavior; "Other" → null signature)
  const exact = ALL_SIGNATORIES.find(o => o.name === name)
  if (exact) return exact.signature
  // 2. Tolerant match for abbreviated/free-typed names — only against staff
  //    that actually have a signature image, so we never false-match "Other".
  const tolerant = ALL_SIGNATORIES.find(o => o.signature && namesMatch(name, o.name))
  if (tolerant) return tolerant.signature
  // 3. Bare-first-name fallback (see matchBareFirstName)
  return matchBareFirstName(name, warehouse)?.signature ?? null
}

/**
 * Resolve a stored value (preset name, abbreviation, or email/username) to the
 * canonical signatory display name. Falls back to the original value when no
 * preset matches (e.g. a free-typed "Other" name). Used for print captions so
 * a username like "pooja.parkar@candorfoods.in" prints as "Pooja Parkar".
 */
export function resolveSignatoryName(value: string, warehouse?: WarehouseScope): string {
  if (!value) return value
  const exact = ALL_SIGNATORIES.find(o => o.name === value)
  if (exact) return exact.name
  const match = ALL_SIGNATORIES.find(o => o.signature && namesMatch(value, o.name))
  if (match) return match.name
  return matchBareFirstName(value, warehouse)?.name ?? value
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
