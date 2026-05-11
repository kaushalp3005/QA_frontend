'use client'

import { useState, useEffect } from 'react'
import { isSuperAdmin } from '@/lib/constants/modules'

interface ModulePermissions {
  access: boolean
  view: boolean
  create: boolean
  edit: boolean
  delete: boolean
}

interface Permissions {
  [module: string]: ModulePermissions
}

function getCurrentUserEmail(): string | null {
  if (typeof window === 'undefined') return null
  const direct = localStorage.getItem('user_email')
  if (direct) return direct
  const userStr = localStorage.getItem('user')
  if (!userStr) return null
  try {
    const u = JSON.parse(userStr) as { email?: string }
    return u.email ?? null
  } catch {
    return null
  }
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<Permissions>({})
  const [isSuper, setIsSuper] = useState<boolean>(false)

  useEffect(() => {
    setIsSuper(isSuperAdmin(getCurrentUserEmail()))

    // Load cached permissions immediately to avoid flicker
    const storedPermissions = localStorage.getItem('permissions')
    if (storedPermissions) {
      try {
        setPermissions(JSON.parse(storedPermissions))
      } catch (e) {
        console.error('Failed to parse permissions:', e)
      }
    }

    // Always refresh from server so admin changes take effect without re-login
    const token = localStorage.getItem('access_token')
    const company = localStorage.getItem('currentCompany') || localStorage.getItem('company')
    if (token && company) {
      fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/auth/permissions/${company}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.permissions) {
            setPermissions(data.permissions)
            localStorage.setItem('permissions', JSON.stringify(data.permissions))
          }
        })
        .catch(() => {/* keep cached permissions on network error */})
    }
  }, [])

  const hasAccess = (module: string): boolean => {
    if (isSuper) return true
    return permissions[module]?.access || false
  }

  const canView = (module: string): boolean => {
    if (isSuper) return true
    return permissions[module]?.view || false
  }

  const canCreate = (module: string): boolean => {
    if (isSuper) return true
    return permissions[module]?.create || false
  }

  const canEdit = (module: string): boolean => {
    if (isSuper) return true
    return permissions[module]?.edit || false
  }

  const canDelete = (module: string): boolean => {
    if (isSuper) return true
    return permissions[module]?.delete || false
  }

  // Helper to check if user has any permission on a module
  const hasAnyPermission = (module: string): boolean => {
    if (isSuper) return true
    return hasAccess(module) || canView(module) || canCreate(module) || canEdit(module) || canDelete(module)
  }

  return {
    permissions,
    isSuperAdmin: isSuper,
    hasAccess,
    canView,
    canCreate,
    canEdit,
    canDelete,
    hasAnyPermission
  }
}
