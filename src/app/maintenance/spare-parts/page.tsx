'use client'

import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { AlertTriangle, Plus } from 'lucide-react'
import clsx from 'clsx'
import { Button, Card, Chips, EmptyState, ErrorBanner, PageHeader, SearchInput, SkeletonRows } from '@/components/maintenance/ui'
import { DownloadButton } from '@/components/maintenance/utilities/fields'
import { downloadSheet } from '@/components/maintenance/utilities/csv'
import { SparePartFormModal } from '@/components/maintenance/spareparts/SparePartFormModal'
import { sparePartsSheet, type SparePartRow } from '@/components/maintenance/spareparts/sheet'
import {
  listSpareParts,
  lowStockCount,
  machineDisplayName,
  machineKey,
  warehouseLabel,
  type SparePartsMachineDto,
} from '@/lib/maintenance/api/spareparts'
import { useMtQuery } from '@/lib/maintenance/hooks'
import { MT } from '@/lib/maintenance/nav'

const toRow = (m: SparePartsMachineDto, part: SparePartsMachineDto['parts'][number]): SparePartRow => ({
  part,
  machineName: machineDisplayName(m),
  warehouse: m.warehouse,
  assetId: m.asset_id,
})

/**
 * Spare Parts landing (SparePartsMachineListScreen). Empty search → machine
 * cards; text in the box → flat part hits, so "belt" finds every belt.
 */
export default function SparePartsPage() {
  const { data, error, loading, reload } = useMtQuery(listSpareParts, [])
  const [search, setSearch] = useState('')
  const [warehouse, setWarehouse] = useState('') // '' = All
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [adding, setAdding] = useState(false)

  const all = data ?? []
  const view = useMemo(() => {
    const byWarehouse = all.filter((m) => !warehouse || m.warehouse === warehouse)
    const query = search.trim().toLowerCase()
    let machines: SparePartsMachineDto[] = []
    let results: SparePartRow[] = []
    let exportRows: SparePartRow[]
    if (!query) {
      machines = lowStockOnly ? byWarehouse.filter((m) => lowStockCount(m) > 0) : byWarehouse
      exportRows = machines.flatMap((m) => m.parts.filter((p) => !lowStockOnly || p.low_stock).map((p) => toRow(m, p)))
    } else {
      // A machine-name hit surfaces all its parts; a part-name hit just that part.
      results = byWarehouse.flatMap((m) => {
        const machineHit =
          machineDisplayName(m).toLowerCase().includes(query) || m.machine_name.toLowerCase().includes(query)
        return m.parts
          .filter((p) => machineHit || p.part_name.toLowerCase().includes(query))
          .filter((p) => !lowStockOnly || p.low_stock)
          .map((p) => toRow(m, p))
      })
      exportRows = results
    }
    return {
      machines,
      results,
      exportRows,
      lowStock: byWarehouse.reduce((n, m) => n + lowStockCount(m), 0),
      warehouses: Array.from(new Set(all.map((m) => m.warehouse).filter((w): w is string => !!w))).sort(),
    }
  }, [all, warehouse, search, lowStockOnly])

  function download() {
    toast(downloadSheet(sparePartsSheet(view.exportRows), 'Spare parts'))
  }

  return (
    <>
      <PageHeader
        title="Spare Parts"
        back={MT.dashboard}
        actions={
          <>
            <DownloadButton disabled={view.exportRows.length === 0} onClick={download} />
            <Button icon={Plus} onClick={() => setAdding(true)}>
              Add spare part
            </Button>
          </>
        }
      />

      <div className="mb-4 space-y-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search machine or part…" />
        <Chips
          options={[{ id: '', label: 'All' }, ...view.warehouses.map((w) => ({ id: w, label: warehouseLabel(w) }))]}
          value={warehouse}
          onChange={setWarehouse}
        />
      </div>

      {view.lowStock > 0 && (
        <button
          type="button"
          onClick={() => setLowStockOnly((x) => !x)}
          className={clsx(
            'mb-4 flex w-full items-center gap-2 rounded-xl border px-4 py-3 text-left text-sm font-medium transition',
            'border-red-200 bg-red-50 text-red-800 hover:border-red-300 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300',
          )}
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {lowStockOnly
            ? `Showing ${view.lowStock} low-stock parts — tap to clear`
            : `${view.lowStock} part${view.lowStock === 1 ? '' : 's'} low on stock`}
        </button>
      )}

      {loading && all.length === 0 ? (
        <SkeletonRows />
      ) : error ? (
        <ErrorBanner error={error} onRetry={reload} />
      ) : search.trim() ? (
        view.results.length === 0 ? (
          <EmptyState title={`No part matches “${search.trim()}”.`} />
        ) : (
          <div className="space-y-2">
            {view.results.map((hit) => (
              <Card key={hit.part.id} href={MT.sparePartsDetail(hit.machineName)} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50">{hit.part.part_name}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {[hit.machineName, hit.warehouse && warehouseLabel(hit.warehouse)].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span
                  className={clsx(
                    'text-lg font-semibold tabular-nums',
                    hit.part.low_stock ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-zinc-50',
                  )}
                >
                  {hit.part.quantity}
                  {hit.part.unit ? ` ${hit.part.unit}` : ''}
                </span>
              </Card>
            ))}
          </div>
        )
      ) : view.machines.length === 0 ? (
        <EmptyState title="No spare parts on record." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {view.machines.map((m) => {
            const low = lowStockCount(m)
            return (
              <Card key={machineKey(m)} href={MT.sparePartsDetail(machineDisplayName(m))} className="p-4">
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">{machineDisplayName(m)}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {[m.asset_id, m.warehouse && warehouseLabel(m.warehouse)].filter(Boolean).join(' · ') || 'Not linked to an asset'}
                </p>
                <div className="mt-2 flex gap-3 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">
                    {m.parts.length} part{m.parts.length === 1 ? '' : 's'}
                  </span>
                  {low > 0 && (
                    <span className="inline-flex items-center gap-1 font-medium text-red-600 dark:text-red-400">
                      <AlertTriangle className="h-3.5 w-3.5" /> {low} low
                    </span>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <SparePartFormModal
        open={adding}
        editing={null}
        onClose={() => setAdding(false)}
        onSaved={() => {
          setAdding(false)
          toast.success('Spare part added')
          reload()
        }}
      />
    </>
  )
}
