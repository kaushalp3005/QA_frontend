'use client'

import { AlertTriangle, PhoneCall, PhoneForwarded, PhoneMissed, Timer } from 'lucide-react'

import { CallStats, formatDuration, prettyLabel } from '@/lib/api/complaintCalls'
import { Skeleton } from '@/components/ui/Loader'

interface Props {
  stats: CallStats | null
  loading: boolean
}

/** Compact stat row above the table. The table is the main content, so this
 *  stays to one line of cards on a laptop. */
export default function CallStatsStrip({ stats, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    )
  }
  if (!stats) return null

  const callbacks = stats.by_disposition?.callback_requested || 0
  const safety = stats.safety_issues || 0
  const topIntents = Object.entries(stats.by_intent || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5 animate-fade-in-up">
      <Card icon={PhoneCall} label="Total calls" value={String(stats.total_calls)} />
      <Card icon={PhoneForwarded} label="Transferred" value={String(stats.transferred)} />
      <Card
        icon={PhoneMissed}
        label="Callback requested"
        value={String(callbacks)}
        tone={callbacks > 0 ? 'warning' : undefined}
        hint={callbacks > 0 ? 'Needs a call back' : undefined}
      />
      <Card
        icon={AlertTriangle}
        label="Safety issues"
        value={String(safety)}
        tone={safety > 0 ? 'danger' : undefined}
      />
      <Card
        icon={Timer}
        label="Avg duration"
        value={formatDuration(stats.avg_duration_seconds)}
        hint={topIntents.map(([k, n]) => `${prettyLabel(k)} ${n}`).join(' · ') || undefined}
      />
    </div>
  )
}

function Card({
  icon: Icon,
  label,
  value,
  tone,
  hint,
}: {
  icon: typeof PhoneCall
  label: string
  value: string
  tone?: 'warning' | 'danger'
  hint?: string
}) {
  const toneClasses =
    tone === 'danger'
      ? 'border-danger-200 bg-danger-50'
      : tone === 'warning'
        ? 'border-warning-200 bg-warning-50'
        : 'surface-card'
  const iconClasses =
    tone === 'danger' ? 'text-danger-700' : tone === 'warning' ? 'text-warning-700' : 'text-brand-500'

  return (
    <div className={`${toneClasses} rounded-2xl border p-3.5`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${iconClasses}`} />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">{label}</span>
      </div>
      <div className="mt-1.5 text-2xl font-bold text-ink-600 tabular-nums">{value}</div>
      {hint && <div className="text-[11px] text-ink-400 truncate">{hint}</div>}
    </div>
  )
}
