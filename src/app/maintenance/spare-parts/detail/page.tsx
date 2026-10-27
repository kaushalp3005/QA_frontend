'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { History, PackageMinus, PackagePlus, Pencil, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { Button, Card, ConfirmDialog, ErrorBanner, PageHeader, SkeletonRows } from '@/components/maintenance/ui'
import { SparePartFormModal } from '@/components/maintenance/spareparts/SparePartFormModal'
import { RestockPartModal, UsePartModal } from '@/components/maintenance/spareparts/StockActionModals'
import {
  deleteSparePart,
  listSpareParts,
  machineDisplayName,
  restockSparePart,
  logSparePartUse,
  warehouseLabel,
  type SparePartDto,
} from '@/lib/maintenance/api/spareparts'
import { MtApiError } from '@/lib/maintenance/client'
import { useMtQuery, useMtSession } from '@/lib/maintenance/hooks'
import { MT } from '@/lib/maintenance/nav'

/** One machine's parts with Use / Restock / History / Edit / Delete (SparePartsDetailScreen). */
function SparePartsDetail() {
  const machineName = useSearchParams().get('machine') ?? ''
  const session = useMtSession()
  // Delete is the one role-gated action (the backend enforces it too).
  const canDelete = session?.role === 'SUPERVISOR' || session?.role === 'ADMIN'
  const { data, error, loading, reload } = useMtQuery(listSpareParts, [])

  const [busyId, setBusyId] = useState<number | null>(null)
  const [usePart, setUsePart] = useState<SparePartDto | null>(null)
  const [restockPart, setRestockPart] = useState<SparePartDto | null>(null)
  const [editPart, setEditPart] = useState<SparePartDto | null>(null)
  const [deletePart, setDeletePart] = useState<SparePartDto | null>(null)

  // Refetch-and-filter by display name, as the app does.
  const machine = useMemo(() => (data ?? []).find((m) => machineDisplayName(m) === machineName), [data, machineName])
  const parts = useMemo(
    () =>
      [...(machine?.parts ?? [])].sort((a, b) =>
        a.low_stock !== b.low_stock ? (a.low_stock ? -1 : 1) : a.part_name < b.part_name ? -1 : a.part_name > b.part_name ? 1 : 0,
      ),
    [machine],
  )

  async function run(partId: number, success: string, action: () => Promise<unknown>, forbidden?: string) {
    setBusyId(partId)
    try {
      await action()
      toast.success(success)
      await reload()
    } catch (e: any) {
      toast.error(forbidden && e instanceof MtApiError && e.status === 403 ? forbidden : e?.message || 'Something went wrong')
    } finally {
      setBusyId(null)
    }
  }

  const subtitle =
    [machine?.asset_id, machine?.warehouse && warehouseLabel(machine.warehouse)].filter(Boolean).join(' · ') ||
    'Not linked to an asset'

  return (
    <>
      <PageHeader title={machineName || 'Spare parts'} subtitle={data ? subtitle : undefined} back={MT.spareParts} />

      {loading && !data ? (
        <SkeletonRows />
      ) : error && !data ? (
        <ErrorBanner error={error} onRetry={reload} />
      ) : (
        <>
          <ErrorBanner error={error} onRetry={reload} />
          {parts.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">No parts recorded for this machine yet.</p>
          ) : (
            <div className="space-y-2">
              {parts.map((p) => {
                const busy = busyId === p.id
                return (
                  <Card key={p.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-zinc-900 dark:text-zinc-50">{p.part_name}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{p.unit?.trim() || '—'}</p>
                        {p.low_stock && (
                          <p className="mt-0.5 text-xs font-semibold text-red-600 dark:text-red-400">
                            Low stock (min {p.min_quantity})
                          </p>
                        )}
                      </div>
                      <span
                        className={clsx(
                          'text-2xl font-bold tabular-nums',
                          p.low_stock ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-zinc-50',
                        )}
                      >
                        {p.quantity}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" icon={PackageMinus} disabled={busy} onClick={() => setUsePart(p)}>
                        Use
                      </Button>
                      <Button size="sm" variant="secondary" icon={PackagePlus} disabled={busy} onClick={() => setRestockPart(p)}>
                        Restock
                      </Button>
                      <Button size="sm" variant="ghost" icon={History} href={MT.sparePartHistory(p.id)}>
                        History
                      </Button>
                      <Button size="sm" variant="ghost" icon={Pencil} disabled={busy} onClick={() => setEditPart(p)}>
                        Edit
                      </Button>
                      {/* Hidden rather than disabled: a greyed-out Delete only invites taps. */}
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Trash2}
                          disabled={busy}
                          className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                          onClick={() => setDeletePart(p)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      <UsePartModal
        part={usePart}
        onClose={() => setUsePart(null)}
        onConfirm={(quantity, workType, note) => {
          const p = usePart!
          setUsePart(null)
          run(p.id, 'Usage logged', () => logSparePartUse(p.id, { quantity, work_type: workType, note }))
        }}
      />

      <RestockPartModal
        part={restockPart}
        onClose={() => setRestockPart(null)}
        onConfirm={(quantity, note) => {
          const p = restockPart!
          setRestockPart(null)
          run(p.id, 'Stock updated', () => restockSparePart(p.id, quantity, note))
        }}
      />

      <SparePartFormModal
        open={!!editPart}
        editing={editPart}
        machineName={machineName}
        assetId={machine?.asset_id ?? null}
        warehouse={machine?.warehouse ?? null}
        onClose={() => setEditPart(null)}
        onSaved={() => {
          setEditPart(null)
          toast.success('Spare part saved')
          reload()
        }}
      />

      <ConfirmDialog
        open={!!deletePart}
        title={`Delete ${deletePart?.part_name ?? ''}?`}
        message="The part stops showing in the list. Its usage history is kept."
        confirmLabel="Delete"
        danger
        onClose={() => setDeletePart(null)}
        onConfirm={() => {
          const p = deletePart!
          setDeletePart(null)
          run(p.id, 'Spare part deleted', () => deleteSparePart(p.id), 'Only a supervisor can delete a spare part')
        }}
      />
    </>
  )
}

export default function SparePartsDetailPage() {
  return (
    <Suspense fallback={null}>
      <SparePartsDetail />
    </Suspense>
  )
}
