'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { Spinner } from '@/components/ui/Loader'
import ThemeToggle from '@/components/ui/ThemeToggle'

interface LoginFormData {
  email: string
  password: string
}

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<LoginFormData>({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email, password: formData.password }),
        },
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Login failed')
      }

      const data = await response.json()
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data))

      if (data.companies && data.companies.length > 0) {
        localStorage.setItem('company', data.companies[0].code)
        try {
          const permsResp = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/auth/permissions/${data.companies[0].code}`,
            { headers: { Authorization: `Bearer ${data.access_token}` } },
          )
          if (permsResp.ok) {
            const permsData = await permsResp.json()
            localStorage.setItem('permissions', JSON.stringify(permsData.permissions || {}))
          }
        } catch (permError) {
          console.error('Failed to fetch permissions:', permError)
        }
      }

      const urlParams = new URLSearchParams(window.location.search)
      const returnUrl = urlParams.get('returnUrl')
      router.push(returnUrl ? decodeURIComponent(returnUrl) : '/dashboard')
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Theme toggle in corner */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Decorative background blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-brand-500/12 blur-3xl animate-float" />
        <div
          className="absolute -bottom-40 -right-40 w-[560px] h-[560px] rounded-full bg-ink-600/8 blur-3xl animate-float"
          style={{ animationDelay: '1.5s' }}
        />
        <div className="absolute top-1/3 right-1/3 w-[300px] h-[300px] rounded-full bg-brand-300/10 blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-fade-in-up">
        {/* Brand header */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-24 h-24 rounded-2xl bg-white shadow-lift ring-1 ring-cream-300 overflow-hidden mb-5 animate-scale-in">
            <Image
              src="/candor-logo.jpg"
              alt="Candor Foods"
              fill
              sizes="96px"
              className="object-contain p-2"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-ink-600 tracking-tight text-center">
            Welcome back
          </h1>
          <p className="text-sm text-ink-400 mt-1.5 font-medium">
            Sign in to the Candor Foods QA / QC system
          </p>
        </div>

        {/* Glass card */}
        <div className="glass-strong rounded-3xl shadow-lift p-7 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="label-base flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-brand-500" />
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="input-base"
                placeholder="your.email@candorfoods.in"
                required
                autoComplete="email"
              />
            </div>

            {/* Password */}
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
              <p className="text-[11px] text-ink-300 mt-1.5 font-medium">
                Format: firstname+lastname (e.g. <span className="font-mono">shraddhajadhav</span>)
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-danger-50 border border-danger-200 animate-fade-in">
                <p className="text-sm text-danger-700 font-medium">{error}</p>
              </div>
            )}

            {/* Submit */}
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

          {/* Sample creds */}
          <div className="mt-6 pt-5 border-t border-cream-300">
            <p className="text-[11px] text-ink-400 text-center mb-2.5 font-semibold tracking-wider uppercase">
              Sample Credentials
            </p>
            <div className="rounded-lg bg-cream-100 border border-cream-300 p-3 text-xs space-y-1 font-mono">
              <p className="text-ink-500">quality.inward@candorfoods.in</p>
              <p className="text-ink-400">abhishekdalvi</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-ink-400 mt-6 font-medium">
          © {new Date().getFullYear()} Candor Foods · Quality Management System
        </p>
      </div>
    </div>
  )
}
