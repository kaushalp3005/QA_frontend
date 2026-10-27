'use client'

/**
 * Print-only Breakdown Maintenance Record — the web stand-in for the Android
 * ChecklistPdfRenderer.renderBreakdown() download (landscape controlled copy,
 * one register row per record). W-202 prints CFPLA.C4.F.06, A-185 CFPLB.C4.F.61
 * (BreakdownFormSpec.forDocNo); the columns are identical.
 */

import type { BreakdownRecord } from '@/lib/maintenance/api/qc'

const META = {
  W202: {
    documentNo: 'CFPLA.C4.F.06',
    formatTitle: 'Breakdown Maintainance Record',
    issueNo: '04',
    revisionNo: '03',
    issueDate: '01/11/2017',
    revisionDate: '01/10/2025',
  },
  A185: {
    documentNo: 'CFPLB.C4.F.61',
    formatTitle: 'Breakdown  Maintenance Record',
    issueNo: '04',
    revisionNo: '03',
    issueDate: '01/11/2017',
    revisionDate: '02/02/2026',
  },
}

export const formMetaFor = (docNo?: string) =>
  docNo?.trim().toUpperCase() === META.A185.documentNo ? META.A185 : META.W202

const HEADERS = ['Sr', 'Date', 'Location', 'Machine', 'Model/Sr No', 'Problem', 'Type', 'Part', 'Reason', 'Start', 'End', 'Operator', 'Maint.', 'QC']
const WEIGHTS = [0.5, 1.2, 1.2, 1.6, 1.4, 2.2, 1.2, 1.1, 1.6, 0.9, 0.9, 1.2, 1.2, 1.1]
const TOTAL = WEIGHTS.reduce((a, b) => a + b, 0)

export const PRINT_ROOT_ID = 'qc-f06-print'

/** Hide everything but the sheet while printing. */
const PRINT_CSS = `
@media screen { #${PRINT_ROOT_ID} { display: none; } }
@media print {
  @page { size: A4 landscape; margin: 10mm; }
  body * { visibility: hidden !important; }
  #${PRINT_ROOT_ID}, #${PRINT_ROOT_ID} * { visibility: visible !important; }
  #${PRINT_ROOT_ID} { position: absolute; left: 0; top: 0; width: 100%; color: #000; background: #fff; }
}
`

export function F06PrintSheet({ record }: { record: BreakdownRecord }) {
  const meta = formMetaFor(record.doc_no)
  const cells = [
    '1',
    record.record_date,
    record.location,
    record.machine_name || record.equipment_model_no,
    record.equipment_model_no,
    record.problem_in_brief,
    record.type_of_maintenance,
    record.part_of_machine,
    record.temporary_reason,
    record.duration_start,
    record.duration_end,
    record.machine_operator_sign,
    record.maintenance_person_sign,
    record.qc_clearance_sign,
  ]
  const cell = 'border border-black px-1 py-1 align-top text-[9px] leading-tight break-words'

  return (
    <div id={PRINT_ROOT_ID} className="font-sans">
      <style>{PRINT_CSS}</style>
      <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
        <tbody>
          <tr>
            <td className="w-[18%] border border-black p-2 text-center align-middle">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/candor-logo.jpg" alt="Candor Foods" className="mx-auto h-10 object-contain" />
            </td>
            <td className="border border-black p-2 text-center align-middle">
              <p className="text-[12px] font-bold">CANDOR FOODS PVT LTD</p>
              <p className="text-[10px]">Format: {meta.formatTitle}</p>
              <p className="text-[10px]">Document No: {meta.documentNo}</p>
            </td>
            <td className="w-[22%] border border-black p-0 align-top text-[9px] text-zinc-700">
              {[
                `Issue Date: ${meta.issueDate}`,
                `Issue No: ${meta.issueNo}`,
                `Revision Date: ${meta.revisionDate}`,
                `Revision No: ${meta.revisionNo}`,
              ].map((t, i) => (
                <div key={t} className={i ? 'border-t border-black px-1.5 py-0.5' : 'px-1.5 py-0.5'}>
                  {t}
                </div>
              ))}
            </td>
          </tr>
        </tbody>
      </table>

      <table className="mt-3 w-full border-collapse" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          {WEIGHTS.map((w, i) => (
            <col key={i} style={{ width: `${(w / TOTAL) * 100}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr className="bg-zinc-200">
            {HEADERS.map((h) => (
              <th key={h} className={`${cell} font-bold`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {cells.map((c, i) => (
              <td key={i} className={cell}>
                {c || ''}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      <p className="mt-3 text-[10px] font-bold">Verified By: {record.verified_by?.trim() || '—'}</p>

      <div className="mt-6 flex justify-between text-[9px] text-zinc-700">
        <span>Prepared By: FST</span>
        <span>CONTROLLED COPY</span>
        <span>Approved By: FSTL</span>
      </div>
    </div>
  )
}
