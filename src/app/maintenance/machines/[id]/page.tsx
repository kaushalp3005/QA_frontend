'use client'

/**
 * Machine detail — ported from machine/MachineDetailScreen + MachineDetailViewModel.
 *
 * Operator: Production Start / Recess / Resume / Stop and Report Breakdown.
 * Supervisor: edit asset details. Supervisor / Admin / Head: shut down / restore.
 * Everyone else views read-only. Live run + breakdown state come from the
 * backend (/energy/runs/active, /breakdowns/open), polled every 20 s.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { AlertTriangle, Ban, History, Pause, Pencil, Play, RotateCcw, Square } from 'lucide-react'
import {
  Button,
  Card,
  ConfirmDialog,
  ErrorBanner,
  LoadingBlock,
  PageHeader,
} from '@/components/maintenance/ui'
import { useMtQuery, useMtSession, usePolling } from '@/lib/maintenance/hooks'
import { fmtDuration, fmtTime, startOfDayIst } from '@/lib/maintenance/format'
import {
  CONDITION_SHUT_DOWN,
  isRunnable,
  isShutDown as assetShutDown,
  listMachines,
  updateMachine,
  type MtMachine,
} from '@/lib/maintenance/api/assets'
import {
  BREAKDOWN_STATUS_LABEL,
  SEVERITY_LABEL,
  assetToWrite,
  fmtKw,
  fmtKwh,
  getMachineHistory,
  isUnresolved,
  startRun,
  stopRun,
  type DailyRunDto,
} from '@/lib/maintenance/api/machines'
import {
  clearRecess,
  cumulativeActiveMs,
  fmtHms,
  readRecess,
  writeRecess,
  type RecessState,
} from '@/lib/maintenance/api/machinesRecess'
import { MT } from '@/lib/maintenance/nav'
import { AssetEditModal, type AssetEditForm } from '@/components/maintenance/machines/AssetEditModal'
import { LIVE_POLL_MS, useLiveStatus } from '@/components/maintenance/machines/useLiveStatus'

type Dialog = 'start' | 'stop' | 'shutdown' | 'restore' | null

export default function MachineDetailPage({ params }: { params: { id: string } }) {
  const assetId = decodeURIComponent(params.id)
  const session = useMtSession()

  const assetQ = useMtQuery(async () => {
    const all = await listMachines()
    const found = all.find((m) => m.asset_id === assetId)
    if (!found) throw new Error('Machine not found in the asset register.')
    return found
  }, [assetId])
  const asset = assetQ.data ?? null

  const live = useLiveStatus()

  // Today's runs from the backend (the Android app read its own device's Room rows).
  const [todaysRuns, setTodaysRuns] = useState<DailyRunDto[]>([])
  const loadToday = useCallback(async () => {
    try {
      const days = await getMachineHistory(assetId, startOfDayIst(), Date.now())
      const runs = (days ?? []).flatMap((d) => d.runs ?? []).sort((a, b) => b.started_at - a.started_at)
      setTodaysRuns(runs)
    } catch {
      // keep the last good list
    }
  }, [assetId])
  useEffect(() => {
    loadToday()
  }, [loadToday])
  usePolling(loadToday, LIVE_POLL_MS)

  const [recess, setRecess] = useState<RecessState | null>(null)
  useEffect(() => {
    if (session) setRecess(readRecess(session.userId, assetId))
  }, [session, assetId])

  const [dialog, setDialog] = useState<Dialog>(null)
  const [busy, setBusy] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // ── Derived state (MachineDetailUiState) ──
  const role = session?.role
  const isOperator = role === 'OPERATOR'
  const isSupervisor = role === 'SUPERVISOR'
  const canToggleShutDown = role === 'SUPERVISOR' || role === 'ADMIN' || role === 'HEAD'

  const backendRun = live.runs.find((r) => r.asset_id === assetId) ?? null
  // Own-run policy: only the operator who started a run can pause / stop it.
  const ownRun =
    backendRun?.run_id && backendRun.operator_id && session && String(backendRun.operator_id) === session.userId
      ? backendRun
      : null
  const isLocalRunning = !!ownRun
  const onRecess = recess?.onRecess === true && !ownRun
  const inLocalSession = isLocalRunning || onRecess
  const accumulatedActiveMs = recess?.accumulatedActiveMs ?? 0
  const hasActiveRun = !!backendRun
  const runOperatorName = ownRun ? session?.name ?? 'You' : backendRun?.operator_name ?? null
  const canStop = !!ownRun
  const runningButLocked = hasActiveRun && !canStop

  const activeBreakdown = useMemo(
    () =>
      live.open
        .filter((b) => b.asset_id === assetId && isUnresolved(b))
        .sort((a, b) => (b.reported_at ?? 0) - (a.reported_at ?? 0))[0] ?? null,
    [live.open, assetId],
  )
  const underBreakdown = !!activeBreakdown
  const isShutDown = asset ? assetShutDown(asset) : false
  const isScheduleLocked = asset?.schedule_locked === true

  // 1-second tick so the active-time / recess timer counts visibly.
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!inLocalSession) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [inLocalSession])

  const saveRecess = (s: RecessState | null) => {
    if (!session) return
    if (s) writeRecess(session.userId, assetId, s)
    else clearRecess(session.userId, assetId)
    setRecess(s)
  }

  const afterRunChange = async () => {
    await Promise.all([live.reload(), loadToday()])
  }

  // ── Actions ──
  const onStartClicked = () => {
    if (underBreakdown || isShutDown || isScheduleLocked) return
    setDialog('start')
  }

  const confirmStart = async () => {
    setDialog(null)
    if (!asset) return
    setBusy(true)
    try {
      await startRun(asset.asset_id)
      // Fresh session — drop any leftover recess so the timer starts at 0.
      saveRecess(null)
      toast.success('Production started')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to start run')
    } finally {
      await afterRunChange()
      setBusy(false)
    }
  }

  /** Recess: stop the current segment and bank its active time. One tap. */
  const onRecessClicked = async () => {
    if (!ownRun?.run_id) return
    setBusy(true)
    try {
      const endedAt = Date.now()
      await stopRun(ownRun.run_id, endedAt)
      saveRecess({
        onRecess: true,
        accumulatedActiveMs: accumulatedActiveMs + Math.max(0, endedAt - ownRun.started_at),
        recessStartedAt: endedAt,
      })
      toast.success('Production paused')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to pause production')
    } finally {
      await afterRunChange()
      setBusy(false)
    }
  }

  /** Resume: open a new segment, keeping the banked active time. One tap. */
  const onResumeClicked = async () => {
    if (!asset || isShutDown || isScheduleLocked || !onRecess) return
    setBusy(true)
    try {
      await startRun(asset.asset_id)
      saveRecess({ onRecess: false, accumulatedActiveMs, recessStartedAt: null })
      toast.success('Production resumed')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to resume production')
    } finally {
      await afterRunChange()
      setBusy(false)
    }
  }

  const confirmStop = async () => {
    setDialog(null)
    if (!inLocalSession && !canStop) return
    setBusy(true)
    try {
      // Paused → nothing is running on the backend; just end the session.
      if (ownRun?.run_id) await stopRun(ownRun.run_id, Date.now())
      saveRecess(null)
      toast.success('Production stopped')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to stop production')
    } finally {
      await afterRunChange()
      setBusy(false)
    }
  }

  const setCondition = async (condition: string | null, successMsg: string) => {
    setDialog(null)
    if (!asset) return
    setBusy(true)
    try {
      const updated = await updateMachine(asset.asset_id, { ...assetToWrite(asset), condition })
      assetQ.setData(updated ?? { ...asset, condition })
      toast.success(successMsg)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update asset')
    } finally {
      setBusy(false)
    }
  }

  const saveEdit = async (f: AssetEditForm) => {
    if (!asset) return
    if (!f.assetName.trim() || !f.building.trim()) {
      setEditError('Asset name and building are required.')
      return
    }
    const q = f.quantity.trim()
    setSavingEdit(true)
    setEditError(null)
    try {
      // power_load goes as text; the backend recomputes rated_kw and returns the fresh row.
      const updated = await updateMachine(asset.asset_id, {
        ...assetToWrite(asset),
        building: f.building.trim(),
        asset_name: f.assetName.trim(),
        category: f.category.trim(),
        sub_location: f.subLocation.trim(),
        quantity: q ? parseInt(q, 10) : null,
        model_no: f.modelNo.trim() || null,
        serial_no: f.serialNo.trim() || null,
        power_load: f.powerLoad.trim() || null,
        condition: f.condition.trim() || null,
        remarks: f.remarks.trim() || null,
      })
      if (updated) assetQ.setData(updated)
      else assetQ.reload()
      setEditOpen(false)
      toast.success('Machine details updated')
    } catch (e: any) {
      setEditError(e?.message || 'Failed to update asset')
    } finally {
      setSavingEdit(false)
    }
  }

  if (!session) return null
  const back = role === 'TECHNICIAN' ? MT.machineMaster : MT.machines

  if (assetQ.loading && !asset) return <LoadingBlock />
  if (!asset)
    return (
      <>
        <PageHeader title="Asset" back={back} />
        <ErrorBanner error={assetQ.error} onRetry={assetQ.reload} />
      </>
    )

  const name = asset.asset_name || assetId
  const hero = 'w-full py-3.5 text-base'

  return (
    <>
      <PageHeader
        title={name}
        back={back}
        actions={
          <>
            {isSupervisor && (
              <Button
                variant="secondary"
                size="sm"
                icon={Pencil}
                onClick={() => {
                  setEditError(null)
                  setEditOpen(true)
                }}
              >
                Edit
              </Button>
            )}
            {canToggleShutDown &&
              (isShutDown ? (
                <Button variant="secondary" size="sm" icon={RotateCcw} onClick={() => setDialog('restore')} disabled={busy}>
                  Restore
                </Button>
              ) : (
                <Button variant="secondary" size="sm" icon={Ban} onClick={() => setDialog('shutdown')} disabled={busy}>
                  Shut down
                </Button>
              ))}
          </>
        }
      />

      <div className="mx-auto max-w-3xl space-y-4">
        <AssetHeaderCard asset={asset} />

        {isShutDown && (
          <Banner tone="red" title="● SHUT DOWN">
            <p>This machine has been shut down and is locked for all users.</p>
            <p className="text-xs opacity-75">A supervisor, admin, or head can restore it from the top-right menu.</p>
          </Banner>
        )}

        {activeBreakdown && (
          <Banner tone="red" title="● UNDER BREAKDOWN">
            <p className="text-xs opacity-80">
              Severity: {SEVERITY_LABEL[(activeBreakdown.severity ?? 'MAJOR').toUpperCase()] ?? activeBreakdown.severity}
              {'  ·  '}Status: {BREAKDOWN_STATUS_LABEL[activeBreakdown.status?.toUpperCase()] ?? activeBreakdown.status}
            </p>
            {activeBreakdown.description?.trim() && <p>{activeBreakdown.description}</p>}
            <p className="text-xs opacity-75">
              Production Start is disabled until a technician resolves and QC clears it.
            </p>
          </Banner>
        )}

        {onRecess ? (
          <Banner tone="amber" title="● ON RECESS">
            <p>Active time: {fmtHms(accumulatedActiveMs)} (paused)</p>
            <p className="text-xs opacity-75">
              Paused for {fmtHms(recess?.recessStartedAt ? now - recess.recessStartedAt : 0)} — tap Resume to continue.
            </p>
          </Banner>
        ) : isLocalRunning && ownRun ? (
          <Banner tone="green" title="● RUNNING">
            <p>Operator: {runOperatorName ?? '—'}</p>
            <p className="text-xs opacity-75 tabular-nums">
              Active time: {fmtHms(cumulativeActiveMs(accumulatedActiveMs, ownRun.started_at, now))}
            </p>
          </Banner>
        ) : hasActiveRun && backendRun ? (
          <Banner tone="green" title="● RUNNING">
            <p>Operator: {runOperatorName ?? '—'}</p>
            <p className="text-xs opacity-75">
              Since {fmtTime(backendRun.started_at)} · {fmtDuration(backendRun.started_at, Date.now())}
            </p>
          </Banner>
        ) : null}

        {/* Production Start/Stop is OPERATOR-only; everyone else is read-only. */}
        {isOperator && (
          <div className="space-y-3">
            {isScheduleLocked ? (
              <>
                <Button variant="success" icon={Play} className={hero} disabled>
                  Production Start
                </Button>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Under a supervisor schedule — this machine records automatically, so operator Start/Stop is disabled.
                </p>
              </>
            ) : onRecess ? (
              <>
                <Button variant="success" icon={Play} className={hero} onClick={onResumeClicked} loading={busy}>
                  Resume
                </Button>
                <Button variant="danger" icon={Square} className={hero} onClick={() => setDialog('stop')} disabled={busy}>
                  Stop (end shift)
                </Button>
              </>
            ) : isLocalRunning && canStop ? (
              <>
                <Button variant="secondary" icon={Pause} className={hero} onClick={onRecessClicked} loading={busy}>
                  Recess (pause)
                </Button>
                <Button variant="danger" icon={Square} className={hero} onClick={() => setDialog('stop')} disabled={busy}>
                  Production Stop
                </Button>
              </>
            ) : runningButLocked ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                This run was started by {runOperatorName ?? 'another operator'} — only they can stop it.
              </p>
            ) : isShutDown || underBreakdown ? (
              <Button variant="success" icon={Play} className={hero} disabled>
                Production Start
              </Button>
            ) : (
              <>
                <Button variant="success" icon={Play} className={hero} onClick={onStartClicked} loading={busy}>
                  Production Start
                </Button>
                {!isRunnable(asset) && (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    This asset has no power load on record or is a support asset, so the kWh for its runs may not be
                    computed.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* Hidden once a breakdown is already open (can't double-report). */}
        {isOperator && !underBreakdown && !isShutDown && (
          <Button variant="secondary" icon={AlertTriangle} className="w-full py-3" href={MT.machineBreakdown(asset.asset_id)}>
            Report Breakdown
          </Button>
        )}

        <div className="flex items-center justify-between pt-2">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Today&apos;s Runs</h2>
          <Link
            href={MT.machineHistory(asset.asset_id)}
            className="inline-flex items-center gap-1 text-sm font-semibold text-factory-700 hover:underline dark:text-factory-300"
          >
            <History className="h-4 w-4" /> 30-day history
          </Link>
        </div>

        {todaysRuns.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No runs logged today</p>
        ) : (
          <div className="space-y-2">
            {todaysRuns.map((r) => (
              <RunRow key={r.id} run={r} />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={dialog === 'start'}
        title="Start Production"
        message={`Start production run on ${name}?`}
        confirmLabel="Start"
        onConfirm={confirmStart}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === 'stop'}
        title="Stop Production"
        message={`Stop production run on ${name}?`}
        confirmLabel="Stop"
        danger
        onConfirm={confirmStop}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === 'shutdown'}
        title="Shut Down Machine"
        message={`Shut down ${name}? It will be locked for all users until restored.`}
        confirmLabel="Shut Down"
        danger
        onConfirm={() => setCondition(CONDITION_SHUT_DOWN, 'Machine shut down')}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === 'restore'}
        title="Restore Machine"
        message={`Restore ${name}? Operators will be able to use it again.`}
        confirmLabel="Restore"
        onConfirm={() => setCondition(null, 'Machine restored')}
        onClose={() => setDialog(null)}
      />

      <AssetEditModal
        open={editOpen}
        asset={asset}
        saving={savingEdit}
        error={editError}
        onClose={() => setEditOpen(false)}
        onSave={saveEdit}
      />
    </>
  )
}

function AssetHeaderCard({ asset }: { asset: MtMachine }) {
  const location = [asset.building, asset.sub_location].filter((s) => s?.trim()).join(' · ')
  const power = asset.rated_kw != null ? fmtKw(asset.rated_kw) : asset.power_load || '—'
  return (
    <Card className="p-4">
      <p className="font-bold text-zinc-900 dark:text-zinc-50">{asset.asset_id}</p>
      {location && <p className="text-sm text-zinc-600 dark:text-zinc-300">{location}</p>}
      <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
        <Info label="Rated Power" value={power} />
        <Info label="Category" value={asset.category?.trim() || '—'} />
        {asset.condition?.trim() && <Info label="Condition" value={asset.condition} />}
      </div>
    </Card>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{value}</p>
    </div>
  )
}

const BANNER_TONE = {
  red: 'border-red-200 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200',
  amber: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
  green:
    'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
}
const BANNER_TITLE = {
  red: 'text-red-700 dark:text-red-300',
  amber: 'text-amber-700 dark:text-amber-300',
  green: 'text-emerald-700 dark:text-emerald-300',
}

function Banner({ tone, title, children }: { tone: keyof typeof BANNER_TONE; title: string; children: React.ReactNode }) {
  return (
    <div className={`space-y-1 rounded-xl border p-4 text-sm ${BANNER_TONE[tone]}`}>
      <p className={`text-sm font-bold ${BANNER_TITLE[tone]}`}>{title}</p>
      {children}
    </div>
  )
}

function RunRow({ run }: { run: DailyRunDto }) {
  return (
    <Card className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{fmtTime(run.started_at)}</p>
        {run.ended_at == null ? (
          <p className="text-sm font-medium text-factory-700 dark:text-factory-300">Running…</p>
        ) : (
          <>
            <p className="text-sm tabular-nums text-zinc-700 dark:text-zinc-300">→ {fmtTime(run.ended_at)}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{fmtDuration(run.started_at, run.ended_at)}</p>
          </>
        )}
      </div>
      {run.ended_at != null && run.kwh != null && (
        <p className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{fmtKwh(run.kwh)}</p>
      )}
    </Card>
  )
}

