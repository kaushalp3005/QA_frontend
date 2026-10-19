'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, HardHat, RefreshCw, Search } from 'lucide-react'
import { toast } from 'react-hot-toast'

import DashboardLayout from '@/components/layout/DashboardLayout'
import ModuleGuard from '@/components/ModuleGuard'
import PageHeader from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Loader'
import { useCompany } from '@/contexts/CompanyContext'
import { cn } from '@/lib/styles'
import StatusBadge, { plantLabel } from '@/components/maintenance-work/StatusBadge'
import { lockedWarehouse } from '@/lib/warehouseAccess'
import {
  AWAITING_QC,
  MODULE_CODE,
  MaintenanceWorkError,
  STATUS_TABS,
  WorkOrderSummary,
  formatIstDate,
  formatIstDateTime,
  maintenanceWorkApi,
  tabCount,
  waitingFor,
} from '@/lib/api/maintenanceWork'

const PAGE_SIZE = 50

const PLANTS = [
  { value: '', label: 'Both plants' },
  { value: 'A185', label: 'A-185' },
  { value: 'W202', label: 'W-202' },
]

// The filters live in sessionStorage so opening a work order and coming back
// (or reloading) keeps them. sessionStorage, not localStorage: they last for this
// browser tab only, so a fresh tab starts on the default view.
const FILTERS_KEY = 'maintenance-work:filters'

interface SavedFilters {
  tabKey: string
  plant: string
  search: string
}

function readSavedFilters(): SavedFilters {
  const fallback: SavedFilters = { tabKey: STATUS_TABS[0].key, plant: '', search: '' }
  try {
    const saved = JSON.parse(sessionStorage.getItem(FILTERS_KEY) || '{}')
    return {
      // Validate: a value saved by an older build may no longer be an option.
      tabKey: STATUS_TABS.some((t) => t.key === saved.tabKey) ? saved.tabKey : fallback.tabKey,
      plant: PLANTS.some((p) => p.value === saved.plant) ? saved.plant : fallback.plant,
      search: typeof saved.search === 'string' ? saved.search : fallback.search,
    }
  } catch {
    return fallback // storage blocked or unreadable — just start on the defaults
  }
}

export default function MaintenanceWorkPage() {
  return (
    <DashboardLayout>
      <ModuleGuard module={MODULE_CODE}>
        <MaintenanceWorkList />
      </ModuleGuard>
    </DashboardLayout>
  )
}

function MaintenanceWorkList() {
  const router = useRouter()
  const { currentCompany } = useCompany()

  // Read once on mount. Safe from hydration mismatch: ModuleGuard renders a
  // spinner until its client-side permission check, so this never renders on the server.
  const [initial] = useState(readSavedFilters)
  // A plant-bound account (e.g. quality.a-185@) works one plant only. The backend
  // clamps the list to it regardless; this just stops offering a switch.
  const [locked] = useState(lockedWarehouse)
  const [tabKey, setTabKey] = useState(initial.tabKey)
  const [plant, setPlant] = useState<string>(locked || initial.plant)
  const [search, setSearch] = useState(initial.search)
  const [activeSearch, setActiveSearch] = useState(initial.search.trim())
  const [page, setPage] = useState(1)

  const [items, setItems] = useState<WorkOrderSummary[]>([])
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const tab = STATUS_TABS.find((t) => t.key === tabKey) || STATUS_TABS[0]

  useEffect(() => {
    const t = setTimeout(() => setActiveSearch(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    try {
      // A locked plant is not a choice, so it is not remembered as one.
      sessionStorage.setItem(
        FILTERS_KEY,
        JSON.stringify({ tabKey, plant: locked ? initial.plant : plant, search: activeSearch }),
      )
    } catch {
      /* storage blocked (private mode) — the filters just won't be remembered */
    }
  }, [tabKey, plant, activeSearch])

  // A changed filter starts from page 1, or it can land past the end of a
  // shorter result and read as "nothing here".
  useEffect(() => {
    setPage(1)
  }, [tabKey, plant, activeSearch])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await maintenanceWorkApi.list({
        company: currentCompany,
        status: tab.statuses || undefined,
        plant: plant || undefined,
        q: activeSearch || undefined,
        page,
        page_size: PAGE_SIZE,
      })
      setItems(res.items)
      setTotal(res.total)
      setCounts(res.counts)
    } catch (err) {
      const message = err instanceof MaintenanceWorkError ? err.message : 'Failed to load work orders.'
      setError(message)
      if (!(err instanceof MaintenanceWorkError) || err.status !== 401) toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [currentCompany, tab.statuses, plant, activeSearch, page])

  useEffect(() => {
    load()
  }, [load])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const awaiting = counts[AWAITING_QC] || 0

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Maintenance Work"
        subtitle="Preventive maintenance work orders from the maintenance team. QC signs off the ones awaiting QC."
        icon={HardHat}
        badge={
          awaiting > 0 ? (
            <span className="inline-flex rounded-full bg-warning-50 text-warning-700 text-[11px] font-semibold px-2.5 py-0.5 tabular-nums">
              {awaiting} awaiting QC
            </span>
          ) : null
        }
        actions={
          <button onClick={load} className="btn-outline px-3 py-2 text-xs inline-flex items-center gap-1.5">
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            Refresh
          </button>
        }
      />

      {/* Status tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-3 animate-fade-in-up">
        {STATUS_TABS.map((t) => {
          const active = t.key === tabKey
          return (
            <button
              key={t.key}
              onClick={() => setTabKey(t.key)}
              className={cn(
                'shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors',
                active ? 'bg-brand-500 text-white shadow-brand' : 'bg-white text-ink-500 hover:bg-cream-200 border border-cream-300',
              )}
            >
              {t.label}
              <span
                className={cn(
                  'inline-flex rounded-full text-[11px] px-2 py-0.5 tabular-nums',
                  active ? 'bg-white/20 text-white' : 'bg-cream-200 text-ink-500',
                )}
              >
                {tabCount(t, counts)}
              </span>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="surface-card p-3 mb-4 flex flex-col sm:flex-row gap-2.5 animate-fade-in-up">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-ink-300 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search work order, machine or technician"
            className="input-base !pl-9 w-full"
          />
        </div>
        {locked ? (
          <div
            className="input-base sm:!w-44 !bg-cream-100 text-ink-500 font-semibold"
            title="Your account works in this plant only"
          >
            {plantLabel(locked)}
          </div>
        ) : (
          <select value={plant} onChange={(e) => setPlant(e.target.value)} className="input-base sm:!w-44">
            {PLANTS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="surface-card overflow-hidden animate-fade-in-up">
        {error ? (
          <div className="px-6 py-14 text-center">
            <div className="bg-danger-50 w-14 h-14 rounded-full mx-auto flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-danger-700" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-ink-600">Could not load work orders</h3>
            <p className="mt-1 text-xs text-ink-400">{error}</p>
            <button onClick={load} className="btn-outline mt-4 px-3 py-1.5 text-xs inline-flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              Try again
            </button>
          </div>
        ) : loading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="bg-cream-200 w-14 h-14 rounded-full mx-auto flex items-center justify-center">
              <HardHat className="h-6 w-6 text-ink-400" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-ink-500">
              {tab.statuses === AWAITING_QC ? 'Nothing is waiting for QC' : 'No work orders here'}
            </h3>
            <p className="mt-1 text-xs text-ink-400">
              {activeSearch || (plant && !locked)
                ? 'Try clearing the search or the plant filter.'
                : 'Work orders appear here once maintenance generates them.'}
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="min-w-full divide-y divide-cream-300">
              <thead className="bg-cream-100">
                <tr>
                  {['Work order', 'Machine', 'Plant', 'Status', 'Checks', 'Technician', tab.statuses === AWAITING_QC ? 'Waiting' : 'Date', 'QC'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-300">
                {items.map((wo) => (
                  <tr
                    key={wo.id}
                    onClick={() => router.push(`/maintenance-work/${encodeURIComponent(wo.id)}`)}
                    className={cn(
                      'cursor-pointer hover:bg-cream-100/50 transition-colors',
                      wo.status === AWAITING_QC && 'border-l-4 border-l-warning-500',
                    )}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-semibold text-ink-600 font-mono">{wo.id}</div>
                      <div className="text-[11px] text-ink-400 truncate max-w-[200px]" title={wo.template_name}>
                        {wo.template_name}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[13px] font-semibold text-ink-600 truncate max-w-[240px]" title={wo.machine_name}>
                        {wo.machine_name}
                      </div>
                      <div className="text-[11px] text-ink-400 font-mono">{wo.machine_id}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-ink-500">{plantLabel(wo.plant)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={wo.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm tabular-nums">
                      {wo.checks_total === 0 ? (
                        <span className="text-ink-300">—</span>
                      ) : wo.checks_failed > 0 ? (
                        <span className="font-semibold text-danger-700">
                          {wo.checks_failed} of {wo.checks_total} failed
                        </span>
                      ) : (
                        <span className="text-ink-500">{wo.checks_total} checks</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[13px] text-ink-500">
                      {wo.assigned_technician_name || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[13px] text-ink-500 tabular-nums">
                      <KeyDate wo={wo} waitingColumn={tab.statuses === AWAITING_QC} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[12px] text-ink-400">
                      {wo.qc_acknowledged_by_name ? (
                        <span title={formatIstDateTime(wo.qc_acknowledged_at)}>{wo.qc_acknowledged_by_name}</span>
                      ) : wo.status === AWAITING_QC ? (
                        <span className="italic">Not picked up</span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="px-5 py-4 border-t border-cream-300 flex items-center justify-between flex-wrap gap-3">
            <div className="text-xs text-ink-400">
              Showing{' '}
              <span className="font-semibold text-ink-600 tabular-nums">{(page - 1) * PAGE_SIZE + 1}</span> to{' '}
              <span className="font-semibold text-ink-600 tabular-nums">{Math.min(page * PAGE_SIZE, total)}</span> of{' '}
              <span className="font-semibold text-ink-600 tabular-nums">{total}</span> work orders
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-outline px-3 py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="inline-flex items-center justify-center min-w-[2rem] px-3 py-1.5 text-xs font-semibold rounded-md bg-brand-500 text-white tabular-nums">
                {page}
              </span>
              <span className="text-xs text-ink-400">
                of <span className="tabular-nums">{totalPages}</span>
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="btn-outline px-3 py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** The one date that matters for where the work order is now. */
function KeyDate({ wo, waitingColumn }: { wo: WorkOrderSummary; waitingColumn: boolean }) {
  if (wo.status === AWAITING_QC) {
    // Under a "Date" heading a bare "2 d" reads like a date, so say what it is.
    const wait = waitingFor(wo.supervisor_approved_at)
    return (
      <span title={formatIstDateTime(wo.supervisor_approved_at)}>
        {waitingColumn ? wait : `waiting ${wait}`}
      </span>
    )
  }
  if (wo.closed_at) return <span title="Closed">{formatIstDate(wo.closed_at)}</span>
  return <span title="Scheduled">{formatIstDate(wo.scheduled_date)}</span>
}
