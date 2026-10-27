'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'
import { Button, Card, EmptyState, ErrorBanner, PageHeader, SkeletonRows } from '@/components/maintenance/ui'
import { DownloadButton, PlantFilterChips } from '@/components/maintenance/utilities/fields'
import { downloadSheet } from '@/components/maintenance/utilities/csv'
import { utilitySheet } from '@/components/maintenance/utilities/sheets'
import {
  decimalsFor,
  formatUtilityNumber,
  labelFor,
  listUtility,
  recordNumber,
  utilityFromSlug,
} from '@/lib/maintenance/api/utilities'
import { useMtQuery } from '@/lib/maintenance/hooks'
import { plantLabel } from '@/lib/maintenance/format'
import { MT } from '@/lib/maintenance/nav'

/** One utility's readings, newest first (UtilityHistoryScreen). Tap a row to edit. */
export default function UtilityHistoryPage({ params }: { params: { util: string } }) {
  const type = utilityFromSlug(decodeURIComponent(params.util))
  const [plant, setPlant] = useState('')
  const { data, error, loading, reload } = useMtQuery(() => listUtility(type.slug, plant || null), [type.slug, plant])
  const records = data ?? []

  function download() {
    const title = `${type.label} consumption`
    toast(downloadSheet(utilitySheet(title, type, records), title))
  }

  return (
    <>
      <PageHeader
        title={`${type.label} readings`}
        back={MT.dailyReading}
        actions={
          <>
            <DownloadButton disabled={records.length === 0} onClick={download} />
            <Button icon={Plus} href={MT.utilityForm(type.slug)}>
              Add reading
            </Button>
          </>
        }
      />
      <div className="mb-4">
        <PlantFilterChips value={plant} onChange={setPlant} />
      </div>

      <ErrorBanner error={records.length > 0 ? error : null} onRetry={reload} />
      {loading && records.length === 0 ? (
        <SkeletonRows />
      ) : records.length === 0 ? (
        error ? (
          <ErrorBanner error={error} onRetry={reload} />
        ) : (
          <EmptyState title="No readings yet" message="Use Add reading to record one." />
        )
      ) : (
        <div className="space-y-2">
          {records.map((rec) => (
            <Card
              key={`${rec.plant}|${rec.reading_date}|${rec.id ?? ''}`}
              href={MT.utilityForm(type.slug, rec.plant, rec.reading_date)}
              className="p-4"
            >
              <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                {rec.reading_date} · {plantLabel(rec.plant)}
              </p>
              <div className="mt-1 space-y-0.5">
                {type.headline.map((key) => (
                  <p key={key} className="text-xs text-zinc-600 dark:text-zinc-400">
                    {labelFor(type, key)}:{' '}
                    <span className="tabular-nums">
                      {formatUtilityNumber(recordNumber(rec, key), decimalsFor(type, key)) || '—'}
                    </span>
                  </p>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
