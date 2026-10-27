'use client'

/**
 * Shared bits of the Daily Reading forms and lists — presentation/utilities/
 * UtilityComponents.kt plus the SectionCard / Metric helpers the A-185 and
 * W-202 screens each carried privately.
 */
import type { ReactNode } from 'react'
import { ChevronRight, Download, Lock, type LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import { Button, Card, Chips, Field, Input, inputCls } from '@/components/maintenance/ui'
import { PLANTS } from '@/lib/maintenance/api/utilities'
import { plantLabel } from '@/lib/maintenance/format'

/** Two-choice plant selector (a plant is always chosen). */
export function PlantSelector({ value, onChange }: { value: string; onChange: (p: string) => void }) {
  return <Chips options={PLANTS.map((p) => ({ id: p, label: plantLabel(p) }))} value={value} onChange={onChange} />
}

/** History filter: All / A-185 / W-202 ('' = All). */
export function PlantFilterChips({ value, onChange }: { value: string; onChange: (p: string) => void }) {
  return (
    <Chips
      options={[{ id: '', label: 'All' }, ...PLANTS.map((p) => ({ id: p, label: plantLabel(p) }))]}
      value={value}
      onChange={onChange}
    />
  )
}

export function NumericField({
  label,
  value,
  onChange,
  invalid,
}: {
  label: ReactNode
  value: string
  onChange: (v: string) => void
  invalid?: boolean
}) {
  return (
    <Field label={label}>
      <Input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={clsx(invalid && 'border-red-500 focus:border-red-500 focus:ring-red-500/20')}
      />
    </Field>
  )
}

export function TextField({ label, value, onChange }: { label: ReactNode; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  )
}

/** Read-only computed value; "—" when it can't be computed yet. */
export function ComputedField({ label, value }: { label: ReactNode; value: string }) {
  return (
    <Field label={label}>
      <div className={clsx(inputCls, 'bg-zinc-50 tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300')}>
        {value || '—'}
      </div>
    </Field>
  )
}

/** Supervisor-set price, read-only in a technician's form. */
export function LockedRateField({ label, value }: { label: ReactNode; value: string }) {
  return (
    <Field label={label} hint="Set by supervisor">
      <div
        className={clsx(
          inputCls,
          'flex items-center justify-between bg-zinc-50 tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
        )}
      >
        <span>{value || '—'}</span>
        <Lock className="h-3.5 w-3.5 text-zinc-400" aria-label="Set by supervisor" />
      </div>
    </Field>
  )
}

/** YYYY-MM-DD date input */
export function DateField({
  value,
  onChange,
  label = 'Date',
}: {
  value: string
  onChange: (v: string) => void
  label?: string
}) {
  return (
    <Field label={label}>
      <Input type="date" value={value} onChange={(e) => e.target.value && onChange(e.target.value)} />
    </Field>
  )
}

/** One titled block of a meter form, with the Final ≥ Initial error under it. */
export function SectionCard({ title, error, children }: { title: string; error?: boolean; children: ReactNode }) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 font-bold text-zinc-900 dark:text-zinc-50">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
      {error && (
        <p className="mt-3 text-xs text-red-600 dark:text-red-400">
          Final reading must be greater than or equal to Initial.
        </p>
      )}
    </Card>
  )
}

/** Small label-over-value cell for history rows. */
export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{value || '—'}</p>
    </div>
  )
}

/** Header action: download the listed rows (disabled when there are none). */
export function DownloadButton({ disabled, onClick, label = 'Download' }: { disabled?: boolean; onClick: () => void; label?: string }) {
  return (
    <Button variant="secondary" icon={Download} disabled={disabled} onClick={onClick}>
      {label}
    </Button>
  )
}

/** Hub row: icon, title, chevron. */
export function ReadingTile({ icon: Icon, title, href }: { icon: LucideIcon; title: string; href: string }) {
  return (
    <Card href={href} className="group flex items-center gap-4 p-4">
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-factory-50 text-factory-700 dark:bg-factory-500/15 dark:text-factory-300">
        <Icon className="h-5 w-5" />
      </span>
      <span className="flex-1 font-semibold text-zinc-900 dark:text-zinc-50">{title}</span>
      <ChevronRight className="h-4 w-4 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-factory-600" />
    </Card>
  )
}
