'use client'

/**
 * Machines — ported from machinelist/MachineListScreen + MachineListViewModel.
 * Operator home, and the Supervisor / Head / Technician live machine list:
 * the full asset register overlaid with live status (Running / Breakdown /
 * Under QC / Idle) from the backend, polled every 20 s.
 */

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Database, Plus, RefreshCw } from 'lucide-react'
import {
  Button,
  Card,
  Chips,
  EmptyState,
  ErrorBanner,
  PageHeader,
  SearchInput,
  SkeletonRows,
  Tabs,
} from '@/components/maintenance/ui'
import { useMtQuery, useMtSession } from '@/lib/maintenance/hooks'
import { addMachine, isHiddenFromOperator, isShutDown, listMachines, type MtMachine, type MtMachineWrite } from '@/lib/maintenance/api/assets'
import {
  LIVE_STATUS_META,
  breakdownSets,
  liveStatusOf,
  type ActiveRunDto,
  type MachineLiveStatus,
} from '@/lib/maintenance/api/machines'
import { MT, homePathFor } from '@/lib/maintenance/nav'
import { AddMachineModal } from '@/components/maintenance/machines/AddMachineModal'
import { useLiveStatus } from '@/components/maintenance/machines/useLiveStatus'
import {
  BuildingSwitch,
  FilterSelect,
  LIVE_STATUS_TEXT,
  LiveStatusDot,
  ShutDownDot,
  containsIgnoreCase,
  distinctSorted,
  eqIgnoreCase,
} from '@/components/maintenance/machines/shared'

type StatusFilter = 'ALL' | MachineLiveStatus

const STATUS_FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'ALL', label: 'All' },
  { id: 'RUNNING', label: 'Running' },
  { id: 'BREAKDOWN', label: 'Breakdown' },
  { id: 'UNDER_QC', label: 'Under QC' },
  { id: 'IDLE', label: 'Idle' },
]

interface Item {
  asset: MtMachine
  status: MachineLiveStatus
  run?: ActiveRunDto
}

/** "just now" / "12m" / "1h 5m" (MachineListScreen.formatDuration) */
function runningFor(ms: number): string {
  const mins = Math.floor(Math.max(0, ms) / 60_000)
  if (mins < 1) return 'just now'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function MachinesPage() {
  const session = useMtSession()
  const router = useRouter()
  const assets = useMtQuery(() => listMachines(), [])
  const live = useLiveStatus()

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [building, setBuilding] = useState<string | null>(null)
  const [floor, setFloor] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [showAdd, setShowAdd] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const role = session?.role
  const isOperator = role === 'OPERATOR'
  const canAddMachine = role === 'SUPERVISOR' || role === 'HEAD' || role === 'TECHNICIAN' || role === 'ADMIN'

  // Operators never see electric / furniture / lab support assets.
  const visible = useMemo(() => {
    const all = assets.data ?? []
    return isOperator ? all.filter((a) => !isHiddenFromOperator(a)) : all
  }, [assets.data, isOperator])

  const runByAsset = useMemo(() => new Map(live.runs.map((r) => [r.asset_id, r])), [live.runs])
  const { underBreakdown, underQc } = useMemo(() => breakdownSets(live.open), [live.open])
  const statusOf = (id: string) => liveStatusOf(id, runByAsset, underQc, underBreakdown)

  const categories = useMemo(() => distinctSorted(visible.map((a) => a.category)), [visible])
  const buildings = useMemo(() => distinctSorted(visible.map((a) => a.building)), [visible])
  const floors = useMemo(
    () => distinctSorted(visible.filter((a) => !building || eqIgnoreCase(a.building, building)).map((a) => a.sub_location)),
    [visible, building],
  )
  const subLocationsByBuilding = useMemo(() => {
    const out: Record<string, string[]> = {}
    for (const b of distinctSorted(visible.map((a) => a.building)))
      out[b] = distinctSorted(visible.filter((a) => a.building === b).map((a) => a.sub_location))
    return out
  }, [visible])

  const counts = useMemo(() => {
    const c: Record<MachineLiveStatus, number> = { RUNNING: 0, BREAKDOWN: 0, UNDER_QC: 0, IDLE: 0 }
    for (const a of visible) c[statusOf(a.asset_id)]++
    return c
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, runByAsset, underQc, underBreakdown])

  const items: Item[] = useMemo(() => {
    const q = search.trim()
    return visible
      .map((asset) => ({ asset, status: statusOf(asset.asset_id), run: runByAsset.get(asset.asset_id) }))
      .filter(
        (it) =>
          !q ||
          containsIgnoreCase(it.asset.asset_name, q) ||
          containsIgnoreCase(it.asset.asset_id, q) ||
          containsIgnoreCase(it.asset.sub_location, q),
      )
      .filter((it) => !category || eqIgnoreCase(it.asset.category, category))
      .filter((it) => !building || eqIgnoreCase(it.asset.building, building))
      .filter((it) => !floor || eqIgnoreCase(it.asset.sub_location, floor))
      .filter((it) => statusFilter === 'ALL' || it.status === statusFilter)
      .sort(
        (a, b) =>
          LIVE_STATUS_META[a.status].order - LIVE_STATUS_META[b.status].order ||
          a.asset.asset_name.toLowerCase().localeCompare(b.asset.asset_name.toLowerCase()),
      )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, runByAsset, underQc, underBreakdown, search, category, building, floor, statusFilter])

  const refresh = () => {
    assets.reload()
    live.reload()
  }

  const submitNew = async (m: MtMachineWrite) => {
    setAdding(true)
    setAddError(null)
    try {
      await addMachine(m)
      setShowAdd(false)
      toast.success('Machine added')
      assets.reload()
    } catch (e: any) {
      setAddError(e?.message || 'Failed to add machine')
    } finally {
      setAdding(false)
    }
  }

  if (!session) return null
  const grouped = statusFilter === 'ALL'
  const now = Date.now()

  return (
    <>
      <PageHeader
        title="Machines"
        subtitle={`${session.name} — ${session.plantId}`}
        back={isOperator ? undefined : homePathFor(session.role)}
        actions={
          <>
            {isOperator && (
              <Button variant="secondary" size="sm" icon={Database} href={MT.machineMaster}>
                Machine Master
              </Button>
            )}
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={refresh} loading={assets.loading && !!assets.data}>
              Refresh
            </Button>
            {canAddMachine && (
              <Button
                size="sm"
                icon={Plus}
                onClick={() => {
                  setAddError(null)
                  setShowAdd(true)
                }}
              >
                Add machine
              </Button>
            )}
          </>
        }
      />

      {assets.loading && !assets.data ? (
        <SkeletonRows rows={6} />
      ) : assets.error && !assets.data ? (
        <>
          <ErrorBanner error={`Failed to load machines. ${assets.error}`} onRetry={refresh} />
        </>
      ) : (
        <>
          <div className="mb-4 space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <BuildingSwitch
                buildings={buildings}
                value={building}
                onChange={(b) => {
                  // Floors are per-building, so switching warehouse resets the floor.
                  setBuilding(b)
                  setFloor(null)
                }}
              />
              <SearchInput value={search} onChange={setSearch} placeholder="Search machines…" className="flex-1" />
              {floors.length > 0 && (
                <FilterSelect
                  label="Floor"
                  allLabel="All floors"
                  value={floor}
                  options={floors}
                  onChange={setFloor}
                  className="lg:w-56"
                />
              )}
            </div>
            <Chips<StatusFilter>
              options={STATUS_FILTERS.map((f) => ({
                id: f.id,
                label: f.id === 'ALL' ? `All (${visible.length})` : `${f.label} (${counts[f.id as MachineLiveStatus]})`,
              }))}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </div>

          {categories.length > 0 && (
            <Tabs
              tabs={[{ id: '', label: 'All' }, ...categories.map((c) => ({ id: c, label: c }))]}
              value={category ?? ''}
              onChange={(id) => setCategory(id || null)}
            />
          )}

          {items.length === 0 ? (
            <EmptyState title="No machines match your filters." />
          ) : (
            <div className="space-y-2">
              {items.map((it, i) => {
                const prev = items[i - 1]
                const header = grouped && (!prev || prev.status !== it.status)
                return (
                  <div key={it.asset.asset_id}>
                    {header && (
                      <h2
                        className={`pb-1 pt-3 text-sm font-bold uppercase tracking-wide ${LIVE_STATUS_TEXT[it.status]}`}
                      >
                        {LIVE_STATUS_META[it.status].label} ({items.filter((x) => x.status === it.status).length})
                      </h2>
                    )}
                    <MachineRow item={it} now={now} onClick={() => router.push(MT.machine(it.asset.asset_id))} />
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      <AddMachineModal
        open={showAdd}
        saving={adding}
        error={addError}
        categoryOptions={categories}
        subLocationsByBuilding={subLocationsByBuilding}
        onClose={() => setShowAdd(false)}
        onSubmit={submitNew}
      />
    </>
  )
}

function MachineRow({ item, now, onClick }: { item: Item; now: number; onClick: () => void }) {
  const { asset, status, run } = item
  const shutDown = isShutDown(asset)
  const runningLine =
    status === 'RUNNING'
      ? [run?.operator_name ? `by ${run.operator_name}` : null, run?.started_at ? `Running ${runningFor(now - run.started_at)}` : null]
          .filter(Boolean)
          .join(' · ')
      : ''
  return (
    <Card onClick={onClick} className="px-4 py-3">
      <div className="flex items-center gap-3">
        <p
          className={`min-w-0 flex-1 truncate font-bold text-zinc-900 dark:text-zinc-50 ${shutDown ? 'opacity-50' : ''}`}
        >
          {asset.asset_name?.trim() || asset.asset_id}
        </p>
        {shutDown ? <ShutDownDot /> : <LiveStatusDot status={status} />}
      </div>
      {runningLine && <p className="mt-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">{runningLine}</p>}
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        {[asset.asset_id, asset.building?.trim() || null, asset.sub_location?.trim() || null].filter(Boolean).join(' · ')}
      </p>
    </Card>
  )
}
