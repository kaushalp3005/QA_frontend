'use client'

import { useRouter } from 'next/navigation'
import { AlertTriangle, PhoneCall, RefreshCw } from 'lucide-react'

import {
  CallListItem,
  DISPOSITION_STYLES,
  formatDuration,
  formatIstDateTime,
  prettyLabel,
} from '@/lib/api/complaintCalls'
import { Skeleton } from '@/components/ui/Loader'

interface Props {
  items: CallListItem[]
  loading: boolean
  error: string | null
  filtered: boolean
  onRetry: () => void
}

export default function CallsTable({ items, loading, error, filtered, onRetry }: Props) {
  const router = useRouter()

  if (error) {
    return (
      <div className="px-6 py-14 text-center">
        <div className="bg-danger-50 w-14 h-14 rounded-full mx-auto flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-danger-700" />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-ink-600">Could not load calls</h3>
        <p className="mt-1 text-xs text-ink-400">{error}</p>
        <button onClick={onRetry} className="btn-outline mt-4 px-3 py-1.5 text-xs inline-flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
          Try again
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-5 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="px-6 py-14 text-center">
        <div className="bg-cream-200 w-14 h-14 rounded-full mx-auto flex items-center justify-center">
          <PhoneCall className="h-6 w-6 text-ink-400" />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-ink-500">No calls in this period</h3>
        <p className="mt-1 text-xs text-ink-400">
          {filtered
            ? 'Try a wider date range or clear the filters.'
            : 'Quality calls handled by the voice agent will appear here.'}
        </p>
      </div>
    )
  }

  return (
    <div className="table-wrap">
      <table className="min-w-full divide-y divide-cream-300">
        <thead className="bg-cream-100">
          <tr>
            {['Date & time', 'Caller', 'Duration', 'Outcome', 'Summary'].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-cream-300">
          {items.map((call) => {
            const hasCaller = Boolean(call.caller_name || call.caller_mobile)
            return (
              <tr
                key={call.interaction_id}
                onClick={() => router.push(`/complaint-calls/${encodeURIComponent(call.interaction_id)}`)}
                className={`cursor-pointer hover:bg-cream-100/50 transition-colors ${
                  call.is_safety_issue ? 'border-l-4 border-l-danger-600 bg-danger-50/30' : ''
                }`}
              >
                <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-ink-600 tabular-nums">
                  {formatIstDateTime(call.started_at)}
                  {call.is_safety_issue && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-danger-50 text-danger-700 text-[11px] font-semibold px-2 py-0.5 align-middle">
                      <AlertTriangle className="w-3 h-3" />
                      Safety
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {hasCaller ? (
                    <>
                      <div className="text-[13px] font-semibold text-ink-600">
                        {call.caller_name || '—'}
                      </div>
                      <div className="text-[11px] text-ink-400 tabular-nums">
                        {call.caller_mobile || 'Number not captured'}
                      </div>
                    </>
                  ) : (
                    // Meaningful, not missing: nobody can call this person back.
                    <span className="text-sm text-ink-300 italic">Not captured</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-ink-500 tabular-nums">
                  {formatDuration(call.duration_seconds)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {call.disposition ? (
                    <span
                      className={`inline-flex rounded-full text-[11px] font-semibold px-2.5 py-0.5 ${
                        DISPOSITION_STYLES[call.disposition] || 'bg-cream-200 text-ink-500'
                      }`}
                    >
                      {prettyLabel(call.disposition)}
                    </span>
                  ) : (
                    <span className="text-sm text-ink-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 min-w-[280px]">
                  {call.summary ? (
                    <span className="block text-[13px] text-ink-600 truncate max-w-[420px]" title={call.summary}>
                      {call.summary}
                    </span>
                  ) : (
                    <span className="text-[13px] text-ink-300 italic">
                      {call.summary_status === 'failed'
                        ? 'Summary unavailable'
                        : call.summary_status === 'skipped'
                          ? 'No conversation recorded'
                          : 'Summary pending'}
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
