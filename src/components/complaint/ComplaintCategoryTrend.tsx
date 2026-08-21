'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { BarChart3, Table2, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/styles'
import { Skeleton } from '@/components/ui/Loader'
import { useCompany } from '@/contexts/CompanyContext'
import { getComplaintCategoryTrend, type CategoryTrendResponse } from '@/lib/api/complaints'

// Validated categorical palette (dataviz skill: 8 slots, fixed order, CVD-safe
// against this app's card surface). Category → color is a stable hash, not a
// rank, so a series keeps its color when the date range changes which
// categories are present.
const LIGHT_PALETTE = ['#2a78d6', '#008300', '#e87ba4', '#eda100', '#1baf7a', '#eb6834', '#4a3aa7', '#e34948']
const DARK_PALETTE = ['#3987e5', '#008300', '#d55181', '#c98500', '#199e70', '#d95926', '#9085e9', '#e66767']
const OTHER_COLOR = { light: '#5c636c', dark: '#8c929a' }

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function colorForCategory(category: string, isDark: boolean): string {
  if (category === 'OTHER') return isDark ? OTHER_COLOR.dark : OTHER_COLOR.light
  const palette = isDark ? DARK_PALETTE : LIGHT_PALETTE
  return palette[hashString(category) % palette.length]
}

function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    const root = document.documentElement
    const sync = () => setIsDark(root.classList.contains('dark'))
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return isDark
}

function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

/** yyyy-mm-dd from local date parts. NOT toISOString(), which converts to UTC
 *  and so returns yesterday's date all night for timezones ahead of it — in IST
 *  that hid today's complaints from the range until 05:30. */
function isoLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return isoLocal(d)
}

function firstOfMonthMonthsAgo(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - months, 1)
  return isoLocal(d)
}

const TODAY = isoDaysAgo(0)

const PRESETS = [
  { label: '3M', from: () => firstOfMonthMonthsAgo(2) },
  { label: '6M', from: () => firstOfMonthMonthsAgo(5) },
  { label: '12M', from: () => firstOfMonthMonthsAgo(11) },
]

interface TooltipPayloadEntry {
  dataKey: string
  value: number
  color: string
}

function CategoryTooltip({ active, payload, label, isDark }: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
  isDark: boolean
}) {
  if (!active || !payload || payload.length === 0) return null
  const rows = payload.filter((p) => p.value > 0).sort((a, b) => b.value - a.value)
  const total = rows.reduce((sum, r) => sum + r.value, 0)
  return (
    <div className="surface-card px-3 py-2.5 shadow-lift text-xs min-w-[160px]">
      <p className="font-semibold text-ink-600 mb-1.5">{label ? formatMonthLabel(label) : ''}</p>
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.dataKey} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-ink-500">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
              {r.dataKey}
            </span>
            <span className="font-semibold text-ink-600 tabular-nums">{r.value}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-4 mt-1.5 pt-1.5 border-t border-cream-300">
        <span className="text-ink-400 font-medium">Total</span>
        <span className="font-bold text-ink-600 tabular-nums">{total}</span>
      </div>
    </div>
  )
}

/** The range the card starts on, and the one the complaints list filters by
 *  until the user picks another. Exported so the page can seed its own state
 *  from the same value instead of duplicating the number 5. */
export const DEFAULT_RANGE = { fromDate: firstOfMonthMonthsAgo(5), toDate: TODAY }

interface ComplaintCategoryTrendProps {
  /**
   * Lift the date range out of the card. The complaints list below is filtered
   * by the same range, so the page owns it and the card reports changes back —
   * a chart headed "N complaints in range" over a table showing a different set
   * is just two answers to one question.
   *
   * Left out, the card keeps its own range and nothing else sees it.
   */
  fromDate?: string
  toDate?: string
  onRangeChange?: (range: { fromDate: string; toDate: string }) => void
}

export default function ComplaintCategoryTrend({
  fromDate: controlledFrom,
  toDate: controlledTo,
  onRangeChange,
}: ComplaintCategoryTrendProps = {}) {
  const { currentCompany } = useCompany()
  const isDark = useIsDarkMode()

  const [ownFromDate, setOwnFromDate] = useState(DEFAULT_RANGE.fromDate)
  const [ownToDate, setOwnToDate] = useState(DEFAULT_RANGE.toDate)
  const fromDate = controlledFrom ?? ownFromDate
  const toDate = controlledTo ?? ownToDate

  const setRange = (next: { fromDate: string; toDate: string }) => {
    setOwnFromDate(next.fromDate)
    setOwnToDate(next.toDate)
    onRangeChange?.(next)
  }
  const setFromDate = (value: string) => setRange({ fromDate: value, toDate })
  const setToDate = (value: string) => setRange({ fromDate, toDate: value })
  const [data, setData] = useState<CategoryTrendResponse['data'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showTable, setShowTable] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getComplaintCategoryTrend({ company: currentCompany, fromDate, toDate })
      .then((res) => {
        if (!cancelled) setData(res.data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load trend data')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [currentCompany, fromDate, toDate])

  const chartData = useMemo(() => {
    if (!data) return []
    return data.trend.map((t) => ({ month: t.month, total: t.total, ...t.categories }))
  }, [data])

  const maxSubcategoryCount = useMemo(() => {
    if (!data || data.subcategories.length === 0) return 0
    return Math.max(...data.subcategories.map((s) => s.count))
  }, [data])

  return (
    <div className="surface-card overflow-hidden animate-fade-in-up mb-6">
      <div className="px-5 py-4 border-b border-cream-300 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shadow-soft">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-ink-600">Item Category Trend</h2>
            <p className="text-xs text-ink-400 font-medium">
              {loading ? 'Loading…' : `${data?.totalComplaints ?? 0} complaints in range`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 rounded-lg bg-cream-100 p-1">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setRange({ fromDate: p.from(), toDate: TODAY })}
                className={cn(
                  'px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors',
                  fromDate === p.from() && toDate === TODAY
                    ? 'bg-brand-500 text-white shadow-soft'
                    : 'text-ink-500 hover:text-ink-600 hover:bg-cream-200'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={fromDate}
            max={toDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-cream-300 rounded-lg bg-white text-ink-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          <span className="text-xs text-ink-400">to</span>
          <input
            type="date"
            value={toDate}
            min={fromDate}
            max={TODAY}
            onChange={(e) => setToDate(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-cream-300 rounded-lg bg-white text-ink-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          <button
            onClick={() => setShowTable((v) => !v)}
            title={showTable ? 'Show chart' : 'View as table'}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              showTable ? 'bg-brand-500 text-white' : 'text-ink-400 hover:text-brand-500 hover:bg-cream-100'
            )}
          >
            {showTable ? <BarChart3 className="w-4 h-4" /> : <Table2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <p className="text-sm text-danger-600 py-8 text-center">{error}</p>
        ) : !data || data.totalComplaints === 0 ? (
          <div className="py-14 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-cream-200 flex items-center justify-center mb-3">
              <TrendingUp className="h-6 w-6 text-ink-400" />
            </div>
            <h3 className="text-sm font-bold text-ink-600">No complaints in this range</h3>
            <p className="text-xs text-ink-400 font-medium mt-1">Try a wider date range</p>
          </div>
        ) : showTable ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-cream-300 text-sm">
              <thead>
                <tr>
                  <th className="text-left text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-3 py-2">Month</th>
                  {data.categories.map((c) => (
                    <th key={c} className="text-right text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-3 py-2">{c}</th>
                  ))}
                  <th className="text-right text-[11px] font-semibold text-ink-400 uppercase tracking-wider px-3 py-2">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-300">
                {data.trend.map((row) => (
                  <tr key={row.month}>
                    <td className="px-3 py-2 font-medium text-ink-600 whitespace-nowrap">{formatMonthLabel(row.month)}</td>
                    {data.categories.map((c) => (
                      <td key={c} className="px-3 py-2 text-right text-ink-500 tabular-nums">{row.categories[c] ?? 0}</td>
                    ))}
                    <td className="px-3 py-2 text-right font-bold text-ink-600 tabular-nums">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barCategoryGap="24%">
                  <CartesianGrid vertical={false} stroke={isDark ? '#333a42' : '#e0dbd8'} />
                  <XAxis
                    dataKey="month"
                    tickFormatter={formatMonthLabel}
                    tick={{ fill: isDark ? '#b8bcc3' : '#5c636c', fontSize: 11 }}
                    axisLine={{ stroke: isDark ? '#333a42' : '#e0dbd8' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: isDark ? '#b8bcc3' : '#5c636c', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                  />
                  <Tooltip
                    cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(41,47,54,0.04)' }}
                    content={(props) => (
                      <CategoryTooltip
                        active={props.active}
                        payload={props.payload as unknown as TooltipPayloadEntry[]}
                        label={props.label as string}
                        isDark={isDark}
                      />
                    )}
                  />
                  {data.categories.map((cat, idx) => (
                    <Bar
                      key={cat}
                      dataKey={cat}
                      stackId="total"
                      fill={colorForCategory(cat, isDark)}
                      stroke={isDark ? '#1a1f25' : '#ffffff'}
                      strokeWidth={2}
                      maxBarSize={28}
                      radius={idx === data.categories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Legend — always shown for 2+ series, per the accessibility floor on
                a couple of palette slots (magenta/yellow/aqua) that sit below 3:1
                on this surface. */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-cream-300">
              {data.categories.map((cat) => (
                <span key={cat} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-500">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colorForCategory(cat, isDark) }} />
                  {cat}
                </span>
              ))}
            </div>
          </>
        )}

        {/* Complaint Subcategory breakdown */}
        {!loading && !error && data && data.subcategories.length > 0 && (
          <div className="mt-6 pt-5 border-t border-cream-300">
            <h3 className="text-sm font-bold text-ink-600 mb-3">Complaint Subcategory</h3>
            <div className="space-y-2.5">
              {data.subcategories.map((s) => (
                <div key={s.key} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 text-xs font-medium text-ink-500 truncate" title={s.label}>
                    {s.label}
                  </span>
                  <div className="flex-1 h-5 rounded-full bg-cream-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all"
                      style={{ width: maxSubcategoryCount ? `${Math.max((s.count / maxSubcategoryCount) * 100, 4)}%` : '0%' }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-xs font-bold text-ink-600 tabular-nums">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
