'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, Camera, CheckCircle2, ChevronDown, XCircle } from 'lucide-react'
import { cn } from '@/lib/styles'
import type { CheckResult, VerifyResult } from '@/lib/api/batchDetection'
import LabelCanvas from './LabelCanvas'

interface ResultViewProps {
  result: VerifyResult
  photoUrl: string
  onDone: () => void
  onRetake: () => void
}

const RANK: Record<CheckResult, number> = { fail: 0, unclear: 1, pass: 2 }

export default function ResultView({ result, photoUrl, onDone, onRetake }: ResultViewProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const issues = useMemo(
    () => result.checks.filter((c) => c.result !== 'pass').sort((a, b) => RANK[a.result] - RANK[b.result]),
    [result],
  )
  const passed = useMemo(() => result.checks.filter((c) => c.result === 'pass'), [result])
  const failCount = issues.filter((c) => c.result === 'fail').length
  const hasUnclear = issues.some((c) => c.result === 'unclear')

  const toggle = (field: string) => setSelected((s) => (s === field ? null : field))

  return (
    <div className="space-y-4">
      <Banner status={result.status} failCount={failCount} />

      <LabelCanvas src={photoUrl} checks={result.checks} selected={selected} onSelect={setSelected} />

      {issues.length > 0 && (
        <section className="surface-card overflow-hidden">
          <header className="px-4 py-3 border-b border-cream-300 bg-cream-100/60">
            <h2 className="text-sm font-bold text-ink-600">Corrections</h2>
            <p className="text-xs text-ink-400">Tap a row to find it on the photo.</p>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream-100/70 border-b border-cream-300">
                <tr>
                  {['Field', 'Found', 'Should be', 'Fix'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-300">
                {issues.map((c) => (
                  <tr
                    key={c.field}
                    onClick={() => toggle(c.field)}
                    className={cn(
                      'cursor-pointer align-top',
                      selected === c.field ? 'bg-brand-50' : 'hover:bg-cream-100/60',
                    )}
                  >
                    <td className="px-3 py-2.5 font-semibold text-ink-600 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <ResultIcon result={c.result} />
                        {c.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-ink-500 min-w-[7rem]">{c.found ?? '—'}</td>
                    <td className="px-3 py-2.5 text-ink-600 font-medium min-w-[7rem]">{c.expected ?? '—'}</td>
                    <td className="px-3 py-2.5 text-ink-600 min-w-[12rem]">{c.fix}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {passed.length > 0 && (
        <details className="surface-card group overflow-hidden">
          <summary className="flex items-center justify-between gap-2 px-4 py-3 cursor-pointer list-none select-none">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-success-700">
              <CheckCircle2 className="w-4 h-4" />
              {passed.length} check{passed.length === 1 ? '' : 's'} passed
            </span>
            <ChevronDown className="w-4 h-4 text-ink-400 transition-transform group-open:rotate-180" />
          </summary>
          <ul className="divide-y divide-cream-300 border-t border-cream-300">
            {passed.map((c) => (
              <li key={c.field}>
                <button
                  type="button"
                  onClick={() => toggle(c.field)}
                  className={cn(
                    'w-full flex items-center justify-between gap-3 px-4 py-2 text-left text-sm',
                    selected === c.field ? 'bg-brand-50' : 'hover:bg-cream-100/60',
                  )}
                >
                  <span className="text-ink-600">{c.label}</span>
                  <span className="text-ink-400 truncate">{c.found ?? ''}</span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
        {hasUnclear && (
          <button type="button" onClick={onRetake} className="btn-outline justify-center">
            <Camera className="w-4 h-4" /> Retake photo
          </button>
        )}
        <button type="button" onClick={onDone} className="btn-primary justify-center">
          <CheckCircle2 className="w-4 h-4" /> Done – Check next label
        </button>
      </div>
    </div>
  )
}

function Banner({ status, failCount }: { status: VerifyResult['status']; failCount: number }) {
  if (status === 'PASS') {
    return (
      <div className="rounded-xl bg-success-600 text-white px-4 py-4 flex items-center gap-3">
        <CheckCircle2 className="w-8 h-8 shrink-0" />
        <div>
          <p className="text-xl font-extrabold tracking-wide">PASS</p>
          <p className="text-sm text-white/90">Label matches the order.</p>
        </div>
      </div>
    )
  }
  if (status === 'FAIL') {
    return (
      <div className="rounded-xl bg-danger-600 text-white px-4 py-4 flex items-center gap-3">
        <XCircle className="w-8 h-8 shrink-0" />
        <div>
          <p className="text-xl font-extrabold tracking-wide">
            FAIL – {failCount} issue{failCount === 1 ? '' : 's'}
          </p>
          <p className="text-sm text-white/90">Fix the label, then check it again.</p>
        </div>
      </div>
    )
  }
  return (
    <div className="rounded-xl bg-warning-500 text-white px-4 py-4 flex items-center gap-3">
      <AlertTriangle className="w-8 h-8 shrink-0" />
      <div>
        <p className="text-xl font-extrabold tracking-wide">UNCLEAR – retake photo</p>
        <p className="text-sm text-white/90">Some text could not be read clearly. Nothing failed.</p>
      </div>
    </div>
  )
}

function ResultIcon({ result }: { result: CheckResult }) {
  if (result === 'fail') return <XCircle className="w-4 h-4 text-danger-600 shrink-0" />
  if (result === 'unclear') return <AlertTriangle className="w-4 h-4 text-warning-600 shrink-0" />
  return <CheckCircle2 className="w-4 h-4 text-success-600 shrink-0" />
}
