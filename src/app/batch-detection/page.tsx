'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, ImagePlus, Loader2, ScanLine, X } from 'lucide-react'
import { toast } from 'react-hot-toast'

import DashboardLayout from '@/components/layout/DashboardLayout'
import ModuleGuard from '@/components/ModuleGuard'
import PageHeader from '@/components/ui/PageHeader'
import SkuPicker from '@/components/batch-detection/SkuPicker'
import ResultView from '@/components/batch-detection/ResultView'
import { useCompany } from '@/contexts/CompanyContext'
import { prepareLabelPhoto } from '@/lib/imageResize'
import {
  BatchDetectionError,
  LabelSku,
  MODULE_CODE,
  VerifyResult,
  batchDetectionApi,
  DEFAULT_SHELF_LIFE_DAYS,
  addDays,
  batchCode,
  expectedBatch,
  formatLabelDate,
  todayIso,
} from '@/lib/api/batchDetection'

/**
 * Batch Detection: pick the SKU, enter the run's packing date, photograph a
 * printed pack label, have it read and checked, fix, repeat. Expiry (packing
 * date + shelf life) and batch (prefix + JK24-style date code) follow from the
 * packing date.
 *
 *   upload  ──Verify──▶  checking  ──▶  result
 *     ▲                                   │
 *     └──── Done (next label) / Retake ───┘
 *
 * Nothing is persisted: the photo stays in this tab as an object URL, the
 * server keeps it in memory for one request, and no browser storage is used.
 * The SKU and packing date survive "Done", so the next label of the run is
 * one tap.
 */
type Step = 'upload' | 'checking' | 'result'

interface Photo {
  blob: Blob
  url: string
  name: string
}

export default function BatchDetectionPage() {
  return (
    <DashboardLayout>
      <ModuleGuard module={MODULE_CODE}>
        <BatchDetection />
      </ModuleGuard>
    </DashboardLayout>
  )
}

function BatchDetection() {
  const { currentCompany } = useCompany()
  const [step, setStep] = useState<Step>('upload')
  const [sku, setSku] = useState<LabelSku | null>(null)
  const [packingDate, setPackingDate] = useState(todayIso)
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // The object URL currently shown, so it is revoked exactly once.
  const urlRef = useRef<string | null>(null)

  const replacePhoto = useCallback((next: Photo | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = next?.url ?? null
    setPhoto(next)
  }, [])

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
  }, [])

  const clearPhoto = useCallback(() => {
    replacePhoto(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [replacePhoto])

  const today = todayIso()
  const runError = !packingDate
    ? 'Enter the packing date'
    : packingDate > today
      ? 'Packing date cannot be in the future'
      : null
  const code = packingDate ? batchCode(packingDate) : null
  const shelfLife = sku?.shelf_life_days || DEFAULT_SHELF_LIFE_DAYS
  const canVerify = !!sku?.mrp && !!photo && !preparing && !runError

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setPreparing(true)
    try {
      const blob = await prepareLabelPhoto(file)
      replacePhoto({ blob, url: URL.createObjectURL(blob), name: file.name || 'label.jpg' })
    } catch (err) {
      clearPhoto()
      setError(err instanceof Error ? err.message : 'Could not open this photo.')
    } finally {
      setPreparing(false)
    }
  }

  const verify = async () => {
    if (!sku || !photo || !canVerify) return
    setError(null)
    setStep('checking')
    try {
      const res = await batchDetectionApi.verify(
        currentCompany,
        sku.id,
        packingDate,
        photo.blob,
        photo.name,
      )
      setResult(res)
      setStep('result')
    } catch (err) {
      const message = err instanceof BatchDetectionError ? err.message : 'Could not check the label.'
      setError(message)
      if (!(err instanceof BatchDetectionError) || err.status !== 401) toast.error(message)
      setStep('upload')
    }
  }

  /** Done – Check next label: clear photo, results, canvas and file input; keep SKU and date. */
  const done = () => {
    setResult(null)
    setError(null)
    clearPhoto()
    setStep('upload')
  }

  /** Retake photo: clear only the photo and open the camera straight away. */
  const retake = () => {
    setResult(null)
    clearPhoto()
    setStep('upload')
    // Still inside the tap, so the browser allows opening the picker.
    fileInputRef.current?.click()
  }

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title="Batch Detection"
        subtitle="Photograph a printed label and check it against the SKU master"
        icon={ScanLine}
      />

      {/* Always mounted so "Retake photo" on the result screen can open it.
          capture="environment": back camera on phones, file picker on desktop. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />

      {step === 'upload' && (
        <div className="surface-card p-4 sm:p-5 space-y-5">
          <SkuPicker company={currentCompany} value={sku} onChange={setSku} />

          {sku && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
              <div>
                <label className="label-base" htmlFor="bd-packing-date">
                  Packing date <span className="text-danger-600">*</span>
                </label>
                <input
                  id="bd-packing-date"
                  type="date"
                  value={packingDate}
                  max={today}
                  onChange={(e) => setPackingDate(e.target.value)}
                  className="input-base"
                />
              </div>
              <div>
                <p className="label-base">Expiry on label</p>
                <p className="font-mono font-bold text-ink-600 py-2">
                  {packingDate ? formatLabelDate(addDays(packingDate, shelfLife)) : '—'}
                </p>
                <p className="text-xs text-ink-400">Packing date + {shelfLife} days</p>
              </div>
              <div>
                <p className="label-base">Batch on label</p>
                <p className="font-mono font-bold text-ink-600 tracking-wide py-2">
                  {packingDate ? expectedBatch(sku.batch_prefix, packingDate) ?? '—' : '—'}
                </p>
                {code && (
                  <p className="text-xs text-ink-400">
                    {code.meaning}
                    {sku.batch_prefix === null && ` · ${sku.brand} prefix not listed, only ${code.code} is checked`}
                  </p>
                )}
              </div>
            </div>
          )}

          <div>
            <p className="label-base">
              Label photo <span className="text-danger-600">*</span>
            </p>
            {photo ? (
              <div className="relative rounded-xl border border-cream-300 bg-ink-50 overflow-hidden">
                <img src={photo.url} alt="Label photo to check" className="w-full max-h-80 object-contain" />
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="absolute top-2 right-2 inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/90 text-ink-600 shadow-soft hover:text-danger-600"
                  aria-label="Remove photo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={preparing}
                className="w-full rounded-xl border-2 border-dashed border-cream-300 bg-cream-50 hover:border-brand-500 hover:bg-cream-100/60 px-4 py-10 flex flex-col items-center gap-2 text-ink-500 transition-colors"
              >
                {preparing ? (
                  <>
                    <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                    <span className="text-sm font-medium">Preparing photo…</span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-2 text-brand-500">
                      <Camera className="w-7 h-7" />
                      <ImagePlus className="w-7 h-7" />
                    </span>
                    <span className="text-sm font-semibold text-ink-600">Take or choose a photo</span>
                    <span className="text-xs text-ink-400">Close, flat, good light — the whole label in frame</span>
                  </>
                )}
              </button>
            )}
          </div>

          {error && <p className="text-sm font-semibold text-danger-600">{error}</p>}
          {sku && photo && runError && <p className="text-sm text-danger-600">{runError}</p>}

          <button
            type="button"
            onClick={verify}
            disabled={!canVerify}
            className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ScanLine className="w-4 h-4" /> Verify
          </button>
        </div>
      )}

      {step === 'checking' && (
        <div className="surface-card p-10 flex flex-col items-center gap-3 text-ink-500">
          <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
          <p className="text-base font-semibold">Checking label…</p>
        </div>
      )}

      {step === 'result' && result && photo && (
        <ResultView result={result} photoUrl={photo.url} onDone={done} onRetake={retake} />
      )}
    </div>
  )
}
