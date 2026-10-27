'use client'

/**
 * New / edit PM plan (PlanEditorScreen.kt / PlanEditorViewModel.kt). A plan is a
 * PM checklist bound to one asset plus its schedule and technician; it is named
 * after its asset (no separate name field).
 */

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import {
  Button,
  Card,
  ErrorBanner,
  Field,
  Input,
  LoadingBlock,
  PageHeader,
  Select,
  Textarea,
} from '@/components/maintenance/ui'
import MachinePicker from '@/components/maintenance/supervisor/MachinePicker'
import { useMtQuery, useMtSession } from '@/lib/maintenance/hooks'
import { isoDateIst } from '@/lib/maintenance/format'
import { MT } from '@/lib/maintenance/nav'
import { listMachines, listUsers, type UserRosterEntry } from '@/lib/maintenance/api/assets'
import {
  DAY_MS,
  createPlan,
  getPlan,
  updatePlan,
  type PmPlan,
  type PmTriggerType,
} from '@/lib/maintenance/api/supervisor'

interface ItemDraft {
  id: string
  title: string
  description: string
}

const uuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

const blankItem = (): ItemDraft => ({ id: `draft-${uuid()}`, title: '', description: '' })

function PlanEditor() {
  const router = useRouter()
  const session = useMtSession()
  const planId = useSearchParams().get('id')?.trim() || null
  const isEdit = !!planId

  // Asset register for the picker — sorted by name, retryable when the backend is cold.
  const assets = useMtQuery(
    async () => (await listMachines()).sort((a, b) => a.asset_name.toLowerCase().localeCompare(b.asset_name.toLowerCase())),
    [],
  )
  // Offline / error → empty picker, same as UserRepositoryImpl.getUsersByRole.
  const techs = useMtQuery(() => listUsers('TECHNICIAN').catch(() => [] as UserRosterEntry[]), [])

  const [loadingPlan, setLoadingPlan] = useState(isEdit)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [assetId, setAssetId] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [techId, setTechId] = useState<string | null>(null)
  const [triggerType, setTriggerType] = useState<PmTriggerType>('TIME')
  const [interval, setIntervalText] = useState('30')
  const [firstDue, setFirstDue] = useState('')
  const [items, setItems] = useState<ItemDraft[]>(() => [blankItem()])

  // Carried over on edit so a re-save doesn't wipe schedule history.
  const loaded = useRef<PmPlan | null>(null)
  // Reused on a retried create so client_ref keeps the POST idempotent.
  const provisionalId = useRef(`plan-${uuid()}`)

  useEffect(() => {
    if (!planId) return
    let live = true
    setLoadingPlan(true)
    getPlan(planId)
      .then((p) => {
        if (!live) return
        loaded.current = p
        setAssetId(p.machine_id)
        setDescription(p.description ?? '')
        setTechId(p.assigned_technician_id)
        setTriggerType(String(p.trigger_type).toUpperCase() === 'USAGE' ? 'USAGE' : 'TIME')
        setIntervalText(String(p.trigger_interval))
        // The first cycle hasn't run yet — surface its (editable) due date.
        setFirstDue(p.last_completed_at == null ? isoDateIst(p.next_due_at) : '')
        const sorted = [...(p.items ?? [])].sort((a, b) => a.order_index - b.order_index)
        setItems(sorted.length ? sorted.map((i) => ({ id: i.id, title: i.title, description: i.description ?? '' })) : [blankItem()])
      })
      .catch((e) => live && setLoadError(e?.status === 404 ? 'Plan not found.' : e?.message || 'Plan not found.'))
      .finally(() => live && setLoadingPlan(false))
    return () => {
      live = false
    }
  }, [planId])

  // Sensible default so the field isn't empty; the supervisor can change it.
  useEffect(() => {
    if (!techId && !isEdit && techs.data?.length) setTechId(techs.data[0].id)
  }, [techs.data, techId, isEdit])

  const intervalNum = parseInt(interval, 10) || 0
  const firstDueValid = !firstDue || /^\d{4}-\d{2}-\d{2}$/.test(firstDue)
  const canSave =
    !!assetId && !!techId?.trim() && intervalNum > 0 && firstDueValid && items.length > 0 && items.every((i) => i.title.trim())

  const patchItem = (idx: number, patch: Partial<ItemDraft>) =>
    setItems((list) => list.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  const move = (idx: number, dir: -1 | 1) =>
    setItems((list) => {
      const j = idx + dir
      if (j < 0 || j >= list.length) return list
      const next = [...list]
      ;[next[idx], next[j]] = [next[j], next[idx]]
      return next
    })
  const remove = (idx: number) =>
    setItems((list) => {
      const next = list.filter((_, i) => i !== idx)
      return next.length ? next : [blankItem()]
    })

  /** Anchored on the last completion once one exists; else the picked first due
   *  date (IST midnight); else now + interval. The first WO appears 7 days before. */
  const computeNextDue = (now: number) => {
    const last = loaded.current?.last_completed_at
    if (last != null) return last + intervalNum * DAY_MS
    if (firstDue) return new Date(`${firstDue}T00:00:00+05:30`).getTime()
    return now + intervalNum * DAY_MS
  }

  const save = async () => {
    if (!canSave || saving) return
    const asset = assets.data?.find((a) => a.asset_id === assetId)
    if (!asset) {
      setError('Pick a machine.')
      toast.error('Pick a machine.')
      return
    }
    setSaving(true)
    setError(null)
    const now = Date.now()
    const prev = loaded.current
    const id = prev?.id ?? provisionalId.current
    const body: PmPlan = {
      id,
      client_ref: prev ? undefined : id,
      machine_id: asset.asset_id,
      machine_name: asset.asset_name,
      description: description.trim(),
      items: items.map((d, idx) => ({
        id: d.id.startsWith('draft-') ? `item-${uuid()}` : d.id,
        order_index: idx,
        title: d.title.trim(),
        description: d.description.trim(),
      })),
      trigger_type: triggerType,
      trigger_interval: intervalNum || 30,
      next_due_at: computeNextDue(now),
      last_completed_at: prev?.last_completed_at ?? null,
      assigned_technician_id: techId!,
      is_active: true,
      created_by: session?.userId || null,
      created_at: prev?.created_at ?? now,
      updated_at: now,
    }
    try {
      if (prev) await updatePlan(prev.id, body)
      else await createPlan(body)
      toast.success(prev ? 'Plan saved' : 'Plan created')
      router.push(MT.supervisor)
    } catch (e: any) {
      const msg = e?.message || 'Save failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  if (loadingPlan) return <LoadingBlock />
  if (loadError)
    return (
      <>
        <PageHeader title="Edit plan" back={MT.supervisor} />
        <ErrorBanner error={loadError} />
      </>
    )

  const techList = techs.data ?? []
  const techOptions = techList.map((t) => ({ value: t.id, label: `${t.name} · ${t.plant_id}` }))
  if (techId && !techList.some((t) => t.id === techId)) techOptions.unshift({ value: techId, label: `Assigned: ${techId}` })

  return (
    <>
      <PageHeader title={isEdit ? 'Edit plan' : 'New plan'} back={MT.supervisor} />
      <div className="max-w-3xl space-y-4">
        <Card className="space-y-4 p-5">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Plan details</h2>
          <MachinePicker
            assets={assets.data ?? []}
            selectedId={assetId}
            onSelect={setAssetId}
            loading={assets.loading}
            error={assets.error}
            onRetry={assets.reload}
          />
          <Field label="Description">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </Field>

          <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-500">Schedule</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Trigger type">
                <Select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value as PmTriggerType)}
                  options={[
                    { value: 'TIME', label: 'TIME (calendar days)' },
                    { value: 'USAGE', label: 'USAGE (running hours)' },
                  ]}
                />
              </Field>
              <Field label={triggerType === 'TIME' ? 'Interval (days)' : 'Interval (running hours)'} required>
                <Input
                  inputMode="numeric"
                  value={interval}
                  onChange={(e) => setIntervalText(e.target.value.replace(/\D/g, ''))}
                />
              </Field>
              <Field
                label="First due date — optional"
                className="sm:col-span-2"
                error={!firstDueValid ? 'Format: YYYY-MM-DD, e.g. 2026-07-20' : undefined}
                hint={`Blank = due ${interval || '…'} days from today. The technician's task appears 7 days before the due date.`}
              >
                <Input type="date" value={firstDue} onChange={(e) => setFirstDue(e.target.value)} className="sm:max-w-xs" />
              </Field>
              <Field label="Assign to technician" required className="sm:col-span-2">
                <Select
                  value={techId ?? ''}
                  onChange={(e) => setTechId(e.target.value || null)}
                  placeholder={techs.loading ? 'Loading technicians…' : techList.length ? 'Select a technician' : 'No technicians found'}
                  options={techOptions}
                />
              </Field>
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Checklist items</h2>
          <span className="text-xs font-semibold tabular-nums text-zinc-500">{items.length}</span>
        </div>

        {items.map((item, idx) => (
          <Card key={item.id} className="space-y-3 p-4">
            <div className="flex items-center gap-1">
              <span className="flex-1 text-sm font-bold text-zinc-900 dark:text-zinc-50">Item {idx + 1}</span>
              <IconBtn label="Move up" disabled={idx === 0} onClick={() => move(idx, -1)}>
                <ArrowUp className="h-4 w-4" />
              </IconBtn>
              <IconBtn label="Move down" disabled={idx === items.length - 1} onClick={() => move(idx, 1)}>
                <ArrowDown className="h-4 w-4" />
              </IconBtn>
              <IconBtn label="Remove" onClick={() => remove(idx)}>
                <Trash2 className="h-4 w-4" />
              </IconBtn>
            </div>
            <Field label="Title" required>
              <Input value={item.title} onChange={(e) => patchItem(idx, { title: e.target.value })} />
            </Field>
            <Field label="Remarks">
              <Textarea value={item.description} rows={2} onChange={(e) => patchItem(idx, { description: e.target.value })} />
            </Field>
          </Card>
        ))}

        <Button variant="secondary" icon={Plus} className="w-full" onClick={() => setItems((l) => [...l, blankItem()])}>
          Add item
        </Button>

        <ErrorBanner error={error} />

        <Button variant="success" className="w-full py-3" onClick={save} loading={saving} disabled={!canSave}>
          {isEdit ? 'Save changes' : 'Create plan'}
        </Button>
      </div>
    </>
  )
}

function IconBtn({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
    >
      {children}
    </button>
  )
}

export default function PlanEditorPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <PlanEditor />
    </Suspense>
  )
}
