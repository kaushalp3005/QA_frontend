'use client'

/**
 * Prev/Next control for a documentation records list.
 *
 * Every records section pages 50 at a time; this renders the controls for the
 * lists that slice their rows in the browser (the whole set is already loaded,
 * because the page's summary tiles and its search both read across all of it).
 * Lists that page on the server — DocListPage and the IPQC register — keep
 * their own controls wired to a request.
 *
 * Renders nothing when everything fits on one page.
 */

/** Rows per page across every documentation records section. */
export const RECORDS_PER_PAGE = 50

/** The slice of `items` belonging to `page`, 1-based. */
export function pageSlice<T>(items: T[], page: number): T[] {
  const start = (page - 1) * RECORDS_PER_PAGE
  return items.slice(start, start + RECORDS_PER_PAGE)
}

/** Number of pages `count` rows need — at least 1, so "Page 1 of 1" is never "of 0". */
export function pageCount(count: number): number {
  return Math.max(1, Math.ceil(count / RECORDS_PER_PAGE))
}

interface Props {
  page: number
  totalPages: number
  /** Total row count, shown alongside the page position. */
  total: number
  onPageChange: (page: number) => void
  /** What the rows are called, for the count line. */
  noun?: string
}

export default function RecordsPagination({ page, totalPages, total, onPageChange, noun = 'records' }: Props) {
  if (totalPages <= 1) return null

  const first = (page - 1) * RECORDS_PER_PAGE + 1
  const last = Math.min(page * RECORDS_PER_PAGE, total)

  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="btn-outline"
      >
        Previous
      </button>
      <span className="text-xs sm:text-sm text-ink-400 font-medium text-center">
        <span className="text-ink-600 font-bold tabular-nums">{first}</span>–
        <span className="text-ink-600 font-bold tabular-nums">{last}</span> of{' '}
        <span className="text-ink-600 font-bold tabular-nums">{total}</span> {noun}
        <span className="hidden sm:inline">
          {' · '}Page <span className="text-ink-600 font-bold">{page}</span> of {totalPages}
        </span>
      </span>
      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="btn-outline"
      >
        Next
      </button>
    </div>
  )
}
