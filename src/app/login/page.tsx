'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  Mail,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Wrench,
  Check,
  type LucideIcon,
} from 'lucide-react'
import { Spinner } from '@/components/ui/Loader'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { landingPathFor, type StoredPermissions } from '@/lib/landing'
import { apiErrorMessage } from '@/lib/api/auth'
import {
  ACTIVE_SYSTEM_KEY,
  MAINTENANCE_HOME,
  isMaintenancePath,
  type SystemId,
} from '@/lib/systems'
import { MtApiError, mtLogin } from '@/lib/maintenance/client'

interface LoginFormData {
  /** Email for QC; mt_users username for Maintenance */
  email: string
  password: string
}

interface SystemInfo {
  id: SystemId
  name: string
  tagline: string
  icon: LucideIcon
  /** Tailwind classes for the icon tile */
  tile: string
}

const SYSTEMS: SystemInfo[] = [
  {
    id: 'qc_system',
    name: 'QA / QC System',
    tagline: 'Complaints, RCA / CAPA, lab reports, documentation and audits.',
    icon: ShieldCheck,
    tile: 'bg-brand-500 text-white shadow-brand',
  },
  {
    id: 'maintenance_system',
    name: 'Maintenance System',
    tagline: 'Breakdowns, preventive maintenance, work orders and equipment.',
    icon: Wrench,
    tile: 'bg-factory-600 text-white shadow-[0_8px_24px_-6px_rgba(15,110,86,0.45)]',
  },
]

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<LoginFormData>({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedSystem, setSelectedSystem] = useState<SystemId>('qc_system')
  const isMaintenance = selectedSystem === 'maintenance_system'

  // Pre-select the system named in ?system= (the Maintenance guard sends
  // signed-out users here with system=maintenance), else the one this
  // browser opened last time.
  useEffect(() => {
    try {
      const param = new URLSearchParams(window.location.search).get('system')
      if (param === 'maintenance' || param === 'maintenance_system') return setSelectedSystem('maintenance_system')
      if (param === 'qc' || param === 'qc_system') return setSelectedSystem('qc_system')
      const last = localStorage.getItem(ACTIVE_SYSTEM_KEY)
      if (last === 'qc_system' || last === 'maintenance_system') setSelectedSystem(last)
    } catch {}
  }, [])

  const handleSelectSystem = (id: SystemId) => {
    setSelectedSystem(id)
    setError('')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError('')
  }

  const openSystem = (system: SystemId, qcLanding: string) => {
    localStorage.setItem(ACTIVE_SYSTEM_KEY, system)
    router.push(system === 'maintenance_system' ? MAINTENANCE_HOME : qcLanding)
  }

  /** Maintenance signs in against mt_users on the maintenance backend —
   *  a separate service with its own JWT; the QC session is not touched. */
  const signInMaintenance = async () => {
    try {
      await mtLogin(formData.email.trim(), formData.password)
    } catch (err) {
      if (err instanceof MtApiError && (err.status === 401 || err.status === 400 || err.status === 403))
        throw new Error(err.message && err.status !== 401 ? err.message : 'Invalid username or password.')
      throw err
    }
    localStorage.setItem(ACTIVE_SYSTEM_KEY, 'maintenance_system')
    const returnUrl = new URLSearchParams(window.location.search).get('returnUrl')
    const target = returnUrl ? decodeURIComponent(returnUrl) : ''
    router.push(isMaintenancePath(target) ? target : MAINTENANCE_HOME)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (isMaintenance) {
        await signInMaintenance()
        return
      }

      let response: Response
      try {
        response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/auth/login`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: formData.email, password: formData.password }),
          },
        )
      } catch {
        // fetch only rejects when no response came back at all — the browser's
        // own wording ("Failed to fetch", "Load failed") means nothing to a user.
        throw new Error("Can't reach the server. Check your internet connection and try again.")
      }

      if (!response.ok) {
        // A proxy or crash can answer with an HTML page, not JSON.
        const errorData = await response.json().catch(() => null)
        throw new Error(
          apiErrorMessage(
            errorData,
            response.status >= 500
              ? 'The sign-in service is having a problem. Please try again in a minute.'
              : 'Login failed. Please check your email and password.',
          ),
        )
      }

      const data = await response.json()
      localStorage.setItem('access_token', data.access_token)
      // The access token now lives 15 minutes. Without the refresh token
      // stored alongside it, FetchInterceptor has nothing to renew with and
      // the user would be bounced to /login every quarter of an hour.
      if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token)
      localStorage.setItem('user', JSON.stringify(data))

      let permissions: StoredPermissions = {}
      if (data.companies && data.companies.length > 0) {
        localStorage.setItem('company', data.companies[0].code)
        try {
          const permsResp = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/auth/permissions/${data.companies[0].code}`,
            { headers: { Authorization: `Bearer ${data.access_token}` } },
          )
          if (permsResp.ok) {
            const permsData = await permsResp.json()
            permissions = permsData.permissions || {}
            localStorage.setItem('permissions', JSON.stringify(permissions))
          }
        } catch (permError) {
          console.error('Failed to fetch permissions:', permError)
        }
      }

      // A returnUrl wins, as long as it points into the system that was chosen.
      const returnUrl = new URLSearchParams(window.location.search).get('returnUrl')
      if (returnUrl) {
        const target = decodeURIComponent(returnUrl)
        const system: SystemId = isMaintenancePath(target) ? 'maintenance_system' : 'qc_system'
        if (system === selectedSystem) {
          localStorage.setItem(ACTIVE_SYSTEM_KEY, system)
          router.push(target)
          return
        }
      }

      // Not every user can see the dashboard — land them on their first
      // viewable section instead of a page that would just deny them.
      openSystem(selectedSystem, landingPathFor(data.email, permissions))
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-cream-100">
      {/* ── Brand panel (desktop) ──────────────────────────────────────── */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#1F242A] p-12 xl:p-16">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -left-32 w-[520px] h-[520px] rounded-full bg-brand-500/25 blur-3xl animate-float" />
          <div
            className="absolute -bottom-48 -right-24 w-[480px] h-[480px] rounded-full bg-amber-500/15 blur-3xl animate-float"
            style={{ animationDelay: '1.5s' }}
          />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
              backgroundSize: '44px 44px',
            }}
          />
        </div>

        <div className="relative flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-xl bg-[#FFFFFF] overflow-hidden ring-1 ring-white/20">
            <Image src="/candor-logo.jpg" alt="Candor Foods" fill sizes="48px" className="object-contain p-1" priority />
          </div>
          <span className="text-[#FAF5F1] font-semibold tracking-wide">Candor Foods</span>
        </div>

        <div className="relative max-w-lg animate-fade-in-up">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300 mb-4">
            One sign-in · Two systems
          </p>
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight text-[#FAF5F1] tracking-tight">
            Candor QC &amp; Maintenance System
          </h1>
          <p className="mt-4 text-base text-[#FAF5F1]/65 leading-relaxed">
            Quality assurance and plant upkeep, side by side. Choose the system
            you want to open, then sign in.
          </p>

          <SystemPicker
            className="mt-10"
            variant="dark"
            selected={selectedSystem}
            onSelect={handleSelectSystem}
          />
        </div>

        <p className="relative text-xs text-[#FAF5F1]/40 font-medium">
          © {new Date().getFullYear()} Candor Foods · Quality &amp; Maintenance Management
        </p>
      </aside>

      {/* ── Form panel ─────────────────────────────────────────────────── */}
      <main className="relative flex items-center justify-center p-4 sm:p-8 overflow-hidden">
        <div className="absolute top-4 right-4 z-10">
          <ThemeToggle />
        </div>

        {/* Soft background accents for small screens, where the brand panel is hidden */}
        <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden lg:hidden">
          <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full bg-brand-500/10 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 w-[420px] h-[420px] rounded-full bg-amber-500/10 blur-3xl" />
        </div>

        <div className="relative w-full max-w-md animate-fade-in-up">
          {/* Compact brand header — mobile / tablet only */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <div className="relative w-20 h-20 rounded-2xl bg-white shadow-lift ring-1 ring-cream-300 overflow-hidden mb-4">
              <Image src="/candor-logo.jpg" alt="Candor Foods" fill sizes="80px" className="object-contain p-2" priority />
            </div>
            <h1 className="text-2xl font-bold text-ink-600 tracking-tight text-center">
              Candor QC &amp; Maintenance System
            </h1>
          </div>

              <div className="mb-7">
                <h2 className="text-3xl font-bold text-ink-600 tracking-tight">Welcome back</h2>
                <p className="text-sm text-ink-400 mt-1.5 font-medium">
                  Sign in to continue to the{' '}
                  {SYSTEMS.find((sys) => sys.id === selectedSystem)?.name}
                </p>
              </div>

              {/* The brand panel holds the picker on desktop; repeat it here on small screens */}
              <SystemPicker
                className="mb-5 lg:hidden"
                variant="light"
                selected={selectedSystem}
                onSelect={handleSelectSystem}
              />

              <div className="glass-strong rounded-3xl shadow-lift p-7 sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="email" className="label-base flex items-center gap-2">
                      {isMaintenance ? (
                        <User className="w-3.5 h-3.5 text-brand-500" />
                      ) : (
                        <Mail className="w-3.5 h-3.5 text-brand-500" />
                      )}
                      {isMaintenance ? 'Username' : 'Email Address'}
                    </label>
                    <input
                      // key: switching systems swaps the browser's autofill set
                      key={selectedSystem}
                      type={isMaintenance ? 'text' : 'email'}
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="input-base"
                      placeholder={isMaintenance ? 'Your maintenance username' : 'your.email@candorfoods.in'}
                      required
                      autoComplete={isMaintenance ? 'username' : 'email'}
                      autoCapitalize="none"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="label-base flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-brand-500" />
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="input-base pr-11"
                        placeholder="Enter your password"
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-ink-300 hover:text-brand-500 hover:bg-cream-200"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {/* Password reset exists for QC accounts only; mt_users
                        passwords are managed by the maintenance Head. */}
                    <div className="flex justify-end mt-2">
                      {isMaintenance ? (
                        <span className="text-xs text-ink-400">Forgot password? Ask your maintenance Head.</span>
                      ) : (
                        <Link
                          href="/forgot-password"
                          className="text-xs font-semibold text-brand-500 hover:text-brand-600"
                        >
                          Forgot password?
                        </Link>
                      )}
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-danger-50 border border-danger-200 animate-fade-in">
                      <p className="text-sm text-danger-700 font-medium">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600
                               text-white py-3 rounded-xl font-semibold tracking-wide
                               shadow-brand hover:shadow-lift transition-all
                               hover:-translate-y-0.5 active:translate-y-0
                               disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  >
                    {isLoading ? (
                      <>
                        <Spinner size={18} className="text-white" />
                        Signing in…
                      </>
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>

          <p className="text-center text-xs text-ink-400 mt-6 font-medium lg:hidden">
            © {new Date().getFullYear()} Candor Foods · Quality &amp; Maintenance Management
          </p>
        </div>
      </main>
    </div>
  )
}

/** Pick which system to sign in to. Styled as checkboxes, but only one can
 *  be ticked at a time — ticking another moves the selection. */
function SystemPicker({
  selected,
  onSelect,
  variant,
  className = '',
}: {
  selected: SystemId
  onSelect: (id: SystemId) => void
  variant: 'dark' | 'light'
  className?: string
}) {
  const dark = variant === 'dark'

  return (
    <fieldset className={className}>
      <legend
        className={
          dark
            ? 'text-xs font-semibold uppercase tracking-[0.2em] text-[#FAF5F1]/50 mb-3'
            : 'label-base mb-2'
        }
      >
        Select system
      </legend>
      <div className={dark ? 'space-y-4' : 'space-y-2.5'}>
        {SYSTEMS.map(({ id, name, tagline, icon: Icon, tile }) => {
          const checked = selected === id
          return (
            <label
              key={id}
              className={`flex items-center gap-4 cursor-pointer transition-all
                ${dark ? 'rounded-2xl border p-4 backdrop-blur-sm' : 'glass-strong rounded-xl border p-3 shadow-card'}
                ${
                  checked
                    ? dark
                      ? 'border-brand-400/70 bg-white/[0.09] ring-1 ring-brand-400/40'
                      : 'border-brand-500/60 ring-1 ring-brand-500/30'
                    : dark
                      ? 'border-white/10 bg-white/[0.04] hover:bg-white/[0.07]'
                      : 'border-transparent hover:border-brand-500/30'
                }
                has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500/50`}
            >
              <input
                type="checkbox"
                name="system"
                value={id}
                checked={checked}
                onChange={() => onSelect(id)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={`shrink-0 inline-flex w-5 h-5 items-center justify-center rounded-md border-2 transition-colors
                  ${
                    checked
                      ? 'bg-brand-500 border-brand-500 text-white'
                      : dark
                        ? 'border-white/30'
                        : 'border-ink-300'
                  }`}
              >
                {checked && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
              </span>
              <span
                className={`shrink-0 inline-flex items-center justify-center ${tile}
                  ${dark ? 'w-11 h-11 rounded-xl' : 'w-9 h-9 rounded-lg'}`}
              >
                <Icon className={dark ? 'w-5 h-5' : 'w-4 h-4'} />
              </span>
              <span className="min-w-0">
                <span className={`block font-semibold ${dark ? 'text-[#FAF5F1]' : 'text-sm text-ink-600'}`}>
                  {name}
                </span>
                <span className={`block mt-0.5 ${dark ? 'text-sm text-[#FAF5F1]/60' : 'text-xs text-ink-400'}`}>
                  {tagline}
                </span>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
