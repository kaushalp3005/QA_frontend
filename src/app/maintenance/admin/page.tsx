'use client'

/**
 * Admin home (AdminHomeScreen.kt / AdminHomeViewModel.kt / AddOtherSheet.kt):
 * every machine with a per-row "Move to Others" / "Restore" toggle, plus an
 * "Add to asset register" sheet (POST /mt-machines).
 *
 * The Others tag set has no backend in the Android app either — it lives in
 * on-device preferences (OthersTagPreferences), seeded once from the keyword
 * list in util/OtherMachineKeywords.kt. Here it lives in this browser's storage.
 */

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, RefreshCw } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  ErrorBanner,
  Field,
  Input,
  Modal,
  PageHeader,
  SearchInput,
  Select,
  SkeletonRows,
} from '@/components/maintenance/ui'
import { useMtQuery } from '@/lib/maintenance/hooks'
import { addMachine, listMachines } from '@/lib/maintenance/api/assets'

const TAGS_KEY = 'mt_admin_others_tags'
const SEEDED_KEY = 'mt_admin_others_seeded'

const OTHER_KEYWORDS = [
  // HVAC / cooling
  'ac', 'split ac', 'indoor unit', 'vrv', 'fresh air', 'cooling device',
  // Air movement
  'fan', 'exhaust', 'exhuast', 'pedstal', 'pedestal',
  // Lighting
  'tube light', 'tubes light', 'led', 'panel light', 'flood light',
  // Pest control
  'fly catcher',
  // Cold storage
  'baking oven', 'blast freezer', 'deep freezer', 'freezer',
  // Water / plumbing
  'drain pump', 'drian pump', 'water heater', 'water bath', 'ro plant', 'hot water tub',
  // Power
  'd.g.', 'stabilizer',
]
const matchesOther = (name: string) => {
  const n = name.toLowerCase()
  return OTHER_KEYWORDS.some((kw) => n.includes(kw))
}

function readTags(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(TAGS_KEY) || '[]') as string[])
  } catch {
    return new Set()
  }
}
function writeTags(tags: Set<string>) {
  try {
    localStorage.setItem(TAGS_KEY, JSON.stringify(Array.from(tags)))
  } catch {
    /* storage blocked — tags last for this visit only */
  }
}

const BUILDINGS = ['W202', 'A185']

export default function AdminHomePage() {
  const { data, error, loading, reload } = useMtQuery(() => listMachines(), [])
  const [tags, setTags] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => setTags(readTags()), [])

  // First visit: pre-tag every machine whose name matches the keyword list.
  // After that the admin's manual edits are authoritative — never re-seed.
  useEffect(() => {
    if (!data) return
    let seeded = false
    try {
      seeded = localStorage.getItem(SEEDED_KEY) === '1'
    } catch {
      seeded = true
    }
    if (seeded) return
    const auto = new Set(data.filter((m) => matchesOther(m.asset_name)).map((m) => m.asset_id))
    if (auto.size) {
      writeTags(auto)
      setTags(auto)
    }
    try {
      localStorage.setItem(SEEDED_KEY, '1')
    } catch {
      /* ignore */
    }
  }, [data])

  const rows = data ?? []
  const tagged = rows.filter((m) => tags.has(m.asset_id)).length
  const q = query.trim().toLowerCase()
  const filtered = q
    ? rows.filter(
        (m) =>
          m.asset_name.toLowerCase().includes(q) ||
          m.asset_id.toLowerCase().includes(q) ||
          (m.sub_location ?? '').toLowerCase().includes(q),
      )
    : rows

  const toggle = (id: string, name: string) => {
    const next = new Set(tags)
    if (next.has(id)) {
      next.delete(id)
      toast.success(`Restored "${name}" to operator list`)
    } else {
      next.add(id)
      toast.success(`Moved "${name}" to Others`)
    }
    writeTags(next)
    setTags(next)
  }

  return (
    <>
      <PageHeader
        title="Admin"
        subtitle={`${tagged} in Others · ${rows.length} machines total`}
        actions={
          <>
            <Button variant="secondary" icon={RefreshCw} onClick={reload} disabled={loading}>
              Refresh
            </Button>
            <Button icon={Plus} onClick={() => setAddOpen(true)}>
              Add machine
            </Button>
          </>
        }
      />

      {error ? (
        <ErrorBanner error={`Failed to load machines — ${error}`} onRetry={reload} />
      ) : loading && !data ? (
        <SkeletonRows rows={6} />
      ) : (
        <>
          <SearchInput value={query} onChange={setQuery} placeholder="Search machines…" className="mb-3 sm:max-w-sm" />
          <p className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {q ? `Showing ${filtered.length} of ${rows.length}` : `All machines (${rows.length})`}
          </p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((m) => {
              const isTagged = tags.has(m.asset_id)
              return (
                <Card key={m.asset_id} className="flex flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-50">{m.asset_name}</p>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {m.asset_id} — {m.sub_location || m.building}
                      </p>
                    </div>
                    {isTagged && <Badge tone="violet">In Others</Badge>}
                  </div>
                  <Button
                    size="sm"
                    variant={isTagged ? 'secondary' : 'primary'}
                    className="mt-3 w-full"
                    onClick={() => toggle(m.asset_id, m.asset_name)}
                  >
                    {isTagged ? 'Restore to operator list' : 'Move to Others'}
                  </Button>
                </Card>
              )
            })}
          </div>
        </>
      )}

      <AddOtherModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={(name) => {
          setAddOpen(false)
          toast.success(`Added "${name}" to Others`)
          reload()
        }}
      />
    </>
  )
}

/** "Add to asset register" sheet (AddOtherSheet.kt) */
function AddOtherModal({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (name: string) => void }) {
  const [name, setName] = useState('')
  const [building, setBuilding] = useState(BUILDINGS[0])
  const [subLocation, setSubLocation] = useState('')
  const [category, setCategory] = useState('')
  const [powerLoad, setPowerLoad] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName('')
    setBuilding(BUILDINGS[0])
    setSubLocation('')
    setCategory('')
    setPowerLoad('')
    setErr(null)
  }, [open])

  const canSubmit = !!name.trim() && !!subLocation.trim() && !!category.trim() && !saving

  const submit = async () => {
    if (!canSubmit) return
    setSaving(true)
    setErr(null)
    try {
      const saved = await addMachine({
        building,
        asset_name: name.trim(),
        category: category.trim(),
        sub_location: subLocation.trim(),
        power_load: powerLoad.trim() || null,
      })
      onAdded(saved?.asset_name || name.trim())
    } catch (e: any) {
      setErr(e?.message || 'Failed to add asset')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title="Add to asset register"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving} disabled={!canSubmit}>
            Add asset
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Asset name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Building" required>
          <Select value={building} onChange={(e) => setBuilding(e.target.value)} options={BUILDINGS} />
        </Field>
        <Field label="Sub-location" required>
          <Input value={subLocation} onChange={(e) => setSubLocation(e.target.value)} />
        </Field>
        <Field
          label="Sub-category"
          required
          hint='Use "Production Equipment" for a production asset; anything else lands in Others.'
        >
          <Input value={category} onChange={(e) => setCategory(e.target.value)} />
        </Field>
        <Field label="Power load (optional)">
          <Input value={powerLoad} onChange={(e) => setPowerLoad(e.target.value)} placeholder="e.g. 120Watt, 2.2 kW" />
        </Field>
        <ErrorBanner error={err} />
      </div>
    </Modal>
  )
}
