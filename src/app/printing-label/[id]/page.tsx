'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight, Pencil, Printer } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ModuleGuard from '@/components/ModuleGuard'
import PageHeader from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Loader'
import { DeleteEntryButton } from '@/components/printing/LabelForm'
import { formatDateShort } from '@/lib/date-utils'
import {
  checkedParameters,
  DOC_META,
  isDraft,
  normalizeParameters,
  printingLabelsApi,
  type PrintingLabelRecord,
} from '@/lib/api/printingLabels'
import { isDocAdminFor } from '@/lib/api/documentations'

export default function ViewEntryPage() {
  return (
    <ModuleGuard module="section_1">
      <DashboardLayout>
        <EntryDetail />
      </DashboardLayout>
    </ModuleGuard>
  )
}

function EntryDetail() {
  const params = useParams()
  const id = Number(params?.id)

  const [record, setRecord] = useState<PrintingLabelRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!Number.isFinite(id)) {
      setError('Invalid entry id')
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    printingLabelsApi
      .get(id)
      .then((res) => {
        if (!cancelled) setRecord(res.data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load entry')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size={28} />
      </div>
    )
  }

  if (error || !record) {
    return (
      <div className="mx-auto max-w-md">
        <div className="surface-card p-8 text-center">
          <p className="text-sm font-medium text-danger-700">{error || 'Entry not found'}</p>
          <Link href="/printing-label" className="btn-base btn-primary mt-5">
            Back to register
          </Link>
        </div>
      </div>
    )
  }

  // Only ticked parameters count as recorded — see checkedParameters().
  const rows = checkedParameters(record)
  const totalParameters = normalizeParameters(record.parameters).length
  // Delete is admin-only server-side; hide the control when it would 403.
  const canDelete = isDocAdminFor(record.warehouse)

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/printing-label"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-400 hover:text-brand-500"
      >
        <ArrowLeft className="h-4 w-4" />
        Batch Coding Register
      </Link>

      <PageHeader
        title={formatDateShort(record.entry_date)}
        subtitle={`${DOC_META.docNo} · Issue No ${DOC_META.issueNo}`}
        icon={Printer}
        badge={
          isDraft(record) ? (
            <span className="status-draft rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide">
              Draft
            </span>
          ) : null
        }
        actions={
          <>
            <Link href={`/printing-label/${record.id}/print`} className="btn-base btn-outline">
              <Printer className="h-4 w-4" />
              Print
            </Link>
            <Link href={`/printing-label/${record.id}/edit`} className="btn-base btn-outline">
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
            {canDelete && <DeleteEntryButton id={record.id} />}
          </>
        }
      />

      <div className="space-y-5">
        {/* Parameters */}
        <div className="surface-card overflow-hidden">
          <div className="border-b border-cream-300 px-5 py-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-500">
              Parameter &amp; Details
              <span className="ml-2 rounded-full bg-cream-200 px-2 py-0.5 text-[11px] font-bold text-ink-500">
                {rows.length}/{totalParameters}
              </span>
            </h2>
          </div>
          {rows.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm font-medium text-ink-300">
              No parameters were recorded for this entry.
            </p>
          ) : (
            <div className="table-wrap">
              <table className="w-full">
                <tbody className="divide-y divide-cream-300">
                  {rows.map((row) => (
                    <tr key={row.parameter}>
                      <th
                        scope="row"
                        className="w-[45%] px-5 py-2.5 text-left text-sm font-semibold text-ink-500"
                      >
                        {row.parameter}
                      </th>
                      <td className="px-5 py-2.5 text-sm text-ink-600">{row.details || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Label sample */}
        <div className="surface-card p-5">
          <p className="label-base">Actual Label Sample</p>
          {record.actual_label_url ? (
            <a href={record.actual_label_url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={record.actual_label_url}
                alt="Label sample"
                className="max-h-96 rounded-xl border border-cream-300 shadow-soft"
              />
            </a>
          ) : (
            <p className="text-sm font-medium text-ink-300">No label sample attached.</p>
          )}
        </div>

        {/* Sign-off */}
        <div className="surface-card grid gap-5 p-5 sm:grid-cols-2">
          <div>
            <p className="label-base">Printed By</p>
            <p className="text-sm font-semibold text-ink-600">{record.printed_by || '—'}</p>
            {record.printed_on && (
              <p className="text-xs font-medium text-ink-400">
                {formatDateShort(record.printed_on)}
              </p>
            )}
          </div>
          <div>
            <p className="label-base">Approved By</p>
            <p className="text-sm font-semibold text-ink-600">{record.approved_by || '—'}</p>
          </div>
        </div>

        <p className="text-[11px] font-medium text-ink-300">
          Recorded by {record.created_by || 'unknown'}
          {record.warehouse ? ` · ${record.warehouse}` : ''}
        </p>

        {/* Prev / next through the register */}
        <div className="flex items-center justify-between">
          {record._prev_id ? (
            <Link href={`/printing-label/${record._prev_id}`} className="btn-base btn-ghost">
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Link>
          ) : (
            <span />
          )}
          {record._next_id ? (
            <Link href={`/printing-label/${record._next_id}`} className="btn-base btn-ghost">
              Next
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span />
          )}
        </div>
      </div>
    </div>
  )
}
