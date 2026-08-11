'use client'

import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ModuleGuard from '@/components/ModuleGuard'
import PageHeader from '@/components/ui/PageHeader'
import LabelForm from '@/components/printing/LabelForm'
import WarehouseSelector from '@/components/ui/WarehouseSelector'
import { DOC_META } from '@/lib/api/printingLabels'

export default function CreateEntryPage() {
  return (
    <ModuleGuard module="section_1">
      <DashboardLayout>
        <div className="mx-auto max-w-7xl">
          <Link
            href="/printing-label"
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-400 hover:text-brand-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Batch Coding Register
          </Link>

          <PageHeader
            title="New register entry"
            subtitle={`${DOC_META.docNo} · Issue No ${DOC_META.issueNo}`}
            icon={Printer}
            // Shown here because the plant is stamped onto each entry when it is
            // first saved — picking it after the fact would be too late.
            actions={<WarehouseSelector />}
          />

          <LabelForm />
        </div>
      </DashboardLayout>
    </ModuleGuard>
  )
}
