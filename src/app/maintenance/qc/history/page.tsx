'use client'

import { ClipboardCheck, Wrench } from 'lucide-react'
import { MT } from '@/lib/maintenance/nav'
import { PageHeader } from '@/components/maintenance/ui'
import { LandingCard } from '@/components/maintenance/qc/QcBits'

/** QC "Checklist Records" hub (QcHistoryHubScreen) — finished records only,
 *  view and download, no actions. Both lists are org-wide (the backend list
 *  endpoints aren't plant-scoped), so QC sees A-185 and W-202. */
export default function QcHistoryHubPage() {
  return (
    <>
      <PageHeader title="Checklist Records" subtitle="PM & Breakdown records — view and download" back={MT.qc} />
      <div className="grid max-w-3xl gap-3">
        <LandingCard
          icon={ClipboardCheck}
          title="PM Checklist Records"
          subtitle="Preventive maintenance checklists — submitted & drafts"
          href={MT.qcHistoryPm}
        />
        <LandingCard
          icon={Wrench}
          title="Breakdown Records"
          subtitle="Submitted F.06 breakdown maintenance records"
          href={MT.qcHistoryBreakdown}
        />
      </div>
    </>
  )
}
