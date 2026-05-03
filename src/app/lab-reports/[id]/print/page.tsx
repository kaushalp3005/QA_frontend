'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { fgCoaApi, type FgCoaRecord, type FgCoaParamRow } from '@/lib/api/documentations'
import { getSignaturePath, COMPANY_STAMP, ANALYSED_BY_OPTIONS, VERIFIED_BY_OPTIONS } from '@/lib/signatures'
import { Loader2, Printer, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(s?: string | null): string {
  if (!s) return ''
  // Already DD/MM/YYYY → keep
  if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(s)) return s.replace(/-/g, '/')
  // ISO YYYY-MM-DD → DD/MM/YYYY
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[3]}/${m[2]}/${m[1]}`
  return s
}

function getRoleFor(name: string, source: { name: string; role?: string }[]): string {
  return source.find(o => o.name === name)?.role ?? ''
}

// ── Main component ───────────────────────────────────────────────────────────

export default function COAPrintPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [record, setRecord] = useState<FgCoaRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!params?.id) return
    fgCoaApi.get(Number(params.id))
      .then(res => setRecord(res.data))
      .catch((err: any) => setError(err?.message || 'Failed to load COA'))
      .finally(() => setLoading(false))
  }, [params?.id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    )
  }

  if (error || !record) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-3">
        <p className="text-red-600 text-sm">{error || 'COA not found'}</p>
        <button onClick={() => router.back()} className="text-blue-600 underline text-sm">Go back</button>
      </div>
    )
  }

  // Strict — only rows explicitly checked (included === true) appear on print.
  // Unchecked rows (included === false) are hidden from the printed COA.
  const isIncluded = (r: FgCoaParamRow) => r.included === true
  const sensoryRows  = (record.sensory  ?? []).filter(isIncluded)
  const physicalRows = (record.physical ?? []).filter(isIncluded)
  const chemicalRows = (record.chemical ?? []).filter(isIncluded)

  const analysedRole = getRoleFor(record.analysed_by ?? '', ANALYSED_BY_OPTIONS) || 'Quality Control Executive'
  const verifiedRole = getRoleFor(record.verified_by ?? '', VERIFIED_BY_OPTIONS) || 'Quality Manager'
  const analysedSig  = getSignaturePath(record.analysed_by ?? '')
  const verifiedSig  = getSignaturePath(record.verified_by ?? '')

  return (
    <>
      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #e8e8e8; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #000; }
        .toolbar {
          position: sticky; top: 0; z-index: 10;
          background: #fff; border-bottom: 1px solid #ddd;
          padding: 10px 20px;
          display: flex; align-items: center; justify-content: space-between; gap: 10px;
        }
        .toolbar button {
          padding: 8px 16px; border: 1px solid #ccc; background: #fff; cursor: pointer;
          font-size: 13px; border-radius: 4px; display: inline-flex; align-items: center; gap: 6px;
        }
        .toolbar button.primary { background: #A41F13; color: #fff; border-color: #A41F13; }
        .page { width: 210mm; min-height: 297mm; margin: 20px auto; padding: 14mm 12mm; background: #fff; box-shadow: 0 2px 10px rgba(0,0,0,0.12); }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        td, th { border: 1px solid #000; padding: 5px 8px; vertical-align: middle; word-wrap: break-word; }
        .header td { height: 58px; }
        .header .logo-cell {
          width: 22%;
          padding: 6px;
          text-align: center;
          vertical-align: middle;
        }
        .header .logo-cell img {
          max-width: 90%;
          max-height: 110px;
          object-fit: contain;
          display: block;
          margin: 0 auto;
        }
        .header .title-cell { width: 58%; text-align: center; padding: 0; }
        .header .title-cell .top, .header .title-cell .bottom { padding: 8px; font-weight: bold; }
        .header .title-cell .top { border-bottom: 1px solid #000; font-size: 13px; }
        .header .code-cell { width: 20%; padding: 0; }
        .info td.label { font-weight: bold; width: 22%; background: #fff; }
        .info td.value { width: 36%; }
        .info td.label-sm { font-weight: bold; width: 22%; }
        .info td.value-sm { width: 20%; }
        .params th { background: #d9d9d9; font-weight: bold; text-align: center; padding: 6px 8px; }
        .params .section td { background: #d9d9d9; font-weight: bold; text-align: center; padding: 5px; letter-spacing: 0.3px; }
        .params td.param { width: 38%; text-align: left; }
        .params td.result { width: 22%; text-align: center; }
        .params td.spec { width: 22%; text-align: center; }
        .params td.method { width: 18%; text-align: center; }
        .remarks .header-cell { background: #d9d9d9; font-weight: bold; text-align: center; padding: 6px; }
        .remarks .body-cell { text-align: center; padding: 8px; }
        .sign td { vertical-align: middle; padding: 4px 8px; }
        .sign .label-row td { font-weight: bold; padding: 5px 8px; }
        .sign .role-row td { font-weight: bold; padding: 4px 8px; }
        .sign .name-row td { padding: 6px 8px; height: 90px; }
        .sign .seal-cell { text-align: center; vertical-align: middle; }
        .sign .sig-img { max-height: 80px; max-width: 180px; object-fit: contain; display: inline-block; }
        .sign .stamp-img { max-height: 105px; max-width: 120px; object-fit: contain; }

        @media print {
          html, body { background: #fff; }
          .toolbar { display: none !important; }
          .page { margin: 0; box-shadow: none; width: auto; min-height: auto; padding: 8mm; }
          @page { size: A4; margin: 8mm; }
        }
      `}</style>

      <div className="toolbar">
        <button onClick={() => router.back()}>
          <ArrowLeft size={14} /> Back
        </button>
        <span style={{ fontSize: 13, color: '#666' }}>COA: <strong>{record.coa_no}</strong></span>
        <button className="primary" onClick={() => window.print()}>
          <Printer size={14} /> Print / Save PDF
        </button>
      </div>

      <div className="page">

        {/* ── HEADER ── */}
        <table className="header">
          <tbody>
            <tr>
              <td className="logo-cell" rowSpan={2}>
                <img src="/candor-logo.jpg" alt="Candor Foods" />
              </td>
              <td className="title-cell">
                <div className="top">CANDOR FOODS PRIVATE LIMITED</div>
              </td>
              <td className="code-cell" style={{ width: '20%' }}>
                <div style={{ padding: 8, borderBottom: '1px solid #000', fontWeight: 'bold' }}>CFPL.C5.F05</div>
              </td>
            </tr>
            <tr>
              <td className="title-cell">
                <div className="bottom">Certificate of Analysis (COA)</div>
              </td>
              <td className="code-cell">
                <div style={{ padding: 8 }}><strong>Issue No:</strong> 01</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── INFO BLOCK ── */}
        <table className="info">
          <tbody>
            <tr>
              <td className="label">COA NO:</td>
              <td className="value" style={{ textAlign: 'center' }}>{record.coa_no}</td>
              <td className="label-sm">COA DATED:</td>
              <td className="value-sm">{formatDate(record.coa_dated)}</td>
            </tr>
            <tr>
              <td className="label">SAMPLE NAME</td>
              <td className="value">{record.sample_name}</td>
              <td className="label-sm">SAMPLE TYPE:</td>
              <td className="value-sm">{record.sample_type}</td>
            </tr>
            <tr>
              <td className="label">Batch Qty</td>
              <td colSpan={3}>{record.batch_qty || '—'}</td>
            </tr>
            <tr>
              <td className="label">FG Batch No.</td>
              <td className="value">{record.batch_no || '—'}</td>
              <td className="label-sm">SAMPLING DATE</td>
              <td className="value-sm">{formatDate(record.sampling_date)}</td>
            </tr>
            <tr>
              <td className="label">Ingredient Name</td>
              <td colSpan={3}>{record.ingredient_name || '—'}</td>
            </tr>
            <tr>
              <td className="label">Country of Origin</td>
              <td colSpan={3}>{record.country_of_origin || '—'}</td>
            </tr>
            <tr>
              <td className="label">Packing Date</td>
              <td colSpan={3}>{formatDate(record.packing_date)}</td>
            </tr>
            <tr>
              <td className="label">Expiry Date</td>
              <td colSpan={3}>{formatDate(record.expiry_date)}</td>
            </tr>
            <tr>
              <td className="label">Shelf Life (from the date of packaging)</td>
              <td colSpan={3}>{record.shelf_life || '—'}</td>
            </tr>
            <tr>
              <td className="label">Storage Condition</td>
              <td colSpan={3}>{record.storage_condition || '—'}</td>
            </tr>
            <tr>
              <td className="label">Packaging Type</td>
              <td colSpan={3}>{record.packaging_type || '—'}</td>
            </tr>
            <tr>
              <td className="label">ASIN Code/Article Code</td>
              <td colSpan={3}>{record.asin_code || '—'}</td>
            </tr>
            <tr>
              <td className="label">Customer Name</td>
              <td colSpan={3}>{record.customer_name}</td>
            </tr>
            <tr>
              <td className="label">Allergen Declaration / EAN Code</td>
              <td colSpan={3}>{record.allergen_declaration || '—'}</td>
            </tr>
          </tbody>
        </table>

        {/* ── PARAMETERS ── */}
        <table className="params">
          <tbody>
            <tr>
              <th className="param" style={{ textAlign: 'center' }}>PARAMETERS</th>
              <th className="result">RESULTS</th>
              <th className="spec">TOLERANCE / SPECS</th>
              <th className="method">METHOD</th>
            </tr>

            {sensoryRows.length > 0 && (
              <>
                <tr className="section"><td colSpan={4}>ORGANOLEPTIC / SENSORY</td></tr>
                {sensoryRows.map((row, i) => (
                  <tr key={`s-${i}`}>
                    <td className="param">{row.label}</td>
                    <td className="result">{row.result || '—'}</td>
                    <td className="spec">{row.tolerance || '—'}</td>
                    <td className="method">{row.method || '—'}</td>
                  </tr>
                ))}
              </>
            )}

            {physicalRows.length > 0 && (
              <>
                <tr className="section"><td colSpan={4}>PHYSICAL</td></tr>
                {physicalRows.map((row, i) => (
                  <tr key={`p-${i}`}>
                    <td className="param">{row.label}</td>
                    <td className="result">{row.result || '—'}</td>
                    <td className="spec">{row.tolerance || '—'}</td>
                    <td className="method">{row.method || '—'}</td>
                  </tr>
                ))}
              </>
            )}

            {chemicalRows.length > 0 && (
              <>
                <tr className="section"><td colSpan={4}>CHEMICAL</td></tr>
                {chemicalRows.map((row, i) => (
                  <tr key={`c-${i}`}>
                    <td className="param">{row.label}</td>
                    <td className="result">{row.result || '—'}</td>
                    <td className="spec">{row.tolerance || '—'}</td>
                    <td className="method">{row.method || '—'}</td>
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>

        {/* ── REMARKS ── */}
        <table className="remarks">
          <tbody>
            <tr><td className="header-cell">REMARKS</td></tr>
            <tr><td className="body-cell">{record.remarks || '—'}</td></tr>
          </tbody>
        </table>

        {/* ── SIGNATURES ── */}
        <table className="sign">
          <tbody>
            <tr className="label-row">
              <td style={{ width: '33%' }}>Analysed By:</td>
              <td style={{ width: '34%' }} rowSpan={3} className="seal-cell">
                <img
                  src={COMPANY_STAMP}
                  alt="Company Stamp"
                  className="stamp-img"
                  onError={(e) => {
                    // Fallback to text seal if image is missing
                    const img = e.currentTarget
                    const fallback = document.createElement('div')
                    fallback.style.cssText = 'width:90px;height:90px;border:1.5px solid #0b3b80;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:#0b3b80;font-size:9px;font-weight:bold;text-align:center;line-height:1.15;padding:8px;'
                    fallback.innerHTML = 'Candor<br/>Foods Pvt.<br/>Ltd.<br/>Navi Mumbai'
                    img.replaceWith(fallback)
                  }}
                />
              </td>
              <td style={{ width: '33%' }}>Verified By:</td>
            </tr>
            <tr className="name-row">
              <td>
                {analysedSig
                  ? <img src={analysedSig} alt="signature" className="sig-img" />
                  : <span style={{ fontStyle: 'italic', color: '#666' }}>—</span>}
              </td>
              <td>
                {verifiedSig
                  ? <img src={verifiedSig} alt="signature" className="sig-img" />
                  : <span style={{ fontStyle: 'italic', color: '#666' }}>—</span>}
              </td>
            </tr>
            <tr className="role-row">
              <td>
                <div>{record.analysed_by || '—'}</div>
                <div style={{ fontWeight: 'normal', fontSize: 11, color: '#444' }}>{analysedRole}</div>
              </td>
              <td>
                <div>{record.verified_by || '—'}</div>
                <div style={{ fontWeight: 'normal', fontSize: 11, color: '#444' }}>{verifiedRole}</div>
              </td>
            </tr>
          </tbody>
        </table>

      </div>
    </>
  )
}
