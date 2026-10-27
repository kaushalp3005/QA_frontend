/**
 * Who picked up a breakdown for QC. The backend records the QC pickup
 * (qc_checked_by) but none of its read endpoints return it — the Android app
 * keeps it in Room (breakdown_flags.qcAcknowledgedBy, written by
 * BreakdownRepositoryImpl.qcAcknowledge). The web keeps the same fact in
 * localStorage so "My Active" and the held-by-me / held-by-other gates work
 * like they do on a phone. PM work orders don't need this: the server sends
 * qc_acknowledged_by on every work order.
 */

const KEY = 'mt_qc_breakdown_claims'

export interface QcClaim {
  userId: string
  userName: string
  /** epoch ms */
  at: number
}

type ClaimMap = Record<string, QcClaim>

function read(): ClaimMap {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') as ClaimMap
  } catch {
    return {}
  }
}

function write(map: ClaimMap) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    // storage full / blocked — the pickup still happened server-side
  }
}

export function getClaims(): ClaimMap {
  return read()
}

export function getClaim(flagId: string): QcClaim | null {
  return read()[flagId] ?? null
}

export function setClaim(flagId: string, claim: QcClaim) {
  const map = read()
  map[flagId] = claim
  write(map)
}

export function clearClaim(flagId: string) {
  const map = read()
  if (!(flagId in map)) return
  delete map[flagId]
  write(map)
}

/** Drop claims for breakdowns that are no longer waiting on QC. */
export function pruneClaims(stillPendingQc: Set<string>) {
  const map = read()
  let changed = false
  for (const id of Object.keys(map)) {
    if (!stillPendingQc.has(id)) {
      delete map[id]
      changed = true
    }
  }
  if (changed) write(map)
}
