'use client'

/**
 * Print-friendly controlled copies — the web stand-in for util/pdf/
 * (ChecklistPdfRenderer + CandorPdfCanvas). The document renders into a
 * portal that is hidden on screen; @media print hides everything else, so
 * "Download PDF" is the browser's Save-as-PDF. The header block lives in
 * <thead> and the footer in <tfoot>, which browsers repeat on every page,
 * like the Android canvas redraws them per page.
 *
 * Paper is always black-on-white, so these styles deliberately have no
 * dark: variants.
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { hasDateRange, type ChecklistRecordDetail } from '@/lib/maintenance/api/checklist'
import {
  DOC_META,
  flattenPreventive,
  pdfFileName,
  pdfFormFor,
  type BreakdownFormSpec,
  type BreakdownRow,
  type DocMeta,
} from './logic'

// ── Print plumbing ───────────────────────────────────────────────────────

interface PrintJob {
  title: string
  landscape: boolean
  node: ReactNode
}

/** `print(job)` mounts the document and opens the print dialog once it has painted. */
export function usePrintDoc() {
  const [job, setJob] = useState<PrintJob | null>(null)
  const done = useCallback(() => setJob(null), [])
  const portal = job ? <PrintPortal job={job} onDone={done} /> : null
  return { print: setJob as (job: PrintJob) => void, printing: !!job, portal }
}

function PrintPortal({ job, onDone }: { job: PrintJob; onDone: () => void }) {
  const [host, setHost] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const el = document.createElement('div')
    el.id = 'mt-print-root'
    document.body.appendChild(el)
    setHost(el)
    return () => {
      el.remove()
    }
  }, [])

  useEffect(() => {
    if (!host) return
    const prevTitle = document.title
    // The saved PDF takes the page title as its file name.
    document.title = job.title
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      document.title = prevTitle
      onDone()
    }
    window.addEventListener('afterprint', finish)
    let fallback: ReturnType<typeof setTimeout> | undefined
    const t = setTimeout(() => {
      window.print()
      // Desktop print() blocks until the dialog closes; some mobile browsers
      // return at once and may never fire afterprint.
      fallback = setTimeout(finish, 1500)
    }, 80)
    return () => {
      clearTimeout(t)
      if (fallback) clearTimeout(fallback)
      window.removeEventListener('afterprint', finish)
      document.title = prevTitle
    }
  }, [host, job, onDone])

  if (!host) return null
  return createPortal(
    <>
      <style>{`
        #mt-print-root { display: none; }
        @media print {
          @page { size: A4 ${job.landscape ? 'landscape' : 'portrait'}; margin: 8mm; }
          html, body { background: #fff !important; }
          body > *:not(#mt-print-root) { display: none !important; }
          #mt-print-root { display: block; color: #000; font-family: Arial, Helvetica, sans-serif; }
          #mt-print-root * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #mt-print-root tr { break-inside: avoid; }
        }
      `}</style>
      {job.node}
    </>,
    host,
  )
}

// ── Shared frame ─────────────────────────────────────────────────────────

const cell = 'border border-[#999] px-1 py-0.5 align-top'

function DocFrame({ meta, columns, children }: { meta: DocMeta; columns: number; children: ReactNode }) {
  return (
    <table className="w-full border-collapse text-[8.5pt] leading-snug">
      <thead>
        <tr>
          <td colSpan={columns} className="pb-2">
            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <td className="w-[110pt] border border-[#999] p-1.5 text-center align-middle">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/candor-logo.jpg" alt="Candor Foods" className="mx-auto max-h-[40pt] object-contain" />
                  </td>
                  <td className="border border-[#999] px-2 py-1 align-middle">
                    <div className="text-[9pt] font-bold">CANDOR FOODS PVT LTD</div>
                    <div>Format: {meta.formatTitle}</div>
                    <div>Document No: {meta.documentNo}</div>
                  </td>
                  <td className="w-[165pt] border border-[#999] px-1.5 py-1 align-middle text-[7.5pt] text-[#555]">
                    <div>Issue Date: {meta.issueDate}</div>
                    <div>Issue No: {meta.issueNo}</div>
                    <div>Revision Date: {meta.revisionDate}</div>
                    <div>Revision No: {meta.revisionNo}</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </thead>
      <tfoot>
        <tr>
          <td colSpan={columns} className="pt-2">
            <div className="flex justify-between text-[7.5pt] text-[#555]">
              <span>Prepared By: FST</span>
              <span>CONTROLLED COPY</span>
              <span>Approved By: FSTL</span>
            </div>
          </td>
        </tr>
      </tfoot>
      <tbody>{children}</tbody>
    </table>
  )
}

const dash = (v: string) => (v.trim() ? v : '—')

// ── Preventive checklist ─────────────────────────────────────────────────

export function preventivePrintJob(detail: ChecklistRecordDetail): PrintJob {
  const form = pdfFormFor(detail.formType)
  const meta = DOC_META[form]
  return {
    title: pdfFileName(form, detail.checklistDate, detail.id),
    landscape: meta.landscape,
    node: <PreventivePrint detail={detail} meta={meta} />,
  }
}

function PreventivePrint({ detail, meta }: { detail: ChecklistRecordDetail; meta: DocMeta }) {
  // A quarterly sheet certifies a period; monthly ones store from == to.
  const dateLabel = hasDateRange(detail)
    ? `Period: ${detail.checklistDateFrom} to ${detail.checklistDateTo}`
    : `Date: ${dash(detail.checklistDate)}`
  return (
    <DocFrame meta={meta} columns={3}>
      <tr>
        <td colSpan={3} className="pb-2">
          <div className="font-bold text-[9pt]">
            {dateLabel}
            <span className="ml-8">Done by: {dash(detail.doneBy)}</span>
          </div>
          <div>
            Checked by: {dash(detail.checkedBy)}
            <span className="ml-8">Verified by: {dash(detail.verifiedBy)}</span>
          </div>
          {detail.remarks.trim() && <div>Remarks: {detail.remarks}</div>}
        </td>
      </tr>
      <tr className="bg-[#F0F0F0] font-bold">
        <td className={`${cell} w-1/2`}>Check point</td>
        <td className={`${cell} w-1/6`}>Status</td>
        <td className={`${cell} w-1/3`}>Remarks</td>
      </tr>
      {flattenPreventive(detail).map((r, i) => {
        switch (r.kind) {
          case 'section':
            return (
              <tr key={i} className="bg-[#E0E0E0] font-bold">
                <td colSpan={3} className={cell}>
                  {r.title}
                </td>
              </tr>
            )
          case 'equipment':
            return (
              <tr key={i} className="font-bold">
                <td colSpan={3} className={cell}>
                  {r.title}
                </td>
              </tr>
            )
          case 'sub':
            return (
              <tr key={i} className="bg-[#F0F0F0]">
                <td colSpan={3} className={`${cell} pl-3`}>
                  {r.title}
                </td>
              </tr>
            )
          default:
            return (
              <tr key={i}>
                <td className={cell}>{r.name}</td>
                <td className={cell}>{r.status}</td>
                <td className={cell}>{r.remarks}</td>
              </tr>
            )
        }
      })}
    </DocFrame>
  )
}

// ── Breakdown register ───────────────────────────────────────────────────

const BREAKDOWN_HEADERS = [
  'Sr',
  'Date',
  'Location',
  'Machine',
  'Model/Sr No',
  'Problem',
  'Type',
  'Part',
  'Reason',
  'Start',
  'End',
  'Operator',
  'Maint.',
  'QC',
]
const BREAKDOWN_WEIGHTS = [0.5, 1.2, 1.2, 1.6, 1.4, 2.2, 1.2, 1.1, 1.6, 0.9, 0.9, 1.2, 1.2, 1.1]
const WEIGHT_SUM = BREAKDOWN_WEIGHTS.reduce((a, b) => a + b, 0)

export function breakdownPrintJob(spec: BreakdownFormSpec, rows: BreakdownRow[], verifiedBy: string): PrintJob {
  const meta = DOC_META[spec.pdfForm]
  return {
    title: pdfFileName(spec.pdfForm, rows[0]?.date ?? '', null),
    landscape: true,
    node: <BreakdownPrint meta={meta} rows={rows} verifiedBy={verifiedBy} />,
  }
}

function BreakdownPrint({ meta, rows, verifiedBy }: { meta: DocMeta; rows: BreakdownRow[]; verifiedBy: string }) {
  const n = BREAKDOWN_HEADERS.length
  return (
    <DocFrame meta={meta} columns={n}>
      <tr className="bg-[#F0F0F0] font-bold">
        {BREAKDOWN_HEADERS.map((h, i) => (
          <td key={h} className={cell} style={{ width: `${(BREAKDOWN_WEIGHTS[i] / WEIGHT_SUM) * 100}%` }}>
            {h}
          </td>
        ))}
      </tr>
      {rows.map((r) => (
        <tr key={r.srNo}>
          {[
            String(r.srNo),
            r.date,
            r.location,
            r.machineName,
            r.equipmentModel,
            r.problem,
            r.typeOfMaintenance,
            r.partOfMachine,
            r.reason,
            r.durationStart,
            r.durationEnd,
            r.machineOperatorSign,
            r.maintenancePersonSign,
            r.qcClearanceSign,
          ].map((v, i) => (
            <td key={i} className={`${cell} break-words`}>
              {v}
            </td>
          ))}
        </tr>
      ))}
      <tr>
        <td colSpan={n} className="pt-3 font-bold text-[9pt]">
          Verified By: {dash(verifiedBy)}
        </td>
      </tr>
    </DocFrame>
  )
}
