'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChevronDown, Settings, X } from 'lucide-react'
import { cn } from '@/lib/styles'
import { getStoredUser, getAuthToken } from '@/lib/api/auth'
import { isSuperAdmin as checkIsSuperAdmin } from '@/lib/constants/modules'
import { NAVIGATION, type NavItem } from '@/lib/constants/navigation'
import { landingPathFromStorage } from '@/lib/landing'
import { getMyPermissions } from '@/lib/api/settings'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

// Appended after the permission filter, so its moduleCode is never consulted.
const settingsNavItem: NavItem = { name: 'Settings', href: '/settings', icon: Settings, moduleCode: 'settings' }

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [viewable, setViewable] = useState<Set<string> | null>(null)
  // Resolved client-side (localStorage is not available during SSR): the brand
  // link must not point at /dashboard for a user who cannot view it.
  const [brandHref, setBrandHref] = useState('/dashboard')

  useEffect(() => {
    const user = getStoredUser()
    const isSA = checkIsSuperAdmin(user?.email)
    setIsSuperAdmin(isSA)
    setBrandHref(landingPathFromStorage())

    // Super admins see everything — no need for the API call
    if (isSA) { setViewable(new Set()); return }

    // No token means the call will 401 — skip it
    if (!getAuthToken()) { setViewable(new Set()); return }

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

  const visibleNav = NAVIGATION.filter((item) => {
    if (isSuperAdmin) return true
    if (viewable === null) return false
    return viewable.has(item.moduleCode)
  })

  const navItems = isSuperAdmin ? [...visibleNav, settingsNavItem] : visibleNav

  /** True when `href` is the current page or an ancestor of it. */
  const isInSection = (href: string) =>
    pathname === href || (href !== '/dashboard' && !!pathname?.startsWith(`${href}/`))

  // A group follows the route by default — land anywhere under /training and it
  // is open. The chevron overrides that for the current page only; navigating
  // clears the override so the sidebar always reopens around where you are.
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  useEffect(() => { setCollapsedGroups({}) }, [pathname])

  const isGroupOpen = (item: NavItem) =>
    collapsedGroups[item.name] ?? isInSection(item.href)

  const toggleGroup = (name: string, open: boolean) =>
    setCollapsedGroups((prev) => ({ ...prev, [name]: !open }))

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
              <Link href={brandHref} className="flex items-center gap-3 group">
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
              const children = item.children
              // A parent with children highlights on its own landing page only —
              // otherwise it and the open sub-item would both light up.
              const isActive = children ? pathname === item.href : isInSection(item.href)
              const open = children ? isGroupOpen(item) : false

              return (
                <div
                  key={item.name}
                  style={{ animationDelay: `${idx * 30}ms` }}
                  className="animate-fade-in-up"
                >
                  <div className="relative">
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium',
                        'transition-all duration-200 ease-out',
                        // Room for the chevron, which overlays the row's right end.
                        children && 'pr-11',
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
                      {isActive && !children && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/90 shadow" />
                      )}
                    </Link>

                    {/* Sits above the link so the row can be followed or folded
                        independently — a <button> cannot be nested in an <a>. */}
                    {children && (
                      <button
                        type="button"
                        onClick={() => toggleGroup(item.name, open)}
                        aria-expanded={open}
                        aria-label={`${open ? 'Collapse' : 'Expand'} ${item.name}`}
                        className={cn(
                          'absolute right-1.5 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-lg transition-colors',
                          isActive
                            ? 'text-white/85 hover:bg-white/20'
                            : 'text-ink-300 hover:text-brand-500 hover:bg-cream-300/70'
                        )}
                      >
                        <ChevronDown
                          className={cn('h-4 w-4 transition-transform duration-200', open && 'rotate-180')}
                        />
                      </button>
                    )}
                  </div>

                  {children && open && (
                    <div className="mt-1 mb-1 ml-6 pl-3 border-l border-cream-300 space-y-0.5">
                      {children.map((child) => {
                        const childActive = isInSection(child.href)
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={onClose}
                            title={child.name}
                            className={cn(
                              'group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium',
                              'transition-colors duration-200',
                              childActive
                                ? 'bg-brand-50 text-brand-600 font-semibold'
                                : 'text-ink-500 hover:text-ink-600 hover:bg-cream-200/80'
                            )}
                          >
                            <child.icon
                              className={cn(
                                'h-4 w-4 shrink-0',
                                childActive ? 'text-brand-500' : 'text-ink-400 group-hover:text-brand-500'
                              )}
                            />
                            <span className="truncate">{child.name}</span>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
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
