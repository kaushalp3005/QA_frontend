'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PhoneCall } from 'lucide-react'
import { toast } from 'react-hot-toast'

import DashboardLayout from '@/components/layout/DashboardLayout'
import PageHeader from '@/components/ui/PageHeader'
import CallFilters, { CallFilterState } from '@/components/complaint-calls/CallFilters'
import CallStatsStrip from '@/components/complaint-calls/CallStatsStrip'
import CallsTable from '@/components/complaint-calls/CallsTable'
import {
  CallListItem,
  CallStats,
  CallsApiError,
  complaintCallsApi,
  istDaysAgo,
  todayIst,
} from '@/lib/api/complaintCalls'
import { getStoredUser } from '@/lib/api/auth'
import { isSuperAdmin } from '@/lib/constants/modules'

const PAGE_SIZE = 25

const DEFAULT_FILTERS: CallFilterState = {
  from: istDaysAgo(7),
  to: todayIst(),
  disposition: '',
  safetyOnly: false,
  search: '',
}

export default function ComplaintCallsPage() {
  const router = useRouter()
  const [allowed, setAllowed] = useState<boolean | null>(null)

  const [filters, setFilters] = useState<CallFilterState>(DEFAULT_FILTERS)
  const [activeSearch, setActiveSearch] = useState('')
  const [page, setPage] = useState(1)

  const [items, setItems] = useState<CallListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [stats, setStats] = useState<CallStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // Call logs carry customer phone numbers and transcripts, so the backend
  // allows QC super-admins only. Mirror that here rather than letting the page
  // render and 403 on every request.
  useEffect(() => {
    setAllowed(isSuperAdmin(getStoredUser()?.email))
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setActiveSearch(filters.search.trim()), 350)
    return () => clearTimeout(t)
  }, [filters.search])

  // A changed filter starts from page 1 — otherwise filtering from page 3 lands
  // on an empty page of a shorter result set and reads as "no calls".
  useEffect(() => {
    setPage(1)
  }, [activeSearch, filters.from, filters.to, filters.disposition, filters.safetyOnly])

  const loadCalls = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await complaintCallsApi.list({
        page,
        page_size: PAGE_SIZE,
        from: filters.from || undefined,
        to: filters.to || undefined,
        disposition: filters.disposition || undefined,
        safety_only: filters.safetyOnly || undefined,
        q: activeSearch || undefined,
      })
      setItems(res.items)
      setTotal(res.total)
    } catch (err) {
      const message = err instanceof CallsApiError ? err.message : 'Failed to load call logs.'
      setError(message)
      if (!(err instanceof CallsApiError) || err.status !== 401) toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [page, filters.from, filters.to, filters.disposition, filters.safetyOnly, activeSearch])

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      setStats(
        await complaintCallsApi.stats({
          from: filters.from || undefined,
          to: filters.to || undefined,
        }),
      )
    } catch {
      setStats(null) // the table is the main content; a failed strip stays silent
    } finally {
      setStatsLoading(false)
    }
  }, [filters.from, filters.to])

  useEffect(() => {
    if (allowed) loadCalls()
  }, [allowed, loadCalls])

  useEffect(() => {
    if (allowed) loadStats()
  }, [allowed, loadStats])

  if (allowed === false) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto">
          <div className="surface-card p-8 text-center">
            <h2 className="text-lg font-bold text-ink-600">Not authorised</h2>
            <p className="mt-2 text-sm text-ink-400">
              Complaint call logs contain customer phone numbers and conversations, so they are
              limited to QC super-admins. Ask an administrator if you need access.
            </p>
            <button onClick={() => router.push('/dashboard')} className="btn-primary mt-5">
              Back to dashboard
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const isFiltered =
    Boolean(activeSearch) || Boolean(filters.disposition) || filters.safetyOnly

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Complaint Calls"
          subtitle="Quality calls handled by the AI voice agent on the customer care line"
          icon={PhoneCall}
          badge={
            !loading && !error ? (
              <span className="inline-flex rounded-full bg-cream-200 text-ink-500 text-[11px] font-semibold px-2.5 py-0.5 tabular-nums">
                {total}
              </span>
            ) : null
          }
        />

        <CallStatsStrip stats={stats} loading={statsLoading} />
        <CallFilters value={filters} onChange={setFilters} />

        <div className="surface-card overflow-hidden animate-fade-in-up">
          <CallsTable
            items={items}
            loading={loading}
            error={error}
            filtered={isFiltered}
            onRetry={loadCalls}
          />

          {!loading && !error && items.length > 0 && (
            <div className="px-5 py-4 border-t border-cream-300 flex items-center justify-between flex-wrap gap-3">
              <div className="text-xs text-ink-400">
                Showing{' '}
                <span className="font-semibold text-ink-600 tabular-nums">
                  {(page - 1) * PAGE_SIZE + 1}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-ink-600 tabular-nums">
                  {Math.min(page * PAGE_SIZE, total)}
                </span>{' '}
                of <span className="font-semibold text-ink-600 tabular-nums">{total}</span> calls
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-outline px-3 py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="inline-flex items-center justify-center min-w-[2rem] px-3 py-1.5 text-xs font-semibold rounded-md bg-brand-500 text-white tabular-nums">
                  {page}
                </span>
                <span className="text-xs text-ink-400">
                  of <span className="tabular-nums">{totalPages}</span>
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="btn-outline px-3 py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
