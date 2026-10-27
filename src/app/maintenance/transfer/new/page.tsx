'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ArrowLeftRight } from 'lucide-react'
import { Button, Card, Field, Input, PageHeader, Select, Textarea } from '@/components/maintenance/ui'
import { MachineAutocomplete, type MachineOption } from '@/components/maintenance/transfer/MachineAutocomplete'
import { ProofPhotoPicker } from '@/components/maintenance/transfer/ProofPhotoPicker'
import { useMtQuery } from '@/lib/maintenance/hooks'
import { isoDateIst } from '@/lib/maintenance/format'
import { MT } from '@/lib/maintenance/nav'
import { listMachines } from '@/lib/maintenance/api/assets'
import {
  TRANSFER_CONDITIONS,
  WAREHOUSES,
  createTransfer,
  isPendingTransfer,
  listTransfers,
  normWarehouse,
  prepareProofPhoto,
} from '@/lib/maintenance/api/transfers'

/** Machine Transfer form (TransferFormScreen / VM) → POST /machine-transfers multipart. */
export default function TransferFormPage() {
  const router = useRouter()

  const [date, setDate] = useState(isoDateIst())
  const [fromWarehouse, setFrom] = useState('A185')
  const [toWarehouse, setTo] = useState('W202')
  const [machineName, setMachineName] = useState('')
  // Set when a register suggestion is picked; cleared on manual typing so a stale
  // id is never sent for a hand-typed name (backend falls back to a name match).
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [machineCode, setMachineCode] = useState('')
  const [condition, setCondition] = useState('')
  const [reason, setReason] = useState('')
  const [authorisedPerson, setAuthorisedPerson] = useState('')
  const [remarks, setRemarks] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const machines = useMtQuery(
    async () =>
      (await listMachines())
        .filter((m) => m.asset_name?.trim())
        .map<MachineOption>((m) => ({
          asset_id: m.asset_id,
          name: m.asset_name,
          building: m.building,
          sub_location: m.sub_location,
        }))
        .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || a.building.localeCompare(b.building)),
    [],
  )

  // Machines mid-transfer (PENDING) are hidden from the picker and blocked from a
  // second transfer. Best-effort: a failure just leaves the set empty.
  const pending = useMtQuery(
    async () => {
      try {
        const rows = await listTransfers()
        return new Set(
          rows
            .filter(isPendingTransfer)
            .map((t) => t.machine_name.trim().toLowerCase())
            .filter(Boolean),
        )
      } catch {
        return new Set<string>()
      }
    },
    [],
  )
  const pendingNames = pending.data ?? new Set<string>()

  const suggestions = useMemo(
    () =>
      (machines.data ?? [])
        .filter((m) => normWarehouse(m.building) === normWarehouse(fromWarehouse))
        .filter((m) => !pendingNames.has(m.name.trim().toLowerCase())),
    [machines.data, fromWarehouse, pendingNames],
  )

  const machineIsPending = !!machineName.trim() && pendingNames.has(machineName.trim().toLowerCase())
  const sameWarehouseError = !!fromWarehouse && fromWarehouse === toWarehouse
  const canSubmit = !!fromWarehouse && !!toWarehouse && !!machineName.trim() && fromWarehouse !== toWarehouse

  const submit = async () => {
    if (submitting || !canSubmit) return
    if (machineIsPending) {
      toast.error('This machine already has a pending transfer awaiting acknowledgement.')
      return
    }
    setSubmitting(true)
    const orNull = (s: string) => (s.trim() ? s : null)
    try {
      const proof = photo ? await prepareProofPhoto(photo) : null
      await createTransfer(
        {
          from_warehouse: fromWarehouse,
          to_warehouse: toWarehouse,
          machine_name: machineName,
          asset_id: selectedAssetId,
          date: orNull(date),
          machine_code: orNull(machineCode),
          condition: orNull(condition),
          reason: orNull(reason),
          authorised_person: orNull(authorisedPerson),
          remarks: orNull(remarks),
        },
        proof,
      )
      toast.success('Transfer recorded.')
      router.push(MT.transfers)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to submit transfer')
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Machine Transfer" subtitle="Move an asset between warehouses" back={MT.transfers} />

      <div className="space-y-4">
        <FormCard title="Transfer route">
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <div>
            <div className="flex items-end gap-2">
              <Field label="From" className="flex-1">
                <Select value={fromWarehouse} options={WAREHOUSES} onChange={(e) => setFrom(e.target.value)} />
              </Field>
              <button
                type="button"
                onClick={() => {
                  setFrom(toWarehouse)
                  setTo(fromWarehouse)
                }}
                className="mb-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-factory-100 text-factory-700 hover:bg-factory-200 dark:bg-factory-500/15 dark:text-factory-300 dark:hover:bg-factory-500/25"
                aria-label="Switch From and To"
                title="Switch From and To"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </button>
              <Field label="To" className="flex-1">
                <Select value={toWarehouse} options={WAREHOUSES} onChange={(e) => setTo(e.target.value)} />
              </Field>
            </div>
            {sameWarehouseError && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">From and To warehouse can&apos;t be the same.</p>
            )}
          </div>
        </FormCard>

        <FormCard title="Machine">
          <Field
            label="Machine name — search or type"
            required
            error={machineIsPending ? 'This machine already has a pending transfer awaiting acknowledgement.' : null}
            hint={
              machines.loading
                ? 'Loading machines…'
                : machines.error
                  ? undefined
                  : suggestions.length === 0
                    ? `No register assets in ${fromWarehouse} — type the name instead.`
                    : undefined
            }
          >
            <MachineAutocomplete
              value={machineName}
              suggestions={suggestions}
              onChange={(v) => {
                setMachineName(v)
                setSelectedAssetId(null)
              }}
              onPick={(o) => {
                setMachineName(o.name)
                setSelectedAssetId(o.asset_id)
              }}
            />
          </Field>
          {machines.error && (
            <p className="-mt-1 text-xs text-red-600 dark:text-red-400">
              Couldn&apos;t load machine list — you can still type the name. ({machines.error})
            </p>
          )}
          <Field label="Model / Sr. No. (optional)">
            <Input value={machineCode} onChange={(e) => setMachineCode(e.target.value)} />
          </Field>
          <Field label="Condition">
            <Select
              value={condition}
              options={TRANSFER_CONDITIONS}
              placeholder="Select condition"
              onChange={(e) => setCondition(e.target.value)}
            />
          </Field>
        </FormCard>

        <FormCard title="Proof — photo of machine">
          <ProofPhotoPicker file={photo} onChange={setPhoto} />
        </FormCard>

        <FormCard title="Authorisation">
          <Field label="Reason for transfer">
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <Field label="Authorised by (person)">
            <Input value={authorisedPerson} onChange={(e) => setAuthorisedPerson(e.target.value)} />
          </Field>
          <Field label="Remarks (optional)">
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </Field>
        </FormCard>

        <Button className="w-full py-3 text-base" onClick={submit} loading={submitting} disabled={!canSubmit}>
          {submitting ? 'Submitting…' : 'Submit transfer'}
        </Button>
      </div>
    </div>
  )
}

function FormCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="p-4">
      <h2 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-50">{title}</h2>
      <div className="space-y-3">{children}</div>
    </Card>
  )
}
