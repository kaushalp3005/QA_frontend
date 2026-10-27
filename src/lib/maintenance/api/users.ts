/**
 * Manage Users — the mt_users directory at /mt-users (HEAD / ADMIN only on the
 * backend). Ported from MtUserApi.kt, MtUserDto.kt and MtUserRepositoryImpl.kt.
 * No password column: new users sign in with the shared password.
 */
import { MtApiError, mtFetch, type MtRole } from '../client'

export interface MtUserRow {
  id: number
  emp_id?: string | null
  name: string
  location?: string | null
  contact_no?: string | null
  email_id?: string | null
  role?: string | null
  /** Login id, stored lowercase */
  username: string
}

/** Same full-row body for POST and PUT; id is never sent. */
export type MtUserWrite = Omit<MtUserRow, 'id'>

export function listMtUsers() {
  return mtFetch<MtUserRow[]>('/mt-users')
}

export function addMtUser(body: MtUserWrite) {
  return mtFetch<MtUserRow>('/mt-users', { method: 'POST', body })
}

export function updateMtUser(id: number, body: MtUserWrite) {
  return mtFetch<MtUserRow>(`/mt-users/${id}`, { method: 'PUT', body })
}

export function deleteMtUser(id: number) {
  return mtFetch<MtUserRow>(`/mt-users/${id}`, { method: 'DELETE' })
}

/** domain/model UserRole, in enum order (the form's role dropdown) */
export const USER_ROLES: MtRole[] = [
  'OPERATOR',
  'TECHNICIAN',
  'HEAD',
  'QC_HEAD',
  'QC_MEMBER',
  'SUPERVISOR',
  'ADMIN',
  'IT_TECHNICIAN',
]

/** MtUserRepositoryImpl.friendly(): backend `detail` first, then by status. */
export function userErrorText(e: unknown, fallback: string): string {
  if (e instanceof MtApiError) {
    const detail = (e.body as any)?.detail
    if (typeof detail === 'string' && detail.trim()) return detail
    if (e.status === 403) return "You don't have permission to do that"
    if (e.status === 404) return 'User not found'
    return e.message || fallback
  }
  return (e as any)?.message || fallback
}
