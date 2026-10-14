'use client'

import { Fragment } from 'react'
import {
  GB_CROSS,
  GB_MONTHS,
  GB_TICK,
  gbConditionIsOk,
  gbFmtDate,
  gbFormatOf,
  gbGroup,
  gbMonthDates,
  gbMonthlyRows,
  gbSignoffs,
  gbYearlyRows,
} from '@/lib/glass-brittle'

const th = 'border px-2 py-1 text-left font-medium bg-gray-50'
const td = 'border px-2 py-1 align-top'

/**
 * Read-only body of a Glass and Brittle Check Record, in whichever of the two
 * plant layouts the record was saved in. Replaces DocViewPage's generic
 * rendering of `rows`, which shows nested month ticks as raw JSON.
 */
export default function GlassBrittleRecordView({ record }: { record: Record<string, any> }) {
  return gbFormatOf(record) === 'monthly' ? <MonthlyView record={record} /> : <YearlyView record={record} />
}

function YearlyView({ record }: { record: Record<string, any> }) {
  const floors = gbGroup(gbYearlyRows(record), (r) => r.floor)
  const dates = gbMonthDates(record)
  const signoffs = gbSignoffs(record)

  if (floors.length === 0) return <p className="text-sm text-gray-400">No items recorded.</p>

  const monthCell = (v: string) =>
    v === GB_TICK ? 'text-green-700 font-bold' : v === GB_CROSS ? 'bg-red-50 text-red-600 font-bold' : ''

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto border rounded">
        <table className="text-xs border-collapse w-full">
          <thead>
            <tr>
              <th className={`${th} min-w-[110px]`}>Floor</th>
              <th className={`${th} min-w-[120px]`}>Item</th>
              <th className={`${th} min-w-[140px]`}>Location</th>
              <th className={`${th} min-w-[160px]`}>Glass No.</th>
              <th className={`${th} min-w-[90px]`}>Glass Details</th>
              {GB_MONTHS.map((m) => (
                <th key={m} className={`${th} text-center min-w-[44px]`}>{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {floors.map((f) => (
              <Fragment key={f.key}>
                {f.rows.map((r, i) => (
                  <tr key={r.id}>
                    {i === 0 && (
                      <td rowSpan={f.rows.length} className={`${td} font-semibold text-gray-800`}>{f.key || '—'}</td>
                    )}
                    <td className={td}>{r.item}</td>
                    <td className={td}>{r.location}</td>
                    <td className={td}>{r.glassNo}</td>
                    <td className={td}>{r.details}</td>
                    {GB_MONTHS.map((m) => (
                      <td key={m} className={`${td} text-center ${monthCell(r.months[m])}`}>{r.months[m]}</td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
            {([
              ['Date of check', (m: (typeof GB_MONTHS)[number]) => gbFmtDate(dates[m])],
              ['Checked By', (m: (typeof GB_MONTHS)[number]) => signoffs[m].checkedBy],
              ['Verified By', (m: (typeof GB_MONTHS)[number]) => signoffs[m].verifiedBy],
            ] as const).map(([label, value]) => (
              <tr key={label} className="bg-gray-50/60">
                <td colSpan={5} className={`${td} font-semibold text-gray-700`}>{label}</td>
                {GB_MONTHS.map((m) => (
                  <td key={m} className={`${td} text-center text-[10px] leading-tight`}>{value(m)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-gray-400">
        {GB_TICK} checked and intact · {GB_CROSS} damaged or missing (see Observations)
      </p>
    </div>
  )
}

function MonthlyView({ record }: { record: Record<string, any> }) {
  const areas = gbGroup(gbMonthlyRows(record), (r) => r.area)

  if (areas.length === 0) return <p className="text-sm text-gray-400">No items recorded.</p>

  return (
    <div className="space-y-5">
      {areas.map((a, ai) => (
        <div key={a.key || ai} className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-900">{a.key || `Area ${ai + 1}`}</h3>
          <div className="overflow-x-auto border rounded">
            {/* Fixed column grid so every area's table lines up with the next. */}
            <table className="text-xs border-collapse w-full min-w-[900px] table-fixed">
              <colgroup>
                <col className="w-[13%]" />
                <col className="w-[35%]" />
                <col className="w-[8%]" />
                <col className="w-[12%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[10%]" />
              </colgroup>
              <thead>
                <tr>
                  <th className={th}>Item</th>
                  <th className={th}>ID Nos.</th>
                  <th className={th}>Date</th>
                  <th className={th}>Condition at the Time of Check</th>
                  <th className={th}>Remark</th>
                  <th className={th}>Action Taken</th>
                  <th className={th}>QC Verification</th>
                </tr>
              </thead>
              <tbody>
                {a.rows.map((r) => {
                  const finding = r.condition.trim() !== '' && !gbConditionIsOk(r.condition)
                  return (
                    <tr key={r.id}>
                      <td className={`${td} font-medium text-gray-800`}>{r.item}</td>
                      <td className={`${td} break-words`}>{r.glassNo}</td>
                      <td className={`${td} whitespace-nowrap`}>{gbFmtDate(r.date)}</td>
                      <td className={`${td} ${finding ? 'bg-red-50 text-red-600 font-semibold' : ''}`}>{r.condition}</td>
                      <td className={`${td} whitespace-pre-wrap`}>{r.remark}</td>
                      <td className={`${td} whitespace-pre-wrap`}>{r.actionTaken}</td>
                      <td className={td}>{r.qcVerification}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
