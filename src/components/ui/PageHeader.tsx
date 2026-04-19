'use client'

import { ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  /** Right-side action buttons / controls. */
  actions?: ReactNode
  /** Optional small badge (e.g., total count). */
  badge?: ReactNode
}

/** Consistent page header used across all module root pages.
 *  Mobile: stacks vertically (title row, then full-width action row).
 *  Desktop (sm+): title left, actions right.
 */
export default function PageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
  badge,
}: PageHeaderProps) {
  return (
    <div className="mb-5 sm:mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 animate-fade-in-up">
      <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
        {Icon && (
          <div className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-brand-500 text-white flex items-center justify-center shadow-brand">
            <Icon className="w-4.5 h-4.5 sm:w-5 sm:h-5" strokeWidth={2.25} />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-ink-600 tracking-tight truncate">
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-ink-400 mt-0.5 font-medium line-clamp-2">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {actions}
        </div>
      )}
    </div>
  )
}
