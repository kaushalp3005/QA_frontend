'use client'

/**
 * Edit the editable mt_asset_list columns — ported from
 * common/components/AssetEditSheet.kt (supervisor, from Machine Detail).
 * asset_id is the immutable key and rated_kw is backend-computed, so neither
 * appears here.
 */

import { useEffect, useState } from 'react'
import { Button, Field, Input, Modal, Textarea } from '@/components/maintenance/ui'
import type { MtMachine } from '@/lib/maintenance/api/assets'

export interface AssetEditForm {
  building: string
  assetName: string
  category: string
  subLocation: string
  quantity: string
  modelNo: string
  serialNo: string
  powerLoad: string
  condition: string
  remarks: string
}

export const formFromAsset = (a: MtMachine): AssetEditForm => ({
  building: a.building ?? '',
  assetName: a.asset_name ?? '',
  category: a.category ?? '',
  subLocation: a.sub_location ?? '',
  quantity: a.quantity != null ? String(a.quantity) : '',
  modelNo: a.model_no ?? '',
  serialNo: a.serial_no ?? '',
  powerLoad: a.power_load ?? '',
  condition: a.condition ?? '',
  remarks: a.remarks ?? '',
})

export function AssetEditModal({
  open,
  asset,
  saving,
  error,
  onClose,
  onSave,
}: {
  open: boolean
  asset: MtMachine | null
  saving: boolean
  error: string | null
  onClose: () => void
  onSave: (form: AssetEditForm) => void
}) {
  const [form, setForm] = useState<AssetEditForm | null>(null)

  useEffect(() => {
    if (open && asset) setForm(formFromAsset(asset))
  }, [open, asset])

  if (!form) return null
  const set = (k: keyof AssetEditForm) => (e: { target: { value: string } }) =>
    setForm((f) => (f ? { ...f, [k]: k === 'quantity' ? e.target.value.replace(/\D/g, '') : e.target.value } : f))

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title="Edit machine details"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="success" onClick={() => onSave(form)} loading={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Asset name" className="sm:col-span-2">
          <Input value={form.assetName} onChange={set('assetName')} />
        </Field>
        <Field label="Building">
          <Input value={form.building} onChange={set('building')} />
        </Field>
        <Field label="Category">
          <Input value={form.category} onChange={set('category')} />
        </Field>
        <Field label="Sub location">
          <Input value={form.subLocation} onChange={set('subLocation')} />
        </Field>
        <Field label="Quantity">
          <Input inputMode="numeric" value={form.quantity} onChange={set('quantity')} />
        </Field>
        <Field label="Model No.">
          <Input value={form.modelNo} onChange={set('modelNo')} />
        </Field>
        <Field label="Serial No.">
          <Input value={form.serialNo} onChange={set('serialNo')} />
        </Field>
        <Field label="Power load (e.g. 120Watt)">
          <Input value={form.powerLoad} onChange={set('powerLoad')} />
        </Field>
        <Field label="Condition">
          <Input value={form.condition} onChange={set('condition')} />
        </Field>
        <Field label="Remarks" className="sm:col-span-2">
          <Textarea value={form.remarks} onChange={set('remarks')} />
        </Field>
      </div>
      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </Modal>
  )
}
