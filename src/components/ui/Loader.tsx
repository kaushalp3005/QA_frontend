'use client'

import Image from 'next/image'

interface PageLoaderProps {
  label?: string
  fullScreen?: boolean
}

/** Full-screen / full-section loader with the Candor logo and brand spinner. */
export function PageLoader({ label = 'Loading', fullScreen = false }: PageLoaderProps) {
  return (
    <div
      className={
        fullScreen
          ? 'fixed inset-0 z-50 flex items-center justify-center bg-cream-100/70 backdrop-blur-md animate-fade-in'
          : 'flex items-center justify-center py-24 animate-fade-in'
      }
    >
      <div className="flex flex-col items-center gap-5">
        <div className="relative w-20 h-20">
          {/* Outer brand ring */}
          <div className="absolute inset-0 rounded-full border-4 border-cream-300" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-500 border-r-brand-500 animate-spin" />
          {/* Inner logo */}
          <div className="absolute inset-2 rounded-full bg-white shadow-soft flex items-center justify-center overflow-hidden">
            <Image
              src="/candor-logo.jpg"
              alt="Candor Foods"
              width={48}
              height={48}
              className="object-contain"
              priority
            />
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-sm font-medium text-ink-500 tracking-wide">
          <span>{label}</span>
          <span className="flex gap-0.5">
            <span className="w-1 h-1 rounded-full bg-brand-500 animate-pulse" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-1 rounded-full bg-brand-500 animate-pulse" style={{ animationDelay: '200ms' }} />
            <span className="w-1 h-1 rounded-full bg-brand-500 animate-pulse" style={{ animationDelay: '400ms' }} />
          </span>
        </div>
      </div>
    </div>
  )
}

/** Compact inline spinner (button / row use). */
export function Spinner({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin ${className}`}
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/** Shimmer skeleton block. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />
}
