'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  PhoneForwarded,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

import DashboardLayout from '@/components/layout/DashboardLayout'
import Transcript from '@/components/complaint-calls/Transcript'
import { Spinner } from '@/components/ui/Loader'
import {
  CallDetail,
  CallsApiError,
  DISPOSITION_STYLES,
  complaintCallsApi,
  formatDuration,
  formatIstDateTimeLong,
  prettyLabel,
} from '@/lib/api/complaintCalls'
import { getStoredUser } from '@/lib/api/auth'
import { isSuperAdmin } from '@/lib/constants/modules'

export default function ComplaintCallDetailPage() {
  const router = useRouter()
  const params = useParams()
  const interactionId = decodeURIComponent(String(params?.id || ''))

  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [call, setCall] = useState<CallDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showTechnical, setShowTechnical] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setAllowed(isSuperAdmin(getStoredUser()?.email))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setCall(await complaintCallsApi.get(interactionId))
    } catch (err) {
      const message = err instanceof CallsApiError ? err.message : 'Failed to load this call.'
      setError(message)
      if (!(err instanceof CallsApiError) || err.status !== 401) toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [interactionId])

  useEffect(() => {
    if (allowed && interactionId) load()
  }, [allowed, interactionId, load])

  const copyNumber = async () => {
    if (!call?.caller_mobile) return
    try {
      await navigator.clipboard.writeText(call.caller_mobile)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy the number')
    }
  }

  if (allowed === false) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto surface-card p-8 text-center">
          <h2 className="text-lg font-bold text-ink-600">Not authorised</h2>
          <p className="mt-2 text-sm text-ink-400">
            Complaint call logs are limited to QC super-admins.
          </p>
          <button onClick={() => router.push('/dashboard')} className="btn-primary mt-5">
            Back to dashboard
          </button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <Link
          href="/complaint-calls"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-brand-500 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to complaint calls
        </Link>

        {loading ? (
          // The backend generates a missing summary during this request, so this
          // can legitimately take a few seconds.
          <div className="surface-card px-6 py-20 text-center">
            <Spinner size={32} className="text-brand-500 mx-auto" />
            <p className="mt-4 text-sm font-medium text-ink-500">Loading call…</p>
            <p className="mt-1 text-xs text-ink-400">Generating the summary can take a few seconds.</p>
          </div>
        ) : error || !call ? (
          <div className="surface-card px-6 py-16 text-center">
            <div className="bg-danger-50 w-14 h-14 rounded-full mx-auto flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-danger-700" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-ink-600">Could not load this call</h3>
            <p className="mt-1 text-xs text-ink-400">{error}</p>
            <button onClick={load} className="btn-outline mt-4 px-3 py-1.5 text-xs inline-flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              Try again
            </button>
          </div>
        ) : (
          <>
            {/* 1. Header */}
            <div className="surface-card p-5 mb-4 animate-fade-in-up">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-bold text-ink-600 truncate">
                      {call.caller_name || 'Caller not identified'}
                    </h1>
                    {call.is_safety_issue && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-danger-50 text-danger-700 text-[11px] font-semibold px-2.5 py-0.5">
                        <AlertTriangle className="w-3 h-3" />
                        Safety issue
                      </span>
                    )}
                  </div>

                  {call.caller_mobile ? (
                    <div className="mt-1 flex items-center gap-2">
                      <a
                        href={`tel:${call.caller_mobile}`}
                        className="text-sm font-semibold text-brand-500 hover:underline tabular-nums"
                      >
                        {call.caller_mobile}
                      </a>
                      <button
                        onClick={copyNumber}
                        className="btn-ghost px-2 py-1 text-xs inline-flex items-center gap-1"
                        title="Copy number"
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-ink-400 italic">
                      Number not captured — this caller cannot be called back.
                    </p>
                  )}
                </div>

                <div className="text-right text-sm text-ink-500">
                  <div className="font-semibold text-ink-600">{formatIstDateTimeLong(call.started_at)}</div>
                  <div className="text-xs text-ink-400 tabular-nums">
                    Duration {formatDuration(call.duration_seconds)}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Summary — the most important thing on the page */}
            <div className="surface-card p-5 mb-4 animate-fade-in-up">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-400 mb-2">
                Summary
              </h2>
              {call.summary ? (
                <p className="text-base leading-relaxed text-ink-600 whitespace-pre-wrap">
                  {call.summary}
                </p>
              ) : call.summary_status === 'pending' ? (
                <div className="flex items-center gap-2 text-sm text-ink-400">
                  <Spinner size={16} className="text-brand-500" />
                  Generating summary… reload in a moment.
                </div>
              ) : call.summary_status === 'skipped' ? (
                <p className="text-sm text-ink-400 italic">
                  No conversation was recorded, so there is nothing to summarise.
                </p>
              ) : (
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-sm text-ink-400 italic">
                    The summary could not be generated. The transcript below is complete.
                  </p>
                  <button onClick={load} className="btn-outline px-3 py-1.5 text-xs">
                    Try again
                  </button>
                </div>
              )}
            </div>

            {/* 3. Outcome */}
            <div className="surface-card p-5 mb-4 animate-fade-in-up">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-400 mb-3">
                Outcome
              </h2>
              <div className="flex items-center gap-6 flex-wrap text-sm">
                <div>
                  <div className="text-[11px] text-ink-400">Intent</div>
                  <div className="font-semibold text-ink-600">{prettyLabel(call.intent)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-ink-400">Disposition</div>
                  {call.disposition ? (
                    <span
                      className={`inline-flex rounded-full text-[11px] font-semibold px-2.5 py-0.5 ${
                        DISPOSITION_STYLES[call.disposition] || 'bg-cream-200 text-ink-500'
                      }`}
                    >
                      {prettyLabel(call.disposition)}
                    </span>
                  ) : (
                    <div className="font-semibold text-ink-600">—</div>
                  )}
                </div>
                {call.transferred_to && (
                  <div>
                    <div className="text-[11px] text-ink-400">Transferred to</div>
                    <div className="font-semibold text-ink-600 tabular-nums inline-flex items-center gap-1.5">
                      <PhoneForwarded className="w-3.5 h-3.5 text-ink-400" />
                      {call.transferred_to}
                    </div>
                  </div>
                )}
                {call.end_reason && (
                  <div>
                    <div className="text-[11px] text-ink-400">Ended because</div>
                    <div className="font-semibold text-ink-600">{prettyLabel(call.end_reason)}</div>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Transcript */}
            <div className="surface-card p-5 mb-4 animate-fade-in-up">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-400 mb-3">
                Conversation
              </h2>
              <Transcript turns={call.transcript} />
            </div>

            {/* 5. Technical details */}
            <div className="surface-card mb-8 animate-fade-in-up">
              <button
                onClick={() => setShowTechnical((v) => !v)}
                className="w-full px-5 py-3.5 flex items-center justify-between text-left"
              >
                <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                  Technical details
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-ink-400 transition-transform ${showTechnical ? 'rotate-180' : ''}`}
                />
              </button>
              {showTechnical && (
                <div className="px-5 pb-5 space-y-3 border-t border-cream-300 pt-4">
                  <Field label="Interaction ID" value={call.interaction_id} mono />
                  <Field
                    label="Telephony gateway number (not the caller)"
                    value={call.gateway_number || '—'}
                    mono
                    hint="Calls are forwarded through Knowlarity, so this number is the same on every call."
                  />
                  <Field label="Agent number dialled" value={call.agent_phone_number || '—'} mono />
                  <Field
                    label="Summary source"
                    value={
                      call.summary_source
                        ? `${prettyLabel(call.summary_source)} (${call.summary_status})`
                        : call.summary_status
                    }
                  />
                  <div>
                    <div className="text-[11px] text-ink-400 mb-1">Agent variables</div>
                    <pre className="text-[11px] bg-cream-100 border border-cream-300 rounded-lg p-3 overflow-x-auto text-ink-600">
                      {JSON.stringify(call.output_variables || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

function Field({
  label,
  value,
  mono,
  hint,
}: {
  label: string
  value: string
  mono?: boolean
  hint?: string
}) {
  return (
    <div>
      <div className="text-[11px] text-ink-400">{label}</div>
      <div className={`text-sm text-ink-600 ${mono ? 'font-mono tabular-nums' : 'font-medium'}`}>
        {value}
      </div>
      {hint && <div className="text-[11px] text-ink-400 mt-0.5">{hint}</div>}
    </div>
  )
}
