'use client'

import toast from 'react-hot-toast'
import { MeterHistory } from '@/components/maintenance/utilities/MeterHistory'
import { downloadSheet } from '@/components/maintenance/utilities/csv'
import { a185Sheet } from '@/components/maintenance/utilities/sheets'
import { deleteA185Reading, listA185Readings } from '@/lib/maintenance/api/readings'
import { formatUtilityNumber } from '@/lib/maintenance/api/utilities'
import { useMtQuery, useMtSession } from '@/lib/maintenance/hooks'
import { MT } from '@/lib/maintenance/nav'

const fmt3 = (v: number | null | undefined) => formatUtilityNumber(v, 3)

/** A-185 HT / Cold Room / UV history (A185ReadingHistoryScreen). Delete is HEAD-only. */
export default function A185ReadingsPage() {
  const session = useMtSession()
  const { data, error, loading, reload } = useMtQuery(() => listA185Readings(), [])
  const readings = data ?? []

  function download() {
    const title = 'HT Cold Room UV readings'
    toast(downloadSheet(a185Sheet(title, readings), title))
  }

  return (
    <MeterHistory
      title="HT / Cold Room / UV"
      addHref={MT.a185Form()}
      rows={readings.map((r) => ({
        date: r.reading_date,
        href: MT.a185Form(r.reading_date),
        metrics: [
          { label: 'HT', value: fmt3(r.ht_consumption) },
          { label: 'Cold', value: fmt3(r.cold_consumption) },
          { label: 'UV', value: fmt3(r.uv_consumption) },
        ],
        remark: r.remark,
      }))}
      loading={loading}
      error={error}
      onRetry={reload}
      emptyText="Use Add reading to record today's HT / Cold Room / UV."
      canDelete={session?.role === 'HEAD'}
      deleteMessage={(d) => `This removes the HT Panel, Cold Room and UV readings for ${d}. This cannot be undone.`}
      forbiddenMessage="Only a Head can delete a day's readings"
      onDelete={deleteA185Reading}
      onDownload={download}
    />
  )
}
