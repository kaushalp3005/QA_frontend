/**
 * Mapping of staff name → signature image path (in /public/signatures/).
 * Used by the COA create form (dropdown options) and the print page (rendered image).
 */

export interface SignatureOption {
  name: string
  signature: string | null   // null = free-text "Other", no preset signature
  role?: string
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

export const COMPANY_STAMP = '/signatures/company-stamp.png'

/** Look up signature path for a name (used on the print page) */
export function getSignaturePath(name: string): string | null {
  const all = [...ANALYSED_BY_OPTIONS, ...VERIFIED_BY_OPTIONS]
  return all.find(o => o.name === name)?.signature ?? null
}
