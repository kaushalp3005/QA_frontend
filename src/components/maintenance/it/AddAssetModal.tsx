'use client'

import { useEffect, useId, useState } from 'react'
import { Button, Field, Input, Modal, Select, Textarea } from '@/components/maintenance/ui'
import type { MtMachineWrite } from '@/lib/maintenance/api/assets'
import { IT_BUILDING_OPTIONS } from '@/lib/maintenance/api/it'

/** "Add asset" sheet with the category pinned (machinelist/AddMachineSheet.kt called
 *  with lockedCategory from ItAssetListScreen). asset_id is backend-assigned. */
export function AddAssetModal({
  open,
  title,
  lockedCategory,
  subLocationsByBuilding,
  saving,
  error,
  onSubmit,
  onClose,
}: {
  open: boolean
  title: string
  lockedCategory: string
  subLocationsByBuilding: Record<string, string[]>
  saving: boolean
  error?: string | null
  onSubmit: (body: MtMachineWrite) => void
  onClose: () => void
}) {
  const listId = useId()
  const [assetName, setAssetName] = useState('')
  const [building, setBuilding] = useState(IT_BUILDING_OPTIONS[0])
  const [subLocation, setSubLocation] = useState('')
  const [powerLoad, setPowerLoad] = useState('')
  const [quantity, setQuantity] = useState('')
  const [modelNo, setModelNo] = useState('')
  const [serialNo, setSerialNo] = useState('')
  const [condition, setCondition] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [remarks, setRemarks] = useState('')

  // Fresh form every time the sheet opens, as the Compose sheet's remember{} does.
  useEffect(() => {
    if (!open) return
    setAssetName('')
    setBuilding(IT_BUILDING_OPTIONS[0])
    setSubLocation('')
    setPowerLoad('')
    setQuantity('')
    setModelNo('')
    setSerialNo('')
    setCondition('')
    setAssignedTo('')
    setRemarks('')
  }, [open])

  // Floors are per building; fall back to every known floor for an empty building.
  const floorOptions =
    subLocationsByBuilding[building] ??
    Array.from(new Set(Object.values(subLocationsByBuilding).flat())).sort((a, b) => a.localeCompare(b))

  const canSubmit = !!assetName.trim() && !!building.trim() && !!lockedCategory.trim() && !!subLocation.trim() && !saving
  const orNull = (s: string) => s.trim() || null

  const submit = () => {
    if (!canSubmit) return
    const qty = parseInt(quantity.trim(), 10)
    onSubmit({
      building,
      asset_name: assetName.trim(),
      category: lockedCategory,
      sub_location: subLocation.trim(),
      power_load: orNull(powerLoad),
      quantity: Number.isFinite(qty) ? qty : null,
      condition: orNull(condition),
      assigned_to: orNull(assignedTo),
      model_no: orNull(modelNo),
      serial_no: orNull(serialNo),
      remarks: orNull(remarks),
    })
  }

  return (
    <Modal
      open={open}
      onClose={saving ? () => {} : onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving} disabled={!canSubmit}>
            Add asset
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Asset name" required>
          <Input value={assetName} onChange={(e) => setAssetName(e.target.value)} />
        </Field>
        <Field label="Building" required>
          <Select value={building} options={IT_BUILDING_OPTIONS} onChange={(e) => setBuilding(e.target.value)} />
        </Field>
        <Field label="Category">
          <Input value={lockedCategory} disabled readOnly />
        </Field>
        <Field label="Floor / Sub-location" required hint="Pick an existing value or type a new one.">
          <Input list={listId} value={subLocation} onChange={(e) => setSubLocation(e.target.value)} autoComplete="off" />
          <datalist id={listId}>
            {floorOptions.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </Field>
        <Field label="Power load (e.g. 120Watt)">
          <Input value={powerLoad} onChange={(e) => setPowerLoad(e.target.value)} />
        </Field>
        <Field label="Quantity">
          <Input inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ''))} />
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
        <Field label="Remarks">
          <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </Field>
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </Modal>
  )
}
