'use client'

import { useEffect, useRef, useState } from 'react'
import type { CheckResult, LabelCheck } from '@/lib/api/batchDetection'

const STROKE: Record<CheckResult, string> = {
  pass: '#16a34a',
  fail: '#dc2626',
  unclear: '#ea580c',
}
// Failures are drawn last so they sit on top of a passing box at the same spot.
const DRAW_ORDER: CheckResult[] = ['pass', 'unclear', 'fail']

interface LabelCanvasProps {
  /** Object URL of the photo that was sent (never fetched from the server). */
  src: string
  checks: LabelCheck[]
  selected: string | null
  onSelect: (field: string | null) => void
}

/** The label photo with each check's box: green pass, red fail, orange unclear.
 *  Boxes are Textract fractions, scaled to the photo's pixel size. Tapping a
 *  box selects its check; the selected box is drawn thicker and filled. */
export default function LabelCanvas({ src, checks, selected, onSelect }: LabelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    let live = true
    const image = new Image()
    image.onload = () => live && setImg(image)
    image.src = src
    return () => {
      live = false
    }
  }, [src])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !img) return
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(img, 0, 0)

    const w = canvas.width
    const h = canvas.height
    const base = Math.max(2, Math.round(w / 400))
    for (const result of DRAW_ORDER) {
      for (const c of checks) {
        if (c.result !== result || !c.box) continue
        const isSel = c.field === selected
        const x = c.box.Left * w
        const y = c.box.Top * h
        const bw = c.box.Width * w
        const bh = c.box.Height * h
        const pad = base * 2
        if (isSel) {
          ctx.fillStyle = `${STROKE[result]}33`
          ctx.fillRect(x - pad, y - pad, bw + pad * 2, bh + pad * 2)
        }
        ctx.strokeStyle = STROKE[result]
        ctx.lineWidth = isSel ? base * 3 : base
        ctx.strokeRect(x - pad, y - pad, bw + pad * 2, bh + pad * 2)
      }
    }
  }, [img, checks, selected])

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const fx = (e.clientX - rect.left) / rect.width
    const fy = (e.clientY - rect.top) / rect.height
    // Smallest box under the tap, failures preferred, so a field wins over the row.
    const hits = checks
      .filter((c) => c.box && fx >= c.box.Left && fx <= c.box.Left + c.box.Width
        && fy >= c.box.Top && fy <= c.box.Top + c.box.Height)
      .sort((a, b) => {
        const rank = (r: CheckResult) => (r === 'fail' ? 0 : r === 'unclear' ? 1 : 2)
        return rank(a.result) - rank(b.result) || a.box!.Width * a.box!.Height - b.box!.Width * b.box!.Height
      })
    onSelect(hits[0]?.field ?? null)
  }

  return (
    <div className="rounded-xl border border-cream-300 bg-ink-50 overflow-hidden">
      {!img && <div className="aspect-[4/3] max-h-[60vh] animate-pulse bg-cream-200" />}
      {/* Capped at 60% of the screen height so the banner and corrections stay
          in view; width follows the photo's aspect ratio. */}
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className={img ? 'block mx-auto max-w-full max-h-[60vh] w-auto h-auto cursor-pointer' : 'hidden'}
        aria-label="Label photo with checked fields outlined"
      />
    </div>
  )
}
