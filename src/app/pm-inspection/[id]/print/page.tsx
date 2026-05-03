'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  getPMInspection,
  type PMInspectionRecord,
} from '@/lib/api/pm-inspection'
import PMInspectionSheet, {
  PM_SHEET_STYLES,
} from '@/components/pm-inspection/PMInspectionSheet'

export default function PMInspectionPrintPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [rec, setRec] = useState<PMInspectionRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const data = await getPMInspection(id)
        if (!cancelled) setRec(data)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load inspection')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  // Auto-open the print dialog once the record is rendered.
  useEffect(() => {
    if (!rec) return
    const t = setTimeout(() => window.print(), 300)
    return () => clearTimeout(t)
  }, [rec])

  if (loading) {
    return (
      <div style={{ padding: 40, fontFamily: 'Segoe UI, Arial, sans-serif' }}>
        Loading inspection…
      </div>
    )
  }
  if (error || !rec) {
    return (
      <div style={{ padding: 40, fontFamily: 'Segoe UI, Arial, sans-serif' }}>
        <p style={{ color: '#b91c1c', fontWeight: 600 }}>
          {error || 'Inspection not found.'}
        </p>
        <button
          onClick={() => router.push('/pm-inspection')}
          style={{ marginTop: 16, padding: '8px 14px' }}
        >
          Back
        </button>
      </div>
    )
  }

  return (
    <>
      <style>{`
        body {
          background: #eef1f5;
          padding: 30px 15px;
        }
        .pm-toolbar {
          max-width: 950px;
          margin: 0 auto 14px auto;
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          font-family: "Segoe UI", Arial, sans-serif;
        }
        .pm-toolbar button {
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid #1f2937;
          background: #fff;
          cursor: pointer;
          border-radius: 4px;
        }
        .pm-toolbar button.primary {
          background: #b71c1c;
          color: #fff;
          border-color: #b71c1c;
        }
        ${PM_SHEET_STYLES}

        /* ── Single-page print, fills ~80% of A4 portrait ───────────
           Usable area at 10mm margins ≈ 190mm × 277mm. We keep the
           original screen typography (only minor tweaks) and let the
           sheet stretch the full page width so the ~24 content rows
           fill most of the page without spilling onto a second page. */
        @media print {
          html, body { background: #fff !important; padding: 0 !important; margin: 0 !important; }
          .pm-toolbar { display: none !important; }

          @page { size: A4 portrait; margin: 10mm; }

          .pm-print-scope { font-size: 13px; }

          .sheet {
            border: 1.5px solid #000 !important;
            box-shadow: none !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .sheet table { page-break-inside: avoid; break-inside: avoid; }
          .sheet tr    { page-break-inside: avoid; break-inside: avoid; }

          .sheet td, .sheet th {
            padding: 7px 10px !important;
            font-size: 13px !important;
            line-height: 1.4 !important;
            border-color: #000 !important;
          }

          .sheet .header td { padding: 6px 10px !important; }
          .sheet .logo-cell img { max-width: 110px !important; max-height: 90px !important; }

          .sheet .title-cell.t1 { font-size: 14.5px !important; padding: 4px 0 !important; }
          .sheet .title-cell.t2 { font-size: 14px !important;   padding: 4px 0 !important; }
          .sheet .title-cell.t3 { font-size: 13px !important;   padding: 4px 0 !important; }

          .sheet .section-row td { padding: 9px !important; font-size: 13.5px !important; letter-spacing: 1px !important; }
          .sheet .sub-head td    { font-size: 13px !important; }

          .sheet .remarks-text { padding: 14px !important; min-height: 36px !important; }

          .sheet .signoff td {
            height: 95px !important;
            padding-top: 8px !important;
          }
          .sheet .signoff .name { margin-top: 38px !important; }

          /* Print exact background colours so the section banners stay grey */
          .sheet *, .sheet {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="pm-toolbar">
        <button onClick={() => router.push('/pm-inspection')}>Back</button>
        <button className="primary" onClick={() => window.print()}>
          Print
        </button>
      </div>

      <PMInspectionSheet rec={rec} />
    </>
  )
}
