'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  FileText,
  Settings,
  BarChart3,
  X,
  Shield,
  Search,
  ClipboardCheck,
  ClipboardList,
  BookOpen,
  GraduationCap,
  Beaker,
} from 'lucide-react'
import { cn } from '@/lib/styles'
import { getStoredUser } from '@/lib/api/auth'
import { isSuperAdmin as checkIsSuperAdmin } from '@/lib/constants/modules'
import { getMyPermissions } from '@/lib/api/settings'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

// `moduleCode` matches qc_module_permissions.module_code; used to gate sidebar
// visibility by the user's can_view flag. Items with no moduleCode are always shown.
const navigation = [
  { name: 'Dashboard',       href: '/dashboard',       icon: LayoutDashboard },
  { name: 'Complaints',      href: '/complaints',      icon: FileText,        moduleCode: 'complaints' },
  { name: 'License Tracker', href: '/license-tracker', icon: Shield,          moduleCode: 'license_tracker' },
  { name: 'Vendor COA',      href: '/vendor-coa',      icon: ClipboardCheck,  moduleCode: 'vendor_coa' },
  { name: 'RCA / CAPA',      href: '/rca-capa',        icon: Search,          moduleCode: 'rca_capa' },
  { name: 'Fishbone',        href: '/fishbone',        icon: BarChart3,       moduleCode: 'fishbone' },
  { name: 'Lab Reports',     href: '/lab-reports',     icon: Beaker,          moduleCode: 'lab_reports' },
  { name: 'Documentations',  href: '/documentations',  icon: BookOpen,        moduleCode: 'documentations' },
  { name: 'Training',        href: '/training',        icon: GraduationCap,   moduleCode: 'training' },
  { name: 'NI Report',       href: '/ni-report',       icon: ClipboardList,   moduleCode: 'ni_report' },
]

const settingsNavItem = { name: 'Settings', href: '/settings', icon: Settings }

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [viewable, setViewable] = useState<Set<string> | null>(null)

  useEffect(() => {
    const user = getStoredUser()
    setIsSuperAdmin(checkIsSuperAdmin(user?.email))

    getMyPermissions()
      .then((res) => {
        const allowed = new Set<string>()
        for (const [code, perm] of Object.entries(res.permissions || {})) {
          if (perm.can_view) allowed.add(code)
        }
        setViewable(allowed)
      })
      .catch(() => setViewable(new Set()))
  }, [pathname])

  // Lock body scroll when the mobile drawer is open
  useEffect(() => {
    if (typeof document === 'undefined') return
    const isMobile = window.matchMedia('(max-width: 1023px)').matches
    if (isOpen && isMobile) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [isOpen])

  const visibleNav = navigation.filter((item) => {
    if (!item.moduleCode) return true
    if (isSuperAdmin) return true
    if (viewable === null) return false
    return viewable.has(item.moduleCode)
  })

  const navItems = isSuperAdmin ? [...visibleNav, settingsNavItem] : visibleNav

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink-700/40 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar — narrower on small screens to leave room */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[78%] max-w-[300px] sm:w-72 transform transition-transform duration-300 ease-out',
          'lg:relative lg:translate-x-0 lg:w-72 lg:max-w-none',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full glass-strong border-r border-cream-300 shadow-card">
          {/* Header / Brand */}
          <div className="px-5 py-5 border-b border-cream-300">
            <div className="flex items-center justify-between gap-3">
              <Link href="/dashboard" className="flex items-center gap-3 group">
                <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-white shadow-soft ring-1 ring-cream-300 group-hover:shadow-lift transition-all">
                  <Image
                    src="/candor-logo.jpg"
                    alt="Candor Foods"
                    fill
                    sizes="44px"
                    className="object-contain p-1"
                    priority
                  />
                </div>
                <div className="leading-tight">
                  <p className="text-[15px] font-bold text-ink-600 tracking-tight">
                    Candor Foods
                  </p>
                  <p className="text-[11px] text-ink-400 font-medium tracking-wide uppercase">
                    QA / QC System
                  </p>
                </div>
              </Link>
              <button
                onClick={onClose}
                className="lg:hidden p-2 rounded-lg text-ink-400 hover:text-brand-500 hover:bg-cream-200"
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
            {navItems.map((item, idx) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname?.startsWith(item.href))

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  style={{ animationDelay: `${idx * 30}ms` }}
                  className={cn(
                    'group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium',
                    'animate-fade-in-up',
                    'transition-all duration-200 ease-out',
                    isActive
                      ? 'bg-brand-500 text-white shadow-brand'
                      : 'text-ink-500 hover:text-ink-600 hover:bg-cream-200/80'
                  )}
                >
                  {/* Subtle red accent on hover (non-active) */}
                  {!isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-0 bg-brand-500 rounded-r group-hover:h-6 transition-all duration-200" />
                  )}
                  <item.icon
                    className={cn(
                      'h-[18px] w-[18px] shrink-0 transition-transform duration-200',
                      isActive ? 'text-white' : 'text-ink-400 group-hover:text-brand-500',
                      'group-hover:scale-110'
                    )}
                  />
                  <span className="truncate">{item.name}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/90 shadow" />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-cream-300">
            <p className="text-[10px] text-ink-300 text-center tracking-wider uppercase font-semibold">
              v1.0 · Quality Assured
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}
