'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/maintenance/ui'

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png']

/** Camera / file picker for one photo with a preview and Retake. The backend
 *  accepts jpeg or png up to 10 MB, so anything else is refused here. */
export function PhotoCapture({
  file,
  onChange,
  title,
  captureLabel,
  disabled,
}: {
  file: File | null
  onChange: (f: File | null) => void
  title: string
  captureLabel: string
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const pick = (f: File | undefined) => {
    if (!f) return
    if (!ALLOWED.includes(f.type)) {
      toast.error('Use a JPEG or PNG photo.')
      return
    }
    if (f.size > MAX_BYTES) {
      toast.error('That photo is over 10 MB. Take a smaller one.')
      return
    }
    onChange(f)
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {preview ? (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Photo preview" className="h-48 w-full rounded-lg bg-zinc-100 object-cover dark:bg-zinc-800" />
          <Button size="sm" variant="ghost" icon={Camera} onClick={() => inputRef.current?.click()} disabled={disabled}>
            Retake
          </Button>
        </div>
      ) : (
        <Button variant="secondary" icon={Camera} className="w-full" onClick={() => inputRef.current?.click()} disabled={disabled}>
          {captureLabel}
        </Button>
      )}
    </div>
  )
}
