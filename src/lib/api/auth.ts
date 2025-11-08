/**
 * Utility functions for authentication in frontend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface LoginCredentials {
  email: string
  password: string
}

export interface User {
  id: number
  email: string
  created_at: string
  last_login: string | null
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: User
}

export interface ChangePasswordData {
  current_password: string
  new_password: string
}

/**
 * Login user with email and password
 */
export async function login(credentials: LoginCredentials, company: 'CDPL' | 'CFPL'): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'company': company
    },
    body: JSON.stringify(credentials)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Login failed')
  }

  return response.json()
}

/**
 * Verify JWT token
 */
export async function verifyToken(token: string, company: 'CDPL' | 'CFPL'): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/auth/verify`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'company': company
    }
  })

  if (!response.ok) {
    throw new Error('Token verification failed')
  }

  return response.json()
}

/**
 * Change user password
 */
export async function changePassword(
  passwordData: ChangePasswordData,
  token: string,
  company: 'CDPL' | 'CFPL'
): Promise<{ message: string; success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'company': company
    },
    body: JSON.stringify(passwordData)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Password change failed')
  }

  return response.json()
}

/**
 * Get stored auth token
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

/**
 * Get stored user data
 */
export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null
  const userStr = localStorage.getItem('user')
  return userStr ? JSON.parse(userStr) : null
}

/**
 * Get stored company
 */
export function getStoredCompany(): 'CDPL' | 'CFPL' {
  if (typeof window === 'undefined') return 'CDPL'
  return (localStorage.getItem('company') as 'CDPL' | 'CFPL') || 'CDPL'
}

/**
 * Logout user (clear local storage)
 */
export function logout(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('access_token')
  localStorage.removeItem('user')
  localStorage.removeItem('company')
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken()
}
