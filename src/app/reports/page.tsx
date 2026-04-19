'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/DashboardLayout'
import PageHeader from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Loader'
import { FileText, Calendar } from 'lucide-react'
import { cn } from '@/lib/styles'
import { canAccessReports, getDocumentationsReport, type ReportRecord } from '@/lib/api/reports'
import { DOC_NAV_ORDER } from '@/config/doc-nav-order'

type Range = 'today' | 'week' | 'month'

const RANGE_LABELS: Record<Range, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
}

// Map form_type → route slug + create-subpath (matches frontend folder names)
const ROUTE_INDEX: Record<string, { slug: string }> = Object.fromEntries(
  DOC_NAV_ORDER.map((e) => [e.slug, { slug: e.slug }])
)

function recordHref(form_type: string, record_id: number): string {
  // Normalise to the slug used in the documentations URL tree. If the form_type
  // matches a folder in DOC_NAV_ORDER, build the view URL directly; otherwise
  // fall back to the list page for that form type.
  const hit = ROUTE_INDEX[form_type]
  if (hit) return `/documentations/${hit.slug}/${record_id}`
  return `/documentations/${form_type}`
}

export default function ReportsPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [range, setRange] = useState<Range>('today')
  const [records, setRecords] = useState<ReportRecord[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const ok = canAccessReports()
    setAuthorized(ok)
    if (!ok) router.replace('/dashboard')
  }, [router])

  useEffect(() => {
    if (authorized !== true) return
    setLoading(true)
    setError(null)
    getDocumentationsReport(range)
      .then((res) => {
        setRecords(res.records)
        setCounts(res.counts_by_form)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load report'))
      .finally(() => setLoading(false))
  }, [authorized, range])

  if (authorized === null) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64"><Spinner /></div>
      </DashboardLayout>
    )
  }

  if (authorized === false) {
    return (
      <DashboardLayout>
        <div className="max-w-xl mx-auto text-center py-20">
          <h1 className="text-lg font-bold text-ink-600">Access restricted</h1>
          <p className="text-sm text-ink-400 mt-2">You don&apos;t have permission to view this page.</p>
        </div>
      </DashboardLayout>
    )
  }

  const nonZeroCounts = Object.entries(counts).filter(([, n]) => n > 0)

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Daily Reports"
          subtitle="Documentation entries created across all forms"
          icon={Calendar}
        />

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-cream-300">
          {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                'px-4 py-2 text-sm font-semibold rounded-t transition-colors',
                range === r
                  ? 'bg-brand-500 text-white border-b-2 border-brand-500'
                  : 'text-ink-500 hover:text-ink-600 hover:bg-cream-100'
              )}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>

        {/* Per-form count chips */}
        {!loading && nonZeroCounts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {nonZeroCounts
              .sort((a, b) => b[1] - a[1])
              .map(([form, n]) => (
                <span
                  key={form}
                  className="text-[11px] px-2.5 py-1 rounded-full font-semibold bg-brand-50 text-brand-600 border border-brand-200"
                >
                  {form}: {n}
                </span>
              ))}
          </div>
        )}

        {/* Feed */}
        <div className="surface-card overflow-hidden">
          <div className="px-5 py-3 border-b border-cream-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-ink-500" />
              <span className="text-sm font-semibold text-ink-600">
                {loading ? 'Loading…' : `${records.length} entries ${RANGE_LABELS[range].toLowerCase()}`}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32"><Spinner /></div>
          ) : error ? (
            <div className="p-6 text-sm text-red-600">{error}</div>
          ) : records.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-cream-200 flex items-center justify-center mb-3">
                <FileText className="h-5 w-5 text-ink-400" />
              </div>
              <p className="text-sm font-semibold text-ink-600">No entries in this range</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-cream-100">
                  <tr>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Form
                    </th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Record
                    </th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Created By
                    </th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">
                      Created At
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-300 bg-white">
                  {records.map((r) => (
                    <tr key={`${r.form_type}-${r.record_id}`} className="hover:bg-cream-100/50">
                      <td className="px-5 py-3 text-sm text-ink-600">
                        <div className="font-semibold">{r.label}</div>
                        <div className="text-[11px] text-ink-400">{r.form_type}</div>
                      </td>
                      <td className="px-5 py-3 text-sm">
                        <Link
                          href={recordHref(r.form_type, r.record_id)}
                          className="text-brand-500 hover:text-brand-600 font-semibold"
                        >
                          #{r.record_id}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-sm text-ink-500">
                        {r.created_by || '—'}
                      </td>
                      <td className="px-5 py-3 text-sm text-ink-500 whitespace-nowrap">
                        {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
