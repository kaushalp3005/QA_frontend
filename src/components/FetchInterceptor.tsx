'use client'

import { useEffect } from 'react'

export default function FetchInterceptor() {
  useEffect(() => {
    const originalFetch = window.fetch

    window.fetch = async (...args) => {
      const response = await originalFetch(...args)

      if (response.status === 401) {
        // Don't intercept login requests
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url
        if (!url.includes('/auth/login')) {
          window.dispatchEvent(new Event('force-logout'))
        }
      }

      return response
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  return null
}
