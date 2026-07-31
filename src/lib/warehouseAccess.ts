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
 * The single warehouse the signed-in account is confined to, or null when it
 * may work across plants (the full admin, and ordinary users).
 */
export function lockedWarehouse(): WarehouseCode | null {
  if (isFullAdmin()) return null
  const email = getUserEmail()
  if (!email) return null
  return SCOPED_ADMIN_EMAILS[email.trim().toLowerCase()] ?? null
}

/** False when the account is pinned to one plant — hide every warehouse switch. */
export function canSwitchWarehouse(): boolean {
  return lockedWarehouse() === null
}
