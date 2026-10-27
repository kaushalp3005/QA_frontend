'use client'

/**
 * Maintenance System UI kit. Deliberately its own look (teal + zinc,
 * squarer corners) rather than the QC cream/brand-red glass, so the two
 * systems are never mistaken for one another.
 */

import Link from 'next/link'
import { useEffect, type ReactNode } from 'react'
import { AlertTriangle, ArrowLeft, Inbox, Loader2, RefreshCw, Search, X, type LucideIcon } from 'lucide-react'
import clsx from 'clsx'

// ── Layout ───────────────────────────────────────────────────────────────

export function PageHeader({
  title,
  subtitle,
  back,
  actions,
}: {
  title: ReactNode
  subtitle?: ReactNode
  /** href of the parent screen */
  back?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
      <div className="min-w-0">
        {back && (
          <Link
            href={back}
            className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-factory-600 dark:text-zinc-400 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h1>
        {subtitle && <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Card({
  children,
  className,
  onClick,
  href,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  href?: string
}) {
  const cls = clsx(
    'block rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900',
    (onClick || href) &&
      'transition hover:border-factory-500/60 hover:shadow-md cursor-pointer text-left w-full',
    className,
  )
  if (href)
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    )
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cls}>
        {children}
      </button>
    )
  return <div className={cls}>{children}</div>
}

export function Section({ title, actions, children }: { title: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  )
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'teal',
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: LucideIcon
  tone?: Tone
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{value}</p>
          {hint && <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>}
        </div>
        {Icon && (
          <span className={clsx('inline-flex h-9 w-9 items-center justify-center rounded-lg', TONE[tone])}>
            <Icon className="h-4.5 w-4.5" />
          </span>
        )}
      </div>
    </Card>
  )
}

// ── Buttons ──────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'

const BTN: Record<ButtonVariant, string> = {
  primary: 'bg-factory-600 text-white hover:bg-factory-700 shadow-sm',
  secondary:
    'bg-white text-zinc-800 border border-zinc-300 hover:border-factory-500 hover:text-factory-700 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700',
  ghost: 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading,
  icon: Icon,
  className,
  href,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: 'sm' | 'md'
  loading?: boolean
  icon?: LucideIcon
  href?: string
}) {
  const cls = clsx(
    'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap',
    size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
    BTN[variant],
    className,
  )
  const inner = (
    <>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </>
  )
  if (href)
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    )
  return (
    <button type="button" className={cls} disabled={loading || rest.disabled} {...rest}>
      {inner}
    </button>
  )
}

// ── Badges ───────────────────────────────────────────────────────────────

export type Tone = 'gray' | 'green' | 'amber' | 'red' | 'blue' | 'teal' | 'violet'

const TONE: Record<Tone, string> = {
  gray: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  teal: 'bg-factory-100 text-factory-800 dark:bg-factory-500/15 dark:text-factory-300',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
}

export function Badge({ children, tone = 'gray', className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Sensible tone for the status strings the backend uses across modules. */
export function statusTone(status: string | null | undefined): Tone {
  const s = (status ?? '').toUpperCase()
  if (['RUNNING', 'PASS', 'OK', 'QC_APPROVED', 'APPROVED', 'CLOSED', 'COMPLETE', 'RESOLVED', 'SUBMITTED_OK', 'ACKNOWLEDGED_DONE'].includes(s))
    return 'green'
  if (['OPEN', 'REOPENED', 'FAIL', 'NOT_OK', 'REJECTED', 'OVERDUE', 'CRITICAL', 'STOPPED', 'MISSED_STOP', 'MISSED_START', 'QC_DISAPPROVED'].includes(s))
    return 'red'
  if (['PENDING_QC', 'PENDING', 'SUBMITTED', 'MAJOR', 'IN_PROGRESS', 'DRAFT'].includes(s)) return 'amber'
  if (['ACKNOWLEDGED', 'NOTIFIED', 'SUPERVISOR_APPROVED', 'MINOR'].includes(s)) return 'blue'
  return 'gray'
}

export function StatusBadge({ status, label }: { status: string | null | undefined; label?: string }) {
  return <Badge tone={statusTone(status)}>{label ?? (status ?? '—').replace(/_/g, ' ')}</Badge>
}

// ── Feedback states ──────────────────────────────────────────────────────

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={clsx('h-5 w-5 animate-spin text-factory-600', className)} />
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-zinc-500">
      <Spinner className="h-7 w-7" />
      {label}
    </div>
  )
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 animate-pulse" />
      ))}
    </div>
  )
}

export function ErrorBanner({ error, onRetry }: { error: string | null | undefined; onRetry?: () => void }) {
  if (!error) return null
  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1">{error}</p>
      {onRetry && (
        <button onClick={onRetry} className="inline-flex items-center gap-1 font-semibold hover:underline">
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      )}
    </div>
  )
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  message,
  action,
}: {
  icon?: LucideIcon
  title: string
  message?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 px-6 py-14 text-center dark:border-zinc-700">
      <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800">
        <Icon className="h-6 w-6" />
      </span>
      <p className="font-semibold text-zinc-800 dark:text-zinc-100">{title}</p>
      {message && <p className="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ── Forms ────────────────────────────────────────────────────────────────

export const inputCls =
  'block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 ' +
  'focus:border-factory-500 focus:outline-none focus:ring-2 focus:ring-factory-500/20 disabled:bg-zinc-50 disabled:text-zinc-500 ' +
  'dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:disabled:bg-zinc-800'

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: ReactNode
  hint?: ReactNode
  error?: string | null
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <label className={clsx('block', className)}>
      <span className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-zinc-500">{hint}</span>
      ) : null}
    </label>
  )
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx(inputCls, props.className)} />
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={clsx(inputCls, props.className)} />
}

export function Select({
  options,
  placeholder,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: Array<string | { value: string; label: string }>
  placeholder?: string
}) {
  return (
    <select {...props} className={clsx(inputCls, props.className)}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => {
        const { value, label } = typeof o === 'string' ? { value: o, label: o } : o
        return (
          <option key={value} value={value}>
            {label}
          </option>
        )
      })}
    </select>
  )
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={clsx('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={clsx(inputCls, 'pl-9')}
      />
    </div>
  )
}

// ── Tabs / chips ─────────────────────────────────────────────────────────

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: Array<{ id: T; label: string; count?: number }>
  value: T
  onChange: (id: T) => void
}) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={clsx(
            '-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold transition',
            value === t.id
              ? 'border-factory-600 text-factory-700 dark:text-factory-300'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200',
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className="ml-1.5 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[11px] tabular-nums dark:bg-zinc-800">
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ id: T; label: string }>
  value: T
  onChange: (id: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={clsx(
            'rounded-full border px-3 py-1 text-xs font-semibold transition',
            value === o.id
              ? 'border-factory-600 bg-factory-600 text-white'
              : 'border-zinc-300 text-zinc-600 hover:border-factory-500 dark:border-zinc-700 dark:text-zinc-300',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ── Overlays ─────────────────────────────────────────────────────────────

/** Centered dialog on desktop, bottom sheet on phones — stands in for the
 *  Android app's ModalBottomSheet / AlertDialog. */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-zinc-950/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={clsx(
          'relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl dark:bg-zinc-900 sm:rounded-2xl',
          { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' }[size],
        )}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3.5 dark:border-zinc-800">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-3 dark:border-zinc-800">{footer}</div>
        )}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger,
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm text-zinc-600 dark:text-zinc-300">{message}</div>
    </Modal>
  )
}

// ── Data display ─────────────────────────────────────────────────────────

/** Label / value grid for detail screens */
export function DetailGrid({ items }: { items: Array<{ label: string; value: ReactNode; wide?: boolean }> }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((it) => (
        <div key={it.label} className={clsx(it.wide && 'sm:col-span-2')}>
          <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{it.label}</dt>
          <dd className="mt-0.5 text-sm text-zinc-900 dark:text-zinc-100 break-words">{it.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Scrollable table shell with consistent header styling. */
export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="whitespace-nowrap px-3 py-2.5">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 text-zinc-800 dark:divide-zinc-800 dark:text-zinc-200">{children}</tbody>
      </table>
    </div>
  )
}

export const tdCls = 'px-3 py-2.5 align-top'
