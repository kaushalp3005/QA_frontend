'use client'

import { Search, X } from 'lucide-react'

import { DISPOSITIONS } from '@/lib/api/complaintCalls'

export interface CallFilterState {
  from: string
  to: string
  disposition: string
  safetyOnly: boolean
  search: string
}

interface Props {
  value: CallFilterState
  onChange: (next: CallFilterState) => void
}

/** No intent dropdown on purpose: this section is the quality view, so the
 *  request always sends intent=quality (plus every safety-issue call, whatever
 *  its intent). */
export default function CallFilters({ value, onChange }: Props) {
  const set = <K extends keyof CallFilterState>(key: K, v: CallFilterState[K]) =>
    onChange({ ...value, [key]: v })

  return (
    <div className="surface-card p-3 sm:p-4 mb-4 flex items-end gap-3 flex-wrap animate-fade-in-up">
      <div className="relative flex-1 min-w-[220px]">
        <label className="label-base" htmlFor="call-search">
          Search
        </label>
        <Search className="absolute left-3.5 top-[2.4rem] h-4 w-4 text-ink-300" />
        <input
          id="call-search"
          type="search"
          placeholder="Caller number or name..."
          value={value.search}
          onChange={(e) => set('search', e.target.value)}
          className="input-base !pl-10 !pr-9 w-full"
        />
        {value.search && (
          <button
            type="button"
            onClick={() => set('search', '')}
            aria-label="Clear search"
            className="absolute right-3 top-[2.4rem] text-ink-300 hover:text-ink-500"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div>
        <label className="label-base" htmlFor="call-from">
          From
        </label>
        <input
          id="call-from"
          type="date"
          value={value.from}
          max={value.to || undefined}
          onChange={(e) => set('from', e.target.value)}
          className="input-base"
        />
      </div>

      <div>
        <label className="label-base" htmlFor="call-to">
          To
        </label>
        <input
          id="call-to"
          type="date"
          value={value.to}
          min={value.from || undefined}
          onChange={(e) => set('to', e.target.value)}
          className="input-base"
        />
      </div>

      <div>
        <label className="label-base" htmlFor="call-disposition">
          Outcome
        </label>
        <select
          id="call-disposition"
          value={value.disposition}
          onChange={(e) => set('disposition', e.target.value)}
          className="input-base min-w-[180px]"
        >
          {DISPOSITIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      <label className="inline-flex items-center gap-2 h-[42px] px-3 rounded-lg border border-cream-300 bg-cream-50 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={value.safetyOnly}
          onChange={(e) => set('safetyOnly', e.target.checked)}
          className="h-4 w-4 accent-[#A41F13]"
        />
        <span className="text-sm font-semibold text-ink-600">Safety issues only</span>
      </label>
    </div>
  )
}
