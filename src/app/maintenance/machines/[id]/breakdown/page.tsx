'use client'

/**
 * Flag Breakdown — ported from breakdown/BreakdownFlagScreen + BreakdownFlagViewModel
 * and RaiseBreakdownFlagUseCase. The operator raises a breakdown on a machine:
 * POST /breakdowns/flag (multipart, optional "before_photo" file part).
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { Camera, ImagePlus } from 'lucide-react'
import { Button, Card, EmptyState, Field, LoadingBlock, PageHeader, Textarea } from '@/components/maintenance/ui'
import { useMtQuery, useMtSession } from '@/lib/maintenance/hooks'
import { isShutDown, listMachines } from '@/lib/maintenance/api/assets'
import {
  SEVERITIES,
  isUnresolved,
  listOpenBreakdowns,
  raiseBreakdownFlag,
  type OpenBreakdownDto,
  type Severity,
} from '@/lib/maintenance/api/machines'
import { MT } from '@/lib/maintenance/nav'

const SEVERITY_TONE: Record<Severity, string> = {
  CRITICAL: 'border-red-600 bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  MAJOR: 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  MINOR: 'border-factory-600 bg-factory-50 text-factory-800 dark:bg-factory-500/15 dark:text-factory-300',
}

const MAX_PHOTO_BYTES = 10 * 1024 * 1024

export default function BreakdownFlagPage({ params }: { params: { id: string } }) {
  const machineId = decodeURIComponent(params.id)
  const session = useMtSession()
  const router = useRouter()

  const ctx = useMtQuery(async () => {
    const [all, open] = await Promise.all([listMachines(), listOpenBreakdowns('both').catch((): OpenBreakdownDto[] => [])])
    return {
      machine: all.find((m) => m.asset_id === machineId) ?? null,
      alreadyOpen: open.some((b) => b.asset_id === machineId && isUnresolved(b)),
    }
  }, [machineId])

  const [severity, setSeverity] = useState<Severity>('MAJOR')
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo])
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview])

  const onPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f || f.size === 0) return
    // The backend accepts image/jpeg or image/png up to 10 MB.
    if (f.type && f.type !== 'image/jpeg' && f.type !== 'image/png') {
      toast.error('Photo must be a JPEG or PNG image.')
      return
    }
    if (f.size > MAX_PHOTO_BYTES) {
      toast.error('Photo must be 10 MB or smaller.')
      return
    }
    setPhoto(f)
  }

  const submit = async () => {
    if (!session) return
    setError(null)
    if (!description.trim()) {
      setError('Description cannot be empty')
      return
    }
    setLoading(true)
    try {
      // Defensive: a shut-down machine cannot receive a breakdown report.
      const all = await listMachines().catch(() => null)
      const machine = all?.find((m) => m.asset_id === machineId)
      if (machine && isShutDown(machine)) {
        setError('This machine is shut down.')
        toast.error('This machine is shut down.')
        return
      }
      await raiseBreakdownFlag({
        machine_id: machineId,
        operator_id: session.userId,
        severity,
        description,
        raised_at: Date.now(),
        before_photo: photo,
      })
      toast.success('Breakdown reported — technicians notified')
      router.push(MT.machine(machineId))
    } catch (e: any) {
      const msg = e?.message || 'Failed to raise breakdown flag'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!session) return null
  const back = MT.machine(machineId)

  if (session.role !== 'OPERATOR')
    return (
      <>
        <PageHeader title="Flag Breakdown" back={back} />
        <EmptyState title="Operators only" message="Only an operator can report a breakdown on a machine." />
      </>
    )

  if (ctx.loading && !ctx.data) return <LoadingBlock />

  const machine = ctx.data?.machine
  if (machine && isShutDown(machine))
    return (
      <>
        <PageHeader title="Flag Breakdown" back={back} />
        <EmptyState title="This machine is shut down." message="A shut-down machine can't receive a breakdown report." />
      </>
    )
  if (ctx.data?.alreadyOpen)
    return (
      <>
        <PageHeader title="Flag Breakdown" back={back} />
        <EmptyState
          title="A breakdown is already open on this machine"
          message="It stays open until a technician resolves it and QC clears it."
          action={<Button href={back}>Back to machine</Button>}
        />
      </>
    )

  return (
    <>
      <PageHeader title="Flag Breakdown" subtitle={machine?.asset_name ? `${machine.asset_name} · ${machineId}` : machineId} back={back} />

      <div className="mx-auto max-w-2xl space-y-5">
        <div>
          <p className="mb-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">Severity</p>
          <div className="flex flex-wrap gap-2">
            {SEVERITIES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeverity(s)}
                className={clsx(
                  'rounded-lg border px-4 py-2 text-sm font-bold transition',
                  severity === s
                    ? SEVERITY_TONE[s]
                    : 'border-zinc-300 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300',
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <Field label="Description" error={error}>
          <Textarea
            rows={5}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
              setError(null)
            }}
            placeholder="Describe the breakdown — noise, smoke, vibration, etc."
          />
        </Field>

        <Card className="space-y-3 p-4">
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Photo (Optional)</p>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPicked} />
          <input ref={galleryRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={onPicked} />
          {photo && preview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Breakdown photo" className="max-h-64 rounded-lg border border-zinc-200 object-contain dark:border-zinc-800" />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Photo attached: {photo.name}</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" icon={Camera} onClick={() => cameraRef.current?.click()}>
                  Retake
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setPhoto(null)}>
                  Remove
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Add a photo of the fault to help the technician.</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" icon={Camera} onClick={() => cameraRef.current?.click()}>
                  Take photo
                </Button>
                <Button variant="secondary" size="sm" icon={ImagePlus} onClick={() => galleryRef.current?.click()}>
                  Choose
                </Button>
              </div>
            </>
          )}
        </Card>

        <Button variant="danger" className="w-full py-3 text-base" onClick={submit} loading={loading}>
          Submit Breakdown Flag
        </Button>
      </div>
    </>
  )
}
