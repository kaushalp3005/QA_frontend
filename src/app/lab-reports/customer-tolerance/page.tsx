'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import DashboardLayout from '@/components/layout/DashboardLayout'
import {
  ArrowLeft,
  Plus,
  Save,
  Trash2,
  Pencil,
  X,
  Search,
  Settings2,
  Package,
  Microscope,
  ShieldCheck,
  Beaker,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react'
import {
  customerToleranceApi,
  type CustomerToleranceRecord,
  type ToleranceParam,
} from '@/lib/api/documentations'

// ── Types ──────────────────────────────────────────────────────────────────────

interface KVRow {
  key: string
  tolerance: string
  method: string
}

interface FormState {
  id?: number
  customer_name: string
  sample_name: string
  organoleptic_sensory: KVRow[]
  physical: KVRow[]
  chemical: KVRow[]
  remarks: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** JSONB section → KVRow[] (handles both `string` and `{tolerance, method}` shapes) */
function jsonbToRows(section: Record<string, ToleranceParam | string> | undefined): KVRow[] {
  if (!section || typeof section !== 'object') return []
  return Object.entries(section).map(([key, val]) => {
    if (typeof val === 'string') return { key, tolerance: val, method: '' }
    return { key, tolerance: val?.tolerance ?? '', method: val?.method ?? '' }
  })
}

/** KVRow[] → JSONB section. Skips empty keys. Stores plain string when method is blank, else object. */
function rowsToJsonb(rows: KVRow[]): Record<string, ToleranceParam | string> {
  const out: Record<string, ToleranceParam | string> = {}
  for (const r of rows) {
    const key = r.key.trim()
    if (!key) continue
    if (r.method.trim()) {
      out[key] = { tolerance: r.tolerance, method: r.method }
    } else {
      out[key] = r.tolerance
    }
  }
  return out
}

const blankForm: FormState = {
  customer_name: '',
  sample_name: '',
  organoleptic_sensory: [],
  physical: [],
  chemical: [],
  remarks: '',
}

// ── Param Section Editor ───────────────────────────────────────────────────────

function ParamSectionEditor({
  title,
  icon: Icon,
  color,
  rows,
  onChange,
}: {
  title: string
  icon: React.ElementType
  color: 'emerald' | 'amber' | 'sky'
  rows: KVRow[]
  onChange: (rows: KVRow[]) => void
}) {
  const [open, setOpen] = useState(true)
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber:   'bg-amber-50 text-amber-700 border-amber-200',
    sky:     'bg-sky-50 text-sky-700 border-sky-200',
  }
  const update = (i: number, field: keyof KVRow, val: string) =>
    onChange(rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  const addRow = () => onChange([...rows, { key: '', tolerance: '', method: '' }])
  const removeRow = (i: number) => onChange(rows.filter((_, idx) => idx !== i))

  return (
    <div className="surface-card rounded-2xl overflow-hidden shadow-soft">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-5 py-4 border-b border-cream-200 ${colorMap[color]} text-left`}
      >
        <span className="p-2 rounded-xl bg-white/60">
          <Icon className="w-4 h-4" />
        </span>
        <div className="flex-1">
          <h3 className="text-xs font-bold uppercase tracking-widest">{title}</h3>
          <p className="text-[11px] opacity-70 mt-0.5 font-normal normal-case tracking-normal">
            {rows.length} parameter{rows.length === 1 ? '' : 's'}
          </p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 opacity-60" /> : <ChevronDown className="w-4 h-4 opacity-60" />}
      </button>

      {open && (
        <div className="p-5 space-y-3">
          {/* Column headers */}
          {rows.length > 0 && (
            <div className="hidden sm:grid grid-cols-[2fr_1.5fr_1.2fr_auto] gap-2 px-2 pb-1 border-b border-cream-200">
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-300">Parameter Name</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-300">Tolerance / Spec</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-300">Method (optional)</p>
              <span />
            </div>
          )}

          {/* Rows */}
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[2fr_1.5fr_1.2fr_auto] gap-2 items-start">
              <input
                value={row.key}
                onChange={e => update(i, 'key', e.target.value)}
                placeholder="e.g. Count (NOS)"
                className="input-base"
              />
              <input
                value={row.tolerance}
                onChange={e => update(i, 'tolerance', e.target.value)}
                placeholder="e.g. Max 3.0%, Absent, <1%"
                className="input-base"
              />
              <input
                value={row.method}
                onChange={e => update(i, 'method', e.target.value)}
                placeholder="e.g. FSSAI"
                className="input-base"
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="p-2 rounded-lg text-ink-300 hover:text-danger-600 hover:bg-danger-50 transition-colors self-center"
                title="Remove row"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {rows.length === 0 && (
            <p className="text-center text-xs text-ink-300 py-3">No parameters yet — click "Add Parameter" below to start.</p>
          )}

          <button
            type="button"
            onClick={addRow}
            className="w-full mt-2 flex items-center justify-center gap-1.5 border-2 border-dashed border-cream-300 hover:border-brand-500 text-ink-400 hover:text-brand-500 rounded-xl py-2.5 text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Parameter
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function CustomerToleranceManagePage() {
  const router = useRouter()
  const [records, setRecords] = useState<CustomerToleranceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CustomerToleranceRecord | null>(null)

  // Load list
  const fetchList = async () => {
    setLoading(true)
    try {
      const res = await customerToleranceApi.list()
      setRecords(res.data ?? [])
    } catch {
      setRecords([])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchList() }, [])

  // Open create form
  const openCreate = () => setEditing({ ...blankForm })

  // Open edit form from existing record
  const openEdit = (r: CustomerToleranceRecord) => {
    setEditing({
      id: r.id,
      customer_name: r.customer_name,
      sample_name: r.sample_name,
      organoleptic_sensory: jsonbToRows(r.organoleptic_sensory),
      physical: jsonbToRows(r.physical),
      chemical: jsonbToRows(r.chemical),
      remarks: r.remarks ?? '',
    })
  }

  // Save (create or update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    if (!editing.customer_name.trim() || !editing.sample_name.trim()) {
      toast.error('Customer Name and Sample Name are required.')
      return
    }
    setSaving(true)
    const payload = {
      customer_name: editing.customer_name.trim(),
      sample_name: editing.sample_name.trim(),
      organoleptic_sensory: rowsToJsonb(editing.organoleptic_sensory),
      physical: rowsToJsonb(editing.physical),
      chemical: rowsToJsonb(editing.chemical),
      remarks: editing.remarks.trim(),
    }
    try {
      if (editing.id) {
        await customerToleranceApi.update(editing.id, payload)
        toast.success('Tolerance record updated.')
      } else {
        await customerToleranceApi.create(payload)
        toast.success('Tolerance record created.')
      }
      setEditing(null)
      fetchList()
    } catch (err: any) {
      toast.error(err?.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  // Delete
  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await customerToleranceApi.remove(deleteTarget.id)
      toast.success('Deleted.')
      setDeleteTarget(null)
      fetchList()
    } catch (err: any) {
      toast.error(err?.message || 'Delete failed.')
    }
  }

  // Filter
  const filtered = records.filter(r =>
    r.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    r.sample_name.toLowerCase().includes(search.toLowerCase())
  )

  // ── Edit form view ────────────────────────────────────────────────────────────

  if (editing) {
    return (
      <DashboardLayout>
        <form onSubmit={handleSave} className="max-w-5xl mx-auto px-3 sm:px-6 py-6 space-y-5 animate-fade-in-up">

          {/* Sticky top bar */}
          <div className="glass-strong sticky top-0 z-30 -mx-3 sm:-mx-6 px-3 sm:px-6 py-3 flex items-center justify-between gap-3 rounded-none sm:rounded-2xl shadow-soft">
            <button type="button" onClick={() => setEditing(null)} className="btn-ghost gap-2 text-sm px-3 py-2">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-2 rounded-xl bg-brand-500/10 shrink-0">
                <Settings2 className="w-4 h-4 text-brand-600" />
              </span>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-bold text-ink-700 truncate">
                  {editing.id ? 'Edit Tolerance Spec' : 'New Tolerance Spec'}
                </h1>
                <p className="text-xs text-ink-300 hidden sm:block">customer_tolerance table</p>
              </div>
            </div>
            <button type="submit" disabled={saving} className="btn-primary gap-2 text-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span className="hidden sm:inline">{saving ? 'Saving…' : 'Save'}</span>
            </button>
          </div>

          {/* Identity card */}
          <div className="surface-card rounded-2xl overflow-hidden shadow-soft">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-cream-200 bg-cream-100/60">
              <span className="p-2 rounded-xl bg-brand-500/10">
                <Package className="w-4 h-4 text-brand-600" />
              </span>
              <h2 className="text-xs font-bold uppercase tracking-widest text-ink-600">Identification</h2>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-base">Customer Name *</label>
                <input
                  required
                  value={editing.customer_name}
                  onChange={e => setEditing({ ...editing, customer_name: e.target.value })}
                  placeholder="e.g. Trent Hypermarket Pvt Ltd."
                  className="input-base"
                />
              </div>
              <div>
                <label className="label-base">Sample Name *</label>
                <input
                  required
                  value={editing.sample_name}
                  onChange={e => setEditing({ ...editing, sample_name: e.target.value })}
                  placeholder="e.g. Whole Cashew - Roasted & Salted"
                  className="input-base"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label-base">Remarks</label>
                <textarea
                  rows={2}
                  value={editing.remarks}
                  onChange={e => setEditing({ ...editing, remarks: e.target.value })}
                  placeholder="Optional notes about this spec…"
                  className="input-base resize-none"
                />
              </div>
            </div>
          </div>

          {/* Three section editors */}
          <ParamSectionEditor
            title="Organoleptic / Sensory"
            icon={Microscope}
            color="emerald"
            rows={editing.organoleptic_sensory}
            onChange={rows => setEditing({ ...editing, organoleptic_sensory: rows })}
          />
          <ParamSectionEditor
            title="Physical"
            icon={ShieldCheck}
            color="amber"
            rows={editing.physical}
            onChange={rows => setEditing({ ...editing, physical: rows })}
          />
          <ParamSectionEditor
            title="Chemical"
            icon={Beaker}
            color="sky"
            rows={editing.chemical}
            onChange={rows => setEditing({ ...editing, chemical: rows })}
          />

          {/* Bottom action bar */}
          <div className="glass-strong sticky bottom-0 -mx-3 sm:-mx-6 px-3 sm:px-6 py-3 flex justify-end gap-3 rounded-none sm:rounded-2xl shadow-soft">
            <button type="button" onClick={() => setEditing(null)} className="btn-outline">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save Tolerance'}
            </button>
          </div>

          <div className="h-4" />
        </form>
      </DashboardLayout>
    )
  }

  // ── List view ────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-5 animate-fade-in-up">

        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/lab-reports')} className="btn-ghost gap-2 px-3 py-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Lab Reports</span>
            </button>
            <span className="hidden sm:inline-block w-px h-6 bg-cream-300" />
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-brand-500/10">
                <Settings2 className="w-4 h-4 text-brand-600" />
              </span>
              <div>
                <h1 className="text-base font-bold text-ink-700">Customer Tolerance</h1>
                <p className="text-xs text-ink-300">Manage customer-specific spec values used in COA</p>
              </div>
            </div>
          </div>
          <button onClick={openCreate} className="btn-primary gap-2">
            <Plus className="w-4 h-4" />
            Add Tolerance Spec
          </button>
        </div>

        {/* Search */}
        <div className="surface-card p-4 animate-fade-in">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-300" />
            <input
              type="text"
              placeholder="Search by customer or sample name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-base pl-10 pr-24"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-semibold text-ink-500 hover:text-brand-500 bg-cream-100 hover:bg-cream-200 rounded-md transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="surface-card overflow-hidden animate-fade-in">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <div className="bg-cream-200 w-14 h-14 rounded-full flex items-center justify-center">
                <Settings2 className="h-6 w-6 text-ink-400" />
              </div>
              <p className="text-sm font-semibold text-ink-500">No tolerance specs found</p>
              <p className="text-xs text-ink-400">{search ? 'Try a different search term.' : 'Click "Add Tolerance Spec" to add the first one.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-cream-300">
                <thead className="bg-cream-100">
                  <tr>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">Customer</th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3">Sample</th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3 whitespace-nowrap">Sensory</th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3 whitespace-nowrap">Physical</th>
                    <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3 whitespace-nowrap">Chemical</th>
                    <th className="text-right text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-5 py-3 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-300 bg-white">
                  {filtered.map(r => (
                    <tr key={r.id} className="hover:bg-cream-100/50 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-semibold text-ink-700">{r.customer_name}</td>
                      <td className="px-5 py-3.5 text-sm text-ink-500">{r.sample_name}</td>
                      <td className="px-5 py-3.5 text-xs text-ink-400 tabular-nums">
                        {Object.keys(r.organoleptic_sensory ?? {}).length}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-ink-400 tabular-nums">
                        {Object.keys(r.physical ?? {}).length}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-ink-400 tabular-nums">
                        {Object.keys(r.chemical ?? {}).length}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(r)}
                            className="p-1.5 rounded-md text-ink-400 hover:text-brand-500 hover:bg-cream-100 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(r)}
                            className="p-1.5 rounded-md text-ink-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* Footer count */}
        {!loading && (
          <div className="surface-card px-5 py-3">
            <p className="text-xs text-ink-400 font-medium tabular-nums">
              Showing <span className="text-ink-600 font-semibold">{filtered.length}</span> of{' '}
              <span className="text-ink-600 font-semibold">{records.length}</span> tolerance specs
            </p>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink-700/40 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => setDeleteTarget(null)} />
          <div className="relative w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl bg-white border border-cream-300 shadow-lift p-6 space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-danger-50 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-danger-600" />
              </div>
              <div>
                <p className="text-base font-bold text-ink-600">Delete Tolerance Spec</p>
                <p className="text-xs text-ink-400 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-ink-500">
              Delete <span className="font-bold text-ink-600">{deleteTarget.customer_name}</span> →{' '}
              <span className="font-bold text-ink-600">{deleteTarget.sample_name}</span>?
            </p>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 btn-outline justify-center">Cancel</button>
              <button onClick={handleDelete} className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-danger-600 hover:bg-danger-700 text-white text-sm font-semibold">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
