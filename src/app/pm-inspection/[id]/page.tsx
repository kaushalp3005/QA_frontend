'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import PageHeader from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Loader'
import { ArrowLeft, ClipboardCheck, Pencil, Printer, Trash2 } from 'lucide-react'
import {
  getPMInspection,
  deletePMInspection,
  type PMInspectionRecord,
} from '@/lib/api/pm-inspection'
import PMInspectionSheet, {
  PM_SHEET_STYLES,
} from '@/components/pm-inspection/PMInspectionSheet'
import { formatDateTime } from '@/lib/date-utils'

export default function PMInspectionViewPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [rec, setRec] = useState<PMInspectionRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getPMInspection(id)
        if (!cancelled) setRec(data)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load inspection')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  const handleEdit = () => {
    if (!rec) return
    router.push(`/pm-inspection/create?id=${rec.id}`)
  }

  const handlePrint = () => {
    if (!rec) return
    window.open(`/pm-inspection/${rec.id}/print`, '_blank', 'noopener')
  }

  const handleDelete = async () => {
    if (!rec) return
    const label = rec.sr_no || `#${rec.id}`
    const ok = window.confirm(`Delete inspection ${label}? This cannot be undone.`)
    if (!ok) return
    try {
      setDeleting(true)
      await deletePMInspection(rec.id)
      router.push('/pm-inspection')
    } catch (e: any) {
      alert(e?.message || 'Failed to delete inspection')
      setDeleting(false)
    }
  }

  return (
    <DashboardLayout>
      {/* Inject sheet styles into the page so the embedded record renders correctly */}
      <style>{PM_SHEET_STYLES}</style>

      <div className="max-w-[1100px] mx-auto">
        <PageHeader
          title="Inspection Details"
          subtitle={
            rec
              ? `${rec.sr_no ? `Sr. No. ${rec.sr_no}` : `#${rec.id}`} · ${rec.grn_number || ''} · ${rec.supplier_name || ''}`
              : 'PM Inspection Record'
          }
          icon={ClipboardCheck}
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/pm-inspection')}
                className="btn-outline"
                type="button"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back
              </button>
              {rec && (
                <>
                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                               bg-cream-50 text-ink-600 border border-cream-300 shadow-soft
                               hover:border-brand-500 hover:text-brand-500
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30
                               transition-all"
                    title="Print"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </button>
                  <button
                    onClick={handleEdit}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                               bg-brand-500 text-white shadow-soft
                               hover:shadow-brand hover:-translate-y-0.5
                               active:translate-y-0
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30
                               transition-all"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                               bg-red-50 text-red-600 border border-red-200 shadow-soft
                               hover:bg-red-500 hover:text-white hover:border-red-500
                               disabled:opacity-50 disabled:pointer-events-none
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30
                               transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                </>
              )}
            </div>
          }
        />

        {loading ? (
          <div className="surface-card p-12 text-center">
            <Spinner size={32} className="text-brand-500 mx-auto" />
            <p className="mt-3 text-sm text-ink-400 font-medium">Loading inspection…</p>
          </div>
        ) : error || !rec ? (
          <div className="surface-card p-10 text-center">
            <p className="text-sm text-red-600 font-medium">
              {error || 'Inspection not found.'}
            </p>
            <button
              onClick={() => router.push('/pm-inspection')}
              className="mt-4 btn-secondary"
            >
              Back to records
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            {/* Audit metadata strip */}
            <div className="surface-card p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <Meta label="Inspection ID" value={`#${rec.id}`} />
              <Meta label="Company" value={rec.company} />
              <Meta label="Created" value={formatDateTime(rec.created_at)} />
              <Meta label="Last Updated" value={formatDateTime(rec.updated_at)} />
            </div>

            {/* Printable sheet (read-only) */}
            <div className="py-2">
              <PMInspectionSheet rec={rec} />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
        {label}
      </p>
      <p className="text-sm font-semibold text-ink-600 mt-0.5 break-words">{value}</p>
    </div>
  )
}
