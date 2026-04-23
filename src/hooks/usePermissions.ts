'use client'

import { useState, useEffect } from 'react'

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

export function usePermissions() {
  const [permissions, setPermissions] = useState<Permissions>({})

  useEffect(() => {
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
    return permissions[module]?.access || false
  }

  const canView = (module: string): boolean => {
    return permissions[module]?.view || false
  }

  const canCreate = (module: string): boolean => {
    return permissions[module]?.create || false
  }

  const canEdit = (module: string): boolean => {
    return permissions[module]?.edit || false
  }

  const canDelete = (module: string): boolean => {
    return permissions[module]?.delete || false
  }

  // Helper to check if user has any permission on a module
  const hasAnyPermission = (module: string): boolean => {
    return hasAccess(module) || canView(module) || canCreate(module) || canEdit(module) || canDelete(module)
  }

  return {
    permissions,
    hasAccess,
    canView,
    canCreate,
    canEdit,
    canDelete,
    hasAnyPermission
  }
}
