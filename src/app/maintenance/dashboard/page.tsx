'use client'

import { ChevronRight } from 'lucide-react'
import { useMtSession } from '@/lib/maintenance/hooks'
import { ROLE_LABEL } from '@/lib/maintenance/client'
import { plantLabel } from '@/lib/maintenance/format'
import { dashboardTilesFor } from '@/lib/maintenance/nav'
import { Card, EmptyState, PageHeader } from '@/components/maintenance/ui'

/** Role launcher grid (DashboardScreen) — Technician, Supervisor, Head, IT. */
export default function DashboardPage() {
  const session = useMtSession()
  if (!session) return null
  const tiles = dashboardTilesFor(session.role)

  return (
    <>
      <PageHeader
        title={`Hello, ${session.name.split(' ')[0]}`}
        subtitle={`${ROLE_LABEL[session.role]} · ${plantLabel(session.plantId)}`}
      />
      {tiles.length === 0 ? (
        <EmptyState title="Nothing here for your role" message="Use the menu to open your section." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {tiles.map(({ label, href, icon: Icon, comingSoon }) => (
            <Card key={label} href={href} className="group p-5">
              <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-factory-50 text-factory-700 dark:bg-factory-500/15 dark:text-factory-300">
                <Icon className="h-5 w-5" />
              </span>
              <span className="flex items-center justify-between gap-2">
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">{label}</span>
                <ChevronRight className="h-4 w-4 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-factory-600" />
              </span>
              {comingSoon && <span className="mt-1 block text-xs text-zinc-500">Coming soon</span>}
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
