'use client'

/**
 * "Add new machine" — ported from machinelist/AddMachineSheet.kt. asset_id is
 * backend-assigned and rated_kw backend-computed, so neither is entered.
 * Category and Floor suggest the values already in the register (a datalist),
 * while a brand-new value can still be typed.
 */

import { useEffect, useId, useState } from 'react'
import { Button, Field, Input, Modal, Select, Textarea } from '@/components/maintenance/ui'
import type { MtMachineWrite } from '@/lib/maintenance/api/assets'

const BUILDING_OPTIONS = ['W202', 'A185']

export function AddMachineModal({
  open,
  saving,
  error,
  categoryOptions,
  subLocationsByBuilding,
  onClose,
  onSubmit,
}: {
  open: boolean
  saving: boolean
  error: string | null
  categoryOptions: string[]
  subLocationsByBuilding: Record<string, string[]>
  onClose: () => void
  onSubmit: (m: MtMachineWrite) => void
}) {
  const [assetName, setAssetName] = useState('')
  const [building, setBuilding] = useState(BUILDING_OPTIONS[0])
  const [category, setCategory] = useState('')
  const [subLocation, setSubLocation] = useState('')
  const [powerLoad, setPowerLoad] = useState('')
  const [quantity, setQuantity] = useState('')
  const [modelNo, setModelNo] = useState('')
  const [serialNo, setSerialNo] = useState('')
  const [condition, setCondition] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [remarks, setRemarks] = useState('')
  const catListId = useId()
  const floorListId = useId()

  // Fresh form every time the sheet opens.
  useEffect(() => {
    if (!open) return
    setAssetName('')
    setBuilding(BUILDING_OPTIONS[0])
    setCategory('')
    setSubLocation('')
    setPowerLoad('')
    setQuantity('')
    setModelNo('')
    setSerialNo('')
    setCondition('')
    setAssignedTo('')
    setRemarks('')
  }, [open])

  // Floors are building-specific; fall back to every known floor when the building has none yet.
  const floorOptions =
    subLocationsByBuilding[building] ??
    Array.from(new Set(Object.values(subLocationsByBuilding).flat())).sort((a, b) => a.localeCompare(b))

  const canSubmit = !!assetName.trim() && !!building.trim() && !!category.trim() && !!subLocation.trim() && !saving
  const nn = (v: string) => v.trim() || null

  const submit = () => {
    if (!canSubmit) return
    const q = quantity.trim()
    onSubmit({
      building,
      asset_name: assetName.trim(),
      category: category.trim(),
      sub_location: subLocation.trim(),
      power_load: nn(powerLoad),
      quantity: q ? parseInt(q, 10) : null,
      condition: nn(condition),
      assigned_to: nn(assignedTo),
      model_no: nn(modelNo),
      serial_no: nn(serialNo),
      remarks: nn(remarks),
    })
  }

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title="Add new machine"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving} disabled={!canSubmit}>
            Add machine
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Asset name" required className="sm:col-span-2">
          <Input value={assetName} onChange={(e) => setAssetName(e.target.value)} />
        </Field>
        <Field label="Building" required>
          <Select value={building} onChange={(e) => setBuilding(e.target.value)} options={BUILDING_OPTIONS} />
        </Field>
        <Field
          label="Category"
          required
          hint={'Use "Production Equipment" for a production asset; anything else lands in Others.'}
        >
          <Input list={catListId} value={category} onChange={(e) => setCategory(e.target.value)} />
          <datalist id={catListId}>
            {categoryOptions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="Floor / Sub-location" required hint="Pick an existing value or type a new one.">
          <Input list={floorListId} value={subLocation} onChange={(e) => setSubLocation(e.target.value)} />
          <datalist id={floorListId}>
            {floorOptions.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </Field>
        <Field label="Power load (e.g. 120Watt)">
          <Input value={powerLoad} onChange={(e) => setPowerLoad(e.target.value)} />
        </Field>
        <Field label="Quantity">
          <Input
            inputMode="numeric"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ''))}
          />
        </Field>
        <Field label="Model No.">
          <Input value={modelNo} onChange={(e) => setModelNo(e.target.value)} />
        </Field>
        <Field label="Serial No.">
          <Input value={serialNo} onChange={(e) => setSerialNo(e.target.value)} />
        </Field>
        <Field label="Condition">
          <Input value={condition} onChange={(e) => setCondition(e.target.value)} />
        </Field>
        <Field label="Assigned to">
          <Input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} />
        </Field>
        <Field label="Remarks" className="sm:col-span-2">
          <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </Field>
      </div>
      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </Modal>
  )
}
