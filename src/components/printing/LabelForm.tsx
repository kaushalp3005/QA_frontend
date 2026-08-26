'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Camera, CopyPlus, FileClock, ImagePlus, Loader2, Plus, Save, Trash2, X } from 'lucide-react'
import { todayLocalISO } from '@/lib/date-utils'
import { cn } from '@/lib/styles'
import { getStoredWarehouse } from '@/components/ui/WarehouseSelector'
import RecreateSidebar, { type RecreateItem } from '@/components/printing/RecreateSidebar'
import {
  APPROVED_BY_OPTIONS,
  APPROVED_BY_OPTIONS_A185,
  APPROVED_BY_OTHER,
  approvedByOptions,
  printedByOptions,
  emptyParameters,
  normalizeParameters,
  printingLabelsApi,
  uploadLabelImage,
  deleteLabelImage,
  validateLabelImage,
  type EntryStatus,
  type ParameterRow,
  type PrintingLabelRecord,
} from '@/lib/api/printingLabels'

// Both plants' lists: a stored approver is "known" — and so reopens on the
// pick-list rather than as "Other" — whichever register it came from.
const KNOWN_APPROVERS: readonly string[] = [...APPROVED_BY_OPTIONS, ...APPROVED_BY_OPTIONS_A185]

/** One register entry being composed. The date lives on the parent: a batch of
 *  entries is written against a single date, the way one page of the paper book
 *  works. */
interface EntryBlock {
  key: number
  /** Set once the block exists in the database — after a partial submit, or
   *  always when editing. Subsequent saves UPDATE this id instead of creating
   *  another row, which is what stops "Submit Partially" twice from filing the
   *  same entry twice. */
  savedId: number | null
  parameters: ParameterRow[]
  labelUrl: string | null
  /** The photo belongs to another entry — this block was recreated from it and
   *  points at the same S3 object. Dropping or replacing the image here must
   *  therefore leave the file alone, or the entry it came from goes blank. */
  labelBorrowed: boolean
  /** Where this block was copied from, ready to display — `#128` for a filed
   *  entry, `Entry 2` for another block on this page. Null when it is original. */
  copiedFrom: string | null
  printedBy: string
  printedOn: string
  /** Select value — either a known approver, APPROVED_BY_OTHER, or ''. */
  approvedBy: string
  /** Free-text name, only meaningful while approvedBy === APPROVED_BY_OTHER. */
  approvedByOther: string
}

/** @param clone copy `record`'s content into a brand-new entry rather than
 *  reopening it — "Recreate". The id is dropped so saving files a new row, and
 *  the label photo is marked borrowed. */
function newBlock(key: number, record?: PrintingLabelRecord, clone = false): EntryBlock {
  // "Approved By" is a pick-list with an escape hatch. An existing entry whose
  // approver is not on the list (an older record, or a name typed before the
  // list existed) reopens as "Other" with the name intact rather than losing it.
  const stored = record?.approved_by ?? ''
  const known = Boolean(stored) && KNOWN_APPROVERS.includes(stored)
  return {
    key,
    savedId: clone ? null : record?.id ?? null,
    parameters: record ? normalizeParameters(record.parameters) : emptyParameters(),
    labelUrl: record?.actual_label_url ?? null,
    labelBorrowed: clone && Boolean(record?.actual_label_url),
    copiedFrom: clone && record ? `#${record.id}` : null,
    printedBy: record?.printed_by ?? '',
    printedOn: record?.printed_on ?? '',
    approvedBy: stored ? (known ? stored : APPROVED_BY_OTHER) : '',
    approvedByOther: stored && !known ? stored : '',
  }
}

function resolveApprover(b: EntryBlock): string {
  return b.approvedBy === APPROVED_BY_OTHER ? b.approvedByOther.trim() : b.approvedBy.trim()
}

/** Copy a block into a new, unsaved one. The label photo is not re-uploaded —
 *  both blocks point at the same object, which is why the copy is marked
 *  borrowed and every delete path checks before removing the file. */
function cloneBlock(key: number, source: EntryBlock, from: string): EntryBlock {
  return {
    ...source,
    key,
    savedId: null,
    parameters: source.parameters.map((r) => ({ ...r })),
    labelBorrowed: Boolean(source.labelUrl),
    copiedFrom: from,
  }
}

function blockDetail(b: EntryBlock, parameter: string): string {
  return (b.parameters.find((r) => r.parameter === parameter)?.details ?? '').trim()
}

/** Bring a block into view after it is added — a copy appended below the fold
 *  reads as "nothing happened". */
function scrollToBlock(key: number) {
  setTimeout(() => {
    document
      .getElementById(`entry-block-${key}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, 60)
}

interface LabelFormProps {
  /** Existing record when editing; omitted when creating. */
  record?: PrintingLabelRecord
}

/** Create/edit form for the Batch Coding Register. Several entries can be filled
 *  against one date in a single pass, on either page: on the edit page the
 *  opened record is updated in place and any block added beside it becomes a new
 *  record. Each block mirrors the paper form. */
export default function LabelForm({ record }: LabelFormProps) {
  const router = useRouter()
  const isEdit = Boolean(record)

  const [entryDate, setEntryDate] = useState(record?.entry_date ?? '')
  const [blocks, setBlocks] = useState<EntryBlock[]>(() => [newBlock(0, record)])
  // Monotonic source of React keys. Using the array index would remount every
  // block after a removed one and lose their in-flight state.
  const nextKey = useRef(1)
  const [busyBlocks, setBusyBlocks] = useState<Set<number>>(new Set())

  const [savingMode, setSavingMode] = useState<null | 'draft' | 'final'>(null)
  const [partialSavedAt, setPartialSavedAt] = useState<number | null>(null)
  const [error, setError] = useState('')

  /** Ids written by the last submit — drives the "filed" banner. */
  const [filedIds, setFiledIds] = useState<number[]>([])

  // Default a new entry to today. Set after mount rather than in the useState
  // initializer: this component is prerendered on the server, and computing the
  // date there would use the server's timezone and mismatch on hydration.
  useEffect(() => {
    if (!record) setEntryDate((current) => current || todayLocalISO())
  }, [record])

  // Which plant new entries will be stamped with. Read after mount (localStorage
  // is not available during SSR) and kept in step with the header's switcher.
  const [warehouse, setWarehouse] = useState('')
  useEffect(() => {
    setWarehouse(getStoredWarehouse())
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.warehouse) setWarehouse(detail.warehouse)
    }
    window.addEventListener('warehouseChanged', handler)
    return () => window.removeEventListener('warehouseChanged', handler)
  }, [])

  function updateBlock(key: number, patch: Partial<EntryBlock>) {
    setBlocks((bs) => bs.map((b) => (b.key === key ? { ...b, ...patch } : b)))
  }

  function addBlock() {
    setBlocks((bs) => [...bs, newBlock(nextKey.current++)])
  }

  function removeBlock(key: number) {
    setBlocks((bs) => {
      const gone = bs.find((b) => b.key === key)
      const rest = bs.filter((b) => b.key !== key)
      // Drop the block's uploaded image too, or it is orphaned in S3 forever.
      // Not when it is borrowed (a filed entry owns it) and not while a copy
      // still points at the same object.
      const shared = Boolean(gone?.labelUrl) && rest.some((b) => b.labelUrl === gone!.labelUrl)
      if (gone?.labelUrl && !gone.labelBorrowed && !shared) {
        deleteLabelImage(gone.labelUrl).catch(() => {})
      }
      return rest
    })
  }

  /** The sidebar's "Recreate" — copy one of the entries already in the form
   *  into a new one at the bottom. Same photo and details; edit what differs. */
  function recreateBlock(key: number) {
    const index = blocks.findIndex((b) => b.key === key)
    const source = blocks[index]
    if (!source) return
    const newKey = nextKey.current++
    setBlocks((bs) => [...bs, cloneBlock(newKey, source, labelOfBlock(source, index))])
    setError('')
    scrollToBlock(newKey)
  }

  function setBlockBusy(key: number, busy: boolean) {
    setBusyBlocks((s) => {
      const next = new Set(s)
      if (busy) next.add(key)
      else next.delete(key)
      return next
    })
  }

  function payloadFor(b: EntryBlock, status: EntryStatus) {
    return {
      entry_date: entryDate,
      parameters: b.parameters,
      actual_label_url: b.labelUrl,
      printed_by: b.printedBy || null,
      printed_on: b.printedOn || null,
      approved_by: resolveApprover(b) || null,
      status,
    }
  }

  /** Persist every block. Blocks already in the database are updated, the rest
   *  created — so partial-submitting twice edits the same rows instead of
   *  filing duplicates. Returns the ids, or null if it stopped on an error. */
  async function persistAll(status: EntryStatus): Promise<number[] | null> {
    const ids: number[] = []
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i]
      try {
        if (b.savedId) {
          await printingLabelsApi.update(b.savedId, payloadFor(b, status))
          ids.push(b.savedId)
        } else {
          const res = await printingLabelsApi.create(payloadFor(b, status))
          ids.push(res.data.id)
          // Remember it immediately: if a later block fails, this one must not
          // be created a second time on the next attempt.
          const key = b.key
          const newId = res.data.id
          setBlocks((bs) => bs.map((x) => (x.key === key ? { ...x, savedId: newId } : x)))
        }
      } catch (err: any) {
        setError(
          ids.length
            ? `Saved ${ids.length} of ${blocks.length} entries — the rest were not saved: ${
                err.message || 'unknown error'
              }`
            : err.message || 'Failed to save entry',
        )
        return null
      }
    }
    return ids
  }

  function validate(): boolean {
    if (!entryDate) {
      setError('Date is required')
      return false
    }
    const missing = blocks.findIndex(
      (b) => b.approvedBy === APPROVED_BY_OTHER && !b.approvedByOther.trim(),
    )
    if (missing !== -1) {
      setError(
        blocks.length > 1
          ? `Entry ${missing + 1}: enter the approver’s name, or pick one from the list`
          : 'Enter the approver’s name, or pick one from the list',
      )
      return false
    }
    return true
  }

  /** "Submit Partially" — writes progress and stays put so filling can continue. */
  async function handlePartial() {
    // Only the date is enforced; a draft is allowed to be incomplete, that is
    // the entire point of it.
    if (!entryDate) {
      setError('Date is required')
      return
    }
    setSavingMode('draft')
    setError('')
    const ids = await persistAll('draft')
    setSavingMode(null)
    if (ids) setPartialSavedAt(Date.now())
  }

  /** The rows just written, as records — synthesised from what was submitted so
   *  the sidebar and the reloaded form need no extra round-trip. */
  function snapshotFiled(ids: number[]): PrintingLabelRecord[] {
    return blocks.map((b, i) => ({
      id: ids[i],
      entry_date: entryDate,
      parameters: b.parameters,
      actual_label_url: b.labelUrl,
      printed_by: b.printedBy || null,
      printed_on: b.printedOn || null,
      approved_by: resolveApprover(b) || null,
      status: 'submitted' as EntryStatus,
      warehouse: warehouse || null,
      created_by: null,
      created_at: new Date().toISOString(),
    }))
  }

  /** Drop the copies and begin a fresh entry. */
  function startBlank() {
    // Deliberately not removeBlock(): these blocks point at photos that now
    // belong to filed entries, and clearing them would take those with it.
    setBlocks([newBlock(nextKey.current++)])
    setFiledIds([])
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSavingMode('final')
    setError('')
    const ids = await persistAll('submitted')
    if (!ids) {
      setSavingMode(null)
      return
    }

    if (isEdit) {
      router.push(ids.length === 1 ? `/printing-label/${ids[0]}` : '/printing-label')
      return
    }

    // Creating: stay on the form. What was just filed reloads as fresh copies —
    // same photo, same details, no id — so the next near-identical entry is one
    // edit away instead of a full re-fill.
    const filed = snapshotFiled(ids)
    setFiledIds(ids)
    setPartialSavedAt(null)
    setBlocks(filed.map((r) => newBlock(nextKey.current++, r, true)))
    setSavingMode(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const anyUploading = busyBlocks.size > 0
  const saving = savingMode !== null
  const draftIds = blocks.map((b) => b.savedId).filter(Boolean) as number[]
  // Blocks that will become new rows — everything except the record being edited.
  const newCount = blocks.filter((b) => b.savedId !== record?.id).length

  /** Label for a block. On the edit page the opened record is called out by id
   *  so it is obvious which one is being changed rather than added. */
  function headingFor(block: EntryBlock, index: number): string {
    if (isEdit && block.savedId === record?.id) return `Editing entry #${record?.id}`
    if (block.copiedFrom) return `Entry ${index + 1} · copied from ${block.copiedFrom}`
    return `Entry ${index + 1}`
  }

  /** How a block is referred to elsewhere — by row id once it exists in the
   *  database, by position until then. */
  function labelOfBlock(block: EntryBlock, index: number): string {
    return block.savedId ? `#${block.savedId}` : `Entry ${index + 1}`
  }

  /** The sidebar's view of the form: one row per entry, live as it is typed. */
  const recreateItems: RecreateItem[] = blocks.map((b, i) => {
    const product = blockDetail(b, 'Product Name')
    const customer = blockDetail(b, 'Customer Name')
    const batch = blockDetail(b, 'Batch No')
    return {
      key: b.key,
      label:
        isEdit && b.savedId === record?.id ? `Editing #${b.savedId}` : `Entry ${i + 1}`,
      title: product || customer || (b.savedId ? `Entry #${b.savedId}` : 'Not filled in yet'),
      subtitle: [batch && `Batch ${batch}`, b.copiedFrom && `from ${b.copiedFrom}`]
        .filter(Boolean)
        .join(' · '),
      imageUrl: b.labelUrl,
    }
  })

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      <form onSubmit={handleSubmit} className="min-w-0 flex-1 space-y-5 lg:max-w-4xl">
      {error && (
        <div className="rounded-xl border border-danger-200 bg-danger-50 p-3 text-sm font-medium text-danger-700">
          {error}
        </div>
      )}

      {filedIds.length > 0 && (
        <div className="rounded-xl border border-success-200 bg-success-50 p-3 text-sm font-medium text-success-800">
          Filed{' '}
          <span className="font-bold">{filedIds.map((id) => `#${id}`).join(', ')}</span>. The
          entr{filedIds.length > 1 ? 'ies' : 'y'} below {filedIds.length > 1 ? 'are' : 'is'} a
          fresh copy — change what differs and submit again to file another, or{' '}
          <button type="button" onClick={startBlank} className="font-bold underline">
            start blank
          </button>
          .{' '}
          <Link href={`/printing-label/${filedIds[0]}`} className="font-bold underline">
            View {filedIds.length > 1 ? 'the first' : 'it'}
          </Link>
        </div>
      )}

      {/* Date — shared by every block in this batch */}
      <div className="surface-card p-5">
        <label htmlFor="entry_date" className="label-base">
          Date
        </label>
        <input
          id="entry_date"
          type="date"
          value={entryDate}
          onChange={(e) => setEntryDate(e.target.value)}
          className="input-base max-w-xs"
          required
        />
        <p className="mt-1.5 text-[11px] font-medium text-ink-300">
          {isEdit ? (
            <>
              Date fields can only be changed by a QA administrator — an edit saved by anyone
              else leaves them untouched.
              {record?.warehouse ? ` This entry belongs to ${record.warehouse}.` : ''}
            </>
          ) : (
            <>
              Every entry below is recorded against this date
              {warehouse ? (
                <>
                  {' at '}
                  <span className="font-bold text-ink-500">{warehouse}</span>
                </>
              ) : null}
              .{' '}
              {draftIds.length > 0
                ? 'The plant was fixed when these entries were first saved — switching it now will not move them.'
                : 'Switch plant in the header before saving if that is wrong.'}
            </>
          )}
        </p>
      </div>

      {blocks.map((block, i) => (
        <EntryBlockFields
          key={block.key}
          block={block}
          heading={headingFor(block, i)}
          // A lone block on the edit page needs no heading — there is nothing to
          // tell it apart from. Adding a second one makes labels necessary.
          showHeading={!isEdit || blocks.length > 1}
          // The record being edited cannot be removed here: this form edits it,
          // it does not delete it. Blocks added alongside can go.
          canRemove={blocks.length > 1 && block.savedId !== record?.id}
          // Another block on this page points at the same photo — clearing or
          // replacing it here must not delete the file out from under it.
          labelShared={
            Boolean(block.labelUrl) &&
            blocks.some((b) => b.key !== block.key && b.labelUrl === block.labelUrl)
          }
          // Sign-off pick-lists differ per plant. An entry being edited keeps
          // its own plant's list even if the header has since been switched.
          warehouse={record?.warehouse || warehouse}
          onChange={(patch) => updateBlock(block.key, patch)}
          onRemove={() => removeBlock(block.key)}
          onBusyChange={(busy) => setBlockBusy(block.key, busy)}
        />
      ))}

      <button type="button" onClick={addBlock} className="btn-base btn-outline">
        <Plus className="h-4 w-4" />
        Add another entry
      </button>
      {isEdit && blocks.length > 1 && (
        <p className="text-[11px] font-medium text-ink-300">
          Added entries are saved as new records against the same date — the entry you opened
          is updated in place.
        </p>
      )}

      {partialSavedAt !== null && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm font-medium text-blue-800">
          Draft{draftIds.length > 1 ? 's' : ''}{' '}
          <span className="font-bold">
            {draftIds.map((id) => `#${id}`).join(', ')}
          </span>{' '}
          saved. Keep filling and use <strong>Submit Partially</strong> again, or{' '}
          <strong>{isEdit ? 'Save changes' : 'Submit'}</strong> to file{' '}
          {draftIds.length > 1 ? 'them' : 'it'}. Drafts stay out of the printed register.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving || anyUploading} className="btn-base btn-primary">
          {savingMode === 'final' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {savingMode === 'final'
            ? 'Submitting…'
            : isEdit
              ? newCount > 0
                ? `Save changes + ${newCount} new`
                : 'Save changes'
              : `Submit ${blocks.length > 1 ? `${blocks.length} entries` : 'entry'}`}
        </button>
        <button
          type="button"
          onClick={handlePartial}
          disabled={saving || anyUploading}
          className="btn-base btn-outline"
        >
          {savingMode === 'draft' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileClock className="h-4 w-4" />
          )}
          {savingMode === 'draft' ? 'Saving…' : 'Submit Partially'}
        </button>
        <Link
          href={isEdit && record ? `/printing-label/${record.id}` : '/printing-label'}
          className="btn-base btn-ghost"
        >
          {filedIds.length > 0 ? 'Done' : 'Cancel'}
        </Link>
      </div>
      </form>

      {/* Available on both pages. On the edit page a copy is appended beside the
          opened entry and saved as a new row — the same thing "Add another
          entry" already does there, just pre-filled. */}
      <RecreateSidebar
        items={recreateItems}
        onRecreate={recreateBlock}
        onJump={scrollToBlock}
      />
    </div>
  )
}

// ── One entry block ──────────────────────────────────────────────────────────

interface EntryBlockFieldsProps {
  block: EntryBlock
  /** Rendered label — the parent decides, so the edit page can name the record
   *  it opened rather than just numbering it. */
  heading: string
  showHeading: boolean
  canRemove: boolean
  /** A copy of this block on the same page shares its label photo. */
  labelShared: boolean
  /** Plant this entry belongs to — decides the sign-off pick-lists. */
  warehouse: string
  onChange: (patch: Partial<EntryBlock>) => void
  onRemove: () => void
  onBusyChange: (busy: boolean) => void
}

function EntryBlockFields({
  block,
  heading,
  showHeading,
  canRemove,
  labelShared,
  warehouse,
  onChange,
  onRemove,
  onBusyChange,
}: EntryBlockFieldsProps) {
  // Two inputs rather than one: the `capture` attribute is what makes a phone
  // open the camera straight away, and it cannot be toggled per click — the
  // browser reads it when the picker opens. Desktop ignores `capture` and shows
  // the normal file dialog, so both buttons stay useful there.
  const galleryInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const { parameters, labelUrl } = block
  const checkedCount = parameters.filter((r) => r.checked).length
  const allChecked = checkedCount === parameters.length
  // Unique per block so several blocks on one page do not share input ids.
  const uid = `b${block.key}`

  const approvers = approvedByOptions(warehouse)
  const printers = printedByOptions(warehouse)

  function setDetail(i: number, details: string) {
    onChange({ parameters: parameters.map((r, n) => (n === i ? { ...r, details } : r)) })
  }

  function toggleParam(i: number) {
    // `details` is kept on untick so re-ticking restores what was typed.
    onChange({
      parameters: parameters.map((r, n) => (n === i ? { ...r, checked: !r.checked } : r)),
    })
  }

  function toggleAll() {
    const next = !allChecked
    onChange({ parameters: parameters.map((r) => ({ ...r, checked: next })) })
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Reset the input that fired, so re-picking the same file still triggers
    // onChange (and so a camera retake of the same shot is not swallowed).
    e.target.value = ''
    if (!file) return

    const invalid = validateLabelImage(file)
    if (invalid) {
      setUploadError(invalid)
      return
    }

    setUploadError('')
    setUploading(true)
    onBusyChange(true)
    const previous = labelUrl
    const previousKept = block.labelBorrowed || labelShared
    try {
      const url = await uploadLabelImage(file)
      onChange({ labelUrl: url, labelBorrowed: false })
      // Replacing an image leaves the old object orphaned in S3 otherwise — but
      // a borrowed or shared one belongs to another entry and is not ours.
      if (previous && !previousKept) deleteLabelImage(previous).catch(() => {})
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload label sample')
    } finally {
      setUploading(false)
      onBusyChange(false)
    }
  }

  function removeImage() {
    const url = labelUrl
    const keep = block.labelBorrowed || labelShared
    onChange({ labelUrl: null, labelBorrowed: false })
    // Best-effort: an orphaned object is less harmful than blocking the edit.
    // A borrowed or shared photo is left alone — the entry it was copied from,
    // or the copy beside it, still needs the file.
    if (url && !keep) deleteLabelImage(url).catch(() => {})
  }

  return (
    <div
      id={`entry-block-${block.key}`}
      className={cn(
        'scroll-mt-6 space-y-5',
        showHeading && 'rounded-2xl border border-cream-300 bg-cream-100/50 p-3 sm:p-4',
      )}
    >
      {showHeading && (
        <div className="flex items-center justify-between gap-3 px-1">
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink-500">
            {heading}
          </h2>
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold text-danger-600 transition-colors hover:bg-danger-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          )}
        </div>
      )}

      {uploadError && (
        <div className="rounded-xl border border-danger-200 bg-danger-50 p-3 text-sm font-medium text-danger-700">
          {uploadError}
        </div>
      )}

      {/* Actual label sample */}
      <div className="surface-card p-5">
        <p className="label-base">Actual Label Sample</p>

        {labelUrl && block.labelBorrowed && (
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-cream-100 px-2 py-1 text-[11px] font-semibold text-ink-400">
            <CopyPlus className="h-3.5 w-3.5" />
            Same photo as {block.copiedFrom ?? 'the entry this was copied from'} — retake it if
            this label differs.
          </p>
        )}

        {labelUrl && (
          <div className="relative mb-3 inline-block">
            {/* Plain <img>: the S3 host is not in next.config images.domains. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={labelUrl}
              alt="Label sample"
              className="max-h-72 rounded-xl border border-cream-300 shadow-soft"
            />
            <button
              type="button"
              onClick={removeImage}
              className="absolute -right-2 -top-2 rounded-full bg-white p-1.5 text-danger-600 shadow-card ring-1 ring-cream-300 hover:bg-danger-50"
              aria-label="Remove label sample"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {uploading ? (
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading…
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => cameraInput.current?.click()}
              className="btn-base btn-outline"
            >
              <Camera className="h-4 w-4" />
              {labelUrl ? 'Retake photo' : 'Take photo'}
            </button>
            <button
              type="button"
              onClick={() => galleryInput.current?.click()}
              className="btn-base btn-outline"
            >
              <ImagePlus className="h-4 w-4" />
              {labelUrl ? 'Choose another' : 'Choose from gallery'}
            </button>
          </div>
        )}

        {/* Gallery picker. */}
        <input
          ref={galleryInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFile}
          className="hidden"
        />
        {/* Camera. `capture="environment"` asks for the rear lens; phones open
            the camera app directly, desktops fall back to the file dialog.
            accept stays broad so the camera app is actually offered — the type
            is still validated before upload. */}
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          className="hidden"
        />
        <p className="mt-2 text-[11px] font-medium text-ink-300">JPG, PNG or WebP · max 10MB</p>
      </div>

      {/* Parameter / Details block */}
      <div className="surface-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-cream-300 px-5 py-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-ink-500">
            Parameter &amp; Details Verified
            <span className="ml-2 rounded-full bg-cream-200 px-2 py-0.5 text-[11px] font-bold text-ink-500">
              {checkedCount}/{parameters.length}
            </span>
          </h3>
          <button
            type="button"
            onClick={toggleAll}
            className="shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold text-brand-500 transition-colors hover:bg-brand-50 hover:text-brand-600"
          >
            {allChecked ? 'Deselect all' : 'Select all'}
          </button>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {parameters.map((row, i) => (
            <label
              key={row.parameter}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition-all duration-150',
                row.checked
                  ? 'border-brand-500 bg-brand-50 shadow-soft'
                  : 'border-cream-300 bg-white hover:border-brand-200',
              )}
            >
              <input
                type="checkbox"
                checked={row.checked}
                onChange={() => toggleParam(i)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded accent-brand-500"
              />
              <div className="min-w-0 flex-1">
                <span className="text-sm font-semibold leading-snug text-ink-600">
                  {row.parameter}
                </span>
                {row.checked && (
                  <input
                    type="text"
                    value={row.details}
                    onChange={(e) => setDetail(i, e.target.value)}
                    placeholder="Details"
                    aria-label={row.parameter}
                    // Stops the wrapping <label> from re-toggling the checkbox
                    // when the operator clicks into the field.
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1.5 w-full rounded-md border border-cream-300 bg-white px-2.5 py-1.5 text-xs text-ink-600 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                )}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Sign-off */}
      <div className="surface-card grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-printed_by`} className="label-base">
            Printed By
          </label>
          {printers.length > 0 ? (
            <select
              id={`${uid}-printed_by`}
              value={block.printedBy}
              onChange={(e) => onChange({ printedBy: e.target.value })}
              className="input-base"
            >
              <option value="">Select name</option>
              {printers.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              {/* A name saved before this list existed stays selectable rather
                  than silently blanking when the entry is reopened. */}
              {block.printedBy && !printers.includes(block.printedBy) && (
                <option value={block.printedBy}>{block.printedBy}</option>
              )}
            </select>
          ) : (
            <input
              id={`${uid}-printed_by`}
              type="text"
              value={block.printedBy}
              onChange={(e) => onChange({ printedBy: e.target.value })}
              className="input-base"
              placeholder="Name"
            />
          )}
        </div>
        <div>
          <label htmlFor={`${uid}-printed_on`} className="label-base">
            Printed On
          </label>
          <input
            id={`${uid}-printed_on`}
            type="date"
            value={block.printedOn}
            onChange={(e) => onChange({ printedOn: e.target.value })}
            className="input-base"
          />
        </div>
        <div>
          <label htmlFor={`${uid}-approved_by`} className="label-base">
            Approved By
          </label>
          <select
            id={`${uid}-approved_by`}
            value={block.approvedBy}
            onChange={(e) => onChange({ approvedBy: e.target.value })}
            className="input-base"
          >
            <option value="">Select approver</option>
            {approvers.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            {/* An approver from the other plant's list (or an older entry) is
                kept selectable so reopening never drops the recorded name. */}
            {block.approvedBy &&
              block.approvedBy !== APPROVED_BY_OTHER &&
              !approvers.includes(block.approvedBy) && (
                <option value={block.approvedBy}>{block.approvedBy}</option>
              )}
            <option value={APPROVED_BY_OTHER}>{APPROVED_BY_OTHER}</option>
          </select>
          {block.approvedBy === APPROVED_BY_OTHER && (
            <input
              type="text"
              value={block.approvedByOther}
              onChange={(e) => onChange({ approvedByOther: e.target.value })}
              className="input-base mt-2"
              placeholder="Approver’s name"
              aria-label="Other approver name"
              autoFocus
            />
          )}
        </div>
      </div>
    </div>
  )
}

/** Delete control, shared by the view page. Kept here so the register's
 *  destructive action lives beside the form that creates it. */
export function DeleteEntryButton({ id }: { id: number }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function handleDelete() {
    if (!confirm('Delete this register entry? This cannot be undone.')) return
    setBusy(true)
    try {
      await printingLabelsApi.remove(id)
      router.push('/printing-label')
    } catch (err: any) {
      alert(err.message || 'Failed to delete entry')
      setBusy(false)
    }
  }

  return (
    <button onClick={handleDelete} disabled={busy} className="btn-base btn-outline action-btn-red">
      <Trash2 className="h-4 w-4" />
      Delete
    </button>
  )
}
