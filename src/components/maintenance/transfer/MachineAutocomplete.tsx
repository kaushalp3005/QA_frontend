'use client'

import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Input } from '@/components/maintenance/ui'

/** One selectable register asset — carries asset_id so the backend moves the exact row. */
export interface MachineOption {
  asset_id: string
  name: string
  building: string
  sub_location: string
}

/** Type to search the FROM warehouse's assets, or enter a name by hand
 *  (TransferFormScreen.MachineAutocompleteField). */
export function MachineAutocomplete({
  value,
  suggestions,
  onChange,
  onPick,
}: {
  value: string
  suggestions: MachineOption[]
  onChange: (v: string) => void
  onPick: (o: MachineOption) => void
}) {
  const [open, setOpen] = useState(false)
  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase()
    return (q ? suggestions.filter((s) => s.name.toLowerCase().includes(q)) : suggestions).slice(0, 8)
  }, [value, suggestions])

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder="Search or type a machine name"
        autoComplete="off"
        className="pr-9"
      />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {filtered.map((o) => (
            <li key={o.asset_id}>
              <button
                type="button"
                // mousedown fires before the input's blur closes the list
                onMouseDown={(e) => {
                  e.preventDefault()
                  onPick(o)
                  setOpen(false)
                }}
                className="block w-full px-3 py-2 text-left hover:bg-factory-50 dark:hover:bg-factory-500/10"
              >
                <span className="block text-sm text-zinc-900 dark:text-zinc-100">{o.name}</span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                  {[o.asset_id, o.building, o.sub_location].filter((s) => s && s.trim()).join(' · ')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
