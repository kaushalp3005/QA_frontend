'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import clsx from 'clsx'
import { LogOut, Menu, X } from 'lucide-react'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { getMtSession, mtLogout, ROLE_LABEL, type MtSession } from '@/lib/maintenance/client'
import { plantLabel } from '@/lib/maintenance/format'
import { MT, settingsItem, sidebarFor, type NavItem } from '@/lib/maintenance/nav'

/**
 * Guard + chrome for every /maintenance page. Signed-out visitors go to the
 * shared /login with the Maintenance system pre-selected; the maintenance
 * session (mt_users JWT) is separate from the QC one.
 */
export default function MtShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [session, setSession] = useState<MtSession | null>(null)
  const [ready, setReady] = useState(false)
  const [drawer, setDrawer] = useState(false)

  useEffect(() => {
    const toLogin = () => {
      const back = window.location.pathname + window.location.search
      router.replace(`/login?system=maintenance&returnUrl=${encodeURIComponent(back)}`)
    }
    const s = getMtSession()
    if (!s) {
      toLogin()
      return
    }
    setSession(s)
    setReady(true)
    window.addEventListener('mt-logout', toLogin)
    return () => window.removeEventListener('mt-logout', toLogin)
  }, [router])

  useEffect(() => setDrawer(false), [pathname])

  if (!ready || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-factory-200 border-t-factory-600" />
      </div>
    )
  }

  const groups = sidebarFor(session.role)

  const sidebar = (
    <nav className="flex h-full flex-col bg-zinc-950 text-zinc-300">
      <Link href={MT.home} className="flex items-center gap-3 px-5 py-5">
        <span className="relative h-9 w-9 overflow-hidden rounded-lg bg-[#FFFFFF] ring-1 ring-white/10">
          <Image src="/candor-logo.jpg" alt="Candor Foods" fill sizes="36px" className="object-contain p-0.5" />
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-bold text-zinc-50">Candor Maintenance</span>
          <span className="block text-[11px] font-medium uppercase tracking-wider text-factory-300">FactoryOps</span>
        </span>
      </Link>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((g, gi) => (
          <div key={gi} className="mb-4">
            {g.title && (
              <p className="px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{g.title}</p>
            )}
            {g.items.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
        ))}
        <NavLink item={settingsItem} pathname={pathname} />
      </div>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-factory-600 text-sm font-bold uppercase text-[#FFFFFF]">
            {session.name?.[0] ?? '?'}
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-semibold text-zinc-100">{session.name}</span>
            <span className="block truncate text-xs text-zinc-400">
              {ROLE_LABEL[session.role]} · {plantLabel(session.plantId)}
            </span>
          </span>
        </div>
        <button
          onClick={mtLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/5 hover:text-zinc-50"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    </nav>
  )

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-zinc-950/60" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-zinc-200 bg-white/90 px-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90 lg:px-8">
          <button
            className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 lg:hidden"
            onClick={() => setDrawer((d) => !d)}
            aria-label="Menu"
          >
            {drawer ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 lg:hidden">Candor Maintenance</span>
          <span className="hidden text-xs font-medium text-zinc-500 lg:inline">
            {ROLE_LABEL[session.role]} · {plantLabel(session.plantId)}
          </span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const base = item.href.split('?')[0]
  const active = pathname === base || (base !== MT.home && base !== MT.dashboard && pathname.startsWith(`${base}/`))
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={clsx(
        'mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
        active ? 'bg-factory-600 text-[#FFFFFF]' : 'hover:bg-white/5 hover:text-zinc-50',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.comingSoon && <span className="text-[10px] uppercase tracking-wide text-zinc-500">Soon</span>}
    </Link>
  )
}
