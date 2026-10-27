'use client'

import { ClipboardCheck, FolderOpen } from 'lucide-react'
import { useMtSession } from '@/lib/maintenance/hooks'
import { plantLabel } from '@/lib/maintenance/format'
import { MT } from '@/lib/maintenance/nav'
import { PageHeader } from '@/components/maintenance/ui'
import { LandingCard, qcRoleLabel } from '@/components/maintenance/qc/QcBits'

/** QC home — two-option chooser (QcLandingScreen). "QC Verification" is the
 *  live inbox; "Checklist Records" is the read-only PM + Breakdown archive. */
export default function QcLandingPage() {
  const session = useMtSession()
  if (!session) return null

  return (
    <>
      <PageHeader
        title="QC"
        subtitle={`${session.name} — ${qcRoleLabel(session.role)} — ${plantLabel(session.plantId)}`}
      />
      <div className="grid max-w-3xl gap-3">
        <LandingCard
          icon={ClipboardCheck}
          title="QC Verification"
          subtitle="Verify breakdown & PM handoffs — awaiting, active, done"
          href={MT.qcInbox}
        />
        <LandingCard
          icon={FolderOpen}
          title="Checklist Records"
          subtitle="PM & Breakdown records — view and download"
          href={MT.qcHistory}
        />
      </div>
    </>
  )
}
