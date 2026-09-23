'use client'

import { useMemo, useState } from 'react'
import { Languages } from 'lucide-react'

import { TranscriptTurn } from '@/lib/api/complaintCalls'

interface Props {
  turns: TranscriptTurn[] | null | undefined
}

/** Agent/caller chat bubbles. English by default; the original-language toggle
 *  appears only when at least one turn actually carries indic_text. */
export default function Transcript({ turns }: Props) {
  const [showOriginal, setShowOriginal] = useState(false)
  const hasIndic = useMemo(
    () => (turns || []).some((t) => (t.indic_text || '').trim().length > 0),
    [turns],
  )

  if (!turns || turns.length === 0) {
    return (
      <p className="text-sm text-ink-400 italic">No conversation was recorded for this call.</p>
    )
  }

  return (
    <div>
      {hasIndic && (
        <div className="flex justify-end mb-3">
          <button
            type="button"
            onClick={() => setShowOriginal((v) => !v)}
            className="btn-outline px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
          >
            <Languages className="w-3.5 h-3.5" />
            {showOriginal ? 'Show English' : 'Show original language'}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {turns.map((turn, i) => {
          const isAgent = String(turn.role || '').toLowerCase() === 'agent'
          const english = (turn.en_text || '').trim()
          const indic = (turn.indic_text || '').trim()
          const primary = (showOriginal ? indic || english : english || indic) || '—'
          return (
            <div key={i} className={`flex ${isAgent ? 'justify-start' : 'justify-end'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  isAgent
                    ? 'bg-cream-100 border border-cream-300 text-ink-600 rounded-tl-sm'
                    : 'bg-brand-500 text-white rounded-tr-sm'
                }`}
              >
                <div
                  className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${
                    isAgent ? 'text-ink-400' : 'text-white/70'
                  }`}
                >
                  {isAgent ? 'Agent' : 'Caller'}
                </div>
                <div className="text-sm whitespace-pre-wrap break-words">{primary}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
