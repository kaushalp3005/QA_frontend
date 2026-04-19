'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, LogOut } from 'lucide-react'
import Sidebar from './Sidebar'
import CompanySelector from '@/components/ui/CompanySelector'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { logout, getStoredUser } from '@/lib/api/auth'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const user = getStoredUser()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  // Initials for the avatar circle
  const initials = (user?.email || '?').slice(0, 2).toUpperCase()

  return (
    <div className="fixed inset-0 flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main column */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Top bar — translucent / blurred */}
        <header className="sticky top-0 z-30 glass-strong border-b border-cream-300">
          <div className="flex items-center justify-between gap-2 px-3 sm:px-6 lg:px-8 h-14 sm:h-16">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-ink-500 hover:text-brand-500 hover:bg-cream-200"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 lg:hidden min-w-0">
              <p className="text-sm font-bold text-ink-600 truncate">QA / QC</p>
            </div>

            {/* Right side controls */}
            <div className="flex items-center gap-1.5 sm:gap-3 ml-auto">
              {/* Dark mode toggle */}
              <ThemeToggle />

              {/* CompanySelector — visible on all sizes, narrower on mobile */}
              <div className="w-[120px] sm:w-auto sm:min-w-[180px]">
                <CompanySelector />
              </div>

              {/* User pill — desktop only */}
              {user && (
                <div className="hidden md:flex items-center gap-2.5 px-2.5 py-1.5 rounded-full bg-cream-200/60 border border-cream-300 hover:bg-cream-200">
                  <div className="w-7 h-7 rounded-full bg-brand-500 text-white text-[11px] font-bold flex items-center justify-center shadow-sm ring-2 ring-white">
                    {initials}
                  </div>
                  <span className="text-xs font-semibold text-ink-600 max-w-[180px] truncate">
                    {user.email}
                  </span>
                </div>
              )}

              {/* Mobile: avatar-only chip */}
              {user && (
                <div
                  className="md:hidden w-8 h-8 rounded-full bg-brand-500 text-white text-[11px] font-bold flex items-center justify-center shadow-sm ring-2 ring-white"
                  title={user.email}
                >
                  {initials}
                </div>
              )}

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-lg text-sm font-semibold
                           text-ink-600 bg-white border border-cream-300 shadow-soft
                           hover:text-brand-500 hover:border-brand-500 hover:shadow-card sm:hover:-translate-y-0.5
                           active:translate-y-0
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page content — tighter padding on mobile */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-6 lg:px-8 py-4 sm:py-6 animate-fade-in-up">
          {children}
        </main>
      </div>
    </div>
  )
}
