'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { isAuthenticated, getAuthToken, getStoredCompany } from '@/lib/api/auth'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuth = () => {
      // Public routes that don't need authentication
      const publicRoutes = ['/login', '/']
      
      // Check if current route is public
      const isPublicRoute = publicRoutes.includes(pathname)
      
      // If not authenticated and trying to access protected route
      if (!isAuthenticated() && !isPublicRoute) {
        router.push('/login')
        return
      }
      
      // If authenticated and trying to access login page, redirect to dashboard
      if (isAuthenticated() && pathname === '/login') {
        router.push('/dashboard')
        return
      }
      
      setIsChecking(false)
    }

    checkAuth()
  }, [pathname, router])

  // Show loading while checking authentication
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
