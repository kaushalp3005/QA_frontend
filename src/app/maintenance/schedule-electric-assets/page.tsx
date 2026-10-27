'use client'

/**
 * Schedule Electric Assets — ported from schedule/ScheduleElectricAssetsScreen +
 * ScheduleElectricAssetsViewModel. A supervisor gives each schedulable asset
 * its daily recording windows (split shifts, weekdays, 24 h) and edits basic
 * asset details; the backend records the estimated kWh once a window elapses.
 * Head (and every other role) is read-only.
 */

import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Card, EmptyState, ErrorBanner, PageHeader, SearchInput, SkeletonRows } from '@/components/maintenance/ui'
import { useMtQuery, useMtSession } from '@/lib/maintenance/hooks'
import { listMachines, updateMachine, type MtMachine } from '@/lib/maintenance/api/assets'
import {
  ALL_DAYS,
  MINUTES_IN_DAY,
  assetToWrite,
  clearAssetSchedule,
  codesToDays,
  daysToCodes,
  fmtMin,
  listAssetSchedules,
  scheduleIntervals,
  upsertAssetSchedule,
  type AssetScheduleDto,
} from '@/lib/maintenance/api/machines'
import { homePathFor } from '@/lib/maintenance/nav'
import {
  ScheduleAssetEditModal,
  ScheduleEditorModal,
  editorValidationError,
  type ScheduleAssetEdit,
  type ScheduleEditorState,
} from '@/components/maintenance/machines/ScheduleEditorModal'
import { FilterSelect, containsIgnoreCase, distinctSorted, eqIgnoreCase } from '@/components/maintenance/machines/shared'

/** First window offered on a brand-new schedule: 10:00–20:00. */
const DEFAULT_INTERVAL = { startMin: 600, endMin: 1200 }

export default function ScheduleElectricAssetsPage() {
  const session = useMtSession()
  const q = useMtQuery(() => listAssetSchedules('both'), [])
  const schedules = useMemo(() => q.data ?? [], [q.data])

  const [building, setBuilding] = useState<string | null>(null)
  const [floor, setFloor] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [editor, setEditor] = useState<ScheduleEditorState | null>(null)
  const [assetEdit, setAssetEdit] = useState<ScheduleAssetEdit | null>(null)
  // Full asset behind the details sheet, so a save keeps the fields it doesn't expose.
  const [editingAsset, setEditingAsset] = useState<MtMachine | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Only a supervisor may create / edit / delete schedules or asset details.
  const canEdit = session?.role === 'SUPERVISOR'

  const buildings = useMemo(() => distinctSorted(schedules.map((s) => s.building)), [schedules])
  const floors = useMemo(
    () =>
      distinctSorted(
        schedules.filter((s) => !building || eqIgnoreCase(s.building, building)).map((s) => s.sub_location),
      ),
    [schedules, building],
  )
  const filtered = useMemo(() => {
    const s = search.trim()
    return schedules
      .filter((x) => !building || eqIgnoreCase(x.building, building))
      .filter((x) => !floor || eqIgnoreCase(x.sub_location, floor))
      .filter((x) => !s || containsIgnoreCase(x.asset_name, s) || containsIgnoreCase(x.asset_id, s))
  }, [schedules, building, floor, search])

  const openEditor = (item: AssetScheduleDto) => {
    if (!canEdit) return
    const intervals = scheduleIntervals(item)
    const has = intervals.length > 0
    setEditor({
      assetId: item.asset_id,
      assetName: item.asset_name ?? '',
      intervals: has ? intervals : [DEFAULT_INTERVAL],
      active: has ? item.active === true : true,
      hasExisting: has,
      // New schedules default to every day; existing ones keep their saved days.
      days: has ? codesToDays(item.days) : [...ALL_DAYS],
      is24h: item.is_24h === true,
    })
  }

  const saveSchedule = async () => {
    if (!editor || !canEdit) return
    const err = editorValidationError(editor)
    if (err) return void toast.error(err)
    if (!editor.days.length) return void toast.error('Select at least one day.')
    // A full-day window is sent for a 24 h run so the backend's duration maths holds.
    const intervals = editor.is24h
      ? [{ startMin: 0, endMin: MINUTES_IN_DAY }]
      : [...editor.intervals].sort((a, b) => a.startMin - b.startMin)
    setSubmitting(true)
    try {
      await upsertAssetSchedule(editor.assetId, {
        start_min: intervals[0].startMin,
        end_min: intervals[intervals.length - 1].endMin,
        intervals: intervals.map((i) => ({ start_min: i.startMin, end_min: i.endMin })),
        active: editor.active,
        days: daysToCodes(editor.days),
        is_24h: editor.is24h,
      })
      setEditor(null)
      toast.success('Schedule saved')
      q.reload()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save schedule')
    } finally {
      setSubmitting(false)
    }
  }

  const clearSchedule = async () => {
    if (!editor || !canEdit) return
    setSubmitting(true)
    try {
      await clearAssetSchedule(editor.assetId)
      setEditor(null)
      toast.success('Schedule cleared')
      q.reload()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to clear schedule')
    } finally {
      setSubmitting(false)
    }
  }

  const openAssetEdit = async () => {
    if (!editor || !canEdit) return
    setSubmitting(true)
    try {
      const asset = (await listMachines()).find((m) => m.asset_id === editor.assetId)
      if (!asset) {
        toast.error('Asset not found.')
        return
      }
      setEditingAsset(asset)
      setEditor(null)
      setAssetEdit({
        assetId: asset.asset_id,
        assetName: asset.asset_name ?? '',
        powerLoad: asset.power_load ?? '',
        subLocation: asset.sub_location ?? '',
        condition: asset.condition ?? '',
      })
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load asset register')
    } finally {
      setSubmitting(false)
    }
  }

  const saveAsset = async () => {
    if (!assetEdit || !editingAsset || !canEdit) return
    if (!assetEdit.assetName.trim()) return void toast.error("Asset name can't be empty.")
    setSubmitting(true)
    try {
      await updateMachine(editingAsset.asset_id, {
        ...assetToWrite(editingAsset),
        asset_name: assetEdit.assetName.trim(),
        power_load: assetEdit.powerLoad.trim() || null,
        sub_location: assetEdit.subLocation.trim(),
        condition: assetEdit.condition.trim() || null,
      })
      setEditingAsset(null)
      setAssetEdit(null)
      toast.success('Asset details updated')
      q.reload()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update asset')
    } finally {
      setSubmitting(false)
    }
  }

  if (!session) return null

  return (
    <>
      <PageHeader
        title="Schedule Assets"
        subtitle={canEdit ? 'Tap an asset to set its daily recording window' : 'View only'}
        back={homePathFor(session.role)}
      />

      {q.loading && !q.data ? (
        <SkeletonRows rows={6} />
      ) : q.error ? (
        <ErrorBanner error={q.error} onRetry={q.reload} />
      ) : schedules.length === 0 ? (
        <EmptyState title="No electric assets found." />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-[1fr_14rem_14rem] lg:items-end">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search machine name…"
              className="col-span-2 lg:col-span-1"
            />
            <FilterSelect
              label="Warehouse"
              allLabel="All"
              value={building}
              options={buildings}
              onChange={(b) => {
                // Floors are per-building, so switching warehouse resets the floor.
                setBuilding(b)
                setFloor(null)
              }}
            />
            <FilterSelect label="Floor" allLabel="All" value={floor} options={floors} onChange={setFloor} />
          </div>

          {filtered.length === 0 ? (
            <EmptyState title="No assets match the current search or warehouse/floor filters." />
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {filtered.map((item) => (
                <ScheduleCard key={item.asset_id} item={item} onClick={canEdit ? () => openEditor(item) : undefined} />
              ))}
            </div>
          )}
        </>
      )}

      <ScheduleEditorModal
        editor={editor}
        submitting={submitting}
        onChange={setEditor}
        onSave={saveSchedule}
        onClear={clearSchedule}
        onEditDetails={openAssetEdit}
        onClose={() => setEditor(null)}
      />
      <ScheduleAssetEditModal
        edit={assetEdit}
        submitting={submitting}
        onChange={setAssetEdit}
        onSave={saveAsset}
        onClose={() => {
          setEditingAsset(null)
          setAssetEdit(null)
        }}
      />
    </>
  )
}

function ScheduleCard({ item, onClick }: { item: AssetScheduleDto; onClick?: () => void }) {
  const intervals = scheduleIntervals(item)
  const has = intervals.length > 0
  let summary = 'No schedule set'
  if (has) {
    const kwh = item.est_daily_kwh != null ? `~${item.est_daily_kwh.toFixed(1)} kWh/day` : '—'
    // Past a couple of windows, summarise by count and total hours.
    const windows = item.is_24h
      ? '24 h'
      : intervals.length <= 2
        ? intervals.map((i) => `${fmtMin(i.startMin)}–${fmtMin(i.endMin)}`).join(', ')
        : `${intervals.length} intervals · ${(item.hours ?? 0).toFixed(1)} h/day`
    summary = `${windows} · ${kwh} · ${item.active ? 'Active' : 'Paused'}`
  }
  const meta = [item.asset_id, item.category, item.building, item.sub_location, item.power_load]
    .filter((s) => s && s.trim())
    .join(' · ')
  return (
    <Card onClick={onClick} className="px-4 py-3">
      <p className="font-bold text-zinc-900 dark:text-zinc-50">{item.asset_name || item.asset_id}</p>
      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{meta}</p>
      <p
        className={
          has && item.active
            ? 'mt-2 text-sm font-medium text-factory-700 dark:text-factory-300'
            : 'mt-2 text-sm font-medium text-zinc-600 dark:text-zinc-400'
        }
      >
        {summary}
      </p>
      {(item.rated_kw == null || item.rated_kw <= 0) && (
        <p className="mt-1 text-[11px] font-medium text-red-600 dark:text-red-400">Set a power load to record consumption.</p>
      )}
    </Card>
  )
}
