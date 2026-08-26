/**
 * "Measures to Resolve" — the resolution route picked on a complaint.
 *
 * Two of them are actionable inside this app: RCA/CAPA and Fishbone each have
 * their own analysis form, so a complaint carrying one of those offers a button
 * that opens it. The rest (RTV, Replacement, Refund, Other) record a decision
 * settled elsewhere — there is nothing here to open, so they are only ever
 * displayed.
 *
 * The option values come from ComplaintCreateForm's `measuresToResolve` select
 * and are stored lower-case; every reader lower-cases before looking up here.
 */

export interface MeasureMeta {
  label: string
  /** Tailwind classes for the badge shown when the measure is not actionable. */
  badge: string
}

export const MEASURE_CONFIG: Record<string, MeasureMeta> = {
  replacement: { label: 'Replacement', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  rca_capa: { label: 'RCA/CAPA', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  fishbone: { label: 'Fishbone', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  rtv: { label: 'RTV', badge: 'bg-teal-50 text-teal-700 border-teal-200' },
  refund: { label: 'Refund', badge: 'bg-warning-50 text-warning-700 border-warning-200' },
  other: { label: 'Other', badge: 'bg-cream-200 text-ink-500 border-cream-300' },
}

const NEUTRAL_BADGE = 'bg-cream-200 text-ink-500 border-cream-300'

/** Human label for a stored measure. Unknown values are title-cased rather than
 *  hidden — a value the DB holds but this list has not learned about is still
 *  worth showing. */
export function measureLabel(measure?: string | null): string {
  if (!measure) return 'Not Specified'
  return (
    MEASURE_CONFIG[measure.toLowerCase()]?.label ||
    measure.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  )
}

/** Badge classes for a stored measure. */
export function measureBadge(measure?: string | null): string {
  if (!measure) return NEUTRAL_BADGE
  return MEASURE_CONFIG[measure.toLowerCase()]?.badge || NEUTRAL_BADGE
}

/** The measures that open an analysis form, mapped to their permission code. */
export const ACTIONABLE_MEASURES = {
  rca_capa: 'rca_capa',
  fishbone: 'fishbone',
} as const

export type ActionableMeasure = keyof typeof ACTIONABLE_MEASURES

/** True when this measure has an analysis form to open. */
export function isActionableMeasure(measure?: string | null): measure is ActionableMeasure {
  return !!measure && measure.toLowerCase() in ACTIONABLE_MEASURES
}
