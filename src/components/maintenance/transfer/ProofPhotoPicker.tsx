'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, ImagePlus } from 'lucide-react'
import { Button } from '@/components/maintenance/ui'

/** Proof photo: take one with the camera or pick from the gallery; once chosen,
 *  preview with Retake / Gallery / Remove (TransferFormScreen.ProofImagePicker). */
export function ProofPhotoPicker({ file, onChange }: { file: File | null; onChange: (f: File | null) => void }) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
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

  const picked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) onChange(f)
    e.target.value = '' // let the same file be picked again after Remove
  }

  return (
    <div className="space-y-2">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={picked} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={picked} />
      {!file ? (
        <>
          <Button className="w-full" icon={Camera} onClick={() => cameraRef.current?.click()}>
            Take photo (camera)
          </Button>
          <Button className="w-full" variant="secondary" icon={ImagePlus} onClick={() => galleryRef.current?.click()}>
            Choose from gallery
          </Button>
        </>
      ) : (
        <>
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Machine proof photo" className="h-48 w-full rounded-xl object-cover" />
          )}
          <div className="grid grid-cols-3 gap-2">
            <Button variant="secondary" onClick={() => cameraRef.current?.click()}>
              Retake
            </Button>
            <Button variant="secondary" onClick={() => galleryRef.current?.click()}>
              Gallery
            </Button>
            <Button variant="secondary" onClick={() => onChange(null)}>
              Remove
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
