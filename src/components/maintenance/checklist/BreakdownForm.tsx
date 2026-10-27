'use client'

/**
 * Breakdown Maintenance Record sheet (W-202 CFPLA.C4.F.06 / A-185 CFPLB.C4.F.61)
 * — presentation/checklist/BreakdownFormScreen + BreakdownFormViewModel.
 * One card per register row; opened with ?breakdownId= it seeds the row from
 * that QC-approved operator breakdown (BreakdownF06Logic.breakdownFlagToEntry).
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Download, Plus, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  breakdownHistory,
  listOpenBreakdowns,
  submitBreakdownSheet,
  type BreakdownFlagDto,
} from '@/lib/maintenance/api/checklist'
import { listMachines } from '@/lib/maintenance/api/assets'
import { isoDateIst } from '@/lib/maintenance/format'
import { useMtSession } from '@/lib/maintenance/hooks'
import { MT } from '@/lib/maintenance/nav'
import { Button, Card, Field, Input, LoadingBlock, PageHeader, Textarea, inputCls } from '@/components/maintenance/ui'
import {
  BREAKDOWN_W202,
  breakdownSpecForPlant,
  flagToEntry,
  isEntryValid,
  plantOf,
  type BreakdownEntryState,
  type BreakdownFormSpec,
  type BreakdownRow,
} from './logic'
import { breakdownPrintJob, usePrintDoc } from './PrintDoc'

interface MachineOption {
  name: string
  srNo: string
}

/** Look a breakdown up by id: recent history first (it carries the resolved/QC names), then open. */
async function findBreakdown(id: string): Promise<BreakdownFlagDto | null> {
  const from = isoDateIst(Date.now() - 365 * 86_400_000)
  const [hist, open] = await Promise.allSettled([breakdownHistory(from, isoDateIst(), 'both'), listOpenBreakdowns('both')])
  const pick = (r: PromiseSettledResult<BreakdownFlagDto[]>) =>
    r.status === 'fulfilled' ? (r.value ?? []).find((f) => f.id === id) ?? null : null
  return pick(hist) ?? pick(open)
}

export function BreakdownForm({ breakdownId }: { breakdownId: string | null }) {
  const router = useRouter()
  const session = useMtSession()
  const seq = useRef(0)
  const defaultLocation = useRef('')

  const newEntry = (): BreakdownEntryState => ({
    key: `bd-${seq.current++}`,
    date: isoDateIst(),
    location: defaultLocation.current,
    machineName: '',
    equipmentModel: '',
    problem: '',
    typeOfMaintenance: 'Breakdown',
    partOfMachine: '',
    reason: '',
    durationStart: '',
    durationEnd: '',
    machineOperatorSign: '',
    maintenancePersonSign: '',
    qcClearanceSign: '',
  })

  const [spec, setSpec] = useState<BreakdownFormSpec>(BREAKDOWN_W202)
  const [entries, setEntries] = useState<BreakdownEntryState[]>(() => [newEntry()])
  const [verifiedBy, setVerifiedBy] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [prefilling, setPrefilling] = useState(!!breakdownId)
  const [prefillMissing, setPrefillMissing] = useState(false)
  const [machineOptions, setMachineOptions] = useState<MachineOption[]>([])
  const [machinesError, setMachinesError] = useState<string | null>(null)
  const { print, printing, portal } = usePrintDoc()

  // Machine register for the Machine Name picker; typing still works if it fails.
  useEffect(() => {
    listMachines()
      .then((list) => {
        const seen = new Set<string>()
        const opts: MachineOption[] = []
        for (const m of list ?? []) {
          if (!m.asset_name?.trim() || seen.has(m.asset_name)) continue
          seen.add(m.asset_name)
          opts.push({ name: m.asset_name, srNo: m.asset_id })
        }
        setMachineOptions(opts.sort((a, b) => a.name.localeCompare(b.name)))
        setMachinesError(null)
      })
      .catch((e: any) => setMachinesError(e?.message ?? 'Request failed'))
  }, [])

  // Resolve the plant before prefilling, so a prefilled Location isn't overwritten.
  const plantId = session?.plantId
  useEffect(() => {
    if (!session) return
    defaultLocation.current = plantOf(plantId) === 'A185' ? 'A185' : 'W202'
    setSpec(breakdownSpecForPlant(plantId))
    setEntries((list) => list.map((e) => (e.location.trim() ? e : { ...e, location: defaultLocation.current })))
    if (!breakdownId) return
    let cancelled = false
    setPrefilling(true)
    findBreakdown(breakdownId)
      .then((flag) => {
        if (cancelled) return
        if (!flag) return setPrefillMissing(true)
        const entry = flagToEntry(flag, `bd-${seq.current++}`)
        setEntries([{ ...entry, typeOfMaintenance: entry.typeOfMaintenance.trim() || 'Breakdown' }])
      })
      .finally(() => !cancelled && setPrefilling(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, plantId, breakdownId])

  const canSubmit = !submitting && entries.length > 0 && entries.every(isEntryValid)
  const canDownload = !printing && entries.some(isEntryValid)

  const update = (u: BreakdownEntryState) => setEntries((list) => list.map((e) => (e.key === u.key ? u : e)))
  const remove = (key: string) =>
    setEntries((list) => {
      const left = list.filter((e) => e.key !== key)
      return left.length ? left : [newEntry()]
    })

  async function submit() {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await submitBreakdownSheet({
        doc_no: spec.docNo,
        verified_by: verifiedBy.trim(),
        entries: entries.map((e) => ({
          record_date: e.date.trim() || null,
          location: e.location.trim(),
          machine_name: e.machineName.trim(),
          equipment_model_no: e.equipmentModel.trim(),
          problem_in_brief: e.problem.trim(),
          type_of_maintenance: e.typeOfMaintenance.trim(),
          part_of_machine: e.partOfMachine.trim(),
          temporary_reason: e.reason.trim(),
          duration_start: e.durationStart.trim(),
          duration_end: e.durationEnd.trim(),
          machine_operator_sign: e.machineOperatorSign.trim(),
          maintenance_person_sign: e.maintenancePersonSign.trim(),
          qc_clearance_sign: e.qcClearanceSign.trim(),
        })),
      })
      toast.success('Breakdown record saved.')
      router.push(MT.breakdownSheetList)
    } catch (e: any) {
      toast.error(`Save failed — ${e?.message ?? 'Request failed'}`)
      setSubmitting(false)
    }
  }

  function exportPdf() {
    const rows: BreakdownRow[] = entries.filter(isEntryValid).map((e, i) => ({
      srNo: i + 1,
      date: e.date.trim(),
      location: e.location.trim(),
      machineName: e.machineName.trim(),
      equipmentModel: e.equipmentModel.trim(),
      problem: e.problem.trim(),
      typeOfMaintenance: e.typeOfMaintenance.trim(),
      partOfMachine: e.partOfMachine.trim(),
      reason: e.reason.trim(),
      durationStart: e.durationStart.trim(),
      durationEnd: e.durationEnd.trim(),
      machineOperatorSign: e.machineOperatorSign.trim(),
      maintenancePersonSign: e.maintenancePersonSign.trim(),
      qcClearanceSign: e.qcClearanceSign.trim(),
    }))
    if (rows.length === 0) {
      toast.error("Couldn't create PDF — Add at least one entry (Date, Machine, Problem).")
      return
    }
    print(breakdownPrintJob(spec, rows, verifiedBy.trim()))
  }

  return (
    <div>
      <PageHeader
        title="Breakdown Record"
        subtitle={`Doc ${spec.docNo} · ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}
        back={MT.breakdownSheetList}
        actions={
          <Button variant="secondary" icon={Download} onClick={exportPdf} disabled={!canDownload} loading={printing}>
            Download PDF
          </Button>
        }
      />

      {prefilling ? (
        <LoadingBlock label="Loading breakdown…" />
      ) : (
        <div className="mx-auto max-w-3xl space-y-4">
          {prefillMissing && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
              Couldn&apos;t find that breakdown to pre-fill — fill the entry in by hand.
            </p>
          )}

          {entries.map((entry, i) => (
            <EntryCard
              key={entry.key}
              srNo={i + 1}
              entry={entry}
              canRemove={entries.length > 1}
              options={machineOptions}
              onChange={update}
              onRemove={() => remove(entry.key)}
            />
          ))}

          {machinesError && machineOptions.length === 0 && (
            <p className="text-xs text-red-600 dark:text-red-400">
              Couldn&apos;t load machine list — you can still type the name. ({machinesError})
            </p>
          )}

          <Button variant="secondary" icon={Plus} className="w-full" onClick={() => setEntries((l) => [...l, newEntry()])}>
            Add breakdown
          </Button>

          <Card className="space-y-2 p-4">
            <Field label="Verified By">
              <Input value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} />
            </Field>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Prepared By: FST · Approved By: FSTL</p>
          </Card>

          {!canSubmit && !submitting && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Each entry needs a Date, Machine Name and Problem.</p>
          )}
          <Button icon={Send} className="w-full py-3 text-base" onClick={submit} disabled={!canSubmit} loading={submitting}>
            {submitting ? 'Saving…' : 'Submit record'}
          </Button>
        </div>
      )}
      {portal}
    </div>
  )
}

function EntryCard({
  srNo,
  entry,
  canRemove,
  options,
  onChange,
  onRemove,
}: {
  srNo: number
  entry: BreakdownEntryState
  canRemove: boolean
  options: MachineOption[]
  onChange: (e: BreakdownEntryState) => void
  onRemove: () => void
}) {
  const set = (patch: Partial<BreakdownEntryState>) => onChange({ ...entry, ...patch })
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">#{srNo}</p>
        {canRemove && (
          <Button variant="ghost" size="sm" onClick={onRemove}>
            Remove
          </Button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Date (YYYY-MM-DD)" required>
          <Input type="date" value={entry.date} onChange={(e) => set({ date: e.target.value })} />
        </Field>
        <Field label="Location">
          <Input value={entry.location} onChange={(e) => set({ location: e.target.value })} />
        </Field>
        <MachineNameField
          value={entry.machineName}
          options={options}
          onType={(v) => set({ machineName: v })}
          // Choosing from the register fills the name AND its Sr./Model No.
          onSelect={(o) => set({ machineName: o.name, equipmentModel: o.srNo })}
        />
        <Field label="Equipment Model No./Sr. No. (auto)">
          <Input value={entry.equipmentModel} onChange={(e) => set({ equipmentModel: e.target.value })} />
        </Field>
        <Field label="Problem in Brief" required className="sm:col-span-2">
          <Textarea rows={2} value={entry.problem} onChange={(e) => set({ problem: e.target.value })} />
        </Field>
        <Field label="Type of Maintenance">
          <Input value={entry.typeOfMaintenance} onChange={(e) => set({ typeOfMaintenance: e.target.value })} />
        </Field>
        <Field label="Part of machine">
          <Input value={entry.partOfMachine} onChange={(e) => set({ partOfMachine: e.target.value })} />
        </Field>
        <Field label="Reason (if temporary)" className="sm:col-span-2">
          <Textarea rows={2} value={entry.reason} onChange={(e) => set({ reason: e.target.value })} />
        </Field>
        <Field label="Duration Start">
          <Input type="time" value={entry.durationStart} onChange={(e) => set({ durationStart: e.target.value })} />
        </Field>
        <Field label="Duration End">
          <Input type="time" value={entry.durationEnd} onChange={(e) => set({ durationEnd: e.target.value })} />
        </Field>
        <Field label="Machine operator sign">
          <Input value={entry.machineOperatorSign} onChange={(e) => set({ machineOperatorSign: e.target.value })} />
        </Field>
        <Field label="Maintenance person sign">
          <Input value={entry.maintenancePersonSign} onChange={(e) => set({ maintenancePersonSign: e.target.value })} />
        </Field>
        <Field label="QC clearance sign">
          <Input value={entry.qcClearanceSign} onChange={(e) => set({ qcClearanceSign: e.target.value })} />
        </Field>
      </div>
    </Card>
  )
}

/** Machine Name — search the asset register or type freely. */
function MachineNameField({
  value,
  options,
  onType,
  onSelect,
}: {
  value: string
  options: MachineOption[]
  onType: (v: string) => void
  onSelect: (o: MachineOption) => void
}) {
  const [open, setOpen] = useState(false)
  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase()
    const list = q ? options.filter((o) => o.name.toLowerCase().includes(q) && o.name !== value) : options
    return list.slice(0, 8)
  }, [value, options])

  return (
    <div className="relative">
      <span className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
        Machine Name<span className="text-red-600"> *</span>{' '}
        <span className="font-normal text-zinc-500">— search or type</span>
      </span>
      <div className="relative">
        <input
          value={value}
          onChange={(e) => {
            onType(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          // Delay so a click on an option lands before the list closes.
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className={`${inputCls} pr-9`}
          autoComplete="off"
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      </div>
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {filtered.map((o) => (
            <li key={o.name}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(o)
                  setOpen(false)
                }}
                className="block w-full px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <span className="block text-sm text-zinc-900 dark:text-zinc-100">{o.name}</span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">{o.srNo}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
