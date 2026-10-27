'use client'

/**
 * Type-to-search machine field over the asset register (MachineSearchPicker in
 * PlanEditorScreen.kt). The text is the raw query, matched on asset name OR id;
 * loading / load-failed states are shown distinctly from "no match".
 */

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, RefreshCw } from 'lucide-react'
import clsx from 'clsx'
import { Field, inputCls } from '@/components/maintenance/ui'
import type { MtMachine } from '@/lib/maintenance/api/assets'

export default function MachinePicker({
  assets,
  selectedId,
  onSelect,
  loading,
  error,
  onRetry,
}: {
  assets: MtMachine[]
  selectedId: string | null
  onSelect: (assetId: string) => void
  loading: boolean
  error: string | null
  onRetry: () => void
}) {
  const selectedName = assets.find((a) => a.asset_id === selectedId)?.asset_name ?? ''
  const [query, setQuery] = useState(selectedName)
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  // Re-seed the text when the selection (or the loaded register) changes.
  useEffect(() => setQuery(selectedName), [selectedName])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const q = query.trim().toLowerCase()
  const filtered = q
    ? assets.filter((a) => a.asset_name.toLowerCase().includes(q) || a.asset_id.toLowerCase().includes(q))
    : assets

  const hint = loading ? 'Loading machines…' : error ? "Couldn't load machines. Open the field and hit Retry." : undefined

  return (
    <div ref={box} className="relative">
      <Field label="Machine" required hint={!error ? hint : undefined} error={error ? hint : undefined}>
        <div className="relative">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search assets by name or id…"
            className={clsx(inputCls, 'pr-9', error && 'border-red-400 dark:border-red-500/60')}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setOpen((o) => !o)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 hover:text-zinc-600"
            aria-label="Show machines"
          >
            <ChevronDown className={clsx('h-4 w-4 transition', open && 'rotate-180')} />
          </button>
        </div>
      </Field>
      {open && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          {loading ? (
            <p className="px-3 py-2 text-sm text-zinc-500">Loading machines…</p>
          ) : error ? (
            <button
              type="button"
              onClick={onRetry}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-factory-700 hover:bg-zinc-50 dark:text-factory-300 dark:hover:bg-zinc-800"
            >
              <RefreshCw className="h-4 w-4" /> Retry loading machines
            </button>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-zinc-500">No assets match &quot;{query.trim()}&quot;</p>
          ) : (
            filtered.map((a) => (
              <button
                key={a.asset_id}
                type="button"
                onClick={() => {
                  onSelect(a.asset_id)
                  setQuery(a.asset_name)
                  setOpen(false)
                }}
                className={clsx(
                  'block w-full px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800',
                  a.asset_id === selectedId
                    ? 'font-semibold text-factory-700 dark:text-factory-300'
                    : 'text-zinc-800 dark:text-zinc-200',
                )}
              >
                {a.asset_name} <span className="text-zinc-500">— {a.asset_id} · {a.building}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
