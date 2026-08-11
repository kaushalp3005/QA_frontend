'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ModuleGuard from '@/components/ModuleGuard'
import PageHeader from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Loader'
import LabelForm from '@/components/printing/LabelForm'
import { DOC_META, printingLabelsApi, type PrintingLabelRecord } from '@/lib/api/printingLabels'

export default function EditEntryPage() {
  return (
    <ModuleGuard module="section_1">
      <DashboardLayout>
        <EditEntry />
      </DashboardLayout>
    </ModuleGuard>
  )
}

function EditEntry() {
  const params = useParams()
  const id = Number(params?.id)

  const [record, setRecord] = useState<PrintingLabelRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!Number.isFinite(id)) {
      setError('Invalid entry id')
      setLoading(false)
      return
    }
    let cancelled = false
    printingLabelsApi
      .get(id)
      .then((res) => {
        if (!cancelled) setRecord(res.data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load entry')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size={28} />
      </div>
    )
  }

  if (error || !record) {
    return (
      <div className="mx-auto max-w-md">
        <div className="surface-card p-8 text-center">
          <p className="text-sm font-medium text-danger-700">{error || 'Entry not found'}</p>
          <Link href="/printing-label" className="btn-base btn-primary mt-5">
            Back to register
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl">
      <Link
        href={`/printing-label/${record.id}`}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-400 hover:text-brand-500"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to entry
      </Link>

      <PageHeader
        title="Edit register entry"
        subtitle={`${DOC_META.docNo} · Issue No ${DOC_META.issueNo}`}
        icon={Printer}
      />

      <LabelForm record={record} />
    </div>
  )
}
