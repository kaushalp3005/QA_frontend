'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import PageHeader from '@/components/ui/PageHeader'
import { ArrowLeft, ClipboardCheck, Save } from 'lucide-react'
import {
  FORM_META,
  HEADER_FIELDS,
  VISUAL_VERIFICATION_PARAMS,
  INSPECTION_PARAMS,
  FOOTER_FIELDS,
  STATUS_SUGGESTIONS,
  PM_GRN_SESSION_KEY,
  buildEmptyForm,
  emptyParamMap,
  type PMInspectionFormData,
  type ParamRowDef,
} from '@/lib/pm-inspection-layout'
import {
  createPMInspection,
  getPMInspection,
  updatePMInspection,
  type PMInwardRow,
} from '@/lib/api/pm-inspection'

export default function PMInspectionCreatePage() {
  const router = useRouter()
  const params = useSearchParams()
  const company = params.get('company') || ''
  const txn = params.get('txn') || ''
  const editId = params.get('id') || ''
  const isEdit = Boolean(editId)

  const [grn, setGrn] = useState<PMInwardRow | null>(null)
  const [form, setForm] = useState<PMInspectionFormData>(() => buildEmptyForm(null))
  const [submitting, setSubmitting] = useState(false)
  const [loadingRecord, setLoadingRecord] = useState(isEdit)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Edit mode: load the existing record from the API and prefill the form.
  // Create mode: pull the GRN row stashed by the list page (if any) and
  // build an empty form prefilled from it.
  useEffect(() => {
    if (typeof window === 'undefined') return

    if (isEdit) {
      let cancelled = false
      ;(async () => {
        try {
          setLoadingRecord(true)
          setLoadError(null)
          const rec = await getPMInspection(editId)
          if (cancelled) return
          // Merge the saved record over an empty form so any newly-added
          // params in the layout file get default empty entries.
          const blank = buildEmptyForm(null)
          const merged: PMInspectionFormData = {
            ...blank,
            company: rec.company || '',
            transaction_no: rec.transaction_no || '',
            grn_number: rec.grn_number || '',
            sr_no: rec.sr_no || '',
            received_date: rec.received_date || '',
            inspection_date: rec.inspection_date || '',
            material_description: rec.material_description || '',
            challan_no: rec.challan_no || '',
            invoice_no: rec.invoice_no || '',
            supplier_name: rec.supplier_name || '',
            vehicle_no: rec.vehicle_no || '',
            coa_received: (rec.coa_received as 'yes' | 'no' | '') || '',
            quantity: rec.quantity || '',
            visual_verification: {
              ...emptyParamMap(VISUAL_VERIFICATION_PARAMS),
              ...(rec.visual_verification || {}),
            },
            inspection_parameters: {
              ...emptyParamMap(INSPECTION_PARAMS),
              ...(rec.inspection_parameters || {}),
            },
            remarks: rec.remarks || '',
            done_by: rec.done_by || '',
            verified_by: rec.verified_by || '',
          }
          setForm(merged)
        } catch (e: any) {
          if (!cancelled) setLoadError(e?.message || 'Failed to load inspection')
        } finally {
          if (!cancelled) setLoadingRecord(false)
        }
      })()
      return () => {
        cancelled = true
      }
    }

    try {
      const raw = sessionStorage.getItem(PM_GRN_SESSION_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as PMInwardRow
        if (
          parsed &&
          (!company || parsed.company === company) &&
          (!txn || parsed.transaction_no === txn)
        ) {
          setGrn(parsed)
          setForm(buildEmptyForm(parsed))
          return
        }
      }
    } catch {
      // ignore — fall through to empty form
    }
    setForm(buildEmptyForm(null))
  }, [company, txn, editId, isEdit])

  const updateField = <K extends keyof PMInspectionFormData>(key: K, value: PMInspectionFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const updateParam = (
    section: 'visual_verification' | 'inspection_parameters',
    key: string,
    field: 'observation' | 'status',
    value: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: { ...prev[section][key], [field]: value },
      },
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        ...form,
        // backend Date columns reject empty strings — coerce to null
        received_date: form.received_date || null,
        inspection_date: form.inspection_date || null,
        sr_no: form.sr_no || null,
      }
      if (isEdit) {
        // Update — only mutable fields; identity (company/transaction_no/grn) is frozen.
        const { company: _c, transaction_no: _t, grn_number: _g, ...mutable } = payload
        const saved = await updatePMInspection(editId, mutable)
        alert(`Inspection #${saved.sr_no || saved.id} updated.`)
      } else {
        const saved = await createPMInspection(payload)
        alert(`Inspection #${saved.sr_no || saved.id} saved.`)
        sessionStorage.removeItem(PM_GRN_SESSION_KEY)
      }
      router.push('/pm-inspection')
    } catch (err: any) {
      alert(err?.message || 'Failed to save inspection')
    } finally {
      setSubmitting(false)
    }
  }

  const headerEntries = useMemo(() => HEADER_FIELDS, [])

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title={isEdit ? 'PM Inspection — Edit' : 'PM Inspection — New Entry'}
          subtitle={
            isEdit
              ? `${form.grn_number || ''} · ${form.supplier_name || ''}`
              : grn
              ? `${grn.grn_number || ''} · ${grn.vendor_supplier_name || ''}`
              : 'Packing Material Inspection Record'
          }
          icon={ClipboardCheck}
          actions={
            <button
              onClick={() => router.push('/pm-inspection')}
              className="btn-outline"
              type="button"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back
            </button>
          }
        />

        {isEdit && loadingRecord ? (
          <div className="surface-card p-12 text-center">
            <p className="text-sm text-ink-400 font-medium">Loading inspection…</p>
          </div>
        ) : loadError ? (
          <div className="surface-card p-10 text-center">
            <p className="text-sm text-red-600 font-medium">{loadError}</p>
            <button
              type="button"
              onClick={() => router.push('/pm-inspection')}
              className="mt-4 btn-secondary"
            >
              Back to records
            </button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Form metadata strip (mirrors the printed header) */}
          <div className="surface-card p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <Meta label="Form Code" value={FORM_META.formCode} />
            <Meta label="Issue No." value={FORM_META.issueNo} />
            <Meta label="Issue Date" value={FORM_META.issueDate} />
            <Meta label="Revision No." value={FORM_META.revisionNo} />
          </div>

          {/* Header fields */}
          <Section title="GRN & Inspection Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {headerEntries.map((def) => (
                <div key={def.key} className={def.fullWidth ? 'md:col-span-2' : ''}>
                  <label className="block text-[12px] font-semibold text-ink-500 mb-1">
                    {def.label}
                    {def.required && <span className="text-brand-500 ml-0.5">*</span>}
                  </label>
                  {def.type === 'yesno' ? (
                    <select
                      value={(form as any)[def.key]}
                      onChange={(e) => updateField(def.key as any, e.target.value as any)}
                      className="input-base"
                      required={def.required}
                    >
                      <option value="">— Select —</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  ) : (
                    <input
                      type={def.type === 'date' ? 'date' : def.type === 'number' ? 'number' : 'text'}
                      value={(form as any)[def.key]}
                      onChange={(e) => updateField(def.key as any, e.target.value as any)}
                      className="input-base"
                      placeholder={def.source === 'auto' ? 'auto-generated' : ''}
                      required={def.required}
                    />
                  )}
                </div>
              ))}
            </div>
          </Section>

          {/* Visual Verification */}
          <ParamSection
            title="Visual Verification"
            defs={VISUAL_VERIFICATION_PARAMS}
            values={form.visual_verification}
            onChange={(k, f, v) => updateParam('visual_verification', k, f, v)}
            statusUseSuggestions
          />

          {/* Inspection Parameters */}
          <ParamSection
            title="Inspection Parameters"
            defs={INSPECTION_PARAMS}
            values={form.inspection_parameters}
            onChange={(k, f, v) => updateParam('inspection_parameters', k, f, v)}
          />

          {/* Footer fields */}
          <Section title="Remarks & Sign-off">
            <div className="grid grid-cols-1 gap-4">
              {FOOTER_FIELDS.map((def) => (
                <div key={def.key}>
                  <label className="block text-[12px] font-semibold text-ink-500 mb-1">
                    {def.label}
                  </label>
                  {def.type === 'textarea' ? (
                    <textarea
                      rows={3}
                      value={form[def.key]}
                      onChange={(e) => updateField(def.key, e.target.value)}
                      className="input-base"
                    />
                  ) : (
                    <input
                      type="text"
                      value={form[def.key]}
                      onChange={(e) => updateField(def.key, e.target.value)}
                      className="input-base"
                    />
                  )}
                </div>
              ))}
            </div>
          </Section>

          {/* Submit row */}
          <div className="flex items-center justify-end gap-3 pb-8">
            <button
              type="button"
              onClick={() => router.push('/pm-inspection')}
              className="btn-outline"
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              <Save className="w-4 h-4 mr-1.5" />
              {submitting ? 'Saving…' : isEdit ? 'Update Inspection' : 'Save Inspection'}
            </button>
          </div>
        </form>
        )}
      </div>
    </DashboardLayout>
  )
}

// ── Small presentational pieces ──────────────────────────────────────

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="text-sm font-semibold text-ink-600 mt-0.5">{value}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface-card p-5">
      <h2 className="text-base font-semibold text-ink-600 mb-4">{title}</h2>
      {children}
    </div>
  )
}

function ParamSection({
  title,
  defs,
  values,
  onChange,
  statusUseSuggestions,
}: {
  title: string
  defs: ParamRowDef[]
  values: Record<string, { observation: string; status: string }>
  onChange: (key: string, field: 'observation' | 'status', value: string) => void
  statusUseSuggestions?: boolean
}) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="px-5 py-3 border-b border-cream-300 bg-cream-100">
        <h2 className="text-base font-semibold text-ink-600">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-cream-300">
          <thead className="bg-cream-100/50">
            <tr>
              <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-4 py-2.5 w-1/3">
                Parameter
              </th>
              <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-4 py-2.5">
                Observation
              </th>
              <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-4 py-2.5">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-300 bg-white">
            {defs.map((def) => {
              const v = values[def.key] || { observation: '', status: '' }
              return (
                <tr key={def.key}>
                  <td className="px-4 py-2.5 text-sm font-medium text-ink-600">{def.parameter}</td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={v.observation}
                      onChange={(e) => onChange(def.key, 'observation', e.target.value)}
                      placeholder={def.observationPlaceholder}
                      className="input-base"
                    />
                  </td>
                  <td className="px-3 py-2">
                    {statusUseSuggestions ? (
                      <input
                        list={`status-options-${def.key}`}
                        value={v.status}
                        onChange={(e) => onChange(def.key, 'status', e.target.value)}
                        placeholder={def.statusPlaceholder}
                        className="input-base"
                      />
                    ) : (
                      <input
                        type="text"
                        value={v.status}
                        onChange={(e) => onChange(def.key, 'status', e.target.value)}
                        placeholder={def.statusPlaceholder}
                        className="input-base"
                      />
                    )}
                    {statusUseSuggestions && (
                      <datalist id={`status-options-${def.key}`}>
                        {STATUS_SUGGESTIONS.map((s) => (
                          <option key={s} value={s} />
                        ))}
                      </datalist>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
