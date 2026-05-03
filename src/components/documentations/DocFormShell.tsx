'use client'

import { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, LucideIcon, FileText } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface DocFormShellProps {
  title: string
  docNo?: string
  subtitle?: string
  icon?: LucideIcon
  /** Optional right-side action area (e.g., status badge). */
  actions?: ReactNode
  /** Optional small note / frequency tag below header. */
  note?: string
  /** Form content. */
  children: ReactNode
  /** Optional back href. Defaults to router.back(). */
  backHref?: string
  /** Constrain max width. Defaults to "xl" → max-w-5xl. */
  width?: 'md' | 'lg' | 'xl' | 'full'
}

const widthMap: Record<NonNullable<DocFormShellProps['width']>, string> = {
  md: 'max-w-3xl',
  lg: 'max-w-5xl',
  xl: 'max-w-7xl',
  full: 'max-w-none',
}

/** Consistent shell for every document create / edit page.
 *  Provides: dashboard layout, modern back pill, page header card,
 *  and a centered content container. */
export default function DocFormShell({
  title,
  docNo,
  subtitle,
  icon: Icon = FileText,
  actions,
  note,
  children,
  backHref,
  width = 'xl',
}: DocFormShellProps) {
  const router = useRouter()

  return (
    <DashboardLayout>
      <div className={`${widthMap[width]} mx-auto`}>
        <button
          onClick={() => (backHref ? router.push(backHref) : router.back())}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-400 hover:text-brand-500 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>

        <div className="surface-card p-4 sm:p-5 mb-5 animate-fade-in-up">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
              <div className="shrink-0 w-11 h-11 rounded-xl bg-brand-500 text-white flex items-center justify-center shadow-brand">
                <Icon className="w-5 h-5" strokeWidth={2.25} />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-ink-600 tracking-tight leading-tight truncate">
                  {title}
                </h1>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {docNo && (
                    <span className="inline-flex items-center rounded-full bg-brand-50 text-brand-600 text-[11px] font-semibold px-2 py-0.5">
                      {docNo}
                    </span>
                  )}
                  {subtitle && (
                    <span className="text-xs text-ink-400 font-medium">{subtitle}</span>
                  )}
                </div>
              </div>
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
          {note && (
            <p className="text-xs text-ink-400 italic mt-3 pt-3 border-t border-cream-300">
              {note}
            </p>
          )}
        </div>

        <div className="space-y-5 animate-fade-in pb-12">{children}</div>
      </div>
    </DashboardLayout>
  )
}
