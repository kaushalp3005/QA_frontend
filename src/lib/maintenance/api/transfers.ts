/**
 * Machine transfers between warehouses — mt_machine_transfer, served at
 * /machine-transfers. Ported from MachineTransferApi.kt, MachineTransferDtos.kt,
 * domain/model/MachineTransfer.kt, MachineTransferRepositoryImpl.kt and the option
 * lists in TransferFormViewModel.kt.
 *
 * Online-only in the Android app too (no Room queue): the backend owns S3 and
 * returns the proof photo URL. created_at / acknowledged_at are ISO-8601 strings;
 * `date` is a YYYY-MM-DD string.
 */
import { mtFetch } from '../client'

export type TransferStatus = 'PENDING' | 'APPROVED'

/** One row of GET /machine-transfers (and the acknowledge / PUT response). */
export interface MachineTransfer {
  id: number
  date?: string | null
  from_warehouse: string
  to_warehouse: string
  machine_name: string
  condition?: string | null
  machine_code?: string | null
  reason?: string | null
  authorised_person?: string | null
  remarks?: string | null
  /** ISO-8601 …Z */
  created_at?: string | null
  proof_photo_url?: string | null
  /** PENDING until the receiving warehouse acknowledges → APPROVED */
  status: TransferStatus | string
  acknowledged_by?: string | null
  acknowledged_at?: string | null
  /** Backend verdict for the caller: destination-warehouse technician or any supervisor */
  can_acknowledge?: boolean
  /** Backend verdict: the caller created it and it is still PENDING */
  can_edit?: boolean
}

/** 201 from POST /machine-transfers */
export interface MachineTransferCreated {
  id: number
  proof_photo_url?: string | null
}

export interface NewMachineTransfer {
  from_warehouse: string
  to_warehouse: string
  machine_name: string
  /** Picked register row — moves that asset's building server-side. Null when typed. */
  asset_id?: string | null
  date?: string | null
  machine_code?: string | null
  condition?: string | null
  reason?: string | null
  authorised_person?: string | null
  remarks?: string | null
}

/** PUT body — null / absent fields are left unchanged server-side. */
export type MachineTransferEdit = Partial<NewMachineTransfer>

export const WAREHOUSES = ['A185', 'W202', 'A68']

export const TRANSFER_CONDITIONS = ['New', 'Good', 'Working', 'Needs Repair', 'Under Repair', 'Damaged', 'Scrap']

/** "W-202" / "w202" / " W202 " → "W202" */
export const normWarehouse = (s: string | null | undefined) => (s ?? '').replace(/[^a-z0-9]/gi, '').toUpperCase()

export const isPendingTransfer = (t: Pick<MachineTransfer, 'status'>) => (t.status ?? '').toUpperCase() === 'PENDING'
export const isApprovedTransfer = (t: Pick<MachineTransfer, 'status'>) => (t.status ?? '').toUpperCase() === 'APPROVED'

export function listTransfers() {
  return mtFetch<MachineTransfer[]>('/machine-transfers')
}

/** multipart/form-data: text parts + optional "proof_photo" file part. */
export function createTransfer(input: NewMachineTransfer, proofPhoto?: Blob | null) {
  const form = new FormData()
  for (const [k, v] of Object.entries(input)) {
    if (v !== null && v !== undefined && v !== '') form.append(k, String(v))
  }
  if (proofPhoto) {
    const ext = proofPhoto.type === 'image/png' ? 'png' : 'jpg'
    form.append('proof_photo', proofPhoto, `proof_photo.${ext}`)
  }
  return mtFetch<MachineTransferCreated>('/machine-transfers', { method: 'POST', body: form })
}

/** Receiving warehouse confirms receipt: PENDING → APPROVED. 403 when not allowed. */
export function acknowledgeTransfer(id: number) {
  return mtFetch<MachineTransfer>(`/machine-transfers/${id}/acknowledge`, { method: 'POST' })
}

/** Edit a still-PENDING transfer (creator only). The photo isn't editable here. */
export function updateTransfer(id: number, body: MachineTransferEdit) {
  return mtFetch<MachineTransfer>(`/machine-transfers/${id}`, { method: 'PUT', body })
}

/** Delete a still-PENDING transfer (creator only) — the machine moves back. 204. */
export function deleteTransfer(id: number) {
  return mtFetch<void>(`/machine-transfers/${id}`, { method: 'DELETE' })
}

// ── Proof photo (util/ImageCompressor.kt) ────────────────────────────────

const MAX_PHOTO_BYTES = 10 * 1024 * 1024
const MAX_DIM = 1600
const QUALITY = 0.8

/** Downscale to ≤1600px and re-encode as JPEG q80 so phone photos upload fast.
 *  Falls back to the original file (JPEG/PNG only, ≤10 MB) if it can't be decoded.
 *  Throws a user-readable Error on a bad file. */
export async function prepareProofPhoto(file: File): Promise<Blob> {
  const compressed = await compressToJpeg(file).catch(() => null)
  let out: Blob
  if (compressed) {
    out = compressed
  } else {
    if (file.type !== 'image/jpeg' && file.type !== 'image/png') throw new Error('Proof photo must be a JPEG or PNG image.')
    out = file
  }
  if (out.size > MAX_PHOTO_BYTES) throw new Error('Proof photo must be 10 MB or smaller.')
  return out
}

function compressToJpeg(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const w = img.naturalWidth
      const h = img.naturalHeight
      if (!w || !h) return resolve(null)
      const scale = Math.min(1, MAX_DIM / Math.max(w, h))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(w * scale))
      canvas.height = Math.max(1, Math.round(h * scale))
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(null)
      // Browsers apply EXIF orientation when drawing an <img>, so no manual rotate.
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((b) => resolve(b), 'image/jpeg', QUALITY)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}
