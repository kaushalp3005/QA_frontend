'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Warehouse, Check } from 'lucide-react'
import { cn } from '@/lib/styles'
import { canSwitchWarehouse, lockedWarehouse, type WarehouseCode } from '@/lib/warehouseAccess'

export type { WarehouseCode }

const STORAGE_KEY = 'currentWarehouse'

/**
 * The active warehouse. An account pinned to one plant always gets that plant,
 * whatever is in localStorage — so a stale value (or one left behind by another
 * user on a shared browser) can never leak the other plant's data into its view
 * or stamp the wrong warehouse onto a record it saves.
 */
export function getStoredWarehouse(): WarehouseCode {
  if (typeof window === 'undefined') return 'A185'
  const locked = lockedWarehouse()
  if (locked) return locked
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved === 'W202' || saved === 'A185' ? saved : 'A185'
}

export function setStoredWarehouse(value: WarehouseCode) {
  if (!canSwitchWarehouse()) return // pinned account — switching is not offered
  localStorage.setItem(STORAGE_KEY, value)
  window.dispatchEvent(new CustomEvent('warehouseChanged', { detail: { warehouse: value } }))
}

const WAREHOUSES: { value: WarehouseCode; label: string }[] = [
  { value: 'A185', label: 'A185 — Main Plant' },
  { value: 'W202', label: 'W202 — Warehouse' },
]

export default function WarehouseSelector() {
  const [current, setCurrent] = useState<WarehouseCode>('A185')
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  // null until mounted — who is signed in is only knowable client-side, and
  // rendering nothing until then keeps a pinned account from seeing the switch
  // flash up before it is removed.
  const [canSwitch, setCanSwitch] = useState<boolean | null>(null)

  useEffect(() => {
    setCanSwitch(canSwitchWarehouse())
    setCurrent(getStoredWarehouse())
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.warehouse) setCurrent(detail.warehouse)
    }
    window.addEventListener('warehouseChanged', handler)
    return () => window.removeEventListener('warehouseChanged', handler)
  }, [])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const handleSelect = (value: WarehouseCode) => {
    setCurrent(value)
    setStoredWarehouse(value)
    setIsOpen(false)
  }

  // Pinned to one plant (or not resolved yet) — render no switch at all.
  if (canSwitch !== true) return null

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200',
          'bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300 border border-gray-300 shadow-sm',
          isOpen && 'bg-gray-50 ring-2 ring-blue-300 border-blue-300'
        )}
      >
        <Warehouse className="h-4 w-4 text-blue-600" />
        <span className="font-semibold">{current}</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform text-gray-400', isOpen && 'rotate-180 text-blue-500')} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="py-2">
            <div className="px-4 py-2 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-900">Select Warehouse</h3>
              <p className="text-xs text-gray-500 mt-1">Switch active warehouse / plant</p>
            </div>
            {WAREHOUSES.map((w) => (
              <button
                key={w.value}
                onClick={() => handleSelect(w.value)}
                className={cn(
                  'w-full px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors',
                  current === w.value && 'bg-blue-50 border-l-4 border-blue-400'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-bold shadow-sm',
                        w.value === 'A185' ? 'bg-blue-500' : 'bg-emerald-500'
                      )}
                    >
                      {w.value.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{w.value}</div>
                      <div className="text-xs text-gray-500">{w.label}</div>
                    </div>
                  </div>
                  {current === w.value && <Check className="h-4 w-4 text-blue-600" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
