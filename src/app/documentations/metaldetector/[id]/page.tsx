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

    // Group entries by location (use entry-level location, fallback to record location)
    const locationGroups: Record<string, { location: string, identificationNo: string, entries: typeof filledEntries }> = {}
    filledEntries.forEach(e => {
      const loc = e.location || record?.location || 'Unknown'
      if (!locationGroups[loc]) {
        locationGroups[loc] = {
          location: loc,
          identificationNo: e.identification_no || record?.identification_no || '',
          entries: []
        }
      }
      locationGroups[loc].entries.push(e)
    })

    // If no entries at all, create one group with record-level data
    if (Object.keys(locationGroups).length === 0) {
      const loc = record?.location || 'Unknown'
      locationGroups[loc] = {
        location: loc,
        identificationNo: record?.identification_no || '',
        entries: []
      }
    }

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
          <td>${e.product_name || ''}</td>
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

    const buildPage = (location: string, identificationNo: string, pageEntries: typeof filledEntries) => {
      // Always render exactly 10 rows, pad with empty if fewer
      const rows = Array.from({ length: ROWS_PER_PAGE }, (_, i) => buildRow(pageEntries[i])).join('')

      return `
<div class="page">
  <table class="header-table">
    <tr>
      <td class="header-left" rowspan="4" style="border-right: 1px solid #000;">
        <div style="display: flex; align-items: flex-start; gap: 15px;">
          <img src="/candor-logo.jpg" alt="Candor Foods" style="width: 60px; height: 60px; object-fit: contain; flex-shrink: 0;" />
          <div style="flex: 1;">
            <div class="company-name">CANDOR FOODS PRIVATE LIMITED</div>
            <div class="doc-title">Format : CCP calibration, Monitoring and Verification Record<br/>(Metal Detector)</div>
            <div class="doc-no">Document No: CFPLA.C2.F.24</div>
          </div>
        </div>
      </td>
      <td style="border-bottom: 1px solid #000;"><table class="meta-table"><tr><td class="label">Issue Date:</td><td>05/02/2023</td></tr></table></td>
    </tr>
    <tr><td style="border-bottom: 1px solid #000;"><table class="meta-table"><tr><td class="label">Issue No:</td><td>02</td></tr></table></td></tr>
    <tr><td style="border-bottom: 1px solid #000;"><table class="meta-table"><tr><td class="label">Revision Date:</td><td>01/10/2025</td></tr></table></td></tr>
    <tr><td><table class="meta-table"><tr><td class="label">Revision No.:</td><td>01</td></tr></table></td></tr>
  </table>

  <p class="frequency">Frequency: Start - Mid - End (Every Hour)</p>

  <table class="machine-row">
    <tr>
      <td class="label" style="width:15%;">MACHINE DETAILS</td>
      <td style="width:20%;">Metal Detector</td>
      <td class="label" style="width:10%;">LOCATION:</td>
      <td style="width:25%;">${location}</td>
      <td style="width:15%;"></td>
      <td class="label" style="width:15%;">Identification No: ${identificationNo}</td>
    </tr>
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

    // Build all pages: each location gets its own pages, 10 rows each
    let allPages = ''
    Object.values(locationGroups).forEach(group => {
      const { location, identificationNo, entries: groupEntries } = group
      if (groupEntries.length === 0) {
        // Empty location page with 10 blank rows
        allPages += buildPage(location, identificationNo, [])
      } else {
        // Split into chunks of 10
        for (let i = 0; i < groupEntries.length; i += ROWS_PER_PAGE) {
          const chunk = groupEntries.slice(i, i + ROWS_PER_PAGE)
          allPages += buildPage(location, identificationNo, chunk)
        }
      }
    })

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<title>Metal Detector Record - ${record?.batch_id || ''}</title>
<style>
  @page { size: landscape A4; margin: 10mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #000; }
  .page { width: 100%; page-break-after: always; }
  .page:last-child { page-break-after: avoid; }
  .header-table { width: 100%; border-collapse: collapse; border: 2px solid #000; }
  .header-table td { padding: 4px 8px; vertical-align: top; }
  .header-left { width: 70%; }
  .company-name { font-size: 16px; font-weight: bold; text-align: center; }
  .doc-title { font-size: 12px; font-weight: bold; text-align: center; margin-top: 4px; }
  .doc-no { font-size: 10px; text-align: center; margin-top: 2px; }
  .meta-table { width: 100%; border-collapse: collapse; }
  .meta-table td { border: 1px solid #000; padding: 3px 8px; font-size: 10px; }
  .meta-table .label { font-weight: bold; width: 50%; }
  .frequency { font-size: 10px; font-weight: bold; margin: 6px 0; }
  .machine-row { width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none; }
  .machine-row td { border: 1px solid #000; padding: 4px 8px; font-size: 11px; }
  .machine-row .label { font-weight: bold; background: #f0f0f0; }
  .main-table { width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none; }
  .main-table th, .main-table td { border: 1px solid #000; padding: 4px 6px; text-align: center; font-size: 10px; }
  .main-table th { background: #f5f5f5; font-weight: bold; }
  .main-table td { height: 22px; }
  .footer { width: 100%; border: 2px solid #000; border-top: none; padding: 20px 15px; display: flex; justify-content: space-between; align-items: center; }
  .footer-left, .footer-right { font-size: 11px; font-weight: bold; }
  .controlled-copy { border: 2px solid #000; padding: 6px 16px; font-weight: bold; font-size: 12px; }
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Records
          </button>
          <div className="flex items-center space-x-3">
            {editing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => { setEditing(false); fetchRecord() }}
                  className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </button>
              </>
            ) : (
              <>
                {isAuthorizedUser && record.status !== 'pending' && (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                )}
                <button
                  onClick={handlePrint}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Record
                </button>
              </>
            )}
          </div>
        </div>

        {/* Record Info Card */}
        <div ref={printRef} className="bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Metal Detector Record</h2>
                <p className="text-blue-100 text-sm mt-1">CCP Calibration, Monitoring and Verification</p>
              </div>
              <span className="bg-white/20 text-white text-sm font-medium px-3 py-1 rounded-full">
                {record.batch_id}
              </span>
            </div>
          </div>

          {/* Record Details Grid */}
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Date</p>
                  <p className="text-sm font-semibold text-gray-900">{record.created_at ? new Date(record.created_at).toLocaleDateString() : '—'}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <MapPin className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Location</p>
                  <p className="text-sm font-semibold text-gray-900">{record.location || '—'}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Hash className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Identification No.</p>
                  <p className="text-sm font-semibold text-gray-900">{record.identification_no || '—'}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <User className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Customer</p>
                  <p className="text-sm font-semibold text-gray-900">{record.customer_name || '—'}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-4">
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Batch/Lot No.</p>
                <p className="text-sm font-semibold text-gray-900">{record.batch_lot_no || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Calibrated By</p>
                <p className="text-sm font-semibold text-gray-900">{record.calibrated_by || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Verified By</p>
                <p className="text-sm font-semibold text-gray-900">{record.verified_by || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Status</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  record.status === 'passed' ? 'bg-green-100 text-green-800' :
                  record.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {record.status === 'passed' ? 'Passed' : record.status === 'pending' ? 'Pending' : record.status || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Entries Table */}
          <div className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Entries
              <span className="ml-2 text-sm font-normal text-gray-500">({filledEntries.length} records)</span>
            </h3>

            {filledEntries.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch/Lot</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">FE</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">NFE</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">SS</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action (Detector)</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action (Product)</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Calibrated By</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Verified By</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filledEntries.map((entry, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                        {editing ? (
                          <>
                            <td className="px-4 py-3">
                              <input type="date" value={entry.entry_date} onChange={e => handleUpdateEntry(idx, 'entry_date', e.target.value)} className="w-full text-sm border border-gray-300 rounded px-2 py-1" />
                            </td>
                            <td className="px-4 py-3">
                              <input type="time" value={entry.entry_time} onChange={e => handleUpdateEntry(idx, 'entry_time', e.target.value)} className="w-full text-sm border border-gray-300 rounded px-2 py-1" />
                            </td>
                            <td className="px-4 py-3">
                              <input type="text" value={entry.product_name} onChange={e => handleUpdateEntry(idx, 'product_name', e.target.value)} className="w-full text-sm border border-gray-300 rounded px-2 py-1" />
                            </td>
                            <td className="px-4 py-3">
                              <input type="text" value={entry.batch_lot_no} onChange={e => handleUpdateEntry(idx, 'batch_lot_no', e.target.value)} className="w-full text-sm border border-gray-300 rounded px-2 py-1" />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input type="checkbox" checked={entry.sensitivity_fe_checked} onChange={e => handleUpdateEntry(idx, 'sensitivity_fe_checked', e.target.checked)} className="w-4 h-4 accent-green-600" />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input type="checkbox" checked={entry.sensitivity_nfe_checked} onChange={e => handleUpdateEntry(idx, 'sensitivity_nfe_checked', e.target.checked)} className="w-4 h-4 accent-green-600" />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input type="checkbox" checked={entry.sensitivity_ss_checked} onChange={e => handleUpdateEntry(idx, 'sensitivity_ss_checked', e.target.checked)} className="w-4 h-4 accent-green-600" />
                            </td>
                            <td className="px-4 py-3">
                              <input type="text" value={entry.corrective_action_on_detector || ''} onChange={e => handleUpdateEntry(idx, 'corrective_action_on_detector', e.target.value)} className="w-full text-sm border border-gray-300 rounded px-2 py-1" />
                            </td>
                            <td className="px-4 py-3">
                              <input type="text" value={entry.corrective_action_on_product || ''} onChange={e => handleUpdateEntry(idx, 'corrective_action_on_product', e.target.value)} className="w-full text-sm border border-gray-300 rounded px-2 py-1" />
                            </td>
                            <td className="px-4 py-3">
                              <input type="text" value={entry.calibrated_by} onChange={e => handleUpdateEntry(idx, 'calibrated_by', e.target.value)} className="w-full text-sm border border-gray-300 rounded px-2 py-1" />
                            </td>
                            <td className="px-4 py-3">
                              <input type="text" value={entry.verified_by} onChange={e => handleUpdateEntry(idx, 'verified_by', e.target.value)} className="w-full text-sm border border-gray-300 rounded px-2 py-1" />
                            </td>
                            <td className="px-4 py-3">
                              <input type="text" value={entry.remarks || ''} onChange={e => handleUpdateEntry(idx, 'remarks', e.target.value)} className="w-full text-sm border border-gray-300 rounded px-2 py-1" />
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{entry.entry_date || '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatTime(entry.entry_time)}</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{entry.product_name || '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{entry.batch_lot_no || '—'}</td>
                            <td className="px-4 py-3 text-center">
                              {entry.sensitivity_fe_checked
                                ? <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                                : <XCircle className="h-5 w-5 text-red-400 mx-auto" />}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {entry.sensitivity_nfe_checked
                                ? <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                                : <XCircle className="h-5 w-5 text-red-400 mx-auto" />}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {entry.sensitivity_ss_checked
                                ? <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                                : <XCircle className="h-5 w-5 text-red-400 mx-auto" />}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{entry.corrective_action_on_detector || 'NO'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{entry.corrective_action_on_product || 'NO'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{entry.calibrated_by || '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{entry.verified_by || '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{entry.remarks || '—'}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No entries recorded yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
