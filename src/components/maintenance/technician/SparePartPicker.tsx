'use client'

import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, Field, Input, Modal, SearchInput, Spinner, Textarea } from '@/components/maintenance/ui'
import { fmtNumber } from '@/lib/maintenance/format'
import {
  MAX_WO_SPARES,
  pickMatches,
  sparePicker,
  warehouseLabel,
  type SpareLine,
  type SparePartPick,
  type SparePartPickerResponse,
} from '@/lib/maintenance/api/technicianSpares'

/**
 * Pick a spare off the shelf and say how many were used (SparePartPickerSheet).
 * No free-text path: every line names an mt_spareparts row, because submitting
 * the job is what decrements it. Loaded when opened, so a job that uses no
 * spares costs no round trip.
 */
export function SparePartPickerModal({
  open,
  assetId,
  onConfirm,
  onClose,
}: {
  open: boolean
  assetId?: string | null
  onConfirm: (pick: SparePartPick, quantity: number, notes: string | null) => void
  onClose: () => void
}) {
  const [catalog, setCatalog] = useState<SparePartPickerResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<SparePartPick | null>(null)

  useEffect(() => {
    if (!open) return
    setSelected(null)
    setQuery('')
    let live = true
    setLoading(true)
    setError(null)
    sparePicker(assetId)
      .then((c) => live && setCatalog(c))
      .catch((e) => live && setError(e?.message || "Couldn't load spare parts"))
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [open, assetId])

  const items = catalog?.items ?? []
  const label = warehouseLabel(catalog?.warehouses ?? [])
  const matching = items.filter((p) => pickMatches(p, query))
  const thisMachine = matching.filter((p) => p.for_this_machine)
  const others = matching.filter((p) => !p.for_this_machine)

  return (
    <Modal open={open} onClose={onClose} title={selected ? 'Quantity used' : 'Add spare used'}>
      {selected ? (
        <QuantityForm
          pick={selected}
          onBack={() => setSelected(null)}
          onConfirm={(qty, notes) => onConfirm(selected, qty, notes)}
        />
      ) : (
        <div className="space-y-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Search part or machine name" />
          {loading && items.length === 0 ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-6 w-6" />
            </div>
          ) : error ? (
            // An error outranks emptiness — "nothing registered" would send them to the wrong person.
            <div className="space-y-1 py-3 text-sm">
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <p className="text-zinc-500">
                {items.length > 0
                  ? 'Showing the last loaded list below — quantities may be out of date.'
                  : 'There is nothing to show until the list loads.'}
              </p>
            </div>
          ) : items.length === 0 ? (
            <p className="py-4 text-sm text-zinc-500">No spare parts are registered for {label} yet.</p>
          ) : matching.length === 0 ? (
            <p className="py-4 text-sm text-zinc-500">No part matches &quot;{query}&quot;.</p>
          ) : null}

          {!loading && matching.length > 0 && (
            <div className="max-h-[50vh] overflow-y-auto">
              {thisMachine.length > 0 && (
                <>
                  <GroupHeader>This machine</GroupHeader>
                  {thisMachine.map((p) => (
                    <PartRow key={p.part_id} pick={p} onPick={setSelected} />
                  ))}
                </>
              )}
              {others.length > 0 && (
                <>
                  <GroupHeader>{thisMachine.length === 0 ? `Parts in ${label}` : `Other parts in ${label}`}</GroupHeader>
                  {others.map((p) => (
                    <PartRow key={p.part_id} pick={p} onPick={setSelected} />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

function GroupHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{children}</p>
  )
}

function PartRow({ pick, onPick }: { pick: SparePartPick; onPick: (p: SparePartPick) => void }) {
  // Out-of-stock parts stay visible: "out of stock" says it exists and needs restocking.
  const enabled = pick.quantity > 0
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={() => onPick(pick)}
      className={clsx(
        'flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition',
        enabled ? 'hover:bg-zinc-50 dark:hover:bg-zinc-800' : 'cursor-not-allowed opacity-45',
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{pick.part_name}</span>
        <span className="block truncate text-xs text-zinc-500">{pick.machine_name?.trim() || 'Unassigned'}</span>
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
  pick: SparePartPick
  onBack: () => void
  onConfirm: (qty: number, notes: string | null) => void
}) {
  const [qty, setQty] = useState('1')
  const [notes, setNotes] = useState('')
  // Whole numbers only: mt_spareparts.quantity is an integer column.
  const parsed = /^\d+$/.test(qty) ? Number(qty) : null
  const valid = parsed !== null && parsed > 0 && parsed <= pick.quantity
  const over = parsed !== null && parsed > pick.quantity

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="Back to parts"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <p className="font-bold text-zinc-900 dark:text-zinc-50">{pick.part_name}</p>
          <p className="text-xs text-zinc-500">{`${pick.quantity} ${pick.unit ?? ''} on hand`.replace(/\s+/g, ' ')}</p>
        </div>
      </div>
      <Field label={`Quantity used${pick.unit ? ` (${pick.unit})` : ''}`} error={over ? `Only ${pick.quantity} on hand` : null}>
        <Input
          inputMode="numeric"
          value={qty}
          onChange={(e) => setQty(e.target.value.replace(/\D/g, '').slice(0, 4))}
          className={clsx(qty !== '' && !valid && 'border-red-400')}
        />
      </Field>
      <Field label="Notes (optional)">
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <Button
        variant="success"
        className="w-full"
        disabled={!valid}
        onClick={() => onConfirm(parsed!, notes.trim() ? notes.trim() : null)}
      >
        Add
      </Button>
    </div>
  )
}

/** "Spares used" card — list with remove, and the add button that stops at ten. */
export function SpareLinesCard({
  lines,
  onAdd,
  onRemove,
  emptyText,
  disabled,
}: {
  lines: SpareLine[]
  onAdd: () => void
  onRemove: (line: SpareLine) => void
  emptyText: string
  disabled?: boolean
}) {
  const canAdd = lines.length < MAX_WO_SPARES
  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Spares used</p>
        <Button size="sm" variant="secondary" icon={Plus} onClick={onAdd} disabled={!canAdd || disabled}>
          Add spare
        </Button>
      </div>
      {!canAdd && <p className="mt-2 text-xs text-zinc-500">Limit of {MAX_WO_SPARES} spare parts reached.</p>}
      {lines.length === 0 ? (
        <p className="mt-2 text-xs text-zinc-500">{emptyText}</p>
      ) : (
        <ul className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
          {lines.map((s) => (
            <li key={s.id} className="flex items-center gap-2 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{s.spare_name}</p>
                <p className="truncate text-xs text-zinc-500">
                  {[`${fmtNumber(s.quantity_used)} ${s.unit}`.trim(), s.machine_name?.trim() || null]
                    .filter(Boolean)
                    .join('  ·  ')}
                  {s.notes ? ` — ${s.notes}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(s)}
                disabled={disabled}
                className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-500/10"
                aria-label={`Remove ${s.spare_name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
