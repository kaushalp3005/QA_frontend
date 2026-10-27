'use client'

/**
 * Searchable machine dropdown over the whole asset register
 * (spareparts/components/MachinePickerField.kt). The last row is always
 * "Other — type machine name", so a failed register fetch never blocks adding
 * a part.
 */
import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Field, Input } from '@/components/maintenance/ui'
import { plantLabel } from '@/lib/maintenance/format'

export interface MachineOption {
  assetId: string
  assetName: string
  building: string
}

export function MachinePickerField({
  query,
  options,
  onQueryChange,
  onSelect,
  onChooseOther,
  hint,
}: {
  query: string
  options: MachineOption[]
  onQueryChange: (v: string) => void
  onSelect: (o: MachineOption) => void
  onChooseOther: () => void
  hint?: string | null
}) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const q = query.trim().toLowerCase()
  const filtered = (q ? options.filter((o) => o.assetName.toLowerCase().includes(q) || o.assetId.toLowerCase().includes(q)) : options).slice(0, 8)

  return (
    <div ref={box} className="relative">
      <Field label="Machine — search the asset list" required hint={hint}>
        <div className="relative">
          <Input
            value={query}
            onChange={(e) => {
              onQueryChange(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            placeholder="Machine name or asset ID"
            className="pr-9"
          />
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        </div>
      </Field>
      {open && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {filtered.map((o) => (
            <button
              key={o.assetId}
              type="button"
              onClick={() => {
                onSelect(o)
                setOpen(false)
              }}
              className="block w-full px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <span className="block text-sm text-zinc-900 dark:text-zinc-100">{o.assetName}</span>
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                {o.assetId} · {plantLabel(o.building)}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              onChooseOther()
              setOpen(false)
            }}
            className="block w-full px-3 py-2 text-left text-sm font-semibold text-factory-700 hover:bg-zinc-50 dark:text-factory-300 dark:hover:bg-zinc-800"
          >
            Other — type machine name
          </button>
        </div>
      )}
    </div>
  )
}
