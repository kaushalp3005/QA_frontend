'use client'

import { Button, Field, Input, Modal, Textarea } from '@/components/maintenance/ui'
import type { MtMachine } from '@/lib/maintenance/api/assets'

/** Text-backed editable columns of an mt_asset_list row (AssetEditSheet.AssetEditForm). */
export interface AssetEditForm {
  building: string
  asset_name: string
  category: string
  sub_location: string
  quantity: string
  model_no: string
  serial_no: string
  power_load: string
  condition: string
  remarks: string
}

export const editFormFrom = (a: MtMachine): AssetEditForm => ({
  building: a.building ?? '',
  asset_name: a.asset_name ?? '',
  category: a.category ?? '',
  sub_location: a.sub_location ?? '',
  quantity: a.quantity != null ? String(a.quantity) : '',
  model_no: a.model_no ?? '',
  serial_no: a.serial_no ?? '',
  power_load: a.power_load ?? '',
  condition: a.condition ?? '',
  remarks: a.remarks ?? '',
})

/** Edit sheet over the editable register columns (common/components/AssetEditSheet.kt).
 *  asset_id is the backend key and rated_kw is computed there, so neither shows.
 *  `lockedCategory` renders the category read-only. */
export function AssetEditModal({
  open,
  form,
  saving,
  error,
  title = 'Edit asset',
  lockedCategory,
  onChange,
  onSave,
  onClose,
}: {
  open: boolean
  form: AssetEditForm
  saving: boolean
  error?: string | null
  title?: string
  lockedCategory?: string | null
  onChange: (f: AssetEditForm) => void
  onSave: () => void
  onClose: () => void
}) {
  const set = (patch: Partial<AssetEditForm>) => onChange({ ...form, ...patch })
  const text = (label: string, key: keyof AssetEditForm, extra?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <Field label={label}>
      <Input value={form[key]} onChange={(e) => set({ [key]: e.target.value })} {...extra} />
    </Field>
  )

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
          <Button variant="success" onClick={onSave} loading={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {text('Asset name', 'asset_name')}
        {text('Building', 'building')}
        {lockedCategory != null ? (
          <Field label="Category">
            <Input value={lockedCategory} disabled readOnly />
          </Field>
        ) : (
          text('Category', 'category')
        )}
        {text('Sub location', 'sub_location')}
        <Field label="Quantity">
          <Input
            inputMode="numeric"
            value={form.quantity}
            onChange={(e) => set({ quantity: e.target.value.replace(/\D/g, '') })}
          />
        </Field>
        {text('Model No.', 'model_no')}
        {text('Serial No.', 'serial_no')}
        {text('Power load (e.g. 120Watt)', 'power_load')}
        {text('Condition', 'condition')}
        <Field label="Remarks">
          <Textarea value={form.remarks} onChange={(e) => set({ remarks: e.target.value })} />
        </Field>
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </Modal>
  )
}
