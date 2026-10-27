/**
 * Operator recess (pause/resume) session — ported from EnergyRepositoryImpl's
 * recess functions + domain/usecase/energy/RecessTimer.kt.
 *
 * A production session is one or more run segments. Recess stops the current
 * segment on the backend and banks its active time; Resume starts a new segment.
 * The backend only knows the segments; the banked total and "on recess" flag
 * were device-local (Room recess_state) on Android and are kept per browser
 * here, keyed by operator + asset.
 */

export interface RecessState {
  onRecess: boolean
  /** Active time banked from finished segments this session */
  accumulatedActiveMs: number
  /** epoch ms the current recess began */
  recessStartedAt: number | null
}

const key = (userId: string, assetId: string) => `mt_recess:${userId}:${assetId}`

export function readRecess(userId: string, assetId: string): RecessState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key(userId, assetId))
    return raw ? (JSON.parse(raw) as RecessState) : null
  } catch {
    return null
  }
}

export function writeRecess(userId: string, assetId: string, state: RecessState): void {
  try {
    localStorage.setItem(key(userId, assetId), JSON.stringify(state))
  } catch {
    // storage blocked — the session just won't survive a reload
  }
}

export function clearRecess(userId: string, assetId: string): void {
  try {
    localStorage.removeItem(key(userId, assetId))
  } catch {
    // ignore
  }
}

/** Cumulative ACTIVE time, excluding recess gaps (cumulativeActiveMs). */
export function cumulativeActiveMs(accumulatedActiveMs: number, currentSegmentStartMs: number | null, nowMs: number) {
  const current = currentSegmentStartMs != null ? Math.max(0, nowMs - currentSegmentStartMs) : 0
  return accumulatedActiveMs + current
}

/** ms → "HH:MM:SS" */
export function fmtHms(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}
