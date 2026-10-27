'use client'

import toast from 'react-hot-toast'
import { MeterHistory } from '@/components/maintenance/utilities/MeterHistory'
import { downloadSheet } from '@/components/maintenance/utilities/csv'
import { w202Sheet } from '@/components/maintenance/utilities/sheets'
import { deleteW202Reading, listW202Readings, w202KindFromSlug, W202_KINDS } from '@/lib/maintenance/api/readings'
import { formatUtilityNumber } from '@/lib/maintenance/api/utilities'
import { useMtQuery, useMtSession } from '@/lib/maintenance/hooks'
import { MT } from '@/lib/maintenance/nav'

const fmt3 = (v: number | null | undefined) => formatUtilityNumber(v, 3)

/** W-202 Main meter / Solar history (W202ReadingHistoryScreen). Delete is HEAD-only. */
export default function W202ReadingsPage({ params }: { params: { kind: string } }) {
  const kind = w202KindFromSlug(decodeURIComponent(params.kind))
  const meta = W202_KINDS[kind]
  const session = useMtSession()
  const { data, error, loading, reload } = useMtQuery(() => listW202Readings(kind), [kind])
  const readings = data ?? []

  function download() {
    const title = `${kind === 'main' ? 'Main' : 'Solar'} meter reading`
    toast(downloadSheet(w202Sheet(title, readings), title))
  }

  return (
    <MeterHistory
      title={meta.title}
      addHref={MT.w202Form(kind)}
      rows={readings.map((r) => ({
        date: r.reading_date,
        href: MT.w202Form(kind, r.reading_date),
        metrics: [
          { label: 'KWH', value: fmt3(r.kwh_consumption) },
          { label: 'KVAH', value: fmt3(r.kvah_consumption) },
          { label: 'PF', value: fmt3(r.power_factor) },
        ],
        remark: r.remark,
      }))}
      loading={loading}
      error={error}
      onRetry={reload}
      emptyText={`Use Add reading to record today's ${meta.title.toLowerCase()}.`}
      canDelete={session?.role === 'HEAD'}
      deleteMessage={(d) => `This removes the ${meta.title.toLowerCase()} for ${d}. This cannot be undone.`}
      forbiddenMessage="Only a Head can delete a day's reading"
      onDelete={(d) => deleteW202Reading(kind, d)}
      onDownload={download}
    />
  )
}
