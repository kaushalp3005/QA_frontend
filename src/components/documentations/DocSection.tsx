'use client'

import { ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'

interface DocSectionProps {
  title?: string
  description?: string
  icon?: LucideIcon
  actions?: ReactNode
  children: ReactNode
  /** When true, removes inner padding so callers can place full-bleed content (e.g., tables). */
  bleed?: boolean
  className?: string
}

/** Section card used to group fields/tables inside DocFormShell.
 *  Visually a surface-card with optional title row. */
export default function DocSection({
  title,
  description,
  icon: Icon,
  actions,
  children,
  bleed = false,
  className = '',
}: DocSectionProps) {
  return (
    <section className={`surface-card overflow-hidden ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-cream-300 bg-cream-100/60">
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <div className="shrink-0 w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                <Icon className="w-4 h-4" strokeWidth={2.25} />
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h2 className="text-sm font-bold text-ink-600 leading-tight truncate">{title}</h2>
              )}
              {description && (
                <p className="text-[11px] text-ink-400 font-medium mt-0.5 truncate">{description}</p>
              )}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </header>
      )}
      <div className={bleed ? '' : 'p-4 sm:p-5'}>{children}</div>
    </section>
  )
}
