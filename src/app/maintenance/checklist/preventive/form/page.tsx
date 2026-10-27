'use client'

/** Fill / continue a PM checklist (?draftId=) — presentation/checklist/ChecklistScreen. */

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { LoadingBlock } from '@/components/maintenance/ui'
import { ChecklistForm } from '@/components/maintenance/checklist/ChecklistForm'

function Inner() {
  const raw = useSearchParams().get('draftId')
  const n = raw ? Number.parseInt(raw, 10) : NaN
  return <ChecklistForm draftIdParam={Number.isFinite(n) ? n : null} />
}

export default function PreventiveFormPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <Inner />
    </Suspense>
  )
}
