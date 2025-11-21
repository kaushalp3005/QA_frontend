'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Mail, Lock, Eye, EyeOff } from 'lucide-react'

interface LoginFormData {
  email: string
  password: string
}

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Login failed')
      }

      const data = await response.json()
      
      // Store token and user data in localStorage
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data))
      // Default to first company if available
      if (data.companies && data.companies.length > 0) {
        localStorage.setItem('company', data.companies[0].code)
        
        // Fetch user permissions for the selected company
        try {
          const permissionsResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/auth/permissions/${data.companies[0].code}`,
            {
              headers: {
                'Authorization': `Bearer ${data.access_token}`
              }
            }
          )
          
          if (permissionsResponse.ok) {
            const permissionsData = await permissionsResponse.json()
            localStorage.setItem('permissions', JSON.stringify(permissionsData.permissions || {}))
          }
        } catch (permError) {
          console.error('Failed to fetch permissions:', permError)
          // Continue with login even if permissions fetch fails
        }
      }
      
      // Redirect to dashboard
      router.push('/dashboard')
      
    } catch (error: any) {
      setError(error.message || 'Login failed. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center p-4" style={{ backgroundImage: 'linear-gradient(135deg, #F5F5F0 0%, #E6D8C3 50%, #F5F5F0 100%)' }}>
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-sage-300 rounded-full mb-4 shadow-lg border-4 border-cream-50">
            <Shield className="w-10 h-10 text-sage-900" />
          </div>
          <h1 className="text-3xl font-bold text-sage-800 mb-2 tracking-tight">
            Quality Control System
          </h1>
          <p className="text-sage-600 font-medium">
            Sign in to access your account
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-beige-50 rounded-2xl shadow-2xl border border-tan-200 p-8 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-sage-700 mb-2">
                <Mail className="w-4 h-4 inline mr-2 text-sage-600" />
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-tan-200 bg-cream-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300 text-sage-900 placeholder:text-tan-300 transition-all"
                placeholder="your.email@candorfoods.in"
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-sage-700 mb-2">
                <Lock className="w-4 h-4 inline mr-2 text-sage-600" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-tan-200 bg-cream-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300 pr-12 text-sage-900 placeholder:text-tan-300 transition-all"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-tan-300 hover:text-sage-400 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-sage-500 mt-1">
                Password format: firstname+lastname (e.g., shraddhajadhav)
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-sage-300 text-sage-900 py-3 rounded-lg font-semibold hover:bg-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-sage-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Sample Credentials */}
          <div className="mt-6 pt-6 border-t border-tan-200">
            <p className="text-xs text-sage-600 text-center mb-3 font-medium">Sample Login Credentials:</p>
            <div className="bg-cream-50 rounded-lg p-3 text-xs space-y-1 border border-tan-200">
              <p className="font-mono text-sage-700">Email: quality.inward@candorfoods.in</p>
              <p className="font-mono text-sage-700">Password: abhishekdalvi</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-sage-600 mt-6 font-medium">
          © 2025 Candor Foods. All rights reserved.
        </p>
      </div>
    </div>
  )
}
