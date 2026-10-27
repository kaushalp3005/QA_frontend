'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Hammer } from 'lucide-react'
import { MT } from '@/lib/maintenance/nav'
import { Button, EmptyState, PageHeader } from '@/components/maintenance/ui'

function ComingSoon() {
  const label = useSearchParams().get('label') || 'This section'
  return (
    <>
      <PageHeader title={label} back={MT.home} />
      <EmptyState
        icon={Hammer}
        title="Coming soon"
        message={`${label} isn't built yet. It will appear here once it's ready.`}
        action={<Button href={MT.home}>Back to home</Button>}
      />
    </>
  )
}

export default function ComingSoonPage() {
  return (
    <Suspense>
      <ComingSoon />
    </Suspense>
  )
}
