'use client'

/**
 * Use / Restock sheets from SparePartsDetailScreen, plus WorkTypeChips.
 * Usage can't be logged without a work type — every OUT row carries a reason.
 */
import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button, Chips, Field, Input, Modal } from '@/components/maintenance/ui'
import { WORK_TYPES, type SparePartDto, type WorkType } from '@/lib/maintenance/api/spareparts'

/** Required "Used for" selector; nothing chosen until the technician picks. */
export function WorkTypeChips({ value, onChange }: { value: WorkType | null; onChange: (w: WorkType) => void }) {
  return (
    <Chips
      options={WORK_TYPES.map((w) => ({ id: w, label: w }))}
      value={(value ?? '') as WorkType}
      onChange={onChange}
    />
  )
}

function Stepper({ value, onChange, max }: { value: number; onChange: (n: number) => void; max?: number }) {
  const btn =
    'inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-300 text-zinc-700 hover:border-factory-500 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200'
  return (
    <div className="flex items-center gap-4">
      <button type="button" className={btn} aria-label="Decrease" disabled={value <= 1} onClick={() => value > 1 && onChange(value - 1)}>
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-[2ch] text-center text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{value}</span>
      <button
        type="button"
        className={btn}
        aria-label="Increase"
        disabled={max !== undefined && value >= max}
        onClick={() => (max === undefined || value < max) && onChange(value + 1)}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}

const onHand = (p: SparePartDto) => `On hand: ${p.quantity}${p.unit ? ` ${p.unit}` : ''}`

export function UsePartModal({
  part,
  onClose,
  onConfirm,
}: {
  part: SparePartDto | null
  onClose: () => void
  onConfirm: (quantity: number, workType: WorkType, note: string | null) => void
}) {
  if (!part) return null
  return <UseBody part={part} onClose={onClose} onConfirm={onConfirm} />
}

function UseBody({
  part,
  onClose,
  onConfirm,
}: {
  part: SparePartDto
  onClose: () => void
  onConfirm: (quantity: number, workType: WorkType, note: string | null) => void
}) {
  const [quantity, setQuantity] = useState(1)
  const [workType, setWorkType] = useState<WorkType | null>(null)
  const [note, setNote] = useState('')
  const valid = workType !== null && quantity >= 1 && quantity <= part.quantity

  return (
    <Modal
      open
      onClose={onClose}
      title={`Use — ${part.part_name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!valid} onClick={() => valid && onConfirm(quantity, workType!, note.trim() ? note : null)}>
            Log Usage
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">{onHand(part)}</p>
        <Stepper value={quantity} onChange={setQuantity} max={part.quantity} />
        <div>
          <p className="mb-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Used for <span className="text-red-600">*</span>
          </p>
          <WorkTypeChips value={workType} onChange={setWorkType} />
        </div>
        <Field label="Note (optional)">
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}

/** The Use sheet minus the work type — /restock always logs "Restock". */
export function RestockPartModal({
  part,
  onClose,
  onConfirm,
}: {
  part: SparePartDto | null
  onClose: () => void
  onConfirm: (quantity: number, note: string | null) => void
}) {
  if (!part) return null
  return <RestockBody part={part} onClose={onClose} onConfirm={onConfirm} />
}

function RestockBody({
  part,
  onClose,
  onConfirm,
}: {
  part: SparePartDto
  onClose: () => void
  onConfirm: (quantity: number, note: string | null) => void
}) {
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  return (
    <Modal
      open
      onClose={onClose}
      title={`Restock — ${part.part_name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={quantity <= 0} onClick={() => onConfirm(quantity, note.trim() ? note : null)}>
            Add Stock
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">{onHand(part)}</p>
        <Stepper value={quantity} onChange={setQuantity} />
        <Field label="Note (optional)">
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}
