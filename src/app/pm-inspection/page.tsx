'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import PageHeader from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Loader'
import {
  Wrench,
  RefreshCw,
  ClipboardCheck,
  Download,
  Pencil,
  Trash2,
  FileText,
  ListChecks,
  Printer,
  Eye,
} from 'lucide-react'
import { formatDateShort, formatDateTime } from '@/lib/date-utils'
import {
  listPMInwards,
  listPMInspections,
  deletePMInspection,
  type PMInwardRow,
  type PMInspectionRecord,
} from '@/lib/api/pm-inspection'
import { PM_GRN_SESSION_KEY } from '@/lib/pm-inspection-layout'

type Tab = 'pending' | 'records'

export default function PMInspectionPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('pending')

  // Pending Inspections (live PM inwards)
  const [rows, setRows] = useState<PMInwardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Records (saved inspections from pm_inspections table)
  const [records, setRecords] = useState<PMInspectionRecord[]>([])
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [recordsError, setRecordsError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const handleProceed = (row: PMInwardRow) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(PM_GRN_SESSION_KEY, JSON.stringify(row))
    }
    const qs = new URLSearchParams({
      company: row.company,
      txn: row.transaction_no || '',
    }).toString()
    router.push(`/pm-inspection/create?${qs}`)
  }

  const fetchRows = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await listPMInwards()
      setRows(res.records || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load PM inwards')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  const fetchRecords = async () => {
    try {
      setRecordsLoading(true)
      setRecordsError(null)
      const res = await listPMInspections({ limit: 500 })
      setRecords(res || [])
    } catch (e: any) {
      setRecordsError(e?.message || 'Failed to load inspection records')
      setRecords([])
    } finally {
      setRecordsLoading(false)
    }
  }

  useEffect(() => {
    fetchRows()
    fetchRecords()
  }, [])

  const handleView = (id: number) => {
    router.push(`/pm-inspection/${id}`)
  }

  const handleEdit = (id: number) => {
    router.push(`/pm-inspection/create?id=${id}`)
  }

  const handlePrint = (id: number) => {
    // Open in a new tab so the records list stays put. The print page
    // auto-triggers window.print() once the record has loaded.
    if (typeof window !== 'undefined') {
      window.open(`/pm-inspection/${id}/print`, '_blank', 'noopener')
    }
  }

  const handleDelete = async (rec: PMInspectionRecord) => {
    const label = rec.sr_no || `#${rec.id}`
    const ok = window.confirm(
      `Delete inspection ${label}? This cannot be undone.`,
    )
    if (!ok) return
    try {
      setDeletingId(rec.id)
      await deletePMInspection(rec.id)
      setRecords((prev) => prev.filter((r) => r.id !== rec.id))
    } catch (e: any) {
      alert(e?.message || 'Failed to delete inspection')
    } finally {
      setDeletingId(null)
    }
  }

  const refreshActiveTab = () => {
    if (tab === 'pending') fetchRows()
    else fetchRecords()
  }

  const fmtQty = (q: number) =>
    Number.isInteger(q) ? q.toString() : q.toLocaleString(undefined, { maximumFractionDigits: 3 })

  const handleDownloadCSV = () => {
    if (!rows.length) return
    const headers = [
      'Company',
      'GRN No.',
      'Transaction No.',
      'Entry Date',
      'Vendor / Supplier',
      'Challan No.',
      'Invoice No.',
      'Vehicle No.',
      'Items',
      'Total Qty',
    ]
    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v)
      return `"${s.replace(/"/g, '""')}"`
    }
    const lines = [
      headers.map(escape).join(','),
      ...rows.map((r) =>
        [
          r.company,
          r.grn_number || '',
          r.transaction_no || '',
          r.entry_date || '',
          r.vendor_supplier_name || '',
          r.challan_number || '',
          r.invoice_number || '',
          r.vehicle_number || '',
          r.items || '',
          fmtQty(r.total_quantity),
        ]
          .map(escape)
          .join(','),
      ),
    ]
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const today = new Date().toISOString().slice(0, 10)
    a.download = `pm-inwards-${today}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownloadRecordsCSV = () => {
    if (!records.length) return
    const headers = [
      'Sr. No.',
      'Company',
      'GRN No.',
      'Inspection Date',
      'Received Date',
      'Supplier',
      'Material',
      'Challan No.',
      'Invoice No.',
      'Vehicle No.',
      'Quantity',
      'COA',
      'Done By',
      'Verified By',
      'Created At',
    ]
    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v)
      return `"${s.replace(/"/g, '""')}"`
    }
    const lines = [
      headers.map(escape).join(','),
      ...records.map((r) =>
        [
          r.sr_no || r.id,
          r.company,
          r.grn_number || '',
          r.inspection_date || '',
          r.received_date || '',
          r.supplier_name || '',
          r.material_description || '',
          r.challan_no || '',
          r.invoice_no || '',
          r.vehicle_no || '',
          r.quantity || '',
          r.coa_received || '',
          r.done_by || '',
          r.verified_by || '',
          r.created_at || '',
        ]
          .map(escape)
          .join(','),
      ),
    ]
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const today = new Date().toISOString().slice(0, 10)
    a.download = `pm-inspection-records-${today}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const isBusy = tab === 'pending' ? loading : recordsLoading

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto">
        <PageHeader
          title="PM Inspection"
          subtitle="Live PM (Packing Material) inward GRNs from Inventory"
          icon={Wrench}
          actions={
            <button
              onClick={refreshActiveTab}
              disabled={isBusy}
              className="btn-primary disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${isBusy ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          }
        />

        {/* Tab swap */}
        <div className="mb-4 inline-flex rounded-xl border border-cream-300 bg-cream-50 p-1 shadow-soft">
          <TabButton
            active={tab === 'pending'}
            onClick={() => setTab('pending')}
            icon={ListChecks}
            label="Pending Inspections"
            count={rows.length}
          />
          <TabButton
            active={tab === 'records'}
            onClick={() => setTab('records')}
            icon={FileText}
            label="Records"
            count={records.length}
          />
        </div>

        {tab === 'pending' ? (
          <PendingSection
            rows={rows}
            loading={loading}
            error={error}
            onRetry={fetchRows}
            onProceed={handleProceed}
            onDownload={handleDownloadCSV}
            fmtQty={fmtQty}
          />
        ) : (
          <RecordsSection
            records={records}
            loading={recordsLoading}
            error={recordsError}
            onRetry={fetchRecords}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPrint={handlePrint}
            deletingId={deletingId}
            onDownload={handleDownloadRecordsCSV}
          />
        )}
      </div>
    </DashboardLayout>
  )
}

// ── Tab button ────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
  count: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all
        ${
          active
            ? 'bg-white text-brand-600 shadow-soft'
            : 'text-ink-400 hover:text-ink-600'
        }`}
    >
      <Icon className="w-4 h-4" />
      {label}
      <span
        className={`tabular-nums text-[11px] px-1.5 py-0.5 rounded-md ${
          active ? 'bg-brand-50 text-brand-700' : 'bg-cream-200 text-ink-500'
        }`}
      >
        {count}
      </span>
    </button>
  )
}

// ── Pending Inspections (live PM inwards) ─────────────────────────────

function PendingSection({
  rows,
  loading,
  error,
  onRetry,
  onProceed,
  onDownload,
  fmtQty,
}: {
  rows: PMInwardRow[]
  loading: boolean
  error: string | null
  onRetry: () => void
  onProceed: (row: PMInwardRow) => void
  onDownload: () => void
  fmtQty: (q: number) => string
}) {
  return (
    <div className="surface-card overflow-hidden animate-fade-in">
      <div className="px-5 py-4 border-b border-cream-300 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink-600">All PM Inwards</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-400 font-medium tabular-nums">
            {rows.length} records
          </span>
          <button
            onClick={onDownload}
            disabled={!rows.length || loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                       bg-cream-50 text-ink-600 border border-cream-300 shadow-soft
                       hover:border-brand-500 hover:text-brand-500
                       disabled:opacity-50 disabled:pointer-events-none
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30
                       transition-all"
            title="Download as Excel (CSV)"
          >
            <Download className="w-3.5 h-3.5" />
            Download Excel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <Spinner size={32} className="text-brand-500 mx-auto" />
          <p className="mt-3 text-sm text-ink-400 font-medium">Loading PM inwards...</p>
        </div>
      ) : error ? (
        <div className="p-10 text-center">
          <p className="text-sm text-red-600 font-medium">{error}</p>
          <button onClick={onRetry} className="mt-4 btn-secondary">
            Try again
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-sm text-ink-400 font-medium">No PM inwards found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-cream-300">
            <thead className="bg-cream-100">
              <tr>
                {[
                  'Company',
                  'GRN No.',
                  'Entry Date',
                  'Vendor / Supplier',
                  'Challan No.',
                  'Invoice No.',
                  'Vehicle No.',
                  'Items',
                  'Total Qty',
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
                <th className="text-right text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300 bg-white">
              {rows.map((r) => (
                <tr
                  key={`${r.company}-${r.transaction_no}`}
                  className="hover:bg-cream-100/50 transition-colors"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-[11px] font-semibold tracking-wide">
                      {r.company}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-ink-600">
                    {r.grn_number || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-ink-500">
                    {formatDateShort(r.entry_date)}
                  </td>
                  <td
                    className="px-4 py-3 text-sm text-ink-600 max-w-[220px] truncate"
                    title={r.vendor_supplier_name || ''}
                  >
                    {r.vendor_supplier_name || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-ink-500 font-mono">
                    {r.challan_number || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-ink-500 font-mono">
                    {r.invoice_number || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-ink-500 font-mono">
                    {r.vehicle_number || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-500 max-w-[360px] truncate" title={r.items}>
                    {r.items || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-ink-600 font-semibold tabular-nums">
                    {fmtQty(r.total_quantity)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <button
                      onClick={() => onProceed(r)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                                 bg-brand-500 text-white shadow-soft
                                 hover:shadow-brand hover:-translate-y-0.5
                                 active:translate-y-0
                                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30
                                 transition-all"
                      title="Proceed Inspection"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5" />
                      Proceed Inspection
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Records (saved inspections from pm_inspections table) ─────────────

function RecordsSection({
  records,
  loading,
  error,
  onRetry,
  onView,
  onEdit,
  onDelete,
  onPrint,
  deletingId,
  onDownload,
}: {
  records: PMInspectionRecord[]
  loading: boolean
  error: string | null
  onRetry: () => void
  onView: (id: number) => void
  onEdit: (id: number) => void
  onDelete: (rec: PMInspectionRecord) => void
  onPrint: (id: number) => void
  deletingId: number | null
  onDownload: () => void
}) {
  return (
    <div className="surface-card overflow-hidden animate-fade-in">
      <div className="px-5 py-4 border-b border-cream-300 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink-600">Inspection Records</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-400 font-medium tabular-nums">
            {records.length} records
          </span>
          <button
            onClick={onDownload}
            disabled={!records.length || loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                       bg-cream-50 text-ink-600 border border-cream-300 shadow-soft
                       hover:border-brand-500 hover:text-brand-500
                       disabled:opacity-50 disabled:pointer-events-none
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30
                       transition-all"
            title="Download as Excel (CSV)"
          >
            <Download className="w-3.5 h-3.5" />
            Download Excel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <Spinner size={32} className="text-brand-500 mx-auto" />
          <p className="mt-3 text-sm text-ink-400 font-medium">Loading inspection records...</p>
        </div>
      ) : error ? (
        <div className="p-10 text-center">
          <p className="text-sm text-red-600 font-medium">{error}</p>
          <button onClick={onRetry} className="mt-4 btn-secondary">
            Try again
          </button>
        </div>
      ) : records.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-sm text-ink-400 font-medium">No inspection records yet.</p>
          <p className="mt-1 text-xs text-ink-400">
            Open the <span className="font-semibold">Pending Inspections</span> tab and proceed an inward to create one.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-cream-300">
            <thead className="bg-cream-100">
              <tr>
                {[
                  'Sr. No.',
                  'Company',
                  'GRN No.',
                  'Inspection Date',
                  'Supplier',
                  'Material',
                  'Quantity',
                  'COA',
                  'Done By',
                  'Created',
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
                <th className="text-right text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-300 bg-white">
              {records.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-cream-100/50 transition-colors"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold tabular-nums">
                    <button
                      onClick={() => onView(r.id)}
                      className="text-brand-600 hover:underline focus:outline-none"
                      title="View inspection"
                    >
                      {r.sr_no || `#${r.id}`}
                    </button>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-[11px] font-semibold tracking-wide">
                      {r.company}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-ink-600">
                    {r.grn_number || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-ink-500">
                    {formatDateShort(r.inspection_date)}
                  </td>
                  <td
                    className="px-4 py-3 text-sm text-ink-600 max-w-[200px] truncate"
                    title={r.supplier_name || ''}
                  >
                    {r.supplier_name || '—'}
                  </td>
                  <td
                    className="px-4 py-3 text-sm text-ink-500 max-w-[260px] truncate"
                    title={r.material_description || ''}
                  >
                    {r.material_description || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-ink-600 tabular-nums">
                    {r.quantity || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    {r.coa_received === 'yes' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold tracking-wide">
                        Yes
                      </span>
                    ) : r.coa_received === 'no' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-red-50 text-red-700 font-semibold tracking-wide">
                        No
                      </span>
                    ) : (
                      <span className="text-ink-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-ink-500">
                    {r.done_by || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-ink-400">
                    {formatDateTime(r.created_at)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => onView(r.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold
                                   bg-cream-50 text-ink-600 border border-cream-300 shadow-soft
                                   hover:border-brand-500 hover:text-brand-500
                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30
                                   transition-all"
                        title="View"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                      <button
                        onClick={() => onPrint(r.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold
                                   bg-cream-50 text-ink-600 border border-cream-300 shadow-soft
                                   hover:border-brand-500 hover:text-brand-500
                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30
                                   transition-all"
                        title="Print"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print
                      </button>
                      <button
                        onClick={() => onEdit(r.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold
                                   bg-cream-50 text-ink-600 border border-cream-300 shadow-soft
                                   hover:border-brand-500 hover:text-brand-500
                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30
                                   transition-all"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(r)}
                        disabled={deletingId === r.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold
                                   bg-red-50 text-red-600 border border-red-200 shadow-soft
                                   hover:bg-red-500 hover:text-white hover:border-red-500
                                   disabled:opacity-50 disabled:pointer-events-none
                                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30
                                   transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {deletingId === r.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
