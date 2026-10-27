'use client'

import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, RefreshCw } from 'lucide-react'
import {
  Button,
  Card,
  Chips,
  EmptyState,
  ErrorBanner,
  Field,
  PageHeader,
  SearchInput,
  Select,
  SkeletonRows,
} from '@/components/maintenance/ui'
import { AddAssetModal } from '@/components/maintenance/it/AddAssetModal'
import { useMtQuery } from '@/lib/maintenance/hooks'
import { MT } from '@/lib/maintenance/nav'
import { addMachine, listMachines, type MtMachine, type MtMachineWrite } from '@/lib/maintenance/api/assets'
import { IT_ASSET_CATEGORIES, itCategoryMatches, itCategoryOf } from '@/lib/maintenance/api/it'

const BOTH = '__both__'
const eqi = (a: string | null | undefined, b: string | null | undefined) =>
  (a ?? '').toLowerCase() === (b ?? '').toLowerCase()
const byText = (a: string, b: string) => a.localeCompare(b)

/** One IT category's slice of the register (ItAssetListScreen / VM): warehouse
 *  capsule, search, floor filter and an Add button that pins the category. */
export default function ItAssetListPage({ params }: { params: { category: string } }) {
  const category = itCategoryOf(decodeURIComponent(params.category))
  const meta = IT_ASSET_CATEGORIES[category]
  const { data, error, loading, reload } = useMtQuery(() => listMachines(), [])

  const [search, setSearch] = useState('')
  const [building, setBuilding] = useState<string | null>(null)
  const [floor, setFloor] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const rows = useMemo(() => data ?? [], [data])
  const inCategory = useMemo(() => rows.filter((m) => itCategoryMatches(category, m)), [rows, category])

  const buildings = useMemo(
    () => Array.from(new Set(inCategory.map((m) => m.building).filter((b) => b?.trim()))).sort(byText),
    [inCategory],
  )
  const floors = useMemo(
    () =>
      Array.from(
        new Set(
          inCategory
            .filter((m) => building === null || eqi(m.building, building))
            .map((m) => m.sub_location)
            .filter((s) => s?.trim()),
        ),
      ).sort(byText),
    [inCategory, building],
  )
  // Floors from every category, per building — so the add sheet doesn't mint typos.
  const subLocationsByBuilding = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const m of rows) {
      if (!m.building?.trim() || !m.sub_location?.trim()) continue
      ;(map[m.building] ??= []).push(m.sub_location)
    }
    for (const k of Object.keys(map)) map[k] = Array.from(new Set(map[k])).sort(byText)
    return map
  }, [rows])

  const items = useMemo(() => {
    const q = search.trim().toLowerCase()
    const hit = (m: MtMachine) =>
      !q ||
      m.asset_name?.toLowerCase().includes(q) ||
      m.asset_id?.toLowerCase().includes(q) ||
      m.sub_location?.toLowerCase().includes(q)
    return inCategory
      .filter((m) => building === null || eqi(m.building, building))
      .filter((m) => floor === null || eqi(m.sub_location, floor))
      .filter(hit)
      .sort(
        (a, b) =>
          (a.building ?? '').toLowerCase().localeCompare((b.building ?? '').toLowerCase()) ||
          (a.asset_name ?? '').toLowerCase().localeCompare((b.asset_name ?? '').toLowerCase()),
      )
  }, [inCategory, building, floor, search])

  const submitNew = async (body: MtMachineWrite) => {
    setAdding(true)
    setAddError(null)
    try {
      // Category forced to this screen's, so an IT-added asset can't land elsewhere.
      await addMachine({ ...body, category: meta.backendValue })
      toast.success('Asset added')
      setShowAdd(false)
      reload()
    } catch (e: any) {
      setAddError(e?.message || 'Failed to add machine')
    } finally {
      setAdding(false)
    }
  }

  const noFilters = !search.trim() && floor === null && building === null

  return (
    <>
      <PageHeader
        title={meta.label}
        back={MT.itAssets}
        actions={
          <>
            <Button variant="secondary" icon={RefreshCw} onClick={reload} disabled={loading}>
              Refresh
            </Button>
            <Button
              icon={Plus}
              onClick={() => {
                setAddError(null)
                setShowAdd(true)
              }}
            >
              Add asset
            </Button>
          </>
        }
      />

      {error ? (
        <ErrorBanner error={`Failed to load asset register — ${error}`} onRetry={reload} />
      ) : loading && !data ? (
        <SkeletonRows rows={6} />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            {/* Warehouse capsule — only worth showing when this category spans both. */}
            {buildings.length >= 2 && (
              <Chips
                options={[{ id: BOTH, label: 'Both' }, ...buildings.map((b) => ({ id: b, label: b }))]}
                value={building ?? BOTH}
                onChange={(id) => {
                  setBuilding(id === BOTH ? null : id)
                  setFloor(null) // floors are per building
                }}
              />
            )}
            <SearchInput value={search} onChange={setSearch} placeholder="Search assets…" className="sm:flex-1" />
            {floors.length > 0 && (
              <Field label="Floor" className="sm:w-56">
                <Select
                  value={floor ?? ''}
                  placeholder="All floors"
                  options={floors}
                  onChange={(e) => setFloor(e.target.value || null)}
                />
              </Field>
            )}
          </div>

          {items.length === 0 ? (
            <EmptyState title={noFilters ? 'No assets in this category yet.' : 'No assets match your filters.'} />
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {items.map((a) => (
                <Card key={a.asset_id} href={MT.itAsset(a.asset_id)} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-zinc-900 dark:text-zinc-50 break-words">{a.asset_name?.trim() || a.asset_id}</p>
                    <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {a.asset_id}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {[a.building, a.sub_location].filter((s) => s?.trim()).join(' · ') || '—'}
                  </p>
                  {a.condition?.trim() && <p className="text-xs text-zinc-500 dark:text-zinc-400">{a.condition}</p>}
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <AddAssetModal
        open={showAdd}
        title={`Add ${meta.label} asset`}
        lockedCategory={meta.backendValue}
        subLocationsByBuilding={subLocationsByBuilding}
        saving={adding}
        error={addError}
        onSubmit={submitNew}
        onClose={() => setShowAdd(false)}
      />
    </>
  )
}
