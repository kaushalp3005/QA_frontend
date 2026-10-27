'use client'

/**
 * Machine Master — ported from machinemaster/MachineMasterScreen +
 * MachineMasterViewModel. The full asset register (GET /mt-machines) by
 * warehouse / floor / category, grouped by category; tapping a row opens the
 * machine detail.
 */

import { useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button, Card, EmptyState, ErrorBanner, PageHeader, SearchInput, SkeletonRows, Tabs } from '@/components/maintenance/ui'
import { useMtQuery, useMtSession } from '@/lib/maintenance/hooks'
import { listMachines, type MtMachine } from '@/lib/maintenance/api/assets'
import { fmtKw } from '@/lib/maintenance/api/machines'
import { MT, homePathFor } from '@/lib/maintenance/nav'
import {
  BuildingSwitch,
  FilterSelect,
  IdChip,
  SubCategoryChip,
  containsIgnoreCase,
  distinctSorted,
  eqIgnoreCase,
} from '@/components/maintenance/machines/shared'

export default function MachineMasterPage() {
  const session = useMtSession()
  const q = useMtQuery(() => listMachines(), [])
  const rows = useMemo(() => q.data ?? [], [q.data])

  const [search, setSearch] = useState('')
  const [building, setBuilding] = useState<string | null>(null)
  const [floor, setFloor] = useState<string | null>(null)
  const [category, setCategory] = useState<string | null>(null)

  const buildings = useMemo(() => distinctSorted(rows.map((r) => r.building)), [rows])
  const floors = useMemo(
    () => distinctSorted(rows.filter((r) => !building || eqIgnoreCase(r.building, building)).map((r) => r.sub_location)),
    [rows, building],
  )
  const categories = useMemo(() => distinctSorted(rows.map((r) => r.category)), [rows])

  const items = useMemo(() => {
    const s = search.trim()
    return rows
      .filter((r) => !building || eqIgnoreCase(r.building, building))
      .filter((r) => !floor || eqIgnoreCase(r.sub_location, floor))
      .filter((r) => !category || eqIgnoreCase(r.category, category))
      .filter(
        (r) =>
          !s ||
          containsIgnoreCase(r.asset_name, s) ||
          containsIgnoreCase(r.asset_id, s) ||
          containsIgnoreCase(r.sub_location, s),
      )
      .sort(
        (a, b) =>
          (a.category ?? '').toLowerCase().localeCompare((b.category ?? '').toLowerCase()) ||
          (a.asset_name ?? '').toLowerCase().localeCompare((b.asset_name ?? '').toLowerCase()),
      )
  }, [rows, search, building, floor, category])

  if (!session) return null
  const back = session.role === 'OPERATOR' ? MT.machines : homePathFor(session.role)
  // Category headers only when no single category tab is chosen.
  const grouped = !category

  return (
    <>
      <PageHeader
        title="Machine Master"
        subtitle="Asset register"
        back={back}
        actions={
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={q.reload} loading={q.loading && !!q.data}>
            Refresh
          </Button>
        }
      />

      {q.loading && !q.data ? (
        <SkeletonRows rows={6} />
      ) : q.error && !q.data ? (
        <ErrorBanner error={`Failed to load asset register. ${q.error}`} onRetry={q.reload} />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end">
            <BuildingSwitch
              buildings={buildings}
              value={building}
              onChange={(b) => {
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
              {items.map((m, i) => {
                const prev = items[i - 1]
                const header = grouped && (!prev || !eqIgnoreCase(prev.category, m.category))
                return (
                  <div key={m.asset_id}>
                    {header && (
                      <h2 className="pb-1 pt-3 text-sm font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
                        {m.category?.trim() || 'Uncategorised'} (
                        {items.filter((x) => eqIgnoreCase(x.category, m.category)).length})
                      </h2>
                    )}
                    <MasterRow machine={m} />
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </>
  )
}

function MasterRow({ machine }: { machine: MtMachine }) {
  const location = [machine.building, machine.sub_location].filter((s) => s?.trim()).join(' · ') || '—'
  const power = machine.rated_kw != null ? fmtKw(machine.rated_kw, 2) : machine.power_load || '—'
  return (
    <Card href={MT.machine(machine.asset_id)} className="space-y-1.5 px-4 py-3">
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 truncate font-bold text-zinc-900 dark:text-zinc-50">
          {machine.asset_name?.trim() || machine.asset_id}
        </p>
        <IdChip id={machine.asset_id} />
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{location}</p>
      <div className="flex items-center gap-3">
        <SubCategoryChip category={machine.category} className="min-w-0" />
        <span className="flex-1" />
        <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{power}</span>
      </div>
    </Card>
  )
}
