'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Spinner } from '@/components/ui/Loader'
import { fgCoaApi, type FgCoaRecord, type FgCoaParamRow } from '@/lib/api/documentations'
import {
  ArrowLeft,
  FlaskConical,
  Package,
  User,
  Microscope,
  ShieldCheck,
  Beaker,
  FileText,
  Printer,
} from 'lucide-react'

const SAMPLE_TYPE_LABELS: Record<string, string> = {
  FG: 'FG – Finished Goods',
  RM: 'RM – Raw Material',
  WIP: 'WIP – Work In Progress',
  PM: 'PM – Packaging Material',
}

function formatDate(s?: string | null): string {
  if (!s) return ''
  if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(s)) return s.replace(/-/g, '/')
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[3]}/${m[2]}/${m[1]}`
  return s
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-300 mb-0.5">{label}</p>
      <p className="text-sm text-ink-600 font-medium">{value || <span className="text-ink-300">—</span>}</p>
    </div>
  )
}

function SectionCard({
  icon: Icon,
  title,
  color = 'brand',
  children,
}: {
  icon: React.ElementType
  title: string
  color?: 'brand' | 'emerald' | 'amber' | 'sky'
  children: React.ReactNode
}) {
  const iconBg = {
    brand: 'bg-brand-500/10 text-brand-600',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    sky: 'bg-sky-50 text-sky-700',
  }[color]

  return (
    <div className="surface-card rounded-2xl overflow-hidden shadow-soft">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-cream-200 bg-cream-100/60">
        <span className={`p-2 rounded-xl ${iconBg}`}>
          <Icon className="w-4 h-4" />
        </span>
        <h2 className="text-xs font-bold uppercase tracking-widest text-ink-600">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function ParamTable({ rows }: { rows: FgCoaParamRow[] }) {
  if (!rows?.length) return <p className="px-5 py-4 text-sm text-ink-300">No parameters included.</p>
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-cream-200">
        <thead className="bg-cream-50">
          <tr>
            {['Parameter', 'Result', 'Tolerance / Spec', 'Method'].map(h => (
              <th key={h} className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-ink-300">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-cream-100">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-cream-50/60 transition-colors">
              <td className="px-5 py-3 text-sm text-ink-600 font-medium leading-snug max-w-[260px]">{row.label}</td>
              <td className="px-5 py-3 text-sm text-ink-500 whitespace-nowrap">
                {row.result || <span className="text-ink-300">—</span>}
              </td>
              <td className="px-5 py-3 text-sm text-ink-400 whitespace-nowrap">{row.tolerance || '—'}</td>
              <td className="px-5 py-3 text-sm text-ink-400 whitespace-nowrap">{row.method || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function LabReportViewPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [report, setReport] = useState<FgCoaRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    fgCoaApi.get(Number(id))
      .then(res => setReport(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false))
  }, [id])

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Spinner size={32} className="text-brand-500 mx-auto" />
            <p className="mt-3 text-sm text-ink-400 font-medium">Loading COA record...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (notFound || !report) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="bg-cream-200 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-ink-400" />
            </div>
            <p className="text-sm font-semibold text-ink-500">COA record not found</p>
            <button onClick={() => router.push('/lab-reports')} className="btn-outline mt-4 text-sm">
              Back to Lab Reports
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const isIncluded = (r: FgCoaParamRow) => r.included === true
  const sensoryRows  = (report.sensory  ?? []).filter(isIncluded)
  const physicalRows = (report.physical ?? []).filter(isIncluded)
  const chemicalRows = (report.chemical ?? []).filter(isIncluded)

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 space-y-6 animate-fade-in-up">

        {/* ── Top bar ── */}
        <div className="glass-strong sticky top-0 z-30 -mx-3 sm:-mx-6 px-3 sm:px-6 py-3 flex items-center justify-between gap-3 rounded-none sm:rounded-2xl shadow-soft">
          <button
            onClick={() => router.push('/lab-reports')}
            className="btn-ghost gap-2 text-sm px-3 py-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-2 rounded-xl bg-brand-500/10 shrink-0">
              <FlaskConical className="w-4 h-4 text-brand-600" />
            </span>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-ink-700 truncate leading-tight">
                COA — {report.coa_no}
              </h1>
              <p className="text-xs text-ink-300 hidden sm:block">CFPL.C5.F05 · Issue No: 01</p>
            </div>
          </div>

          <button
            onClick={() => window.open(`/lab-reports/${report.id}/print`, '_blank')}
            className="btn-outline gap-2 text-sm"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>

        {/* ── Document ID strip ── */}
        <div className="surface-card p-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-brand-500" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-300">Document Reference</p>
              <p className="text-xs font-mono text-ink-500 mt-0.5">CFPL.C5.F05 · Issue No: 01</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-300 mb-0.5">COA No.</p>
              <p className="font-mono text-lg font-bold text-brand-600">{report.coa_no}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-300 mb-0.5">COA Dated</p>
              <p className="text-sm font-semibold text-ink-600 tabular-nums">{formatDate(report.coa_dated)}</p>
            </div>
          </div>
        </div>

        {/* ── Product Information ── */}
        <SectionCard icon={Package} title="Product Information">
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
            <div className="sm:col-span-2">
              <Field label="Sample Name" value={report.sample_name} />
            </div>
            <Field label="Sample Type" value={SAMPLE_TYPE_LABELS[report.sample_type] || report.sample_type} />
            <Field label="Batch Qty" value={report.batch_qty} />
            <Field label="FG Batch No." value={report.batch_no} />
            <Field label="Sampling Date" value={formatDate(report.sampling_date)} />
            <Field label="Ingredient Name" value={report.ingredient_name} />
            <Field label="Country of Origin" value={report.country_of_origin} />
            <Field label="Packing Date" value={formatDate(report.packing_date)} />
            <Field label="Expiry Date" value={formatDate(report.expiry_date)} />
            <Field label="Shelf Life" value={report.shelf_life} />
            <Field label="Packaging Type" value={report.packaging_type} />
            {report.storage_condition && (
              <div className="sm:col-span-2 lg:col-span-3">
                <Field label="Storage Condition" value={report.storage_condition} />
              </div>
            )}
          </div>
        </SectionCard>

        {/* ── Customer & Compliance ── */}
        <SectionCard icon={User} title="Customer & Compliance" color="sky">
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <Field label="ASIN Code / Article Code" value={report.asin_code} />
            <Field label="Customer Name" value={report.customer_name} />
            {report.allergen_declaration && (
              <div className="sm:col-span-2">
                <Field label="Allergen Declaration / EAN Code" value={report.allergen_declaration} />
              </div>
            )}
          </div>
        </SectionCard>

        {/* ── Organoleptic ── */}
        <SectionCard icon={Microscope} title="Organoleptic / Sensory Parameters" color="emerald">
          <ParamTable rows={sensoryRows} />
        </SectionCard>

        {/* ── Physical ── */}
        <SectionCard icon={ShieldCheck} title="Physical Parameters" color="amber">
          <ParamTable rows={physicalRows} />
        </SectionCard>

        {/* ── Chemical ── */}
        <SectionCard icon={Beaker} title="Chemical Parameters" color="sky">
          <ParamTable rows={chemicalRows} />
        </SectionCard>

        {/* ── Remarks ── */}
        {report.remarks && (
          <SectionCard icon={FileText} title="Remarks">
            <div className="p-5">
              <p className="text-sm text-ink-600 leading-relaxed">{report.remarks}</p>
            </div>
          </SectionCard>
        )}

        {/* ── Signatories ── */}
        <SectionCard icon={User} title="Signatories">
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="border border-cream-200 rounded-xl p-4 text-center">
              <p className="text-base font-semibold text-ink-600 mb-1">{report.analysed_by || '—'}</p>
              <div className="border-t border-cream-300 pt-2 mt-2">
                <p className="text-[11px] text-ink-300 uppercase tracking-widest font-semibold">Analysed By</p>
                <p className="text-xs text-ink-400 mt-0.5">Quality Control Executive</p>
              </div>
            </div>
            <div className="border border-cream-200 rounded-xl p-4 text-center">
              <p className="text-base font-semibold text-ink-600 mb-1">{report.verified_by || '—'}</p>
              <div className="border-t border-cream-300 pt-2 mt-2">
                <p className="text-[11px] text-ink-300 uppercase tracking-widest font-semibold">Verified By</p>
                <p className="text-xs text-ink-400 mt-0.5">Quality Manager</p>
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="h-4" />
      </div>
    </DashboardLayout>
  )
}
