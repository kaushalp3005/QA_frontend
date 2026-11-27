'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2, Search, X } from 'lucide-react'
import {
  BatchDetectionError,
  DEFAULT_SHELF_LIFE_DAYS,
  LabelSku,
  batchDetectionApi,
} from '@/lib/api/batchDetection'

interface SkuPickerProps {
  company: string
  value: LabelSku | null
  onChange: (sku: LabelSku | null) => void
  disabled?: boolean
}

/** Search the SKU master and pick one. Once picked, shows what the label is
 *  checked against (net weight, MRP, USP, shelf life). */
export default function SkuPicker({ company, value, onChange, disabled }: SkuPickerProps) {
  const [search, setSearch] = useState('')
  const [term, setTerm] = useState('')
  const [skus, setSkus] = useState<LabelSku[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setTerm(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (value) return
    let cancelled = false
    setLoading(true)
    setError(null)
    batchDetectionApi
      .listSkus(company, term)
      .then((rows) => !cancelled && setSkus(rows))
      .catch((err) => {
        if (cancelled) return
        setSkus([])
        setError(err instanceof BatchDetectionError ? err.message : 'Could not load SKUs.')
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [company, term, value])

  if (value) {
    return (
      <div className="rounded-xl border border-cream-300 bg-cream-100/60 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">
              {value.customer} · {value.brand}
            </p>
            <p className="font-bold text-ink-600">{value.name_on_pack || value.product_name}</p>
            {value.name_on_pack && <p className="text-xs text-ink-400 line-clamp-2">{value.product_name}</p>}
            {value.customer_sku_code && (
              <p className="text-xs text-ink-500 mt-0.5">SKU code {value.customer_sku_code}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            className="btn-ghost !px-2.5 !py-1.5 text-xs shrink-0"
          >
            Change
          </button>
        </div>
        <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-sm">
          <Fact label="Net weight" value={value.grammage_g ? `${value.grammage_g} g` : '—'} />
          <Fact label="MRP" value={value.mrp ?? '—'} />
          <Fact label="USP" value={value.usp_per_g ? `${value.usp_per_g} per g` : '—'} />
          <Fact
            label="Shelf life"
            value={
              value.shelf_life_days
                ? `${value.shelf_life_days} days`
                : `${DEFAULT_SHELF_LIFE_DAYS} days (default)`
            }
          />
        </dl>
        {!value.mrp && (
          <p className="mt-3 flex items-start gap-2 text-sm font-semibold text-danger-600">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            This SKU has no MRP in the SKU master, so its labels cannot be checked yet.
          </p>
        )}
        {value.mrp && !value.shelf_life_days && (
          <p className="mt-3 flex items-start gap-2 text-xs text-warning-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            No shelf life in the SKU master: expiry is checked with the default {DEFAULT_SHELF_LIFE_DAYS} days.
          </p>
        )}
      </div>
    )
  }

  return (
    <div>
      <label className="label-base" htmlFor="bd-sku-search">
        SKU <span className="text-danger-600">*</span>
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
        <input
          id="bd-sku-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search words in any order, e.g. vedaka prunes"
          className="input-base !pl-9 !pr-9"
          disabled={disabled}
          autoComplete="off"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-ink-400 hover:text-ink-600"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="mt-2 rounded-xl border border-cream-300 bg-cream-50 max-h-72 overflow-y-auto">
        {loading ? (
          <p className="flex items-center gap-2 px-3 py-3 text-sm text-ink-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading SKUs…
          </p>
        ) : error ? (
          <p className="px-3 py-3 text-sm text-danger-600">{error}</p>
        ) : skus.length === 0 ? (
          <p className="px-3 py-3 text-sm text-ink-400">
            {term ? `No SKU matches “${term}”.` : 'No SKUs in the master yet.'}
          </p>
        ) : (
          <ul className="divide-y divide-cream-300">
            {skus.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onChange(s)}
                  disabled={disabled}
                  className="w-full text-left px-3 py-2.5 hover:bg-cream-200/70 focus:bg-cream-200/70 focus:outline-none"
                >
                  <span className="block font-semibold text-ink-600 text-sm line-clamp-2">{s.product_name}</span>
                  <span className="block text-xs text-ink-400">
                    {s.brand}
                    {s.customer_sku_code ? ` · ${s.customer_sku_code}` : ''}
                    {s.grammage_g ? ` · ${s.grammage_g} g` : ''}
                    {s.mrp ? ` · MRP ${s.mrp}` : ' · no MRP'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wider text-ink-400">{label}</dt>
      <dd className="font-semibold text-ink-600 truncate">{value}</dd>
    </div>
  )
}
