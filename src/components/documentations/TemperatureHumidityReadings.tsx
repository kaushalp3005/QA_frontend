'use client'

import { Fragment } from 'react'
import {
  TH_DAYS,
  TH_HUMIDITY_MAX,
  TH_HUMIDITY_MIN,
  TH_READING_LABELS,
  thHasData,
  thHumidityOutOfRange,
  thSavedSections,
} from '@/lib/temperature-humidity'

const DAY_NUMBERS = Array.from({ length: TH_DAYS }, (_, i) => i + 1)

/**
 * Read-only readings for a Temperature & Humidity record, one block per area.
 *
 * Replaces DocViewPage's generic rendering of the `readings` jsonb, which for
 * the v2 shape is a nested object and came out as a raw JSON dump — the
 * readings, per-day signatories and notes weren't readable on the view page.
 */
export default function TemperatureHumidityReadings({ record }: { record: Record<string, any> }) {
  const sections = thSavedSections(record).filter(thHasData)

  if (sections.length === 0) {
    return <p className="text-sm text-gray-400">No readings recorded.</p>
  }

  return (
    <div className="space-y-6">
      {sections.map((s, si) => (
        <div key={`${s.area}-${si}`} className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">{s.area || `Area ${si + 1}`}</h3>

          <div className="overflow-x-auto border rounded">
            <table className="text-xs border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-1 text-left font-medium sticky left-0 bg-gray-50 z-10 min-w-[120px]">
                    Reading
                  </th>
                  {DAY_NUMBERS.map((d) => (
                    <th key={d} className="border px-1 py-1 text-center font-medium min-w-[40px]">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TH_READING_LABELS.map((label, idx) => (
                  <Fragment key={label}>
                    <tr>
                      <td className="border px-2 py-1 font-medium text-gray-700 sticky left-0 bg-white z-10">
                        {label} Temp °C
                      </td>
                      {DAY_NUMBERS.map((d) => (
                        <td key={d} className="border px-1 py-1 text-center">{s.grid[d]?.[idx]?.temp}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border px-2 py-1 font-medium text-gray-700 sticky left-0 bg-white z-10">
                        {label} Humidity %
                      </td>
                      {DAY_NUMBERS.map((d) => {
                        const v = s.grid[d]?.[idx]?.humidity ?? ''
                        const bad = thHumidityOutOfRange(v)
                        return (
                          <td
                            key={d}
                            className={`border px-1 py-1 text-center ${bad ? 'bg-red-50 text-red-600 font-semibold' : ''}`}
                          >
                            {v}
                          </td>
                        )
                      })}
                    </tr>
                  </Fragment>
                ))}
                {([
                  ['Checked By', s.checkedBy],
                  ['Verified By', s.verifiedBy],
                ] as const).map(([label, signs]) => (
                  <tr key={label} className="bg-gray-50/60">
                    <td className="border px-2 py-1 font-medium text-gray-700 sticky left-0 bg-gray-50 z-10">
                      {label}
                    </td>
                    {DAY_NUMBERS.map((d) => (
                      <td
                        key={d}
                        className="border px-1 py-1 text-center text-[10px] leading-tight text-gray-700"
                        title={signs[d] || undefined}
                      >
                        {signs[d] || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-gray-400">
            Humidity acceptable: {TH_HUMIDITY_MIN}–{TH_HUMIDITY_MAX}%. Out-of-range values are highlighted.
          </p>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Observations</dt>
              <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                {s.observations || <span className="text-gray-400">—</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase">Corrective Action</dt>
              <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                {s.correctiveAction || <span className="text-gray-400">—</span>}
              </dd>
            </div>
          </dl>
        </div>
      ))}
    </div>
  )
}
