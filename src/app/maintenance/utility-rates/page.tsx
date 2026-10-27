'use client'

import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Button, Card, ErrorBanner, LoadingBlock, PageHeader } from '@/components/maintenance/ui'
import { ComputedField, NumericField, PlantSelector } from '@/components/maintenance/utilities/fields'
import {
  formatUtilityNumber,
  getUtilityRates,
  parseNum,
  setUtilityRates,
  UTILITY_RATE_KEYS,
  UTILITY_RATE_LABELS,
  type UtilityRateKey,
  type UtilityRatesDto,
} from '@/lib/maintenance/api/utilities'
import { useMtSession } from '@/lib/maintenance/hooks'
import { fmtDateTime } from '@/lib/maintenance/format'
import type { MtRole } from '@/lib/maintenance/client'
import { MT } from '@/lib/maintenance/nav'

const EDITOR_ROLES: MtRole[] = ['SUPERVISOR', 'HEAD', 'ADMIN']

const emptyInputs = () => Object.fromEntries(UTILITY_RATE_KEYS.map((k) => [k, ''])) as Record<UtilityRateKey, string>

/**
 * Per-plant utility prices every technician reading uses until changed
 * (UtilityRatesScreen). SUPERVISOR / HEAD / ADMIN edit; anyone else reads.
 */
export default function UtilityRatesPage() {
  const session = useMtSession()
  const canEdit = !!session && EDITOR_ROLES.includes(session.role)
  const [plant, setPlant] = useState('A185')
  const [inputs, setInputs] = useState(emptyInputs)
  const [meta, setMeta] = useState<Pick<UtilityRatesDto, 'set_by' | 'set_at'>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const seq = useRef(0)

  async function load(p: string) {
    const id = ++seq.current
    setLoading(true)
    setError(null)
    try {
      const r = await getUtilityRates(p)
      if (id !== seq.current) return
      setInputs(
        Object.fromEntries(
          UTILITY_RATE_KEYS.map((k) => [k, r[k] != null ? formatUtilityNumber(Number(r[k]), 2) : '']),
        ) as Record<UtilityRateKey, string>,
      )
      setMeta({ set_by: r.set_by, set_at: r.set_at })
    } catch (e: any) {
      if (id === seq.current) setError(e?.message || 'Failed to load rates')
    } finally {
      if (id === seq.current) setLoading(false)
    }
  }

  useEffect(() => {
    load(plant)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function changePlant(p: string) {
    setPlant(p)
    load(p)
  }

  async function save() {
    if (!canEdit || saving) return
    const rates = Object.fromEntries(UTILITY_RATE_KEYS.map((k) => [k, parseNum(inputs[k])])) as Record<
      UtilityRateKey,
      number | null
    >
    setSaving(true)
    setError(null)
    try {
      const r = await setUtilityRates(plant, rates)
      setMeta({ set_by: r.set_by, set_at: r.set_at })
      toast.success('Rates saved')
    } catch (e: any) {
      const msg = e?.message || 'Failed to save rates'
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Utility Rates" back={MT.dashboard} />
      <Card className="space-y-4 p-4">
        <PlantSelector value={plant} onChange={changePlant} />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          These prices apply to every technician reading for this plant until changed.
        </p>

        {loading ? (
          <LoadingBlock />
        ) : (
          <>
            {UTILITY_RATE_KEYS.map((k) =>
              canEdit ? (
                <NumericField
                  key={k}
                  label={UTILITY_RATE_LABELS[k]}
                  value={inputs[k]}
                  onChange={(v) => setInputs((cur) => ({ ...cur, [k]: v }))}
                />
              ) : (
                <ComputedField key={k} label={UTILITY_RATE_LABELS[k]} value={inputs[k]} />
              ),
            )}

            {meta.set_by && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Last set by {meta.set_by}
                {meta.set_at ? ` · ${fmtDateTime(meta.set_at)}` : ''}
              </p>
            )}

            <ErrorBanner error={error} />

            {canEdit && (
              <Button className="w-full" loading={saving} onClick={save}>
                Save
              </Button>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
