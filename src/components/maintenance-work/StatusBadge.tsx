import { cn } from '@/lib/styles'
import { STATUS_STYLES, statusLabel } from '@/lib/api/maintenanceWork'

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full text-[11px] font-semibold px-2.5 py-0.5',
        STATUS_STYLES[status] || 'bg-cream-200 text-ink-500',
      )}
    >
      {statusLabel(status)}
    </span>
  )
}

/** 'A185' -> 'A-185', the way the plants are written everywhere else in the app. */
export function plantLabel(plant: string | null): string {
  if (!plant) return '—'
  return plant === 'A185' ? 'A-185' : plant === 'W202' ? 'W-202' : plant
}
