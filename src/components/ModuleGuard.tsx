'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { Spinner } from '@/components/ui/Loader'
import { getMyPermissions } from '@/lib/api/settings'
import { getStoredUser, getAuthToken } from '@/lib/api/auth'
import { isSuperAdmin } from '@/lib/constants/modules'
import { landingPathFromStorage } from '@/lib/landing'

interface ModuleGuardProps {
  /** qc_module_permissions.module_code this page belongs to. */
  module: string
  children: React.ReactNode
}

/** Blocks a page when the user lacks can_view on its module. The sidebar
 *  already hides the link; this closes the hole where someone types the URL.
 *  Deliberately renders a message instead of redirecting — a user with no
 *  viewable modules would otherwise bounce in a loop. */
export default function ModuleGuard({ module, children }: ModuleGuardProps) {
  const [allowed, setAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    if (isSuperAdmin(getStoredUser()?.email)) {
      setAllowed(true)
      return
    }
    if (!getAuthToken()) {
      setAllowed(false)
      return
    }
    getMyPermissions()
      .then((res) => setAllowed(Boolean(res.permissions?.[module]?.can_view)))
      .catch(() => setAllowed(false))
  }, [module])

  if (allowed === null) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size={28} />
      </div>
    )
  }

  if (!allowed) {
    const landing = landingPathFromStorage()
    return (
      <div className="max-w-md mx-auto mt-16 rounded-2xl border border-cream-300 bg-white shadow-card p-8 text-center animate-fade-in-up">
        <div className="w-12 h-12 rounded-xl bg-cream-200 text-ink-400 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold text-ink-600">No access to this section</h2>
        <p className="text-sm text-ink-400 mt-1.5 font-medium">
          Your account has not been granted access here. Ask a QA administrator
          if you need it.
        </p>
        <Link
          href={landing}
          className="inline-flex items-center justify-center mt-5 px-4 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold shadow-brand hover:bg-brand-600"
        >
          Go to my sections
        </Link>
      </div>
    )
  }

  return <>{children}</>
}
