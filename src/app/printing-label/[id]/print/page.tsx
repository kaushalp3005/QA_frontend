'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Printer } from 'lucide-react'
import {
  checkedParameters,
  DOC_META,
  isDraft,
  printingLabelsApi,
  type ParameterRow,
  type PrintingLabelRecord,
} from '@/lib/api/printingLabels'

/** Entries per printed A4 sheet. The paper register fits two blocks to a page,
 *  and the CSS below (compact rows, capped sample image) is sized for that. */
const ENTRIES_PER_PAGE = 2

/** ISO (YYYY-MM-DD) → DD/MM/YYYY, the format written on the paper register. */
function formatDate(s?: string | null): string {
  if (!s) return ''
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export default function PrintEntryPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [entries, setEntries] = useState<PrintingLabelRecord[]>([])
  const [date, setDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!params?.id) return
    let cancelled = false
    ;(async () => {
      try {
        // Load the requested entry first for its date, then pull that whole
        // day — the register is read a page (a date) at a time, not one row.
        const { data } = await printingLabelsApi.get(Number(params.id))
        if (cancelled) return
        setDate(data.entry_date)

        // A draft is not a filed record — it must never reach a controlled
        // printout, including via its own print link.
        if (isDraft(data)) {
          setError(
            'This entry is still a draft. Submit it before printing — drafts are kept off the register.',
          )
          return
        }

        if (!data.entry_date) {
          setEntries([data])
          return
        }
        // No warehouse filter, matching the register listing — the printed sheet
        // must hold exactly the entries the expanded date row shows, or rows go
        // missing from a controlled document without saying so.
        // byDate excludes drafts by default, so the sheet holds filed entries only.
        const sameDay = await printingLabelsApi.byDate(data.entry_date, null)
        if (cancelled) return
        // Fall back to the single entry if the day query somehow misses it.
        setEntries(sameDay.length ? sameDay : [data])
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load entries')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [params?.id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    )
  }

  if (error || !entries.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-red-600">{error || 'Entry not found'}</p>
        <button onClick={() => router.back()} className="text-sm text-blue-600 underline">
          Go back
        </button>
      </div>
    )
  }

  const pages = chunk(entries, ENTRIES_PER_PAGE)

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
          flex-wrap: wrap;
        }
        .toolbar button {
          padding: 8px 16px; border: 1px solid #ccc; background: #fff; cursor: pointer;
          font-size: 13px; border-radius: 4px; display: inline-flex; align-items: center; gap: 6px;
        }
        .toolbar button.primary { background: #A41F13; color: #fff; border-color: #A41F13; }
        .page {
          width: 210mm; min-height: 297mm; margin: 20px auto; padding: 12mm 10mm;
          background: #fff; box-shadow: 0 2px 10px rgba(0,0,0,0.12);
          display: flex; flex-direction: column;
        }
        .page .body { flex: 1; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        td, th { border: 1px solid #000; padding: 4px 6px; vertical-align: middle; word-wrap: break-word; }

        .header .logo-cell { padding: 6px; text-align: center; }
        .header .logo-cell img { max-width: 92%; max-height: 62px; object-fit: contain; display: block; margin: 0 auto; }
        .header .title-cell { text-align: center; font-weight: bold; padding: 7px 6px; }
        .header .meta-label { font-weight: normal; padding: 5px 6px; }
        .header .meta-value { padding: 5px 6px; }

        /* Compact enough that two entry blocks clear an A4 sheet. */
        .entry { margin-top: -1px; font-size: 10px; }
        .entry th { background: #d9d9d9; font-weight: bold; text-align: center; padding: 4px 3px; }
        .entry td { padding: 3px 5px; }
        .entry td.stack { vertical-align: top; text-align: center; padding-top: 6px; font-weight: bold; }
        .entry td.param { text-align: left; font-weight: 600; }
        .entry td.details { text-align: left; }
        .entry td.sample { text-align: center; padding: 4px; }
        .entry td.sample img { max-width: 100%; max-height: 85mm; object-fit: contain; display: block; margin: 0 auto; }
        .entry td.sample .none { color: #666; font-style: italic; }
        .entry td.sign { text-align: center; vertical-align: top; padding-top: 6px; }
        .entry td.sign .name { font-weight: 600; }
        .entry td.sign .on { font-size: 9px; color: #333; margin-top: 2px; }
        .entry + .entry { margin-top: 4mm; }

        /* Sign-off strip: plain text, no table borders — matches the paper form. */
        .signoff { margin-top: 8mm; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .signoff .side { font-weight: bold; white-space: nowrap; font-size: 11px; }
        .signoff .controlled {
          border: 1px solid #6d28d9; color: #6d28d9;
          font-weight: bold; font-size: 10px; line-height: 1.25;
          text-align: center; padding: 6px 14px;
        }

        /* On-screen only: a 210mm sheet does not fit a phone, so let it shrink. */
        @media screen and (max-width: 230mm) {
          .page { width: 100%; min-height: auto; margin: 12px 0; padding: 5mm 4mm; }
          .entry td.sample img { max-height: 45mm; }
        }

        @media print {
          html, body { background: #fff; }
          .toolbar { display: none !important; }
          .page {
            margin: 0; box-shadow: none; width: auto; min-height: auto; padding: 6mm;
            page-break-after: always;
          }
          .page:last-child { page-break-after: auto; }
          @page { size: A4; margin: 8mm; }
          /* Never split one entry's block across two sheets. */
          table.entry, tr { page-break-inside: avoid; }
        }
      `}</style>

      <div className="toolbar">
        <button onClick={() => router.back()}>
          <ArrowLeft size={14} /> Back
        </button>
        <span style={{ fontSize: 13, color: '#666' }}>
          {formatDate(date)} — <strong>{entries.length}</strong>{' '}
          {entries.length === 1 ? 'entry' : 'entries'} on {pages.length}{' '}
          {pages.length === 1 ? 'page' : 'pages'}
        </span>
        <button className="primary" onClick={() => window.print()}>
          <Printer size={14} /> Print / Save PDF
        </button>
      </div>

      {pages.map((pageEntries, pageIndex) => (
        <div className="page" key={pageIndex}>
          {/* ── HEADER ──
              Four rows: the logo spans all of them, the title column carries the
              company / format / document number, and the right pair of columns
              holds the issue + revision control fields. "Format:" spans two rows
              so it sits centred against Issue No / Revision Date, as on the form.
              Repeated on every sheet, since each sheet is a controlled page. */}
          <table className="header">
            <colgroup>
              <col style={{ width: '20%' }} />
              <col style={{ width: '50%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '14%' }} />
            </colgroup>
            <tbody>
              <tr>
                <td className="logo-cell" rowSpan={4}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/candor-logo.jpg" alt="Candor Foods" />
                </td>
                <td className="title-cell">CANDOR FOODS PRIVATE LIMITED</td>
                <td className="meta-label">Issue Date:</td>
                <td className="meta-value">{DOC_META.issueDate}</td>
              </tr>
              <tr>
                <td className="title-cell" rowSpan={2}>
                  Format: {DOC_META.format}
                </td>
                <td className="meta-label">Issue No:</td>
                <td className="meta-value">{DOC_META.issueNo}</td>
              </tr>
              <tr>
                <td className="meta-label">Revision Date:</td>
                <td className="meta-value">{DOC_META.revisionDate}</td>
              </tr>
              <tr>
                <td className="title-cell">Document No: {DOC_META.docNo}</td>
                <td className="meta-label">Revision No.:</td>
                <td className="meta-value">{DOC_META.revisionNo}</td>
              </tr>
            </tbody>
          </table>

          <div className="body">
            {pageEntries.map((entry) => (
              <EntryTable key={entry.id} entry={entry} />
            ))}
          </div>

          {/* ── FOOTER ──
              Document-template sign-off, not per-entry. DOC_META.approvedBy is who
              approved the FORM; the Approved By column above is who approved that
              batch's label. Same words, different things. */}
          <div className="signoff">
            <span className="side">Prepared By: {DOC_META.preparedBy}</span>
            <span className="controlled">
              CONTROLLED
              <br />
              COPY
            </span>
            <span className="side">Approved By: {DOC_META.approvedBy}</span>
          </div>
        </div>
      ))}
    </>
  )
}

// ── One entry's block ────────────────────────────────────────────────────────

function EntryTable({ entry }: { entry: PrintingLabelRecord }) {
  // Only ticked parameters print, matching the on-screen record and the COA
  // print page's rule. An entry with nothing ticked still needs one row so the
  // rowSpan cells (date, label, sign-offs) have something to sit against.
  const rows: ParameterRow[] = checkedParameters(entry)
  const printed: ParameterRow[] = rows.length
    ? rows
    : [{ parameter: '', details: '', checked: true }]
  const span = printed.length

  return (
    <table className="entry">
      <colgroup>
        <col style={{ width: '11%' }} />
        <col style={{ width: '19%' }} />
        <col style={{ width: '19%' }} />
        <col style={{ width: '27%' }} />
        <col style={{ width: '12%' }} />
        <col style={{ width: '12%' }} />
      </colgroup>
      <thead>
        <tr>
          <th>Date</th>
          <th>Parameter</th>
          <th>Details</th>
          <th>Actual Label Sample</th>
          <th>Printed By</th>
          <th>Approved By</th>
        </tr>
      </thead>
      <tbody>
        {printed.map((row, i) => (
          <tr key={row.parameter || `blank-${i}`}>
            {i === 0 && (
              <td className="stack" rowSpan={span}>
                {formatDate(entry.entry_date)}
              </td>
            )}
            <td className="param">{row.parameter}</td>
            <td className="details">{row.details}</td>
            {i === 0 && (
              <td className="sample" rowSpan={span}>
                {entry.actual_label_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entry.actual_label_url} alt="Actual label sample" />
                ) : (
                  <span className="none">No label sample</span>
                )}
              </td>
            )}
            {i === 0 && (
              <td className="sign" rowSpan={span}>
                <div className="name">{entry.printed_by || ''}</div>
                {entry.printed_on && <div className="on">{formatDate(entry.printed_on)}</div>}
              </td>
            )}
            {i === 0 && (
              <td className="sign" rowSpan={span}>
                <div className="name">{entry.approved_by || ''}</div>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
