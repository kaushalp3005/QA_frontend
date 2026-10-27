'use client'

/** New F.06 / F.61 sheet, optionally seeded from a QC-approved breakdown (?breakdownId=) — BreakdownFormScreen. */

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { LoadingBlock } from '@/components/maintenance/ui'
import { BreakdownForm } from '@/components/maintenance/checklist/BreakdownForm'

function Inner() {
  const id = useSearchParams().get('breakdownId')?.trim() || null
  // Keyed so switching breakdowns starts a fresh sheet.
  return <BreakdownForm key={id ?? 'new'} breakdownId={id} />
}

export default function BreakdownSheetFormPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <Inner />
    </Suspense>
  )
}
