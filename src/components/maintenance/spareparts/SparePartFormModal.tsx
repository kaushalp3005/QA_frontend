'use client'

/**
 * Add or edit one spare part (SparePartFormSheet + SparePartFormViewModel).
 * The machine is either an asset from the register (warehouse read off it) or
 * the "Other" free-text path with a chosen warehouse — exactly one is sent.
 */
import { useEffect, useState } from 'react'
import { Button, Field, Input, Modal, Select, inputCls } from '@/components/maintenance/ui'
import { listMachines } from '@/lib/maintenance/api/assets'
import {
  createSparePart,
  updateSparePart,
  warehouseLabel,
  WAREHOUSE_OPTIONS,
  type SparePartDto,
} from '@/lib/maintenance/api/spareparts'
import { MachinePickerField, type MachineOption } from './MachinePickerField'

export interface SparePartFormProps {
  open: boolean
  /** null = add */
  editing: SparePartDto | null
  /** The machine group the edited part sits under */
  machineName?: string
  assetId?: string | null
  warehouse?: string | null
  onClose: () => void
  onSaved: () => void
}

export function SparePartFormModal(props: SparePartFormProps) {
  if (!props.open) return null
  // Mounted per open, so every open starts from a fresh form.
  return <FormBody {...props} />
}

function FormBody({ editing, machineName = '', assetId: editAssetId = null, warehouse: editWarehouse = null, onClose, onSaved }: SparePartFormProps) {
  const [assetOptions, setAssetOptions] = useState<MachineOption[]>([])
  const [assetLoadError, setAssetLoadError] = useState<string | null>(null)
  const [machineQuery, setMachineQuery] = useState(editing ? machineName : '')
  const [assetId, setAssetId] = useState<string | null>(editing ? editAssetId : null)
  const [otherName, setOtherName] = useState(editing && !editAssetId ? machineName : '')
  const [warehouse, setWarehouse] = useState<string | null>(editing ? editWarehouse : null)
  const [warehouseLocked, setWarehouseLocked] = useState(!!(editing && editAssetId))
  const [otherMode, setOtherMode] = useState(!!editing && !editAssetId)
  const [partName, setPartName] = useState(editing?.part_name ?? '')
  const [unit, setUnit] = useState(editing?.unit ?? '')
  const [quantity, setQuantity] = useState('0')
  const [minQuantity, setMinQuantity] = useState(String(editing?.min_quantity ?? 0))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // The whole register, both buildings.
    listMachines()
      .then((ms) =>
        setAssetOptions(
          ms
            .map((m) => ({ assetId: m.asset_id, assetName: m.asset_name, building: m.building }))
            .sort((a, b) => (a.assetName < b.assetName ? -1 : a.assetName > b.assetName ? 1 : 0)),
        ),
      )
      .catch(() => setAssetLoadError('Asset list unavailable — enter the machine manually'))
  }, [])

  // Mirrors the backend's rules so the user hears before a round trip, not after a 400.
  const canSave = !!partName.trim() && !saving && (otherMode ? !!otherName.trim() && !!warehouse : !!assetId)

  function onQueryChange(v: string) {
    // Typing after a selection clears it — field and chosen asset must agree.
    setMachineQuery(v)
    setAssetId(null)
    setWarehouseLocked(false)
  }

  function onSelect(o: MachineOption) {
    setAssetId(o.assetId)
    setMachineQuery(o.assetName)
    setWarehouse(o.building)
    setWarehouseLocked(true)
    setOtherMode(false)
    setError(null)
  }

  function onChooseOther() {
    setOtherMode(true)
    setAssetId(null)
    setWarehouseLocked(false)
    setWarehouse(null)
  }

  function backToAssetList() {
    setOtherMode(false)
    setMachineQuery('')
    setAssetId(null)
    setWarehouse(null)
    setWarehouseLocked(false)
  }

  async function save() {
    if (!canSave) return
    setSaving(true)
    setError(null)
    const source = {
      asset_id: assetId,
      machine_name: assetId ? null : otherName.trim(),
      warehouse: assetId ? null : warehouse,
      part_name: partName.trim(),
      unit: unit.trim() || null,
      min_quantity: parseInt(minQuantity, 10) || 0,
    }
    try {
      if (editing) await updateSparePart(editing.id, source)
      else await createSparePart({ ...source, quantity: parseInt(quantity, 10) || 0 })
      onSaved()
    } catch (e: any) {
      setError(e?.message || (editing ? 'Failed to save spare part' : 'Failed to add spare part'))
      setSaving(false)
    }
  }

  const digits = (v: string) => v.replace(/\D/g, '')

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? 'Edit Spare Part' : 'Add Spare Part'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!canSave} loading={saving}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {!otherMode ? (
          <MachinePickerField
            query={machineQuery}
            options={assetOptions}
            onQueryChange={onQueryChange}
            onSelect={onSelect}
            onChooseOther={onChooseOther}
            hint={assetLoadError}
          />
        ) : (
          <>
            <Field label="Machine name" required>
              <Input value={otherName} onChange={(e) => setOtherName(e.target.value)} />
            </Field>
            <Field label="Warehouse" required>
              <Select
                options={WAREHOUSE_OPTIONS}
                placeholder="Choose warehouse"
                value={warehouse ?? ''}
                onChange={(e) => setWarehouse(e.target.value || null)}
              />
            </Field>
            <button
              type="button"
              onClick={backToAssetList}
              className="text-xs font-semibold text-factory-700 hover:underline dark:text-factory-300"
            >
              Pick from the asset list instead
            </button>
          </>
        )}

        {warehouseLocked && (
          <Field label="Warehouse">
            <div className={`${inputCls} bg-zinc-50 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300`}>
              {warehouseLabel(warehouse) || '—'}
            </div>
          </Field>
        )}

        <Field label="Part name" required error={error}>
          <Input
            value={partName}
            onChange={(e) => {
              setPartName(e.target.value)
              setError(null)
            }}
            className={error ? 'border-red-500' : undefined}
          />
        </Field>

        <Field label="Unit (e.g. nos, pcs, litre)">
          <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
        </Field>

        {!editing && (
          <Field label="Opening quantity">
            <Input inputMode="numeric" value={quantity} onChange={(e) => setQuantity(digits(e.target.value))} />
          </Field>
        )}

        <Field label="Low-stock threshold">
          <Input inputMode="numeric" value={minQuantity} onChange={(e) => setMinQuantity(digits(e.target.value))} />
        </Field>
      </div>
    </Modal>
  )
}
