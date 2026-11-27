/**
 * Shrink a label photo in the browser before it is uploaded.
 *
 * Phone photos are 3–10 MB, but the backend runs on AWS Lambda behind API
 * Gateway, which refuses requests over ~6 MB. Redrawing at most 2000 px wide as
 * JPEG (what the server does anyway before Textract) brings a photo to well
 * under 1 MB.
 *
 * The browser applies the photo's EXIF rotation when it draws an <img>, so the
 * result is upright and carries no rotation tag. The Batch Detection result
 * screen draws this same blob, so the boxes the server returns (fractions of
 * the upright image) land in the right place.
 */

export const MAX_PHOTO_WIDTH = 2000
const JPEG_QUALITY = 0.9
// Sent as-is when the browser cannot decode the format (HEIC on most desktop
// browsers); the server converts it. Kept under Lambda's request limit.
const MAX_UNDECODED_BYTES = 4.5 * 1024 * 1024

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('decode failed'))
    img.src = url
  })
}

export async function prepareLabelPhoto(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    let img: HTMLImageElement
    try {
      img = await loadImage(url)
    } catch {
      if (file.size <= MAX_UNDECODED_BYTES) return file
      throw new Error('This photo format cannot be read here. Take the photo again as a JPEG.')
    }
    const scale = Math.min(1, MAX_PHOTO_WIDTH / img.naturalWidth)
    const width = Math.max(1, Math.round(img.naturalWidth * scale))
    const height = Math.max(1, Math.round(img.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
    return blob ?? file
  } finally {
    URL.revokeObjectURL(url)
  }
}
