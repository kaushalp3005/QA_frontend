'use client'

import {
  FORM_META,
  VISUAL_VERIFICATION_PARAMS,
  INSPECTION_PARAMS,
} from '@/lib/pm-inspection-layout'
import type { PMInspectionRecord } from '@/lib/api/pm-inspection'

// Shared printable / read-only sheet for a single PM inspection record.
// Used by both the View page (/pm-inspection/[id]) and the Print page
// (/pm-inspection/[id]/print). Self-contained styles keep the sheet
// looking the same regardless of the parent layout.

function fmtDateDDMMYYYY(value: string | null | undefined): string {
  if (!value) return '-'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (m) return `${m[3]}/${m[2]}/${m[1]}`
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

function fmtQty(value: string | number | null | undefined): string {
  if (value == null || value === '') return '-'
  const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''))
  if (!Number.isFinite(n)) return String(value)
  return n.toLocaleString('en-IN')
}

function fmtCOA(value: string | null | undefined): string {
  if (value === 'yes') return 'Yes'
  if (value === 'no') return 'No'
  return '-'
}

function dash(value: string | null | undefined): string {
  return value && value.trim() ? value : '-'
}

function statusClass(status: string | null | undefined): string {
  const s = (status || '').trim().toLowerCase()
  if (s === 'complies') return 'complies'
  if (s === 'does not comply') return 'does-not-comply'
  return ''
}

export const PM_SHEET_STYLES = `
  .pm-print-scope * { box-sizing: border-box; margin: 0; padding: 0; }
  .pm-print-scope {
    font-family: "Segoe UI", Arial, sans-serif;
    color: #1f2937;
  }

  .sheet {
    max-width: 950px;
    margin: 0 auto;
    background: #fff;
    border: 1.5px solid #1f2937;
    box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  }

  .sheet table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  .sheet td, .sheet th {
    border: 1px solid #1f2937;
    padding: 7px 10px;
    font-size: 13.5px;
    vertical-align: middle;
    word-wrap: break-word;
  }

  .sheet .header td { padding: 6px 10px; }
  .sheet .logo-cell {
    width: 18%;
    text-align: center;
    background: #fff;
  }
  .sheet .logo-cell img {
    max-width: 110px;
    max-height: 90px;
    object-fit: contain;
  }

  .sheet .title-cell {
    text-align: center;
    font-weight: 600;
    background: #fff;
  }
  .sheet .title-cell.t1 { font-size: 14.5px; font-weight: 700; padding: 4px 0; border-bottom: 1px solid #1f2937; }
  .sheet .title-cell.t2 { font-size: 14px; padding: 4px 0; border-bottom: 1px solid #1f2937; }
  .sheet .title-cell.t3 { font-size: 13px; padding: 4px 0; font-weight: 500; }

  .sheet .meta-label { width: 13%; font-weight: 600; background: #f3f4f6; }
  .sheet .meta-value { width: 11%; text-align: center; font-weight: 600; }

  .sheet .field-label {
    width: 28%;
    background: #f8f9fb;
    font-weight: 600;
  }
  .sheet .field-value { background: #fff; }

  .sheet .section-row td {
    text-align: center;
    background: #d6dbe1;
    font-weight: 700;
    letter-spacing: 1px;
    font-size: 13.5px;
    padding: 8px;
  }

  .sheet .sub-head td {
    background: #eef0f3;
    font-weight: 700;
    text-align: center;
    font-size: 13px;
  }

  .sheet .three-col td:nth-child(1) { width: 30%; font-weight: 600; background: #f8f9fb; }
  .sheet .three-col td:nth-child(2) { width: 35%; }
  .sheet .three-col td:nth-child(3) { width: 35%; }

  .sheet .complies { color: #15803d; font-weight: 600; }
  .sheet .does-not-comply { color: #b91c1c; font-weight: 600; }

  .sheet .remarks-text {
    text-align: center;
    font-style: italic;
    padding: 10px;
    background: #fafbfc;
  }

  .sheet .signoff td {
    height: 70px;
    width: 50%;
    text-align: center;
    vertical-align: top;
    font-weight: 700;
    background: #f8f9fb;
    padding-top: 8px;
  }
  .sheet .signoff .name {
    display: block;
    font-weight: 500;
    font-style: italic;
    margin-top: 30px;
  }
`

export default function PMInspectionSheet({ rec }: { rec: PMInspectionRecord }) {
  const visual = rec.visual_verification || {}
  const inspect = rec.inspection_parameters || {}

  return (
    <div className="pm-print-scope">
      <div className="sheet">
        {/* HEADER */}
        <table className="header">
          <tbody>
            <tr>
              <td className="logo-cell" rowSpan={4}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/candor-logo.jpg" alt="Candor Foods" />
              </td>
              <td className="title-cell t1" colSpan={2}>
                {FORM_META.title}
              </td>
              <td className="meta-label">Issue Date:</td>
              <td className="meta-value">{FORM_META.issueDate}</td>
            </tr>
            <tr>
              <td className="title-cell t2" colSpan={2}>
                {FORM_META.subtitle}
              </td>
              <td className="meta-label">Issue No.:</td>
              <td className="meta-value">{FORM_META.issueNo}</td>
            </tr>
            <tr>
              <td className="title-cell t3" colSpan={2} rowSpan={2}>
                {FORM_META.formCode}
              </td>
              <td className="meta-label">Revision Date:</td>
              <td className="meta-value">{FORM_META.revisionDate}</td>
            </tr>
            <tr>
              <td className="meta-label">Revision No.:</td>
              <td className="meta-value">{FORM_META.revisionNo}</td>
            </tr>
          </tbody>
        </table>

        {/* BASIC FIELDS */}
        <table>
          <tbody>
            <tr>
              <td className="field-label">Sr. No.</td>
              <td className="field-value" colSpan={3}>
                {dash(rec.sr_no || String(rec.id))}
              </td>
            </tr>
            <tr>
              <td className="field-label">Received Date</td>
              <td className="field-value" style={{ width: '22%' }}>
                {fmtDateDDMMYYYY(rec.received_date)}
              </td>
              <td className="field-label" style={{ width: '22%' }}>
                Inspection Date
              </td>
              <td className="field-value">{fmtDateDDMMYYYY(rec.inspection_date)}</td>
            </tr>
            <tr>
              <td className="field-label">Material Description (RM/PM)</td>
              <td className="field-value" colSpan={3}>
                {dash(rec.material_description)}
              </td>
            </tr>
            <tr>
              <td className="field-label">Challan No.</td>
              <td className="field-value">{dash(rec.challan_no)}</td>
              <td className="field-label">Invoice No.</td>
              <td className="field-value">{dash(rec.invoice_no)}</td>
            </tr>
            <tr>
              <td className="field-label">Supplier Name</td>
              <td className="field-value" colSpan={3}>
                {dash(rec.supplier_name)}
              </td>
            </tr>
            <tr>
              <td className="field-label">Vehicle No.</td>
              <td className="field-value" colSpan={3}>
                {dash(rec.vehicle_no)}
              </td>
            </tr>
            <tr>
              <td className="field-label">COA Received (Yes/No)</td>
              <td className="field-value" colSpan={3}>
                {fmtCOA(rec.coa_received)}
              </td>
            </tr>
            <tr>
              <td className="field-label">Quantity (Nos/Pieces)</td>
              <td className="field-value" colSpan={3}>
                {fmtQty(rec.quantity)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* VISUAL VERIFICATION */}
        <table className="three-col">
          <tbody>
            <tr className="section-row">
              <td colSpan={3}>VISUAL VERIFICATION</td>
            </tr>
            <tr className="sub-head">
              <td>Parameter</td>
              <td>Observation</td>
              <td>Status</td>
            </tr>
            {VISUAL_VERIFICATION_PARAMS.map((def) => {
              const v = visual[def.key] || { observation: '', status: '' }
              return (
                <tr key={def.key}>
                  <td>{def.parameter}</td>
                  <td>{dash(v.observation)}</td>
                  <td className={statusClass(v.status)}>{dash(v.status)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* INSPECTION PARAMETERS */}
        <table className="three-col">
          <tbody>
            <tr className="section-row">
              <td colSpan={3}>INSPECTION PARAMETERS</td>
            </tr>
            {INSPECTION_PARAMS.map((def) => {
              const v = inspect[def.key] || { observation: '', status: '' }
              return (
                <tr key={def.key}>
                  <td>{def.parameter}</td>
                  <td>{dash(v.observation)}</td>
                  <td>{dash(v.status)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* REMARKS */}
        <table>
          <tbody>
            <tr className="section-row">
              <td>REMARKS</td>
            </tr>
            <tr>
              <td className="remarks-text">{dash(rec.remarks)}</td>
            </tr>
          </tbody>
        </table>

        {/* SIGN-OFF */}
        <table>
          <tbody>
            <tr className="signoff">
              <td>
                DONE BY
                <span className="name">{dash(rec.done_by)}</span>
              </td>
              <td>
                VERIFIED BY
                <span className="name">{dash(rec.verified_by)}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
