'use client'
import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Trash2, Check } from 'lucide-react'
import Time12Picker from '@/components/Time12Picker'
import { CHECKED_BY_OPTIONS, QC_VERIFIED_BY_OPTIONS, filterSignaturesByWarehouse } from '@/lib/signatures'
import { detectorsForWarehouse, findDetector } from '@/lib/metalDetectors'

export interface MDEditEntry {
  entry_date: string
  entry_time: string
  identification_no: string
  location: string
  customer_name: string
  product_name: string
  batch_lot_no: string
  sensitivity_fe: string
  sensitivity_nfe: string
  sensitivity_ss: string
  sensitivity_fe_checked: boolean
  sensitivity_nfe_checked: boolean
  sensitivity_ss_checked: boolean
  corrective_action_on_detector: string
  corrective_action_on_product: string
  calibrated_by: string
  verified_by: string
  remarks: string
}

interface Props {
  entries: MDEditEntry[]
  warehouse: string
  onChange: (entries: MDEditEntry[]) => void
}

function to12(t: string): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  if (isNaN(h)) return t
  const p = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${String(m || 0).padStart(2, '0')} ${p}`
}

const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1'
const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-amber-500'

export default function MetalDetectorEditRows({ entries, warehouse, onChange }: Props) {
  // Newest-friendly: first row open by default so there's always something to see.
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set(entries.length ? [0] : []))

  const detectors = detectorsForWarehouse(warehouse)
  const ws = warehouse as 'A185' | 'W202'
  const checkedOpts = filterSignaturesByWarehouse(CHECKED_BY_OPTIONS, ws).filter(o => o.name !== 'Other')
  const verifiedOpts = filterSignaturesByWarehouse(QC_VERIFIED_BY_OPTIONS, ws).filter(o => o.name !== 'Other')

  const toggle = (i: number) =>
    setExpanded(prev => {
      const n = new Set(prev)
      if (n.has(i)) n.delete(i)
      else n.add(i)
      return n
    })

  const patch = (i: number, p: Partial<MDEditEntry>) =>
    onChange(entries.map((e, idx) => (idx === i ? { ...e, ...p } : e)))

  // Picking a detector cascades its Location + Fe/NFe/SS specs into this row only.
  const applyDetector = (i: number, idNo: string) => {
    const det = findDetector(idNo, warehouse)
    patch(i, {
      identification_no: idNo,
      location: det?.location ?? entries[i].location,
      sensitivity_fe: det?.sensitivityFE ?? entries[i].sensitivity_fe,
      sensitivity_nfe: det?.sensitivityNFE ?? entries[i].sensitivity_nfe,
      sensitivity_ss: det?.sensitivitySS ?? entries[i].sensitivity_ss,
    })
  }

  const addRow = () => {
    const base = entries[entries.length - 1]
    const det = base ? findDetector(base.identification_no, warehouse) : detectors[0]
    const fresh: MDEditEntry = {
      entry_date: base?.entry_date || new Date().toISOString().split('T')[0],
      entry_time: base?.entry_time || new Date().toTimeString().slice(0, 5),
      identification_no: base?.identification_no || det?.identificationNo || '',
      location: base?.location || det?.location || '',
      customer_name: base?.customer_name || '',
      product_name: '',
      batch_lot_no: base?.batch_lot_no || '',
      sensitivity_fe: base?.sensitivity_fe || det?.sensitivityFE || '',
      sensitivity_nfe: base?.sensitivity_nfe || det?.sensitivityNFE || '',
      sensitivity_ss: base?.sensitivity_ss || det?.sensitivitySS || '',
      sensitivity_fe_checked: true,
      sensitivity_nfe_checked: true,
      sensitivity_ss_checked: true,
      corrective_action_on_detector: '',
      corrective_action_on_product: '',
      calibrated_by: base?.calibrated_by || '',
      verified_by: base?.verified_by || '',
      remarks: '',
    }
    onChange([...entries, fresh])
    setExpanded(prev => new Set(prev).add(entries.length))
  }

  const removeRow = (i: number) => {
    onChange(entries.filter((_, idx) => idx !== i))
    setExpanded(prev => {
      const n = new Set<number>()
      prev.forEach(x => { if (x < i) n.add(x); else if (x > i) n.add(x - 1) })
      return n
    })
  }

  const sensBadge = (label: string, checked: boolean) => (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${checked ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
      {checked && <Check className="w-2.5 h-2.5" />}{label}
    </span>
  )

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-md font-semibold text-gray-800">Entries ({entries.length})</h4>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-b from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 rounded-md shadow-md hover:shadow-lg active:translate-y-[1px] transition-all"
        >
          <Plus className="w-4 h-4" /> Add Row
        </button>
      </div>
      <p className="text-xs text-gray-400">Click any row to expand and edit all of its fields.</p>

      {entries.map((entry, i) => {
        const isOpen = expanded.has(i)
        const detInList = detectors.some(d => d.identificationNo === entry.identification_no)
        const calibInList = checkedOpts.some(o => o.name === entry.calibrated_by)
        const verifInList = verifiedOpts.some(o => o.name === entry.verified_by)
        return (
          <div key={i} className={`border rounded-lg overflow-hidden ${isOpen ? 'border-amber-300 shadow-sm' : 'border-gray-200'}`}>
            {/* Collapsed summary header — click to expand */}
            <button
              type="button"
              onClick={() => toggle(i)}
              className="w-full flex items-center gap-3 px-3 py-2.5 bg-gray-50 hover:bg-amber-50 text-left transition-colors"
            >
              {isOpen ? <ChevronDown className="w-4 h-4 text-amber-600 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
              <span className="text-xs font-bold text-gray-400 w-5 shrink-0">{i + 1}</span>
              <span className="text-sm font-semibold text-gray-800 flex-1 truncate min-w-0">{entry.product_name || <span className="text-gray-400 font-normal italic">Untitled product</span>}</span>
              <span className="text-xs text-gray-500 hidden sm:inline tabular-nums">{to12(entry.entry_time)}</span>
              <span className="text-xs text-gray-500 hidden md:inline truncate max-w-[120px]">{entry.batch_lot_no}</span>
              <span className="hidden sm:flex gap-1 shrink-0">
                {sensBadge('FE', entry.sensitivity_fe_checked)}
                {sensBadge('NFE', entry.sensitivity_nfe_checked)}
                {sensBadge('SS', entry.sensitivity_ss_checked)}
              </span>
            </button>

            {/* Expanded editable body */}
            {isOpen && (
              <div className="p-4 bg-white border-t border-gray-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls}>Date</label>
                    <input type="date" value={entry.entry_date} onChange={e => patch(i, { entry_date: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Time</label>
                    <Time12Picker value={entry.entry_time} onChange={v => patch(i, { entry_time: v })} />
                  </div>
                  <div>
                    <label className={labelCls}>Identification No (Detector)</label>
                    <select value={entry.identification_no} onChange={e => applyDetector(i, e.target.value)} className={inputCls}>
                      {entry.identification_no && !detInList && (
                        <option value={entry.identification_no}>{entry.identification_no} (current)</option>
                      )}
                      {detectors.map(d => (
                        <option key={d.identificationNo} value={d.identificationNo}>{d.identificationNo} · {d.srNo.replace(/[()]/g, '')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Location</label>
                    <input type="text" value={entry.location} readOnly title="Auto-filled from the detector" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 text-gray-600" />
                  </div>
                  <div>
                    <label className={labelCls}>Customer</label>
                    <input type="text" value={entry.customer_name} onChange={e => patch(i, { customer_name: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Product</label>
                    <input type="text" value={entry.product_name} onChange={e => patch(i, { product_name: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Batch / Lot No</label>
                    <input type="text" value={entry.batch_lot_no} onChange={e => patch(i, { batch_lot_no: e.target.value })} className={inputCls} />
                  </div>

                  {/* Sensitivities */}
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className={labelCls}>Sensitivities</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        ['FE', 'sensitivity_fe', 'sensitivity_fe_checked'],
                        ['NFE', 'sensitivity_nfe', 'sensitivity_nfe_checked'],
                        ['SS', 'sensitivity_ss', 'sensitivity_ss_checked'],
                      ] as const).map(([lbl, specKey, checkKey]) => (
                        <label key={lbl} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${entry[checkKey] ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
                          <input type="checkbox" checked={entry[checkKey]} onChange={e => patch(i, { [checkKey]: e.target.checked } as Partial<MDEditEntry>)} className="w-4 h-4 accent-green-600" />
                          <span className="text-xs">
                            <span className="font-semibold text-gray-700">{lbl}</span>
                            <span className="block text-[10px] text-gray-500">{entry[specKey] || '—'}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Corrective (Detector)</label>
                    <input type="text" value={entry.corrective_action_on_detector} onChange={e => patch(i, { corrective_action_on_detector: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Corrective (Product)</label>
                    <input type="text" value={entry.corrective_action_on_product} onChange={e => patch(i, { corrective_action_on_product: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Calibrated / Checked By</label>
                    <select value={entry.calibrated_by} onChange={e => patch(i, { calibrated_by: e.target.value })} className={inputCls}>
                      <option value="">—</option>
                      {entry.calibrated_by && !calibInList && <option value={entry.calibrated_by}>{entry.calibrated_by}</option>}
                      {checkedOpts.map(o => <option key={o.name} value={o.name}>{o.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Verified By</label>
                    <select value={entry.verified_by} onChange={e => patch(i, { verified_by: e.target.value })} className={inputCls}>
                      <option value="">—</option>
                      {entry.verified_by && !verifInList && <option value={entry.verified_by}>{entry.verified_by}</option>}
                      {verifiedOpts.map(o => <option key={o.name} value={o.name}>{o.name}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className={labelCls}>Remarks</label>
                    <input type="text" value={entry.remarks} onChange={e => patch(i, { remarks: e.target.value })} className={inputCls} />
                  </div>
                </div>

                {entries.length > 1 && (
                  <div className="mt-4 flex justify-end">
                    <button type="button" onClick={() => removeRow(i)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-md hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" /> Remove this entry
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
