'use client'

import { CopyPlus, History, ImageOff } from 'lucide-react'

/** One entry as the sidebar shows it — a flattened view of a form block, built
 *  by the form so this component needs nothing from the API. */
export interface RecreateItem {
  /** The block's key, passed straight back to the form's callbacks. */
  key: number
  /** Position label — "Entry 2", or "Editing #128" for the opened record. */
  label: string
  /** Product/customer name, or a fallback when nothing is typed yet. */
  title: string
  /** Batch and provenance, e.g. "Batch JG25 · from #128". */
  subtitle: string
  imageUrl: string | null
}

interface RecreateSidebarProps {
  /** Every entry currently in the form, in form order. */
  items: RecreateItem[]
  /** Copy this entry into a new one at the bottom of the form. */
  onRecreate: (key: number) => void
  /** Scroll the form to this entry. */
  onJump: (key: number) => void
}

/** The entries sitting in the form right now, each with a Recreate button.
 *  A printing run is mostly one label repeated with a new batch number, so
 *  copying the entry you just filled beats re-typing all fourteen parameters. */
export default function RecreateSidebar({ items, onRecreate, onJump }: RecreateSidebarProps) {
  return (
    <aside className="w-full shrink-0 lg:sticky lg:top-6 lg:w-72">
      <div className="surface-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <History className="h-4 w-4 text-brand-500" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink-500">
            Entries in this form
          </h2>
        </div>
        <p className="mb-3 text-[11px] font-medium leading-relaxed text-ink-300">
          Recreate copies an entry — same label photo and details — as another entry below,
          ready to tweak. Everything here is filed together on submit.
        </p>

        <div className="max-h-[32rem] space-y-1.5 overflow-y-auto pr-0.5">
          {items.map((item) => (
            <div
              key={item.key}
              className="flex items-center gap-2.5 rounded-xl border border-cream-300 bg-white p-2 transition-colors hover:border-brand-200"
            >
              <button
                type="button"
                onClick={() => onJump(item.key)}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                title="Go to this entry"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-cream-300 bg-cream-100">
                  {item.imageUrl ? (
                    // Plain <img>: the S3 host is not in next.config images.domains.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <ImageOff className="h-4 w-4 text-ink-300" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-300">
                    {item.label}
                  </span>
                  <span className="block truncate text-xs font-bold text-ink-600" title={item.title}>
                    {item.title}
                  </span>
                  {item.subtitle && (
                    <span className="block truncate text-[11px] font-medium text-ink-300">
                      {item.subtitle}
                    </span>
                  )}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onRecreate(item.key)}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold text-brand-500 transition-colors hover:bg-brand-50"
                title="Copy this entry into a new one"
              >
                <CopyPlus className="h-3.5 w-3.5" />
                Recreate
              </button>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
