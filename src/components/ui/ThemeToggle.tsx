'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

const STORAGE_KEY = 'theme'

type Theme = 'light' | 'dark'

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
  if (stored === 'light' || stored === 'dark') return stored
  // Fall back to OS preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

interface Props {
  className?: string
}

export default function ThemeToggle({ className = '' }: Props) {
  // Avoid hydration mismatch — render nothing until mounted, then sync.
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const t = readStoredTheme()
    setTheme(t)
    applyTheme(t)
    setMounted(true)
  }, [])

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem(STORAGE_KEY, next)
    applyTheme(next)
  }

  if (!mounted) {
    // Placeholder slot to prevent layout shift
    return <div className={`w-9 h-9 ${className}`} aria-hidden />
  }

  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle dark mode"
      className={`
        relative w-9 h-9 rounded-full border border-cream-300
        bg-cream-50 text-ink-500 hover:text-brand-500 hover:border-brand-500
        shadow-soft hover:shadow-card
        flex items-center justify-center
        transition-all duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30
        ${className}
      `}
    >
      <Sun
        className={`absolute w-4 h-4 transition-all duration-300 ${
          isDark ? 'opacity-0 rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'
        }`}
      />
      <Moon
        className={`absolute w-4 h-4 transition-all duration-300 ${
          isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'
        }`}
      />
    </button>
  )
}
