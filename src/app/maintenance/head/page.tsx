'use client'

import { BarChart3, CheckCircle2, ClipboardList, ListChecks, Send, ShieldAlert, Users } from 'lucide-react'
import { PageHeader, Section } from '@/components/maintenance/ui'
import { HubTile } from '@/components/maintenance/reports/ReportFilters'
import { useMtSession } from '@/lib/maintenance/hooks'
import { canonicalPlant } from '@/lib/maintenance/format'
import { MT } from '@/lib/maintenance/nav'

/** Head's read-only oversight launcher, grouped into sections (HeadHomeScreen.kt). */
export default function HeadHomePage() {
  const session = useMtSession()
  if (!session) return null
  const plant = session.plantId?.trim() ?? ''
  const scope = plant.toLowerCase() === 'both' ? 'A185 + W202' : canonicalPlant(plant)

  return (
    <>
      <PageHeader title="Head — Oversight" subtitle={`${session.name}${scope ? ` — ${scope}` : ''}`} />
      <div className="max-w-3xl">
        <Section title="Live operations">
          <div className="space-y-2">
            <HubTile href={MT.machines} icon={ListChecks} title="Machine List" subtitle="Who's running what, in real time" />
            <HubTile href={MT.headBreakdowns} icon={ShieldAlert} title="Breakdowns" subtitle="Active & recent breakdown flags" />
            <HubTile href={MT.headQc} icon={CheckCircle2} title="QC Activity" subtitle="Pending & recently decided QC" />
          </div>
        </Section>
        <Section title="Records">
          <div className="space-y-2">
            <HubTile
              href={MT.headChecklistRecords}
              icon={ClipboardList}
              title="Checklist Records"
              subtitle="Filled preventive checklists"
            />
            <HubTile href={MT.transfers} icon={Send} title="Transfer Records" subtitle="Machine transfers between warehouses" />
          </div>
        </Section>
        <Section title="Analytics">
          <HubTile href={MT.headReports} icon={BarChart3} title="Reports" subtitle="Machine, floor, breakdown & QC history" />
        </Section>
        <Section title="Administration">
          <HubTile href={MT.users} icon={Users} title="Manage Users" subtitle="Add, edit or remove app users" />
        </Section>
      </div>
    </>
  )
}
