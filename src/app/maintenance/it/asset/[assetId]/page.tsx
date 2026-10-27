'use client'

import { useState, type ReactNode } from 'react'
import toast from 'react-hot-toast'
import { Pencil, RefreshCw } from 'lucide-react'
import { Button, Card, DetailGrid, EmptyState, ErrorBanner, LoadingBlock, PageHeader } from '@/components/maintenance/ui'
import { AssetEditModal, editFormFrom, type AssetEditForm } from '@/components/maintenance/it/AssetEditModal'
import { useMtQuery, useMtSession } from '@/lib/maintenance/hooks'
import { fmtNumber } from '@/lib/maintenance/format'
import { MT } from '@/lib/maintenance/nav'
import { ratedKw, updateMachine, type MtMachine } from '@/lib/maintenance/api/assets'
import { IT_CATEGORY_ORDER, canEditItAsset, getAssetById, itCategoryMatches } from '@/lib/maintenance/api/it'

const dash = (v: string | null | undefined) => (v && v.trim() ? v : '—')

/** One IT / Electrical asset (ItAssetDetailScreen / VM): read-only record plus the
 *  shared edit sheet for roles the backend lets write. Asset ID and rated kW are
 *  never editable; Assigned to is display-only (PUT doesn't persist it). */
export default function ItAssetDetailPage({ params }: { params: { assetId: string } }) {
  const assetId = decodeURIComponent(params.assetId)
  const session = useMtSession()
  const { data: asset, error, loading, reload, setData } = useMtQuery(async () => {
    const row = await getAssetById(assetId)
    if (!row) throw new Error(`Asset ${assetId} was not found.`)
    return row
  }, [assetId])

  const [showEdit, setShowEdit] = useState(false)
  const [form, setForm] = useState<AssetEditForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const canEdit = canEditItAsset(session?.role)
  // Back to the category list the asset belongs to, else the chooser.
  const listCategory = asset ? IT_CATEGORY_ORDER.find((c) => itCategoryMatches(c, asset)) : undefined
  const back = listCategory ? MT.itAssetList(listCategory) : MT.itAssets

  const save = async () => {
    if (!asset || !form) return
    if (!form.asset_name.trim() || !form.building.trim()) {
      setEditError('Asset name and building are required.')
      return
    }
    setSaving(true)
    setEditError(null)
    const orNull = (s: string) => s.trim() || null
    const qty = parseInt(form.quantity.trim(), 10)
    try {
      // Category comes from the loaded asset, never the form — it's locked.
      const saved = await updateMachine(asset.asset_id, {
        building: form.building.trim(),
        asset_name: form.asset_name.trim(),
        category: asset.category,
        sub_location: form.sub_location.trim(),
        quantity: Number.isFinite(qty) ? qty : null,
        model_no: orNull(form.model_no),
        serial_no: orNull(form.serial_no),
        power_load: orNull(form.power_load),
        condition: orNull(form.condition),
        remarks: orNull(form.remarks),
        assigned_to: asset.assigned_to ?? null,
      })
      // The backend row carries the recomputed rated_kw.
      setData(saved)
      setShowEdit(false)
      toast.success('Asset updated')
    } catch (e: any) {
      setEditError(e?.message || 'Failed to update asset')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title={asset ? asset.asset_name?.trim() || asset.asset_id : 'Asset'}
        subtitle={asset?.asset_id}
        back={back}
        actions={
          <>
            {asset && canEdit && (
              <Button
                icon={Pencil}
                onClick={() => {
                  setForm(editFormFrom(asset))
                  setEditError(null)
                  setShowEdit(true)
                }}
              >
                Edit asset
              </Button>
            )}
            <Button variant="secondary" icon={RefreshCw} onClick={reload} disabled={loading}>
              Refresh
            </Button>
          </>
        }
      />

      {loading && !asset ? (
        <LoadingBlock />
      ) : !asset ? (
        <EmptyState
          title="Couldn't open this asset"
          message={error ?? 'Unknown error'}
          action={
            <Button variant="secondary" onClick={reload}>
              Retry
            </Button>
          }
        />
      ) : (
        <>
          <ErrorBanner error={error} onRetry={reload} />
          <AssetRecord asset={asset} />
        </>
      )}

      {form && asset && (
        <AssetEditModal
          open={showEdit}
          form={form}
          saving={saving}
          error={editError}
          lockedCategory={asset.category}
          onChange={setForm}
          onSave={save}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  )
}

function AssetRecord({ asset }: { asset: MtMachine }) {
  const kw = ratedKw(asset)
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <RecordCard title={asset.asset_name?.trim() || asset.asset_id} big>
        <DetailGrid
          items={[
            { label: 'Asset ID', value: dash(asset.asset_id) },
            { label: 'Category', value: dash(asset.category) },
            { label: 'Building', value: dash(asset.building) },
            { label: 'Floor / Sub-location', value: dash(asset.sub_location) },
          ]}
        />
      </RecordCard>
      <RecordCard title="Specification">
        <DetailGrid
          items={[
            { label: 'Power load', value: dash(asset.power_load) },
            { label: 'Rated kW', value: kw != null ? `${fmtNumber(kw, 2)} kW` : '—' },
            { label: 'Quantity', value: asset.quantity != null ? String(asset.quantity) : '—' },
            { label: 'Model No.', value: dash(asset.model_no) },
            { label: 'Serial No.', value: dash(asset.serial_no) },
          ]}
        />
      </RecordCard>
      <RecordCard title="Status">
        <DetailGrid
          items={[
            { label: 'Condition', value: dash(asset.condition) },
            { label: 'Assigned to', value: dash(asset.assigned_to) },
            { label: 'Remarks', value: dash(asset.remarks), wide: true },
          ]}
        />
      </RecordCard>
    </div>
  )
}

function RecordCard({ title, big, children }: { title: string; big?: boolean; children: ReactNode }) {
  return (
    <Card className="p-5">
      <h2
        className={
          big
            ? 'mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-50'
            : 'mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400'
        }
      >
        {title}
      </h2>
      {children}
    </Card>
  )
}
