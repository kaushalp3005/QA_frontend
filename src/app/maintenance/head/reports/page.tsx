'use client'

import { CheckCircle2, ShieldAlert, Warehouse, Wrench, Zap } from 'lucide-react'
import { PageHeader } from '@/components/maintenance/ui'
import { HubTile } from '@/components/maintenance/reports/ReportFilters'
import SummaryReportCard from '@/components/maintenance/reports/SummaryReportCard'
import { MT } from '@/lib/maintenance/nav'

/** Head's "Reports" hub: summary + five date-filterable history views (HeadReportsScreen.kt). */
export default function HeadReportsPage() {
  return (
    <>
      <PageHeader title="Reports" back={MT.head} />
      <div className="max-w-3xl space-y-3">
        <SummaryReportCard back={MT.headReports} />
        <HubTile href={MT.headReportsMachine} icon={Zap} title="Machine Readings" subtitle="Per-machine kWh, date-wise" />
        <HubTile href={MT.headReportsFloor} icon={Warehouse} title="Floor Readings" subtitle="Per-floor meter readings, date-wise" />
        <HubTile href={MT.headReportsBreakdowns} icon={ShieldAlert} title="Breakdown History" subtitle="Every breakdown, open or closed" />
        <HubTile href={MT.headReportsQc} icon={CheckCircle2} title="QC Activity History" subtitle="Every QC decision, date-wise" />
        <HubTile href={MT.headReportsPm} icon={Wrench} title="PM History" subtitle="Every PM work order, live or closed" />
      </div>
    </>
  )
}
