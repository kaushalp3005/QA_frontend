'use client'

import { AlertCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/styles'
import { usePermissions } from '@/hooks/usePermissions'
import { measureBadge, measureLabel } from '@/lib/constants/measures'

/**
 * What a complaint's "Measures to Resolve" pick offers on a row.
 *
 * The pick decides what appears: RCA/CAPA and Fishbone each have an analysis
 * form in this app, so those two render a button that opens it for this
 * complaint. Every other measure — RTV, Replacement, Refund, Other — records a
 * decision settled outside the app, so it is shown as a plain badge with
 * nothing to click.
 *
 * A measure whose form the signed-in account may not create falls back to the
 * badge too: the row still says which route was chosen, it just does not offer
 * a way in.
 */

interface Props {
  /** The complaint's stored `measuresToResolve`. */
  measure?: string | null
  /** Opens the RCA/CAPA form for this complaint. */
  onRcaCapa: () => void
  /** Opens the Fishbone form for this complaint. */
  onFishbone: () => void
}

export default function MeasureAction({ measure, onRcaCapa, onFishbone }: Props) {
  const { canCreate } = usePermissions()
  const picked = measure?.toLowerCase() ?? ''

  // Nothing chosen yet — the row shows no measure at all rather than an empty
  // badge, which would read as a measure named "Not Specified".
  if (!picked) return null

  if (picked === 'rca_capa' && canCreate('rca_capa')) {
    return (
      <button
        onClick={onRcaCapa}
        className="inline-flex items-center px-2 py-1 text-[11px] font-semibold rounded-md bg-success-50 text-success-700 hover:bg-success-100 transition-colors"
        title="Open RCA/CAPA for this complaint"
      >
        <Clock className="w-3 h-3 mr-1" />
        RCA/CAPA
      </button>
    )
  }

  if (picked === 'fishbone' && canCreate('fishbone')) {
    return (
      <button
        onClick={onFishbone}
        className="inline-flex items-center px-2 py-1 text-[11px] font-semibold rounded-md bg-brand-50 text-brand-500 hover:bg-brand-100 transition-colors"
        title="Open Fishbone analysis for this complaint"
      >
        <AlertCircle className="w-3 h-3 mr-1" />
        Fishbone
      </button>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-1 text-[11px] font-semibold rounded-md border',
        measureBadge(picked)
      )}
      title={`Measure to resolve: ${measureLabel(picked)}`}
    >
      {measureLabel(picked)}
    </span>
  )
}
