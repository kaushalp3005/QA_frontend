/**
 * Per-device drafts for work the backend only receives at submit time — the
 * Android app keeps these rows in Room (pm_wo_task_logs, pm_wo_spares,
 * breakdown_spares). Wrapped so private mode / blocked storage just means
 * "no draft" instead of a crash.
 */
import type { PmOverallResult, PmTaskLogStatus } from '@/lib/maintenance/api/technicianPm'
import type { SpareLine } from '@/lib/maintenance/api/technicianSpares'

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full / blocked — the draft simply isn't kept
  }
}

function remove(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

// ── PM execution ─────────────────────────────────────────────────────────

export interface PmLogDraft {
  status: PmTaskLogStatus
  notes: string | null
  completed_at: number
  completed_by: string
}

export interface PmExecutionDraft {
  logs: Record<string, PmLogDraft>
  spares: SpareLine[]
  finalNotes: string
  overallResult: PmOverallResult | null
}

const pmKey = (woId: string) => `mt_pm_exec_${woId}`
export const loadPmDraft = (woId: string) => read<PmExecutionDraft>(pmKey(woId))
export const savePmDraft = (woId: string, d: PmExecutionDraft) => write(pmKey(woId), d)
export const clearPmDraft = (woId: string) => remove(pmKey(woId))

// ── Breakdown spares ─────────────────────────────────────────────────────

const bdKey = (id: string) => `mt_bd_spares_${id}`
export const loadBreakdownSpares = (id: string) => read<SpareLine[]>(bdKey(id)) ?? []
export const saveBreakdownSpares = (id: string, lines: SpareLine[]) =>
  lines.length ? write(bdKey(id), lines) : remove(bdKey(id))
