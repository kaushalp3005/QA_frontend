/** The two apps that share one login page: the QA / QC system and the
 *  Maintenance system. The system ticked on /login decides which backend
 *  checks the credentials — qc_users for QC, mt_users for Maintenance. */
export type SystemId = 'qc_system' | 'maintenance_system'

/** Entry route of the Maintenance system. Everything under it belongs to
 *  that app — not to be confused with /maintenance-work, a QC section. */
export const MAINTENANCE_HOME = '/maintenance'

/** Last system the user chose at login, so a reload of /login while
 *  signed in sends them back to the same app. */
export const ACTIVE_SYSTEM_KEY = 'active_system'

export function isMaintenancePath(path: string): boolean {
  return path === MAINTENANCE_HOME || path.startsWith(`${MAINTENANCE_HOME}/`)
}
