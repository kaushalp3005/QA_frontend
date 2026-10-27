'use client'

/**
 * Schedule editor + the small asset-details editor — ported from the two
 * bottom sheets in schedule/ScheduleElectricAssetsScreen.kt, with the editor
 * state rules of ScheduleEditorState (ScheduleElectricAssetsViewModel.kt).
 */

import clsx from 'clsx'
import { Pencil, Plus, X } from 'lucide-react'
import { Button, Field, Input, Modal } from '@/components/maintenance/ui'
import {
  DAY_LABELS,
  MINUTES_IN_DAY,
  fmtMin,
  intervalHours,
  intervalValid,
  intervalsOverlap,
  minLabel,
  type ScheduleInterval,
} from '@/lib/maintenance/api/machines'
import { Toggle } from './shared'

export interface ScheduleEditorState {
  assetId: string
  assetName: string
  /** Never empty while the editor is open */
  intervals: ScheduleInterval[]
  active: boolean
  hasExisting: boolean
  /** 0=Sunday … 6=Saturday */
  days: number[]
  is24h: boolean
}

/** A split shift is a handful of windows, not a timetable. */
export const MAX_INTERVALS = 6
const GAP_MIN = 60
const DEFAULT_SPAN_MIN = 120
const MIN_SPAN_MIN = 30

export const editorTotalHours = (ed: ScheduleEditorState) =>
  ed.is24h ? 24 : ed.intervals.reduce((s, i) => s + intervalHours(i), 0)

/** First problem with the windows, or null. Overlaps name both offenders. */
export function editorValidationError(ed: ScheduleEditorState): string | null {
  if (ed.is24h) return null
  if (!ed.intervals.length) return 'Add at least one interval.'
  const bad = ed.intervals.find((i) => !intervalValid(i))
  if (bad) return `End time must be after start time (${minLabel(bad.startMin)}–${minLabel(bad.endMin)}).`
  const sorted = [...ed.intervals].sort((a, b) => a.startMin - b.startMin)
  for (let k = 0; k < sorted.length - 1; k++) {
    const a = sorted[k]
    const b = sorted[k + 1]
    if (intervalsOverlap(a, b))
      return `Intervals overlap: ${minLabel(a.startMin)}–${minLabel(a.endMin)} and ${minLabel(b.startMin)}–${minLabel(b.endMin)}.`
  }
  return null
}

/** New window an hour past the latest end, so it's valid and non-overlapping on arrival. */
export function nextInterval(intervals: ScheduleInterval[]): ScheduleInterval {
  const lastEnd = intervals.reduce((m, i) => Math.max(m, i.endMin), 0)
  const start = Math.min(lastEnd + GAP_MIN, MINUTES_IN_DAY - MIN_SPAN_MIN)
  return { startMin: start, endMin: Math.min(start + DEFAULT_SPAN_MIN, MINUTES_IN_DAY) }
}

// <input type="time"> can't show 24:00, so a window ending at midnight reads 23:59.
const toTimeValue = (min: number) => fmtMin(Math.min(min, MINUTES_IN_DAY - 1))
const fromTimeValue = (v: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})/.exec(v)
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

export function ScheduleEditorModal({
  editor,
  submitting,
  onChange,
  onSave,
  onClear,
  onEditDetails,
  onClose,
}: {
  editor: ScheduleEditorState | null
  submitting: boolean
  onChange: (next: ScheduleEditorState) => void
  onSave: () => void
  onClear: () => void
  onEditDetails: () => void
  onClose: () => void
}) {
  if (!editor) return null
  const ed = editor
  const validation = editorValidationError(ed)
  const canRemove = ed.intervals.length > 1

  const setInterval = (index: number, patch: Partial<ScheduleInterval>) =>
    onChange({ ...ed, intervals: ed.intervals.map((iv, i) => (i === index ? { ...iv, ...patch } : iv)) })

  const toggleDay = (d: number) =>
    onChange({ ...ed, days: ed.days.includes(d) ? ed.days.filter((x) => x !== d) : [...ed.days, d].sort() })

  return (
    <Modal
      open
      onClose={() => !submitting && onClose()}
      title={ed.assetName || ed.assetId}
      size="md"
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-between">
          <Button variant="ghost" icon={Pencil} onClick={onEditDetails} disabled={submitting}>
            Edit asset details
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            {ed.hasExisting && (
              <Button variant="secondary" onClick={onClear} disabled={submitting}>
                Clear schedule
              </Button>
            )}
            <Button onClick={onSave} loading={submitting} disabled={!!validation || ed.days.length === 0}>
              {ed.hasExisting ? 'Update schedule' : 'Save schedule'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Daily recording windows (factory time)</p>

        <Toggle checked={ed.is24h} onChange={(v) => onChange({ ...ed, is24h: v })} disabled={submitting}>
          24 hours run
        </Toggle>

        {ed.is24h ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Records the full day (24 h) on each selected day.</p>
        ) : (
          <div className="space-y-2">
            {/* A split shift runs 10:00–13:00 and 15:00–22:30; the gap isn't recorded. */}
            {ed.intervals.map((iv, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  type="time"
                  value={toTimeValue(iv.startMin)}
                  disabled={submitting}
                  onChange={(e) => {
                    const v = fromTimeValue(e.target.value)
                    if (v != null) setInterval(i, { startMin: v })
                  }}
                  className="flex-1"
                />
                <span className="text-xs text-zinc-500">to</span>
                <Input
                  type="time"
                  value={toTimeValue(iv.endMin)}
                  disabled={submitting}
                  onChange={(e) => {
                    const v = fromTimeValue(e.target.value)
                    if (v != null) setInterval(i, { endMin: v })
                  }}
                  className="flex-1"
                />
                <button
                  type="button"
                  aria-label={`Remove interval ${i + 1}`}
                  disabled={submitting || !canRemove}
                  onClick={() => onChange({ ...ed, intervals: ed.intervals.filter((_, k) => k !== i) })}
                  className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              icon={Plus}
              disabled={submitting || ed.intervals.length >= MAX_INTERVALS}
              onClick={() => onChange({ ...ed, intervals: [...ed.intervals, nextInterval(ed.intervals)] })}
            >
              Add interval
            </Button>
            <p className="text-xs text-zinc-700 dark:text-zinc-300">Total: {editorTotalHours(ed).toFixed(1)} h/day</p>
            {validation && <p className="text-xs text-red-600 dark:text-red-400">{validation}</p>}
          </div>
        )}

        <div>
          <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">Repeat on</p>
          <div className="flex flex-wrap gap-1.5">
            {DAY_LABELS.map((label, d) => (
              <button
                key={label}
                type="button"
                disabled={submitting}
                onClick={() => toggleDay(d)}
                className={clsx(
                  'rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50',
                  ed.days.includes(d)
                    ? 'border-factory-600 bg-factory-600 text-white'
                    : 'border-zinc-300 text-zinc-600 hover:border-factory-500 dark:border-zinc-700 dark:text-zinc-300',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {ed.days.length === 0 && <p className="mt-1 text-xs text-red-600 dark:text-red-400">Select at least one day.</p>}
        </div>

        <Toggle checked={ed.active} onChange={(v) => onChange({ ...ed, active: v })} disabled={submitting}>
          {ed.active ? 'Active — recording daily' : 'Paused'}
        </Toggle>
      </div>
    </Modal>
  )
}

export interface ScheduleAssetEdit {
  assetId: string
  assetName: string
  powerLoad: string
  subLocation: string
  condition: string
}

export function ScheduleAssetEditModal({
  edit,
  submitting,
  onChange,
  onSave,
  onClose,
}: {
  edit: ScheduleAssetEdit | null
  submitting: boolean
  onChange: (next: ScheduleAssetEdit) => void
  onSave: () => void
  onClose: () => void
}) {
  if (!edit) return null
  const set = (k: keyof ScheduleAssetEdit) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...edit, [k]: e.target.value })
  return (
    <Modal
      open
      onClose={() => !submitting && onClose()}
      title="Edit asset details"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={onSave} loading={submitting} disabled={!edit.assetName.trim()}>
            Save details
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Asset name">
          <Input value={edit.assetName} onChange={set('assetName')} />
        </Field>
        <Field label="Power load (e.g. 120Watt, 1.5kW)">
          <Input value={edit.powerLoad} onChange={set('powerLoad')} />
        </Field>
        <Field label="Floor / sub-location">
          <Input value={edit.subLocation} onChange={set('subLocation')} />
        </Field>
        <Field label="Condition">
          <Input value={edit.condition} onChange={set('condition')} />
        </Field>
      </div>
    </Modal>
  )
}
