'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/api/auth'
import { landingPathFromStorage } from '@/lib/landing'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // If authenticated, redirect to the first section this user can view
    // (not everyone has the dashboard). If not, redirect to login.
    if (isAuthenticated()) {
      router.push(landingPathFromStorage())
    } else {
      router.push('/login')
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-tan-200 border-t-sage-300 mx-auto"></div>
        <p className="mt-4 text-sage-600 font-medium">Redirecting...</p>
      </div>
    </div>
  )
}