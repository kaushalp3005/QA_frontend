/**
 * Which plant(s) an account may work in.
 *
 * Must mirror SCOPED_ADMIN_EMAILS / admin_scope_for in
 * backend/app/config/doc_registry.py. The backend re-checks and clamps every
 * request, so this module only decides what the UI offers.
 */

export type WarehouseCode = 'A185' | 'W202'

export const ADMIN_EMAIL = 'pooja.parkar@candorfoods.in'

/**
 * Accounts that belong to one plant. They get admin-level rights over that
 * plant's records (edit locked date/time fields, delete) AND are confined to
 * it — no warehouse switch is offered anywhere, and everything they read or
 * write is stamped with this warehouse.
 */
export const SCOPED_ADMIN_EMAILS: Record<string, WarehouseCode> = {
  'quality.a-185@candorfoods.in': 'A185',
}

/**
 * Accounts confined to one plant WITHOUT any elevated rights over it.
 *
 * Deliberately separate from SCOPED_ADMIN_EMAILS: listing an account there
 * would also make it an admin over every doc_ form at that plant. These only
 * needed the confinement half — no warehouse switch is offered, and everything
 * they read or write is stamped with this warehouse.
 *
 * Mirrors PLANT_PINNED_EMAILS in backend qc/config/doc_registry.py.
 */
export const PLANT_PINNED_EMAILS: Record<string, WarehouseCode> = {
  'printing@candorfoods.in': 'W202',
  'printinga185@candorfoods.in': 'A185',
}

/** Reads the signed-in email from any of the shapes login has stored it under. */
export function getUserEmail(): string | null {
  if (typeof window === 'undefined') return null
  const direct = localStorage.getItem('user_email')
  if (direct) return direct
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    return user?.email ?? user?.user?.email ?? null
  } catch { return null }
}

/** True for the full admin — every record, any warehouse. */
export function isFullAdmin(): boolean {
  const email = getUserEmail()
  return !!email && email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()
}

/**
 * The plant this account administers: '*' for the full admin, a warehouse code
 * for a scoped admin, null for everyone else.
 *
 * Kept separate from lockedWarehouse() because being pinned to a plant is not
 * the same as having rights over it — conflating the two would silently make
 * every plant-pinned account a documentation admin.
 */
export function adminScope(): WarehouseCode | '*' | null {
  if (isFullAdmin()) return '*'
  const email = getUserEmail()
  if (!email) return null
  return SCOPED_ADMIN_EMAILS[email.trim().toLowerCase()] ?? null
}

/**
 * The single warehouse the signed-in account is confined to, or null when it
 * may work across plants (the full admin, and ordinary users).
 */
export function lockedWarehouse(): WarehouseCode | null {
  if (isFullAdmin()) return null
  const email = getUserEmail()
  if (!email) return null
  const key = email.trim().toLowerCase()
  return SCOPED_ADMIN_EMAILS[key] ?? PLANT_PINNED_EMAILS[key] ?? null
}

/** False when the account is pinned to one plant — hide every warehouse switch. */
export function canSwitchWarehouse(): boolean {
  return lockedWarehouse() === null
}
