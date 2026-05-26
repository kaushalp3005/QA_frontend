'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { MessageSquare, X, Loader2, Send, CheckCircle2, AlertCircle } from 'lucide-react'
import axios from 'axios'
import { getStoredUser } from '@/lib/api/auth'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

type Category = 'Feedback' | 'Update Request' | 'Bug'

export default function FeedbackButton() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<Category>('Feedback')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  const close = () => {
    if (sending) return
    setOpen(false)
    // Reset after a beat so the success state stays visible until the modal is gone
    setTimeout(() => {
      setMessage('')
      setResult(null)
      setCategory('Feedback')
    }, 200)
  }

  const submit = async () => {
    const trimmed = message.trim()
    if (trimmed.length < 3) {
      setResult({ ok: false, text: 'Please write a message (at least 3 characters).' })
      return
    }
    setSending(true)
    setResult(null)
    const user = getStoredUser()
    try {
      const pageUrl = typeof window !== 'undefined' ? `${pathname}${window.location.search}` : pathname
      await axios.post(`${API_BASE_URL}/feedback`, {
        message: trimmed,
        category,
        from_user_email: user?.email ?? null,
        from_user_name: user?.email ?? null,
        page_url: pageUrl,
      })
      setResult({ ok: true, text: 'Thanks! Your message has been sent.' })
      setMessage('')
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Failed to send. Please try again.'
      setResult({ ok: false, text: String(detail) })
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Footer trigger — used inside DashboardLayout's footer */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-brand-600 transition-colors"
        title="Send feedback or request an update"
      >
        <MessageSquare className="w-3.5 h-3.5" />
        Feedback / Updates
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in-up"
          onClick={close}
        >
          <div
            className="surface-card w-full max-w-md rounded-2xl shadow-card overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-cream-300 bg-cream-100/60">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-brand-500/10">
                  <MessageSquare className="w-4 h-4 text-brand-600" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-ink-700">Send Feedback or Update Request</h2>
                  <p className="text-[11px] text-ink-300">Goes straight to the admin inbox.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                disabled={sending}
                className="p-1.5 rounded-lg text-ink-400 hover:text-danger-600 hover:bg-danger-50 disabled:opacity-50"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="label-base">Category</label>
                <div className="flex flex-wrap gap-2">
                  {(['Feedback', 'Update Request', 'Bug'] as Category[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={[
                        'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                        category === c
                          ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                          : 'bg-white text-ink-500 border-cream-300 hover:bg-cream-100',
                      ].join(' ')}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label-base">Message <span className="text-brand-500">*</span></label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  placeholder="Describe the change you'd like, the issue you've noticed, or any feedback you have…"
                  className="input-base resize-y min-h-[120px]"
                  disabled={sending}
                  autoFocus
                />
                <p className="text-[11px] text-ink-300 mt-1">
                  {message.length}/10000 characters · We'll include the page URL automatically.
                </p>
              </div>

              {result && (
                <div
                  className={[
                    'flex items-start gap-2 rounded-lg px-3 py-2 text-xs',
                    result.ok
                      ? 'bg-success-50 text-success-700 border border-success-200'
                      : 'bg-danger-50 text-danger-700 border border-danger-200',
                  ].join(' ')}
                >
                  {result.ok ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                  <span>{result.text}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-cream-300 bg-cream-100/40 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={sending}
                className="btn-outline !py-1.5 !px-3 text-xs"
              >
                {result?.ok ? 'Done' : 'Cancel'}
              </button>
              {!result?.ok && (
                <button
                  type="button"
                  onClick={submit}
                  disabled={sending || message.trim().length < 3}
                  className="btn-primary !py-1.5 !px-3 text-xs gap-1.5"
                >
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {sending ? 'Sending…' : 'Send'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
