'use client'

import { ChevronRight, MonitorSmartphone, RefreshCw, Zap, type LucideIcon } from 'lucide-react'
import { Button, Card, ErrorBanner, PageHeader, SkeletonRows } from '@/components/maintenance/ui'
import { useMtQuery } from '@/lib/maintenance/hooks'
import { MT } from '@/lib/maintenance/nav'
import { listMachines } from '@/lib/maintenance/api/assets'
import {
  IT_ASSET_CATEGORIES,
  IT_CATEGORY_ORDER,
  itCategoryMatches,
  type ItAssetCategory,
} from '@/lib/maintenance/api/it'

const ICON: Record<ItAssetCategory, LucideIcon> = {
  ELECTRICAL: Zap,
  IT_COMMUNICATION: MonitorSmartphone,
}

/** IT Assets chooser (ItAssetCategoriesScreen / VM): one card per category with
 *  its count. The whole register is fetched so casing variants still count. */
export default function ItAssetCategoriesPage() {
  const { data, error, loading, reload } = useMtQuery(() => listMachines(), [])
  const rows = data ?? []

  return (
    <>
      <PageHeader
        title="IT Assets"
        back={MT.dashboard}
        actions={
          <Button variant="secondary" icon={RefreshCw} onClick={reload} disabled={loading}>
            Refresh
          </Button>
        }
      />
      {error ? (
        <ErrorBanner error={`Failed to load asset register — ${error}`} onRetry={reload} />
      ) : loading && !data ? (
        <SkeletonRows rows={2} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {IT_CATEGORY_ORDER.map((c) => {
            const Icon = ICON[c]
            const count = rows.filter((m) => itCategoryMatches(c, m)).length
            return (
              <Card key={c} href={MT.itAssetList(c)} className="group flex items-center gap-4 p-5">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-factory-50 text-factory-700 dark:bg-factory-500/15 dark:text-factory-300">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-zinc-900 dark:text-zinc-50">{IT_ASSET_CATEGORIES[c].label}</span>
                  <span className="block text-sm text-zinc-500 dark:text-zinc-400">
                    {count === 1 ? '1 asset' : `${count} assets`}
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-factory-600" />
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
