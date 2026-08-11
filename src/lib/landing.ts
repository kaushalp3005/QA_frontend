import { NAVIGATION } from '@/lib/constants/navigation'
import { isSuperAdmin } from '@/lib/constants/modules'

/** Shape the login flow stores in localStorage, from GET /auth/permissions/{company}.
 *  Note the short keys — /settings/my-permissions uses can_view/can_access instead. */
export type StoredPermissions = Record<
  string,
  { access?: boolean; view?: boolean } | undefined
>

/** Where to send a user after login, or whenever we'd otherwise hardcode
 *  /dashboard. Dashboard is a permissioned module now, so a user without it
 *  must land on the first section they can actually view. */
export function landingPathFor(
  email: string | null | undefined,
  permissions: StoredPermissions,
): string {
  if (isSuperAdmin(email)) return '/dashboard'
  const first = NAVIGATION.find((item) => permissions[item.moduleCode]?.view)
  // No viewable module at all — /dashboard renders the "no access" card, which
  // is a truthful dead end rather than a redirect loop.
  return first?.href ?? '/dashboard'
}

function readJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/** landingPathFor() using whatever the last login cached in localStorage. */
export function landingPathFromStorage(): string {
  const email =
    localStorage.getItem('user_email') ??
    readJson<{ email?: string }>('user')?.email ??
    null
  return landingPathFor(email, readJson<StoredPermissions>('permissions') ?? {})
}
