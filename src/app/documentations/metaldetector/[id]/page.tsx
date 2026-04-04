'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { ArrowLeft, Loader2, Printer, CheckCircle2, XCircle, Calendar, MapPin, Hash, User, Pencil, Save, X } from 'lucide-react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
const AUTHORIZED_EMAIL = 'pooja.parkar@candorfoods.in'

interface MDEntry {
  id?: number
  entry_date: string
  entry_time: string
  identification_no: string
  location: string
  product_name: string
  batch_lot_no: string
  sensitivity_fe_checked: boolean
  sensitivity_nfe_checked: boolean
  sensitivity_ss_checked: boolean
  corrective_action_on_detector: string
  corrective_action_on_product: string
  calibrated_by: string
  verified_by: string
  remarks: string
}

interface MDRecord {
  id: number
  batch_id: string
  identification_no: string | null
  location: string | null
  customer_name: string | null
  batch_lot_no: string | null
  calibrated_by: string | null
  verified_by: string | null
  status: string | null
  created_at: string | null
  entries?: MDEntry[]
}

export default function MetalDetectorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const recordId = params.id as string
  const printRef = useRef<HTMLDivElement>(null)

  const [record, setRecord] = useState<MDRecord | null>(null)
  const [entries, setEntries] = useState<MDEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currentUserEmail, setCurrentUserEmail] = useState('')

  const autoPrint = searchParams.get('print') === 'true'
  const editRequested = searchParams.get('edit') === 'true'
  const isAuthorizedUser = currentUserEmail === AUTHORIZED_EMAIL

  useEffect(() => {
    if (recordId) {
      fetchRecord()
    }
    try {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const user = JSON.parse(userStr)
        setCurrentUserEmail(user?.email || '')
      }
    } catch {}
  }, [recordId])

  useEffect(() => {
    if (editRequested && isAuthorizedUser && !loading && record) {
      setEditing(true)
    }
  }, [editRequested, isAuthorizedUser, loading, record])

  useEffect(() => {
    if (autoPrint && !loading && record) {
      setTimeout(() => handlePrint(), 500)
    }
  }, [autoPrint, loading, record])

  const handlePrint = () => {
    const filledEntries = entries.filter(e => e.entry_date || e.product_name)
    const location = record?.location || filledEntries[0]?.location || ''
    const identificationNo = record?.identification_no || filledEntries[0]?.identification_no || ''
    const ROWS_PER_PAGE = 10

    const formatEntryTime = (time: string) => {
      if (!time) return ''
      try {
        return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      } catch { return time }
    }

    const buildRow = (e?: typeof filledEntries[0]) => {
      if (e) {
        return `<tr>
          <td>${e.entry_date || ''}</td>
          <td>${formatEntryTime(e.entry_time)}</td>
          <td style="text-align:left;">${e.product_name || ''}</td>
          <td>${e.batch_lot_no || ''}</td>
          <td>${e.sensitivity_fe_checked ? '✓' : ''}</td>
          <td>${e.sensitivity_nfe_checked ? '✓' : ''}</td>
          <td>${e.sensitivity_ss_checked ? '✓' : ''}</td>
          <td>${e.corrective_action_on_detector || 'NO'}</td>
          <td>${e.corrective_action_on_product || 'NO'}</td>
          <td>${e.calibrated_by || ''}</td>
          <td>${e.verified_by || ''}</td>
          <td>${e.remarks || ''}</td>
        </tr>`
      }
      return `<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`
    }

    const buildPage = (pageEntries: typeof filledEntries) => {
      const rows = Array.from({ length: ROWS_PER_PAGE }, (_, i) => buildRow(pageEntries[i])).join('')

      return `
<div class="page">
  <table class="header-table">
    <tbody>
      <tr>
        <td class="header-left" rowspan="4">
          <div class="logo-wrap">
            <img src="/candor-logo.jpg" alt="Candor Foods" style="width:60px;height:52px;object-fit:contain;flex-shrink:0;" onerror="this.style.display='none'" />
            <div style="flex:1; text-align:center;">
              <div class="company-name">CANDOR FOODS PRIVATE LIMITED</div>
              <div class="doc-title">Format : CCP calibration, Monitoring and Verification Record<br/>(Metal Detector)</div>
              <div class="doc-no">Document No: CFPLA.C2.F.24</div>
            </div>
          </div>
        </td>
        <td class="meta-cell" rowspan="4" style="width:30%; padding:0 !important;">
          <div class="meta-row"><span class="meta-label">Issue Date:</span><span class="meta-val">05/02/2023</span></div>
          <div class="meta-row"><span class="meta-label">Issue No:</span><span class="meta-val">02</span></div>
          <div class="meta-row"><span class="meta-label">Revision Date:</span><span class="meta-val">01/10/2025</span></div>
          <div class="meta-row"><span class="meta-label">Revision No.:</span><span class="meta-val">01</span></div>
        </td>
      </tr>
    </tbody>
  </table>

  <div class="frequency">Frequency: Start - Mid - End (Every Hour)</div>

  <table class="machine-row">
    <tbody>
      <tr>
        <td class="lbl" style="width:14%;">MACHINE DETAILS</td>
        <td style="width:18%;">Metal Detector</td>
        <td class="lbl" style="width:10%;">LOCATION:</td>
        <td style="width:28%;">${location}</td>
        <td style="width:14%;"></td>
        <td style="width:16%; font-weight:bold;">Identification No: ${identificationNo}</td>
      </tr>
    </tbody>
  </table>

  <table class="main-table">
    <thead>
      <tr>
        <th rowspan="2" style="width:8%;">DATE</th>
        <th rowspan="2" style="width:6%;">TIME</th>
        <th rowspan="2" style="width:14%;">PRODUCT NAME</th>
        <th rowspan="2" style="width:8%;">BATCH/LOT<br/>NO.</th>
        <th colspan="3" style="width:12%;">SENSITIVITIES</th>
        <th colspan="2" style="width:14%;">IF METAL DETECTOR IS NOT<br/>WORKING, CORRECTIVE ACTION<br/>TAKEN ON</th>
        <th rowspan="2" style="width:10%;">CALIBRATED/<br/>MONITORED<br/>BY</th>
        <th rowspan="2" style="width:8%;">VERIFIED<br/>BY</th>
        <th rowspan="2" style="width:7%;">REMARKS</th>
      </tr>
      <tr>
        <th style="width:4%;">FE<br/>Fe-1.0mm</th>
        <th style="width:4%;">NFE<br/>NFe-1.2mm</th>
        <th style="width:4%;">SS<br/>SS-1.7mm</th>
        <th style="width:7%;">ON METAL<br/>DETECTOR</th>
        <th style="width:7%;">ON PRODUCT<br/>PASSED</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="footer">
    <div class="footer-left">Prepared By: FST</div>
    <div class="controlled-copy">CONTROLLED<br/>COPY</div>
    <div class="footer-right">Approved By: FSTL</div>
  </div>
</div>`
    }

    // Paginate all entries together (no location splitting) — 10 rows per page
    let allPages = ''
    if (filledEntries.length === 0) {
      allPages = buildPage([])
    } else {
      for (let i = 0; i < filledEntries.length; i += ROWS_PER_PAGE) {
        allPages += buildPage(filledEntries.slice(i, i + ROWS_PER_PAGE))
      }
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<title>Metal Detector Record - ${record?.batch_id || ''}</title>
<style>
  @page { size: A4 landscape; margin: 8mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 10px; color: #000; background: #fff; }
  .page { width: 100%; page-break-after: always; }
  .page:last-child { page-break-after: avoid; }

  /* ── Header ── */
  .header-table { width: 100%; border-collapse: collapse; border: 1px solid #555; }
  .header-table > tbody > tr > td { padding: 5px 8px; vertical-align: middle; border: 1px solid #555; }
  .header-left { width: 68%; border-right: 1px solid #555 !important; }
  .logo-wrap { display: flex; align-items: center; gap: 10px; }
  .logo-box { width: 48px; height: 48px; border: 1px solid #555; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: bold; text-align: center; flex-shrink: 0; }
  .company-name { font-size: 13px; font-weight: bold; text-align: center; letter-spacing: 0.3px; }
  .doc-title { font-size: 10px; font-weight: bold; text-align: center; margin-top: 3px; }
  .doc-no { font-size: 9px; text-align: center; margin-top: 2px; color: #333; }
  .meta-cell { padding: 0 !important; }
  .meta-row { display: flex; border-bottom: 1px solid #555; }
  .meta-row:last-child { border-bottom: none; }
  .meta-label { font-weight: bold; font-size: 9px; padding: 4px 6px; width: 95px; border-right: 1px solid #555; background: #f8f8f8; }
  .meta-val { font-size: 9px; padding: 4px 6px; flex: 1; }

  /* ── Frequency ── */
  .frequency { font-size: 9px; font-weight: bold; padding: 4px 6px; border: 1px solid #555; border-top: none; background: #f8f8f8; }

  /* ── Machine row ── */
  .machine-row { width: 100%; border-collapse: collapse; border: 1px solid #555; border-top: none; }
  .machine-row td { border: 1px solid #555; padding: 4px 8px; font-size: 10px; }
  .machine-row .lbl { font-weight: bold; background: #f8f8f8; }

  /* ── Main data table ── */
  .main-table { width: 100%; border-collapse: collapse; border: 1px solid #555; border-top: none; }
  .main-table th { border: 1px solid #555; padding: 4px 4px; text-align: center; font-size: 9px; font-weight: bold; background: #f0f0f0; vertical-align: middle; line-height: 1.3; }
  .main-table td { border: 1px solid #aaa; padding: 3px 4px; text-align: center; font-size: 9px; height: 20px; vertical-align: middle; }

  /* ── Footer ── */
  .footer { width: 100%; border: 1px solid #555; border-top: none; padding: 10px 15px; display: flex; justify-content: space-between; align-items: center; }
  .footer-left, .footer-right { font-size: 10px; font-weight: bold; }
  .controlled-copy { border: 1px solid #555; padding: 5px 18px; font-weight: bold; font-size: 10px; text-align: center; }
</style>
</head>
<body>
${allPages}
<script>window.onload = function() { window.print(); }</script>
</body>
</html>`)
    printWindow.document.close()
  }

  const fetchRecord = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_BASE_URL}/metaldetector/${recordId}`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })
      if (!response.ok) throw new Error('Failed to fetch record')
      
      const data = await response.json()
      setRecord(data)
      setEntries(data.entries || [])
    } catch (error: any) {
      console.error('Error fetching record:', error)
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateEntry = (index: number, field: keyof MDEntry, value: any) => {
    const updated = [...entries]
    updated[index] = { ...updated[index], [field]: value }
    setEntries(updated)
  }

  const handleSave = async () => {
    if (!record) return
    try {
      setSaving(true)
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_BASE_URL}/metaldetector/${recordId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          entries: entries.filter(e => e.entry_date || e.product_name).map(e => ({
            entry_date: e.entry_date,
            entry_time: e.entry_time,
            product_name: e.product_name,
            batch_lot_no: e.batch_lot_no,
            sensitivity_fe_checked: e.sensitivity_fe_checked,
            sensitivity_nfe_checked: e.sensitivity_nfe_checked,
            sensitivity_ss_checked: e.sensitivity_ss_checked,
            corrective_action_on_detector: e.corrective_action_on_detector,
            corrective_action_on_product: e.corrective_action_on_product,
            calibrated_by: e.calibrated_by,
            verified_by: e.verified_by,
            remarks: e.remarks,
          }))
        })
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || 'Failed to save')
      }
      alert('Record updated successfully!')
      setEditing(false)
      fetchRecord()
    } catch (error: any) {
      alert(error.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const formatTime = (time: string) => {
    if (!time) return '—'
    try {
      return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    } catch { return time }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
          <span className="ml-2 text-gray-500">Loading record...</span>
        </div>
      </DashboardLayout>
    )
  }

  if (!record) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-red-600">Record not found</p>
          <button onClick={() => router.back()} className="mt-4 text-blue-600 hover:text-blue-800">
            Go Back
          </button>
        </div>
      </DashboardLayout>
    )
  }

  const filledEntries = entries.filter(e => e.entry_date || e.product_name)

  const thCls = "border border-gray-400 px-2 py-1.5 text-center font-bold text-xs text-gray-800 bg-gray-100"
  const tdCls = "border border-gray-300 px-2 py-1 text-xs text-gray-900 text-center"
  const editInputCls = "w-full text-xs border border-blue-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
  const BLANK_ROWS = 10
  const blankCount = Math.max(0, BLANK_ROWS - filledEntries.length)

  return (
    <DashboardLayout>
      <div className="space-y-4">

        {/* Screen-only toolbar */}
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-5 py-3 shadow-sm print:hidden">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Records
          </button>
          <div className="flex items-center gap-3">
            {editing ? (
              <>
                <button onClick={() => { setEditing(false); fetchRecord() }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
                  <X className="h-4 w-4" /> Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <>
                {isAuthorizedUser && record.status !== 'pending' && (
                  <button onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50">
                    <Pencil className="h-4 w-4" /> Edit
                  </button>
                )}
                <button onClick={handlePrint}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Printer className="h-4 w-4" /> Print / Save PDF
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Physical Form Layout ── */}
        <div ref={printRef} className="bg-white border border-gray-300 shadow-sm" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px' }}>

          {/* Document Header */}
          <div className="grid border-b-2 border-gray-800" style={{ gridTemplateColumns: '160px 1fr 200px' }}>
            {/* Logo */}
            <div className="flex items-center justify-center p-3 border-r border-gray-400">
              <img src="/candor-logo.jpg" alt="Candor Foods" className="h-14 w-auto object-contain" />
            </div>

            {/* Title */}
            <div className="flex flex-col items-center justify-center p-3 border-r border-gray-400 text-center gap-0.5">
              <div className="font-bold text-sm text-gray-900">CANDOR FOODS PRIVATE LIMITED</div>
              <div className="font-semibold text-xs text-gray-700 mt-1">
                Format : CCP calibration, Monitoring and Verification Record<br />(Metal Detector)
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Document No: CFPLA.C2.F.24</div>
            </div>

            {/* Meta */}
            <div className="flex flex-col divide-y divide-gray-300">
              {[['Issue Date:', '05/02/2023'], ['Issue No:', '02'], ['Revision Date:', '01/10/2025'], ['Revision No.:', '01']].map(([k, v]) => (
                <div key={k} className="flex flex-1 items-center divide-x divide-gray-300">
                  <span className="px-2 py-1 text-xs font-bold text-gray-700 w-28">{k}</span>
                  <span className="px-2 py-1 text-xs text-gray-900 flex-1">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div className="px-3 py-1.5 text-xs font-semibold text-gray-700 border-b border-gray-300 bg-gray-50">
            Frequency: Start - Mid - End (Every Hour)
          </div>

          {/* Machine Details Row */}
          <div className="flex divide-x divide-gray-300 border-b-2 border-gray-800 text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 flex-1">
              <span className="font-bold text-gray-700 uppercase">Machine Details</span>
              <span className="text-gray-900">Metal Detector</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 flex-1">
              <span className="font-bold text-gray-700 uppercase">Location:</span>
              <span className="text-gray-900">{record.location || entries[0]?.location || '—'}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 flex-1">
              <span className="font-bold text-gray-700 uppercase">Identification No:</span>
              <span className="text-gray-900">{record.identification_no || entries[0]?.identification_no || '—'}</span>
            </div>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ fontSize: '11px' }}>
              <thead>
                <tr>
                  <th className={thCls} rowSpan={2} style={{ width: '80px' }}>DATE</th>
                  <th className={thCls} rowSpan={2} style={{ width: '65px' }}>TIME</th>
                  <th className={thCls} rowSpan={2} style={{ width: '140px' }}>PRODUCT NAME</th>
                  <th className={thCls} rowSpan={2} style={{ width: '80px' }}>BATCH/LOT<br />NO.</th>
                  <th className={thCls} colSpan={3}>SENSITIVITIES</th>
                  <th className={thCls} colSpan={2} style={{ width: '180px' }}>IF METAL DETECTOR IS NOT WORKING,<br />CORRECTIVE ACTION TAKEN ON</th>
                  <th className={thCls} rowSpan={2} style={{ width: '100px' }}>CALIBRATED/<br />MONITORED<br />BY</th>
                  <th className={thCls} rowSpan={2} style={{ width: '90px' }}>VERIFIED<br />BY</th>
                  <th className={thCls} rowSpan={2} style={{ width: '80px' }}>REMARKS</th>
                </tr>
                <tr>
                  <th className={thCls} style={{ width: '55px' }}>FE<br /><span className="font-normal">Fe-1.0mm</span></th>
                  <th className={thCls} style={{ width: '60px' }}>NFE<br /><span className="font-normal">NFe-1.2mm</span></th>
                  <th className={thCls} style={{ width: '55px' }}>SS<br /><span className="font-normal">SS-1.7mm</span></th>
                  <th className={thCls} style={{ width: '90px' }}>ON METAL<br />DETECTOR</th>
                  <th className={thCls} style={{ width: '90px' }}>ON PRODUCT<br />PASSED</th>
                </tr>
              </thead>
              <tbody>
                {filledEntries.map((entry, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className={tdCls}>
                      {editing ? <input type="date" value={entry.entry_date} onChange={e => handleUpdateEntry(idx, 'entry_date', e.target.value)} className={editInputCls} /> : entry.entry_date || ''}
                    </td>
                    <td className={tdCls}>
                      {editing ? <input type="time" value={entry.entry_time} onChange={e => handleUpdateEntry(idx, 'entry_time', e.target.value)} className={editInputCls} /> : formatTime(entry.entry_time)}
                    </td>
                    <td className={`${tdCls} text-left`}>
                      {editing ? <input type="text" value={entry.product_name} onChange={e => handleUpdateEntry(idx, 'product_name', e.target.value)} className={editInputCls} /> : entry.product_name || ''}
                    </td>
                    <td className={tdCls}>
                      {editing ? <input type="text" value={entry.batch_lot_no} onChange={e => handleUpdateEntry(idx, 'batch_lot_no', e.target.value)} className={editInputCls} /> : entry.batch_lot_no || ''}
                    </td>
                    <td className={tdCls}>
                      {editing
                        ? <input type="checkbox" checked={entry.sensitivity_fe_checked} onChange={e => handleUpdateEntry(idx, 'sensitivity_fe_checked', e.target.checked)} className="w-3.5 h-3.5" />
                        : entry.sensitivity_fe_checked ? '✓' : ''}
                    </td>
                    <td className={tdCls}>
                      {editing
                        ? <input type="checkbox" checked={entry.sensitivity_nfe_checked} onChange={e => handleUpdateEntry(idx, 'sensitivity_nfe_checked', e.target.checked)} className="w-3.5 h-3.5" />
                        : entry.sensitivity_nfe_checked ? '✓' : ''}
                    </td>
                    <td className={tdCls}>
                      {editing
                        ? <input type="checkbox" checked={entry.sensitivity_ss_checked} onChange={e => handleUpdateEntry(idx, 'sensitivity_ss_checked', e.target.checked)} className="w-3.5 h-3.5" />
                        : entry.sensitivity_ss_checked ? '✓' : ''}
                    </td>
                    <td className={tdCls}>
                      {editing ? <input type="text" value={entry.corrective_action_on_detector || ''} onChange={e => handleUpdateEntry(idx, 'corrective_action_on_detector', e.target.value)} className={editInputCls} /> : (entry.corrective_action_on_detector || 'NO')}
                    </td>
                    <td className={tdCls}>
                      {editing ? <input type="text" value={entry.corrective_action_on_product || ''} onChange={e => handleUpdateEntry(idx, 'corrective_action_on_product', e.target.value)} className={editInputCls} /> : (entry.corrective_action_on_product || 'NO')}
                    </td>
                    <td className={tdCls}>
                      {editing ? <input type="text" value={entry.calibrated_by} onChange={e => handleUpdateEntry(idx, 'calibrated_by', e.target.value)} className={editInputCls} /> : entry.calibrated_by || ''}
                    </td>
                    <td className={tdCls}>
                      {editing ? <input type="text" value={entry.verified_by} onChange={e => handleUpdateEntry(idx, 'verified_by', e.target.value)} className={editInputCls} /> : entry.verified_by || ''}
                    </td>
                    <td className={tdCls}>
                      {editing ? <input type="text" value={entry.remarks || ''} onChange={e => handleUpdateEntry(idx, 'remarks', e.target.value)} className={editInputCls} /> : (entry.remarks || '')}
                    </td>
                  </tr>
                ))}
                {/* Blank padding rows */}
                {Array.from({ length: blankCount }).map((_, i) => (
                  <tr key={`blank-${i}`} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {Array.from({ length: 12 }).map((_, j) => (
                      <td key={j} className={tdCls} style={{ height: '24px' }}>&nbsp;</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t-2 border-gray-800 text-xs font-bold text-gray-900">
            <span>Prepared By: FST</span>
            <div className="border-2 border-gray-800 px-4 py-1.5 text-center text-xs font-black">
              CONTROLLED<br />COPY
            </div>
            <span>Approved By: FSTL</span>
          </div>

        </div>
      </div>
    </DashboardLayout>
  )
}
