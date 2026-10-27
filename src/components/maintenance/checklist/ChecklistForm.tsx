'use client'

/**
 * Fill a preventive-maintenance checklist — presentation/checklist/
 * ChecklistScreen + ChecklistViewModel.
 *
 * Every checkpoint is OK (ticked), NOT_OK (a remark, no tick) or UNSET.
 * "Save draft" stores the partial sheet on the server (status DRAFT, UNSET
 * rows included) and keeps the record id; "Submit" needs every row filled,
 * every machine dated and the three sign-offs, so a SUBMITTED sheet never
 * carries an UNSET row.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, CheckCircle2, Save, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import {
  getChecklist,
  saveChecklist,
  type ChecklistFormType,
  type ChecklistStatus,
  type ChecklistSubmissionDto,
} from '@/lib/maintenance/api/checklist'
import { isoDateIst } from '@/lib/maintenance/format'
import { useMtSession } from '@/lib/maintenance/hooks'
import { MT } from '@/lib/maintenance/nav'
import { Button, Card, Chips, ErrorBanner, Field, Input, LoadingBlock, PageHeader, Textarea } from '@/components/maintenance/ui'
import {
  CHECKLIST_TYPES,
  DATE_REGEX,
  buildRows,
  equipmentDateError,
  equipmentKey,
  isRowFilled,
  needsEquipmentRange,
  parseFormType,
  rangeOk,
  rowKey,
  rowStatus,
  typeMeta,
  typesForPlant,
  type ChecklistRow,
  type ChecklistTypeMeta,
} from './logic'

type RowsByType = Record<ChecklistFormType, ChecklistRow[]>

/** Rows of one machine: indices [start, end) into the type's row list. */
interface EquipmentGroup {
  key: string
  section: string
  newSection: boolean
  srNo: number | null
  equipment: string
  start: number
  end: number
}

function groupRows(rows: ChecklistRow[]): EquipmentGroup[] {
  const out: EquipmentGroup[] = []
  rows.forEach((row, i) => {
    const prev = rows[i - 1]
    const newSection = !prev || prev.section !== row.section
    const newEquipment = newSection || prev.equipment !== row.equipment || prev.srNo !== row.srNo
    if (newEquipment) {
      out.push({ key: `${i}-${equipmentKey(row)}`, section: row.section, newSection, srNo: row.srNo, equipment: row.equipment, start: i, end: i + 1 })
    } else {
      out[out.length - 1].end = i + 1
    }
  })
  return out
}

const allRows = (): RowsByType =>
  Object.fromEntries(CHECKLIST_TYPES.map((t) => [t.id, buildRows(t.id)])) as RowsByType

export function ChecklistForm({ draftIdParam }: { draftIdParam: number | null }) {
  const router = useRouter()
  const session = useMtSession()

  // Per-type rows, so switching Monthly/Quarterly never loses entries.
  const [rowsByType, setRowsByType] = useState<RowsByType>(allRows)
  const [type, setType] = useState<ChecklistFormType>('MONTHLY')
  const [availableTypes, setAvailableTypes] = useState<ChecklistTypeMeta[]>([])
  const [doneBy, setDoneBy] = useState('')
  const [checkedBy, setCheckedBy] = useState('')
  const [verifiedBy, setVerifiedBy] = useState('')
  const [remarks, setRemarks] = useState('')
  const [draftId, setDraftId] = useState<number | null>(null)
  const draftIdRef = useRef<number | null>(null)
  const [loadingDraft, setLoadingDraft] = useState(draftIdParam !== null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // The technician's own plant picks the form set; an opened draft keeps its own type.
  const plantId = session?.plantId
  useEffect(() => {
    if (!session) return
    const types = typesForPlant(plantId)
    setAvailableTypes(types)
    if (draftIdParam === null && draftIdRef.current === null) setType(types[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, plantId])

  useEffect(() => {
    // Skips the reload after "Save draft" rewrites the URL to the id we already hold.
    if (draftIdParam === null || draftIdParam === draftIdRef.current) return
    let cancelled = false
    setLoadingDraft(true)
    setLoadError(null)
    getChecklist(draftIdParam)
      .then((d) => {
        if (cancelled) return
        draftIdRef.current = draftIdParam
        const t = parseFormType(d.formType) ?? 'MONTHLY'
        const saved = new Map(d.items.map((it) => [rowKey(it.section, it.srNo, it.equipment, it.checkpoint), it]))
        setRowsByType((prev) => ({
          ...prev,
          [t]: prev[t].map((row) => {
            const s = saved.get(rowKey(row.section, row.srNo, row.equipment, row.checkpoint))
            if (!s) return row
            return {
              ...row,
              checked: s.status.toUpperCase() === 'OK',
              remarks: s.remarks,
              equipmentDate: s.equipmentDate.trim() ? s.equipmentDate : row.equipmentDate,
              equipmentDateTo: s.equipmentDateTo.trim() ? s.equipmentDateTo : row.equipmentDateTo,
            }
          }),
        }))
        setType(t)
        setDraftId(draftIdParam)
        setDoneBy(d.doneBy)
        setCheckedBy(d.checkedBy)
        setVerifiedBy(d.verifiedBy)
        setRemarks(d.remarks)
      })
      .catch((e: any) => !cancelled && setLoadError(`Couldn't load draft — ${e?.message ?? 'Request failed'}`))
      .finally(() => !cancelled && setLoadingDraft(false))
    return () => {
      cancelled = true
    }
  }, [draftIdParam])

  const rows = rowsByType[type]
  const groups = useMemo(() => groupRows(rows), [rows.length, type]) // eslint-disable-line react-hooks/exhaustive-deps
  const showRange = needsEquipmentRange(type)

  // ── Derived state (ChecklistUiState) ──
  const totalRows = rows.length
  const filledRows = useMemo(() => rows.filter(isRowFilled).length, [rows])
  const allFilled = totalRows > 0 && filledRows === totalRows
  const totalEquipment = groups.length
  const datedEquipment = useMemo(
    () => groups.filter((g) => rangeOk(type, rows[g.start].equipmentDate, rows[g.start].equipmentDateTo)).length,
    [groups, rows, type],
  )
  const allEquipmentDated = totalEquipment > 0 && datedEquipment === totalEquipment
  const signOffComplete = !!doneBy.trim() && !!checkedBy.trim() && !!verifiedBy.trim()
  const anyEntered = filledRows > 0 || !!doneBy.trim() || !!checkedBy.trim() || !!verifiedBy.trim() || !!remarks.trim()
  const busy = submitting || loadingDraft
  const canSaveDraft = !busy && anyEntered
  const canSubmit = !busy && allFilled && allEquipmentDated && signOffComplete

  // ── Mutations (stable per type, so memoised rows skip re-rendering) ──
  const onRowChecked = useCallback(
    (index: number, checked: boolean) =>
      setRowsByType((prev) => {
        const next = prev[type].slice()
        next[index] = { ...next[index], checked }
        return { ...prev, [type]: next }
      }),
    [type],
  )
  const onRowRemarks = useCallback(
    (index: number, value: string) =>
      setRowsByType((prev) => {
        const next = prev[type].slice()
        next[index] = { ...next[index], remarks: value }
        return { ...prev, [type]: next }
      }),
    [type],
  )
  // Dates are per machine but stored on each of its rows, so a change fans out.
  const onEquipmentDate = useCallback(
    (start: number, end: number, field: 'equipmentDate' | 'equipmentDateTo', value: string) =>
      setRowsByType((prev) => {
        const next = prev[type].slice()
        for (let i = start; i < end; i++) next[i] = { ...next[i], [field]: value }
        return { ...prev, [type]: next }
      }),
    [type],
  )

  function buildSubmission(status: ChecklistStatus): ChecklistSubmissionDto {
    // Record date = earliest valid machine date on the sheet.
    const dates = rows.map((r) => r.equipmentDate).filter((d) => DATE_REGEX.test(d)).sort()
    const meta = typeMeta(type)
    return {
      form_type: meta.id,
      doc_no: meta.docNo,
      status,
      checklist_date: dates[0] ?? isoDateIst(),
      done_by: doneBy.trim(),
      checked_by: checkedBy.trim(),
      verified_by: verifiedBy.trim(),
      remarks: remarks.trim(),
      items: rows.map((r) => ({
        section: r.section,
        equipment: r.equipment,
        sr_no: r.srNo,
        from_date: r.equipmentDate,
        // A machine serviced within one day carries the same date at both ends.
        to_date: r.equipmentDateTo.trim() ? r.equipmentDateTo : r.equipmentDate,
        checkpoint: r.checkpoint,
        status: rowStatus(r),
        remarks: r.remarks.trim(),
      })),
    }
  }

  async function onSaveDraft() {
    if (!canSaveDraft) return
    setSubmitting(true)
    try {
      const id = await saveChecklist(buildSubmission('DRAFT'), draftId)
      setDraftId(id)
      draftIdRef.current = id
      // Keep the URL on the draft so a reload carries on with it.
      router.replace(MT.preventiveForm(id), { scroll: false })
      toast.success('Draft saved. You can keep filling and submit later.')
    } catch (e: any) {
      toast.error(`Submit failed — ${e?.message ?? 'Request failed'}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function onSubmit() {
    if (!canSubmit) return
    const body = buildSubmission('SUBMITTED')
    if (body.items.some((i) => i.status === 'UNSET')) return // guarded by canSubmit; never send UNSET
    setSubmitting(true)
    try {
      const id = await saveChecklist(body, draftId)
      toast.success(`Submitted (id #${id}). Thank you.`)
      router.push(MT.preventiveList)
    } catch (e: any) {
      toast.error(`Submit failed — ${e?.message ?? 'Request failed'}`)
      setSubmitting(false)
    }
  }

  const hint = (() => {
    const missing = totalRows - filledRows
    const undated = totalEquipment - datedEquipment
    if (undated > 0 && showRange) return `${undated} machine(s) still need a valid Date From and Date To.`
    if (undated > 0) return `${undated} equipment still need a valid date.`
    if (missing > 0) return `${missing} checkpoint(s) still need a tick or a remark.`
    if (!signOffComplete) return 'Fill Done By, Checked By and Verified By to submit.'
    return 'Complete all fields to submit.'
  })()

  const meta = typeMeta(type)
  const done = allFilled && allEquipmentDated

  return (
    <div className="pb-24">
      <PageHeader
        title="Checklist Form"
        subtitle={`Doc ${meta.docNo} · ${filledRows}/${totalRows} filled${draftId !== null ? ` · Draft #${draftId}` : ''}`}
        back={MT.preventiveList}
      />

      <ErrorBanner error={loadError} />

      {loadingDraft ? (
        <LoadingBlock label="Loading draft…" />
      ) : (
        <div className="space-y-4">
          {availableTypes.length >= 2 && (
            <Chips
              options={availableTypes.map((t) => ({ id: t.id, label: t.label }))}
              value={type}
              onChange={(t) => setType(t)}
            />
          )}

          <Card className="p-4">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {showRange
                ? 'Set a Date From and Date To on each machine below; tick or remark every checkpoint.'
                : 'Set a date on each equipment below; tick or remark every checkpoint.'}
            </p>
            <p
              className={clsx(
                'mt-1 text-sm font-medium',
                done ? 'text-factory-700 dark:text-factory-300' : 'text-zinc-600 dark:text-zinc-300',
              )}
            >
              {done && <CheckCircle2 className="mr-1 inline h-4 w-4 align-[-3px]" />}
              {filledRows} / {totalRows} checkpoints · {datedEquipment} / {totalEquipment} equipment dated
            </p>
          </Card>

          {groups.map((g) => {
            const first = rows[g.start]
            return (
              <div key={`${type}-${g.key}`}>
                {g.newSection && (
                  <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wider text-factory-700 dark:text-factory-300">
                    {g.section}
                  </h2>
                )}
                <Card className="overflow-hidden">
                  <EquipmentHeader
                    type={type}
                    title={g.srNo != null ? `${g.srNo}. ${g.equipment}` : g.equipment}
                    from={first.equipmentDate}
                    to={first.equipmentDateTo}
                    start={g.start}
                    end={g.end}
                    showRange={showRange}
                    onChange={onEquipmentDate}
                  />
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {rows.slice(g.start, g.end).map((row, k) => (
                      <CheckpointRow
                        key={k}
                        index={g.start + k}
                        row={row}
                        onChecked={onRowChecked}
                        onRemarks={onRowRemarks}
                      />
                    ))}
                  </div>
                </Card>
              </div>
            )
          })}

          <Card className="space-y-3 p-4">
            <Field label="Done By" required>
              <Input value={doneBy} onChange={(e) => setDoneBy(e.target.value)} />
            </Field>
            <Field label="Checked By" required>
              <Input value={checkedBy} onChange={(e) => setCheckedBy(e.target.value)} />
            </Field>
            <Field label="Verified By" required>
              <Input value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} />
            </Field>
            <Field label="Remarks (If Any)">
              <Textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </Field>
          </Card>

          <div className="space-y-2">
            <Button variant="secondary" icon={Save} className="w-full" onClick={onSaveDraft} disabled={!canSaveDraft}>
              {submitting ? 'Saving…' : 'Save draft'}
            </Button>
            {!canSubmit && !submitting && <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>}
            <Button
              variant="success"
              icon={Send}
              className="w-full py-3 text-base"
              onClick={onSubmit}
              disabled={!canSubmit}
              loading={submitting}
            >
              {submitting ? 'Submitting…' : 'Submit checklist'}
            </Button>
          </div>
        </div>
      )}

      <JumpButton />
    </div>
  )
}

// ── Pieces ───────────────────────────────────────────────────────────────

const EquipmentHeader = memo(function EquipmentHeader({
  type,
  title,
  from,
  to,
  start,
  end,
  showRange,
  onChange,
}: {
  type: ChecklistFormType
  title: string
  from: string
  to: string
  start: number
  end: number
  showRange: boolean
  onChange: (start: number, end: number, field: 'equipmentDate' | 'equipmentDateTo', value: string) => void
}) {
  const error = equipmentDateError(type, from, to)
  const errCls = error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
  return (
    <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/40">
      <p className="font-bold text-zinc-900 dark:text-zinc-50">{title}</p>
      {showRange ? (
        <>
          {/* One message under the pair: an inverted range is one problem, not two. */}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Field label="Date From" required>
              <Input
                type="date"
                value={from}
                className={errCls}
                onChange={(e) => onChange(start, end, 'equipmentDate', e.target.value)}
              />
            </Field>
            <Field label="Date To" required>
              <Input
                type="date"
                value={to}
                className={errCls}
                onChange={(e) => onChange(start, end, 'equipmentDateTo', e.target.value)}
              />
            </Field>
          </div>
          {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
        </>
      ) : (
        <Field label="Date (YYYY-MM-DD)" required error={error} className="mt-2 sm:max-w-xs">
          <Input
            type="date"
            value={from}
            className={errCls}
            onChange={(e) => onChange(start, end, 'equipmentDate', e.target.value)}
          />
        </Field>
      )}
    </div>
  )
})

const CheckpointRow = memo(function CheckpointRow({
  index,
  row,
  onChecked,
  onRemarks,
}: {
  index: number
  row: ChecklistRow
  onChecked: (index: number, checked: boolean) => void
  onRemarks: (index: number, value: string) => void
}) {
  const status = rowStatus(row)
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <input
        type="checkbox"
        checked={row.checked}
        onChange={(e) => onChecked(index, e.target.checked)}
        aria-label={row.checkpoint || row.equipment}
        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-zinc-300 text-factory-600 accent-factory-600 focus:ring-factory-500 dark:border-zinc-600"
      />
      <div className="min-w-0 flex-1 space-y-1.5">
        {row.checkpoint.trim() && (
          <p className="cursor-pointer text-sm text-zinc-900 dark:text-zinc-100" onClick={() => onChecked(index, !row.checked)}>
            {row.checkpoint}
          </p>
        )}
        <p
          className={clsx(
            'text-xs font-semibold',
            status === 'OK' && 'text-factory-700 dark:text-factory-300',
            status === 'NOT_OK' && 'text-red-600 dark:text-red-400',
            status === 'UNSET' && 'font-normal text-zinc-400 dark:text-zinc-500',
          )}
        >
          {status === 'OK' ? 'OK' : status === 'NOT_OK' ? 'NOT OK' : 'Tick if OK, or add a remark'}
        </p>
        <Textarea
          rows={1}
          value={row.remarks}
          placeholder="Remarks (if not OK)"
          onChange={(e) => onRemarks(index, e.target.value)}
          className="resize-y py-1.5"
        />
      </div>
    </div>
  )
})

/** A quarterly sheet runs past a thousand rows — one button jumps to the end and back. */
function JumpButton() {
  const [atBottom, setAtBottom] = useState(false)
  useEffect(() => {
    const onScroll = () =>
      setAtBottom(window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 80)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: atBottom ? 0 : document.documentElement.scrollHeight })}
      aria-label={atBottom ? 'Go to top' : 'Go to bottom'}
      className="fixed bottom-6 right-6 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full bg-factory-600 text-white shadow-lg hover:bg-factory-700"
    >
      {atBottom ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />}
    </button>
  )
}
