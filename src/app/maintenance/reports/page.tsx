'use client'

import { Warehouse, Wrench } from 'lucide-react'
import { PageHeader } from '@/components/maintenance/ui'
import { HubTile } from '@/components/maintenance/reports/ReportFilters'
import SummaryReportCard from '@/components/maintenance/reports/SummaryReportCard'
import { MT } from '@/lib/maintenance/nav'

/** Supervisor "Reports" chooser (ReportsHubScreen.kt). */
export default function ReportsHubPage() {
  return (
    <>
      <PageHeader title="Reports" back={MT.dashboard} />
      <div className="max-w-3xl space-y-3">
        <SummaryReportCard back={MT.reports} />
        <HubTile href={MT.reportsMachines} icon={Wrench} title="Machines Reading" />
        <HubTile href={MT.reportsFloor} icon={Warehouse} title="Warehouse/Floor Readings" />
      </div>
    </>
  )
}
