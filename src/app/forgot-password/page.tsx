'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, KeyRound, CheckCircle2, Inbox,
} from 'lucide-react'
import { Spinner } from '@/components/ui/Loader'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { requestPasswordReset, confirmPasswordReset } from '@/lib/api/auth'

/**
 * Password reset by emailed code.
 *
 *   step 1  email        → POST /auth/password/reset/request
 *   step 2  code + new   → POST /auth/password/reset/confirm
 *   step 3  done         → back to sign-in
 *
 * The server answers step 1 identically whether or not the address is
 * registered, so this screen must never claim the account exists. The copy on
 * step 2 is written to fit both cases: it tells the user what to do if no
 * email arrives instead of asserting one was sent to a real account.
 */

const MIN_PASSWORD_LENGTH = 10
const RESEND_COOLDOWN_SECONDS = 60

type Step = 'email' | 'code' | 'done'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')

  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)

  const otpRef = useRef<HTMLInputElement>(null)

  // Tick the resend cooldown down. The server enforces 60s regardless; this
  // just stops the user firing a request it will only reject.
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  useEffect(() => {
    if (step === 'code') otpRef.current?.focus()
  }, [step])

  const sendCode = async (isResend = false) => {
    setError('')
    setIsLoading(true)
    try {
      await requestPasswordReset(email.trim())
      setCooldown(RESEND_COOLDOWN_SECONDS)
      if (!isResend) setStep('code')
    } catch (err: any) {
      setError(err?.message || 'Could not send the reset code. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void sendCode(false)
  }

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('The two passwords do not match.')
      return
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }

    setIsLoading(true)
    try {
      await confirmPasswordReset({
        email: email.trim(),
        otp: otp.trim(),
        new_password: newPassword,
      })
      setStep('done')
    } catch (err: any) {
      setError(err?.message || 'That code is invalid or has expired.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-brand-500/12 blur-3xl animate-float" />
        <div
          className="absolute -bottom-40 -right-40 w-[560px] h-[560px] rounded-full bg-ink-600/8 blur-3xl animate-float"
          style={{ animationDelay: '1.5s' }}
        />
        <div className="absolute top-1/3 right-1/3 w-[300px] h-[300px] rounded-full bg-brand-300/10 blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-fade-in-up">
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
            {step === 'done' ? 'Password updated' : 'Reset your password'}
          </h1>
          <p className="text-sm text-ink-400 mt-1.5 font-medium text-center max-w-xs">
            {step === 'email' && 'We will email you a 6-digit code.'}
            {step === 'code' && 'Enter the code and choose a new password.'}
            {step === 'done' && 'Sign in with your new password.'}
          </p>
        </div>

        <div className="glass-strong rounded-3xl shadow-lift p-7 sm:p-8">
          {/* ── Step 1: email ─────────────────────────────────────────── */}
          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="label-base flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-brand-500" />
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError('')
                  }}
                  className="input-base"
                  placeholder="your.email@candorfoods.in"
                  required
                  autoFocus
                  autoComplete="email"
                />
                <p className="text-xs text-ink-400 mt-2">
                  Use the email address you sign in with.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-danger-50 border border-danger-200 animate-fade-in">
                  <p className="text-sm text-danger-700 font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="w-full inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600
                           text-white py-3 rounded-xl font-semibold tracking-wide
                           shadow-brand hover:shadow-lift transition-all
                           hover:-translate-y-0.5 active:translate-y-0
                           disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {isLoading ? (
                  <>
                    <Spinner size={18} className="text-white" />
                    Sending…
                  </>
                ) : (
                  <>
                    Send reset code
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ── Step 2: code + new password ───────────────────────────── */}
          {step === 'code' && (
            <form onSubmit={handleResetSubmit} className="space-y-5">
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-cream-200 border border-cream-300">
                <Inbox className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
                <p className="text-xs text-ink-500 leading-relaxed">
                  If <span className="font-semibold text-ink-600">{email}</span> is
                  registered, a 6-digit code is on its way. It expires in 10 minutes.
                  Nothing arrived? Check spam, or confirm you typed the address you sign in with.
                </p>
              </div>

              <div>
                <label htmlFor="otp" className="label-base flex items-center gap-2">
                  <KeyRound className="w-3.5 h-3.5 text-brand-500" />
                  6-digit code
                </label>
                <input
                  ref={otpRef}
                  type="text"
                  id="otp"
                  name="otp"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                    setError('')
                  }}
                  className="input-base text-center text-2xl font-semibold tracking-[0.5em]"
                  placeholder="000000"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="label-base flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-brand-500" />
                  New password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="newPassword"
                    name="newPassword"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value)
                      setError('')
                    }}
                    className="input-base pr-11"
                    placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                    required
                    autoComplete="new-password"
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
              </div>

              <div>
                <label htmlFor="confirmPassword" className="label-base flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-brand-500" />
                  Confirm new password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    setError('')
                  }}
                  className="input-base"
                  placeholder="Type it again"
                  required
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-danger-50 border border-danger-200 animate-fade-in">
                  <p className="text-sm text-danger-700 font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || otp.length < 6}
                className="w-full inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600
                           text-white py-3 rounded-xl font-semibold tracking-wide
                           shadow-brand hover:shadow-lift transition-all
                           hover:-translate-y-0.5 active:translate-y-0
                           disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {isLoading ? (
                  <>
                    <Spinner size={18} className="text-white" />
                    Updating…
                  </>
                ) : (
                  <>
                    Set new password
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep('email')
                    setOtp('')
                    setError('')
                  }}
                  className="text-xs font-semibold text-ink-400 hover:text-brand-500 inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Change email
                </button>
                <button
                  type="button"
                  disabled={cooldown > 0 || isLoading}
                  onClick={() => void sendCode(true)}
                  className="text-xs font-semibold text-brand-500 hover:text-brand-600 disabled:text-ink-300 disabled:cursor-not-allowed"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                </button>
              </div>
            </form>
          )}

          {/* ── Step 3: done ──────────────────────────────────────────── */}
          {step === 'done' && (
            <div className="text-center space-y-5 py-2">
              <div className="mx-auto w-14 h-14 rounded-full bg-success-50 border border-success-200 flex items-center justify-center animate-scale-in">
                <CheckCircle2 className="w-7 h-7 text-success-600" />
              </div>
              <p className="text-sm text-ink-500 leading-relaxed">
                Your password has been changed. For security, every device that was
                signed in has been signed out.
              </p>
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="w-full inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600
                           text-white py-3 rounded-xl font-semibold tracking-wide
                           shadow-brand hover:shadow-lift transition-all
                           hover:-translate-y-0.5 active:translate-y-0"
              >
                Go to sign in
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {step !== 'done' && (
          <p className="text-center mt-6">
            <Link
              href="/login"
              className="text-sm font-semibold text-ink-400 hover:text-brand-500 inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to sign in
            </Link>
          </p>
        )}

        <p className="text-center text-xs text-ink-400 mt-6 font-medium">
          © {new Date().getFullYear()} Candor Foods · Quality Management System
        </p>
      </div>
    </div>
  )
}
