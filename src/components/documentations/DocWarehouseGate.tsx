'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, ArrowLeft } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { getStoredWarehouse, type WarehouseCode } from '@/components/ui/WarehouseSelector'

interface Props {
  /** Plants this format exists at — usually config.warehouses. */
  warehouses?: WarehouseCode[]
  /** Form name, shown in the "not available here" message. */
  label: string
  /** Skip the dashboard chrome — for pages that render their own (e.g. print). */
  bare?: boolean
  children: ReactNode
}

/**
 * Keeps a plant-specific format out of the other plant's hands.
 *
 * Some formats belong to one plant only (e.g. A185's In-process QC — After
 * Processing, CFPLB.C5.F.11). Its card is already hidden from the grid for the
 * other plant, but the URL is still typeable and the warehouse switch can be
 * flipped while the page is open — so every page of such a form wraps its body
 * in this gate. The backend refuses the same requests independently
 * (_guard_form_plant in routers/documentations.py); this is the UI half.
 */
export default function DocWarehouseGate({ warehouses, label, bare, children }: Props) {
  const router = useRouter()
  // null until mounted — the active plant is only knowable client-side, and
  // rendering nothing until then keeps the form from flashing up before it is
  // gated away.
  const [warehouse, setWarehouse] = useState<WarehouseCode | null>(null)

  useEffect(() => {
    setWarehouse(getStoredWarehouse())
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.warehouse) setWarehouse(detail.warehouse)
    }
    window.addEventListener('warehouseChanged', handler)
    return () => window.removeEventListener('warehouseChanged', handler)
  }, [])

  // No restriction — nothing to gate.
  if (!warehouses || warehouses.length === 0) return <>{children}</>

  // Wrap in the dashboard chrome unless the page provides its own.
  const chrome = (body: ReactNode) =>
    bare ? (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">{body}</div>
    ) : (
      <DashboardLayout>{body}</DashboardLayout>
    )

  if (warehouse === null) {
    return chrome(
      <div className="max-w-7xl w-full mx-auto">
        <div className="surface-card p-8 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-10 w-full" />
          ))}
        </div>
      </div>,
    )
  }

  if (!warehouses.includes(warehouse)) {
    return chrome(
      <div className="max-w-2xl w-full mx-auto">
        <div className="surface-card p-12 flex flex-col items-center text-center animate-fade-in">
          <div className="bg-cream-200 w-16 h-16 rounded-full flex items-center justify-center mb-3">
            <Lock className="w-7 h-7 text-ink-300" />
          </div>
          <p className="text-sm font-semibold text-ink-500">Not available for {warehouse}</p>
          <p className="text-xs text-ink-400 mt-1 max-w-sm">
            <span className="font-semibold text-ink-500">{label}</span> is a{' '}
            {warehouses.join(' / ')} format. Switch to {warehouses.join(' or ')} to open it.
          </p>
          <button onClick={() => router.push('/documentations')} className="btn-primary mt-5">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Documentations
          </button>
        </div>
      </div>,
    )
  }

  return <>{children}</>
}
