'use client'

/** Chooser between the plant's two checklist documents — presentation/checklist/ChecklistHubScreen + VM. */

import { AlertTriangle, ChevronRight, Wrench, type LucideIcon } from 'lucide-react'
import { useMtSession } from '@/lib/maintenance/hooks'
import { MT } from '@/lib/maintenance/nav'
import { Card, PageHeader } from '@/components/maintenance/ui'
import {
  breakdownShortDoc,
  breakdownSpecForPlant,
  preventiveSubtitle,
  typesForPlant,
  BREAKDOWN_W202,
  CHECKLIST_TYPES,
} from '@/components/maintenance/checklist/logic'

export default function ChecklistHubPage() {
  const session = useMtSession()
  // W-202 until the session resolves, like the Android default state.
  const types = session ? typesForPlant(session.plantId) : CHECKLIST_TYPES.filter((t) => t.plant === 'W202')
  const spec = session ? breakdownSpecForPlant(session.plantId) : BREAKDOWN_W202

  return (
    <div className="max-w-2xl">
      <PageHeader title="Checklist Form" back={MT.dashboard} />
      <div className="space-y-3">
        <OptionCard
          icon={Wrench}
          title="Preventive Checklist"
          subtitle={preventiveSubtitle(types)}
          href={MT.preventiveList}
        />
        <OptionCard
          icon={AlertTriangle}
          title="Breakdown Checklist"
          subtitle={`Breakdown maintenance record (${breakdownShortDoc(spec)})`}
          href={MT.breakdownSheetList}
        />
      </div>
    </div>
  )
}

function OptionCard({ icon: Icon, title, subtitle, href }: { icon: LucideIcon; title: string; subtitle: string; href: string }) {
  return (
    <Card href={href} className="flex items-center gap-4 p-4">
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-factory-100 text-factory-700 dark:bg-factory-500/15 dark:text-factory-300">
        <Icon className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-zinc-900 dark:text-zinc-50">{title}</span>
        <span className="block text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</span>
      </span>
      <ChevronRight className="h-5 w-5 text-zinc-400" />
    </Card>
  )
}
