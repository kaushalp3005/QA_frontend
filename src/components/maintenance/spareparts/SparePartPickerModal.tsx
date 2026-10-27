'use client'

/**
 * "Add spare used" — pick a part off the shelf and say how many were used
 * (spareparts/components/SparePartPickerSheet.kt). For the PM execute and
 * breakdown close screens. No free-text path: every line names a row in
 * mt_spareparts, because submitting the job is what decrements it.
 *
 * Fetches GET /spare-parts/picker itself (warehouse-scoped by the server),
 * putting parts fitted to `assetId` first. Quantities are advisory — the
 * server re-checks stock when the work order is submitted.
 */
import { useEffect, useState } from 'react'
import { ArrowLeft, Plus } from 'lucide-react'
import clsx from 'clsx'
import { Badge, Button, Field, Input, Modal, SearchInput, Spinner, Textarea } from '@/components/maintenance/ui'
import {
  getSparePartPicker,
  pickMatches,
  type SparePartPickDto,
  type SparePartPickerDto,
} from '@/lib/maintenance/api/spareparts'

export function SparePartPickerModal({
  open,
  assetId,
  onConfirm,
  onClose,
  onAddNewPart,
}: {
  open: boolean
  /** The machine being worked on — its parts are listed first */
  assetId?: string | null
  onConfirm: (pick: SparePartPickDto, quantity: number, notes: string | null) => void
  onClose: () => void
  /** Opens the add-part form when a part isn't in stock yet */
  onAddNewPart?: () => void
}) {
  if (!open) return null
  return <PickerBody assetId={assetId} onConfirm={onConfirm} onClose={onClose} onAddNewPart={onAddNewPart} />
}

function PickerBody({
  assetId,
  onConfirm,
  onClose,
  onAddNewPart,
}: {
  assetId?: string | null
  onConfirm: (pick: SparePartPickDto, quantity: number, notes: string | null) => void
  onClose: () => void
  onAddNewPart?: () => void
}) {
  const [catalog, setCatalog] = useState<SparePartPickerDto>({ warehouses: [], items: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<SparePartPickDto | null>(null)

  useEffect(() => {
    getSparePartPicker(assetId)
      .then(setCatalog)
      .catch((e) => setError(e?.message || "Couldn't load spare parts"))
      .finally(() => setLoading(false))
  }, [assetId])

  const label = catalog.warehouses.join(' / ') || 'your warehouse'
  const matching = catalog.items.filter((p) => pickMatches(p, query))
  const thisMachine = matching.filter((p) => p.for_this_machine)
  const others = matching.filter((p) => !p.for_this_machine)

  return (
    <Modal open onClose={onClose} title={selected ? selected.part_name : 'Add spare used'}>
      {selected ? (
        <QuantityForm pick={selected} onBack={() => setSelected(null)} onConfirm={(q, n) => onConfirm(selected, q, n)} />
      ) : (
        <div className="space-y-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Part or machine name" />
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : error ? (
            // An error outranks emptiness — an empty list here is not "no stock".
            <p className="py-3 text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : catalog.items.length === 0 ? (
            <p className="py-4 text-sm text-zinc-500">No spare parts are registered for {label} yet.</p>
          ) : matching.length === 0 ? (
            <p className="py-4 text-sm text-zinc-500">No part matches &quot;{query}&quot;.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {thisMachine.length > 0 && <GroupHeader text="THIS MACHINE" />}
              {thisMachine.map((p) => (
                <PartRow key={p.part_id} pick={p} onPick={setSelected} />
              ))}
              {others.length > 0 && (
                <GroupHeader text={thisMachine.length === 0 ? `PARTS IN ${label}` : `OTHER PARTS IN ${label}`} />
              )}
              {others.map((p) => (
                <PartRow key={p.part_id} pick={p} onPick={setSelected} />
              ))}
            </div>
          )}
          {onAddNewPart && (
            <Button variant="ghost" size="sm" icon={Plus} onClick={onAddNewPart}>
              Part not listed? Add it to stock
            </Button>
          )}
        </div>
      )}
    </Modal>
  )
}

const GroupHeader = ({ text }: { text: string }) => (
  <p className="pb-1 pt-3 text-[11px] font-bold tracking-wide text-zinc-500 dark:text-zinc-400">{text}</p>
)

function PartRow({ pick, onPick }: { pick: SparePartPickDto; onPick: (p: SparePartPickDto) => void }) {
  // Out-of-stock parts are shown, not hidden — "0 on hand" says it needs restocking.
  const enabled = pick.quantity > 0
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={() => onPick(pick)}
      className={clsx(
        'flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800',
        !enabled && 'cursor-not-allowed opacity-45',
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{pick.part_name}</span>
        <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{pick.machine_name?.trim() || 'Unassigned'}</span>
      </span>
      {pick.low_stock && enabled && <Badge tone="red">Low</Badge>}
      <span className="whitespace-nowrap text-xs font-semibold text-zinc-700 dark:text-zinc-300">
        {enabled ? `${pick.quantity} ${pick.unit ?? ''}`.trim() : 'out of stock'}
      </span>
    </button>
  )
}

function QuantityForm({
  pick,
  onBack,
  onConfirm,
}: {
  pick: SparePartPickDto
  onBack: () => void
  onConfirm: (quantity: number, notes: string | null) => void
}) {
  const [qty, setQty] = useState('1')
  const [notes, setNotes] = useState('')
  // Whole numbers only — mt_spareparts.quantity is an integer column.
  const parsed = qty ? parseInt(qty, 10) : NaN
  const valid = Number.isFinite(parsed) && parsed > 0 && parsed <= pick.quantity

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-factory-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to parts
      </button>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{`${pick.quantity} ${pick.unit ?? ''} on hand`.replace(/\s+/g, ' ')}</p>
      <Field
        label={`Quantity used${pick.unit ? ` (${pick.unit})` : ''}`}
        error={Number.isFinite(parsed) && parsed > pick.quantity ? `Only ${pick.quantity} on hand` : null}
      >
        <Input inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, '').slice(0, 4))} />
      </Field>
      <Field label="Notes (optional)">
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <Button variant="success" className="w-full" disabled={!valid} onClick={() => valid && onConfirm(parsed, notes.trim() ? notes : null)}>
        Add
      </Button>
    </div>
  )
}
